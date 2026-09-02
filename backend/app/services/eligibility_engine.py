# -*- coding: utf-8 -*-
"""
ReviveAI -- Deterministic Recovery Eligibility Engine
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from app.models.opportunity import (
    OpportunityState,
    IntentLevel,
    RecoveryWindowType,
    CustomerFatigueLevel,
    DataProvenance,
)
from app.config import get_settings

settings = get_settings()


@dataclass
class EligibilityContext:
    event_id: str
    merchant_id: str
    customer_id: str
    amount_inr: float
    event_timestamp: datetime
    
    order_id: Optional[str] = None
    order_status: str = "open"
    subscription_id: Optional[str] = None
    subscription_status: Optional[str] = None
    
    customer_opted_out: bool = False
    customer_cancelled_explicitly: bool = False
    customer_active_checkout: bool = True
    last_customer_action_at: Optional[datetime] = None
    recent_contact_count_7d: int = 0
    
    is_pre_authorized: bool = False
    is_already_settled: bool = False
    has_duplicate_successful_payment: bool = False
    payment_method: str = "card"
    
    retry_count: int = 0
    consecutive_failures: int = 0
    risk_score: float = 0.1
    is_weekend: bool = False
    provider_failure_rate: float = 0.02
    target_gateway: str = "razorpay"
    
    has_new_checkout_trigger: bool = False
    historical_context_ids: List[str] = field(default_factory=list)
    evaluation_time: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class EligibilityResult:
    is_eligible: bool
    target_state: OpportunityState
    intent_level: IntentLevel
    window_type: RecoveryWindowType
    fatigue_level: CustomerFatigueLevel
    disqualification_reasons: List[str] = field(default_factory=list)
    action_required: Optional[str] = None
    requires_human: bool = False
    blocking_reason: Optional[str] = None
    evaluated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_eligible": self.is_eligible,
            "target_state": self.target_state.value,
            "intent_level": self.intent_level.value,
            "window_type": self.window_type.value,
            "fatigue_level": self.fatigue_level.value,
            "disqualification_reasons": self.disqualification_reasons,
            "action_required": self.action_required,
            "requires_human": self.requires_human,
            "blocking_reason": self.blocking_reason,
            "evaluated_at": self.evaluated_at.isoformat(),
            "metadata": self.metadata,
        }


class EligibilityEngine:
    def evaluate(self, ctx: EligibilityContext) -> EligibilityResult:
        reasons: List[str] = []
        now = ctx.evaluation_time
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        
        evt_time = ctx.event_timestamp
        if evt_time.tzinfo is None:
            evt_time = evt_time.replace(tzinfo=timezone.utc)

        age_seconds = max(0.0, (now - evt_time).total_seconds())

        # 1. Recovery Window & Recency
        if age_seconds <= 300:
            window_type = RecoveryWindowType.IMMEDIATE
        elif age_seconds <= 7200:
            window_type = RecoveryWindowType.SHORT_TERM
        elif age_seconds <= 86400:
            window_type = RecoveryWindowType.DEFERRED
        else:
            window_type = RecoveryWindowType.EXPIRED

        # 2. Customer Intent Decay
        if ctx.customer_cancelled_explicitly or ctx.customer_opted_out:
            intent_level = IntentLevel.EXPIRED
        elif ctx.has_new_checkout_trigger or (ctx.customer_active_checkout and age_seconds <= 1800):
            intent_level = IntentLevel.HIGH_CURRENT_INTENT
        elif age_seconds <= 7200:
            intent_level = IntentLevel.MODERATE_CURRENT_INTENT
        elif age_seconds <= 86400:
            intent_level = IntentLevel.WEAKENING_INTENT
        else:
            intent_level = IntentLevel.EXPIRED

        # 3. Customer Fatigue
        if ctx.recent_contact_count_7d == 0:
            fatigue_level = CustomerFatigueLevel.NO_CONTACT
        elif ctx.recent_contact_count_7d == 1:
            fatigue_level = CustomerFatigueLevel.LOW_FATIGUE
        elif ctx.recent_contact_count_7d <= 3:
            fatigue_level = CustomerFatigueLevel.MODERATE_FATIGUE
        else:
            fatigue_level = CustomerFatigueLevel.DO_NOT_CONTACT

        # 4. Hard Disqualifications
        # Priority Gate A: Window Expiry & Zero Historical Resurrection
        if window_type == RecoveryWindowType.EXPIRED and not ctx.has_new_checkout_trigger:
            return EligibilityResult(
                is_eligible=False,
                target_state=OpportunityState.HISTORICAL,
                intent_level=IntentLevel.EXPIRED,
                window_type=RecoveryWindowType.EXPIRED,
                fatigue_level=fatigue_level,
                disqualification_reasons=["RECOVERY_WINDOW_EXPIRED_HISTORICAL_RECORD"],
                metadata={"age_days": round(age_seconds / 86400, 1), "resurrection_blocked": True},
            )

        # Gate B: Already Settled / Naturally Recovered
        if ctx.is_already_settled:
            return EligibilityResult(
                is_eligible=False,
                target_state=OpportunityState.RECOVERED,
                intent_level=intent_level,
                window_type=window_type,
                fatigue_level=fatigue_level,
                disqualification_reasons=["PAYMENT_ALREADY_SETTLED"],
                metadata={"age_seconds": age_seconds},
            )

        # Gate C: Duplicate Purchase Shield
        if ctx.has_duplicate_successful_payment:
            return EligibilityResult(
                is_eligible=False,
                target_state=OpportunityState.BLOCKED,
                intent_level=intent_level,
                window_type=window_type,
                fatigue_level=fatigue_level,
                disqualification_reasons=["DUPLICATE_PURCHASE_DETECTED_FOR_CART"],
                blocking_reason="Customer already completed alternative payment for this cart.",
                metadata={"duplicate_shield_active": True},
            )

        # Gate D: Customer Explicit Cancellation
        if ctx.customer_cancelled_explicitly:
            return EligibilityResult(
                is_eligible=False,
                target_state=OpportunityState.CANCELLED,
                intent_level=IntentLevel.EXPIRED,
                window_type=window_type,
                fatigue_level=fatigue_level,
                disqualification_reasons=["CUSTOMER_EXPLICIT_CANCELLATION"],
                metadata={"sovereignty_enforced": True},
            )

        # Gate E: Communication Opt-Out
        if ctx.customer_opted_out:
            return EligibilityResult(
                is_eligible=False,
                target_state=OpportunityState.BLOCKED,
                intent_level=IntentLevel.EXPIRED,
                window_type=window_type,
                fatigue_level=fatigue_level,
                disqualification_reasons=["CUSTOMER_COMMUNICATION_OPT_OUT"],
                metadata={"opt_out": True},
            )

        # Gate F: Order Status Closed / Cancelled
        if ctx.order_status in ("cancelled", "closed", "fulfilled_elsewhere"):
            return EligibilityResult(
                is_eligible=False,
                target_state=OpportunityState.CLOSED,
                intent_level=intent_level,
                window_type=window_type,
                fatigue_level=fatigue_level,
                disqualification_reasons=[f"ORDER_STATUS_{ctx.order_status.upper()}"],
                metadata={"order_status": ctx.order_status},
            )

        # Gate G: Subscription Status Cancelled / Halted
        if ctx.subscription_id and ctx.subscription_status in ("cancelled", "halted", "expired"):
            return EligibilityResult(
                is_eligible=False,
                target_state=OpportunityState.BLOCKED,
                intent_level=intent_level,
                window_type=window_type,
                fatigue_level=fatigue_level,
                disqualification_reasons=[f"SUBSCRIPTION_STATUS_{ctx.subscription_status.upper()}"],
                metadata={"subscription_status": ctx.subscription_status},
            )

        # Gate H: Extreme Customer Fatigue
        if fatigue_level == CustomerFatigueLevel.DO_NOT_CONTACT and not ctx.has_new_checkout_trigger:
            return EligibilityResult(
                is_eligible=False,
                target_state=OpportunityState.BLOCKED,
                intent_level=intent_level,
                window_type=window_type,
                fatigue_level=fatigue_level,
                disqualification_reasons=["CUSTOMER_FATIGUE_LIMIT_EXCEEDED"],
                metadata={"recent_contacts": ctx.recent_contact_count_7d},
            )

        # Gate I: Maximum Retry Exhaustion
        if ctx.retry_count >= settings.max_retries_per_case:
            return EligibilityResult(
                is_eligible=False,
                target_state=OpportunityState.BLOCKED,
                intent_level=intent_level,
                window_type=window_type,
                fatigue_level=fatigue_level,
                disqualification_reasons=["MAX_RETRIES_EXCEEDED"],
                metadata={"retries": ctx.retry_count, "max_allowed": settings.max_retries_per_case},
            )

        # Gate J: Fraud & Risk Ceiling
        if ctx.risk_score >= 0.85:
            return EligibilityResult(
                is_eligible=False,
                target_state=OpportunityState.BLOCKED,
                intent_level=intent_level,
                window_type=window_type,
                fatigue_level=fatigue_level,
                disqualification_reasons=["HIGH_FRAUD_RISK_SCORE"],
                metadata={"risk_score": ctx.risk_score},
            )

        # 5. Conditional Actionability
        if ctx.amount_inr > settings.max_automated_amount_inr:
            return EligibilityResult(
                is_eligible=True,
                target_state=OpportunityState.HUMAN_REVIEW,
                intent_level=intent_level,
                window_type=window_type,
                fatigue_level=fatigue_level,
                disqualification_reasons=[],
                action_required="HUMAN_REVIEW_ESCALATION",
                requires_human=True,
                metadata={"amount_inr": ctx.amount_inr, "ceiling": settings.max_automated_amount_inr},
            )

        if ctx.provider_failure_rate >= 0.25:
            return EligibilityResult(
                is_eligible=True,
                target_state=OpportunityState.WAITING,
                intent_level=intent_level,
                window_type=window_type,
                fatigue_level=fatigue_level,
                disqualification_reasons=[],
                action_required="HOLD_FOR_PROVIDER_RECOVERY",
                metadata={"gateway": ctx.target_gateway, "failure_rate": ctx.provider_failure_rate},
            )

        if not ctx.is_pre_authorized and not ctx.subscription_id:
            return EligibilityResult(
                is_eligible=True,
                target_state=OpportunityState.CUSTOMER_ACTION_REQUIRED,
                intent_level=intent_level,
                window_type=window_type,
                fatigue_level=fatigue_level,
                disqualification_reasons=[],
                action_required="REQUEST_CUSTOMER_CONFIRMATION",
                metadata={"authorization": "NONE", "requires_consent": True},
            )

        # 6. Fully Eligible
        return EligibilityResult(
            is_eligible=True,
            target_state=OpportunityState.ACTIONABLE,
            intent_level=intent_level,
            window_type=window_type,
            fatigue_level=fatigue_level,
            disqualification_reasons=[],
            action_required="PORTFOLIO_ALLOCATION_READY",
            metadata={
                "age_seconds": age_seconds,
                "is_pre_authorized": ctx.is_pre_authorized,
                "historical_context_count": len(ctx.historical_context_ids),
            },
        )


eligibility_engine = EligibilityEngine()
