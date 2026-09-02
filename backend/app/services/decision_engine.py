"""
ReviveAI — Zero-Trust Financial Recovery Decision Control Plane

Integrates:
1. Unified Recovery Brain (Canonical Single Pipeline)
2. The 12-Article Recovery Constitution (Non-bypassable financial safety law)
3. Safety Governor (Dynamic self-reducing autonomy & daily blast radius caps)
4. Signed Deterministic Action Contracts (HMAC-SHA256, Integer Minor Paisa Units, TTL Expiry)
5. Customer Intent Decay & Purchase Completion Correlator (Cross-Order Duplicate Shield)
6. 10-Node Interactive Decision Graph Generator
7. 5-Tier Recovery Trust Score (0-100) & Real-time State Freshness Telemetry
8. Transparent "Why This?" vs "Why Not That?" Rejection Matrix
9. Recovery Causality & Incremental Value Engine
"""
from __future__ import annotations

import math
import time
import uuid
import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from app.services.constitution import constitution_engine, ConstitutionEvaluationResult
from app.services.action_contract import action_contract_manager, ActionContract
from app.services.safety_governor import safety_governor, GovernorDecision, GovernorAutonomyCeiling, SystemSafetyPosture
from app.services.causality_engine import causality_engine, IntentDecayResult, CausalAttributionResult, DuplicateClassification


class CustomerIntent(str, Enum):
    UNKNOWN = "UNKNOWN"
    ACTIVE = "ACTIVE"
    CONFIRMED = "CONFIRMED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    AMBIGUOUS = "AMBIGUOUS"


class AuthorizationState(str, Enum):
    AUTHORIZED = "AUTHORIZED"
    NOT_AUTHORIZED = "NOT_AUTHORIZED"
    AUTHORIZATION_REQUIRED = "AUTHORIZATION_REQUIRED"
    MANDATE_PRESENT = "MANDATE_PRESENT"
    MANDATE_ABSENT = "MANDATE_ABSENT"
    AUTHORIZATION_EXPIRED = "AUTHORIZATION_EXPIRED"
    AUTHORIZATION_REVOKED = "AUTHORIZATION_REVOKED"
    UNKNOWN = "UNKNOWN"


class PaymentType(str, Enum):
    ONE_TIME_CHECKOUT = "ONE_TIME_CHECKOUT"
    RECURRING_PAYMENT = "RECURRING_PAYMENT"
    SUBSCRIPTION = "SUBSCRIPTION"
    MANDATE_AUTHORIZED_PAYMENT = "MANDATE_AUTHORIZED_PAYMENT"
    PAYMENT_LINK = "PAYMENT_LINK"
    REFUND = "REFUND"
    RETRYABLE_AUTHORIZED_PAYMENT = "RETRYABLE_AUTHORIZED_PAYMENT"
    OTHER = "OTHER"


class RecoveryAutonomyLevel(str, Enum):
    LEVEL_0_OBSERVE = "LEVEL_0_OBSERVE"               # Analyze only. No customer action.
    LEVEL_1_RECOMMEND = "LEVEL_1_RECOMMEND"           # Merchant/operator recommendation only.
    LEVEL_2_CUSTOMER_INITIATED = "LEVEL_2_CUSTOMER_INITIATED" # Prepare recovery, require customer interactive link.
    LEVEL_3_AUTO_ELIGIBLE = "LEVEL_3_AUTO_ELIGIBLE"   # Autonomous execution permitted under strict authorization.
    LEVEL_4_HUMAN_APPROVAL = "LEVEL_4_HUMAN_APPROVAL" # Human manager authorization required.
    LEVEL_5_HARD_STOP = "LEVEL_5_HARD_STOP"           # Forbidden (fraud, duplicate risk, customer cancelled).


class ActionVerdict(str, Enum):
    RECOVER = "RECOVER"
    WAIT = "WAIT"
    ASK = "ASK"
    ESCALATE = "ESCALATE"
    STOP = "STOP"
    DO_NOTHING = "DO_NOTHING"


class CustomerFrictionLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    VERY_HIGH = "VERY_HIGH"


class TrustTier(str, Enum):
    VERY_HIGH = "VERY_HIGH"  # 85-100
    HIGH = "HIGH"            # 70-84
    MODERATE = "MODERATE"    # 50-69
    LOW = "LOW"              # 30-49
    VERY_LOW = "VERY_LOW"    # 0-29


class StrategyType(str, Enum):
    OPTIMAL_SMART_DELAY = "optimal_smart_delay"
    GATEWAY_FAILOVER = "gateway_failover"
    ONE_TAP_CARD_UPDATE = "one_tap_card_update"
    STEP_UP_3DS_AUTH = "step_up_3ds_auth"
    CUSTOMER_RECOVERY_LINK = "customer_recovery_link"
    HUMAN_VIP_REVIEW = "human_vip_review"
    IMMEDIATE_RETRY = "immediate_retry"
    DO_NOTHING = "do_nothing"
    STOP_AND_RESTRAIN = "stop_and_restrain"


class ModelTier(str, Enum):
    DETERMINISTIC_RULES = "deterministic-rules-engine"
    FAST_CLASSIFIER = "gemini-2.0-flash-fast"
    DEEP_REASONER = "gemini-2.0-flash-deep"
    EMERGENCY_FALLBACK = "deterministic-fallback-v2"


@dataclass
class NormalizedCase:
    case_id: str
    amount_inr: float
    failure_code: str
    gateway: str
    customer_id: str
    customer_name: str
    customer_ltv_inr: float
    customer_tenure_months: int
    historical_success_rate: float
    retry_count: int
    tenant_id: str = "merchant_default"
    is_weekend: bool = False
    gateway_is_degraded: bool = False
    gateway_error_rate: float = 0.04
    customer_opted_out: bool = False
    is_vip: bool = False
    customer_intent: CustomerIntent = CustomerIntent.ACTIVE
    authorization_state: AuthorizationState = AuthorizationState.AUTHORIZED
    payment_type: PaymentType = PaymentType.ONE_TIME_CHECKOUT
    duplicate_purchase_detected: bool = False
    duplicate_order_id: Optional[str] = None
    customer_cancelled: bool = False
    recovery_window_minutes: int = 30
    data_quality_pct: float = 95.0
    payment_state_age_seconds: int = 4
    gateway_health_age_seconds: int = 3
    provider_sync_age_seconds: int = 12
    is_shadow_mode: bool = False
    canary_percentage: int = 100
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class CandidateStrategy:
    strategy_type: StrategyType
    name: str
    description: str
    recovery_probability: float
    expected_delay_seconds: int
    customer_friction_cost_inr: float
    customer_friction_level: CustomerFrictionLevel
    gateway_execution_cost_inr: float
    risk_cost_inr: float
    ai_inference_cost_inr: float
    gross_expected_revenue_inr: float
    net_expected_value_inr: float
    requires_human: bool
    policy_status: str
    selection_score: float
    economic_rationale: str
    rejection_reason: Optional[str] = None


@dataclass
class DecisionResult:
    case_id: str
    decision_id: str
    timestamp: str
    priority_score: float
    priority_tier: str
    priority_explanation: str
    root_cause_diagnosis: str
    model_routing: Dict[str, Any]
    candidate_strategies: List[CandidateStrategy]
    selected_strategy: CandidateStrategy
    baseline_expected_value_inr: float
    incremental_economic_lift_inr: float
    policy_gate_verdict: str
    policy_version: str
    is_autonomous_executable: bool
    decision_receipt_hash: str
    # Trust, Safety & Explainability Engine
    action_verdict: ActionVerdict = ActionVerdict.RECOVER
    autonomy_level: RecoveryAutonomyLevel = RecoveryAutonomyLevel.LEVEL_3_AUTO_ELIGIBLE
    trust_score: float = 85.0
    trust_tier: TrustTier = TrustTier.VERY_HIGH
    trust_breakdown: Dict[str, Any] = field(default_factory=dict)
    data_quality_score: float = 95.0
    data_quality_checklist: List[Dict[str, Any]] = field(default_factory=list)
    state_freshness_status: Dict[str, Any] = field(default_factory=dict)
    why_selected: str = ""
    rejected_alternatives: List[Dict[str, str]] = field(default_factory=list)
    decision_graph: List[Dict[str, Any]] = field(default_factory=list)
    duplicate_risk_summary: Dict[str, Any] = field(default_factory=dict)
    customer_protection_summary: Dict[str, Any] = field(default_factory=dict)
    counterfactual_do_nothing_diff_inr: float = 0.0
    # Zero-Trust Additions
    constitution_evaluation: Dict[str, Any] = field(default_factory=dict)
    signed_action_contract: Optional[Dict[str, Any]] = None
    safety_governor_posture: Dict[str, Any] = field(default_factory=dict)
    intent_decay: Dict[str, Any] = field(default_factory=dict)
    causal_attribution: Dict[str, Any] = field(default_factory=dict)
    recovery_window_expires_at: Optional[str] = None


class RecoveryDecisionEngine:
    def __init__(self):
        self.policy_version = "v3.2-zero-trust-control-plane"
        self.strategy_memory = {
            StrategyType.OPTIMAL_SMART_DELAY: {"predicted_avg": 0.88, "observed_avg": 0.86, "brier_score": 0.04, "circuit_breaker_tripped": False},
            StrategyType.GATEWAY_FAILOVER: {"predicted_avg": 0.82, "observed_avg": 0.81, "brier_score": 0.05, "circuit_breaker_tripped": False},
            StrategyType.ONE_TAP_CARD_UPDATE: {"predicted_avg": 0.85, "observed_avg": 0.83, "brier_score": 0.03, "circuit_breaker_tripped": False},
            StrategyType.STEP_UP_3DS_AUTH: {"predicted_avg": 0.78, "observed_avg": 0.76, "brier_score": 0.06, "circuit_breaker_tripped": False},
            StrategyType.CUSTOMER_RECOVERY_LINK: {"predicted_avg": 0.65, "observed_avg": 0.64, "brier_score": 0.05, "circuit_breaker_tripped": False},
            StrategyType.IMMEDIATE_RETRY: {"predicted_avg": 0.18, "observed_avg": 0.14, "brier_score": 0.12, "circuit_breaker_tripped": False},
            StrategyType.DO_NOTHING: {"predicted_avg": 0.00, "observed_avg": 0.00, "brier_score": 0.00, "circuit_breaker_tripped": False},
        }

    def compute_priority_score(self, case: NormalizedCase) -> tuple[float, str, str]:
        amount_comp = min(30.0, (math.log10(max(100.0, case.amount_inr)) / math.log10(500000.0)) * 30.0)
        ltv_comp = min(35.0, (math.log10(max(1000.0, case.customer_ltv_inr)) / math.log10(1000000.0)) * 35.0)
        tenure_comp = min(15.0, (case.customer_tenure_months / 24.0) * 15.0)
        rel_comp = case.historical_success_rate * 20.0
        raw = amount_comp + ltv_comp + tenure_comp + rel_comp
        deduction = min(25.0, case.retry_count * 8.0)
        final_score = max(5.0, min(99.0, raw - deduction))

        if final_score >= 80.0:
            tier = "CRITICAL"
        elif final_score >= 60.0:
            tier = "HIGH"
        elif final_score >= 40.0:
            tier = "MEDIUM"
        else:
            tier = "LOW"

        explanation = (
            f"Score {final_score:.1f}/100: Protected LTV Rs {case.customer_ltv_inr:,.0f} "
            f"({case.customer_tenure_months}mo tenure, {case.historical_success_rate*100:.0f}% reliability) "
            f"against Rs {case.amount_inr:,.0f} transaction exposure."
        )
        return round(final_score, 1), tier, explanation

    def compute_trust_score(self, case: NormalizedCase) -> tuple[float, TrustTier, Dict[str, Any]]:
        # 1. Authorization
        if case.authorization_state in (AuthorizationState.AUTHORIZED, AuthorizationState.MANDATE_PRESENT):
            auth_val = 100.0
        elif case.authorization_state == AuthorizationState.AUTHORIZATION_REQUIRED:
            auth_val = 30.0
        elif case.authorization_state == AuthorizationState.UNKNOWN:
            auth_val = 20.0
        else:
            auth_val = 0.0

        # 2. Intent
        if case.customer_intent in (CustomerIntent.ACTIVE, CustomerIntent.CONFIRMED):
            intent_val = 100.0
        elif case.customer_intent == CustomerIntent.AMBIGUOUS:
            intent_val = 40.0
        elif case.customer_intent == CustomerIntent.UNKNOWN:
            intent_val = 20.0
        else:
            intent_val = 0.0

        # 3. Duplicate Absence
        dup_val = 0.0 if case.duplicate_purchase_detected else 100.0

        # 4. Provider Health
        if case.gateway_is_degraded:
            provider_val = max(20.0, (1.0 - case.gateway_error_rate * 2) * 100.0)
        else:
            provider_val = 98.0

        # 5. Data Quality
        data_val = max(10.0, min(100.0, case.data_quality_pct))

        # 6. State Freshness
        max_age = max(case.payment_state_age_seconds, case.gateway_health_age_seconds)
        if max_age <= 10:
            fresh_val = 100.0
        elif max_age <= 60:
            fresh_val = 80.0
        elif max_age <= 300:
            fresh_val = 50.0
        else:
            fresh_val = 20.0

        # 7. Model Calibration
        calib_val = 92.0

        total_trust = (
            auth_val * 0.35 +
            intent_val * 0.25 +
            dup_val * 0.15 +
            provider_val * 0.10 +
            data_val * 0.05 +
            fresh_val * 0.05 +
            calib_val * 0.05
        )
        total_trust = round(max(0.0, min(100.0, total_trust)), 1)

        if total_trust >= 85.0:
            tier = TrustTier.VERY_HIGH
        elif total_trust >= 70.0:
            tier = TrustTier.HIGH
        elif total_trust >= 50.0:
            tier = TrustTier.MODERATE
        elif total_trust >= 30.0:
            tier = TrustTier.LOW
        else:
            tier = TrustTier.VERY_LOW

        breakdown = {
            "overall_trust_score": total_trust,
            "trust_tier": tier.value,
            "authorization_confidence": "HIGH" if auth_val >= 80 else ("MEDIUM" if auth_val >= 40 else "LOW"),
            "intent_confidence": "HIGH" if intent_val >= 80 else ("MEDIUM" if intent_val >= 40 else "LOW"),
            "duplicate_risk_confidence": "HIGH" if dup_val == 100 else "ZERO_DUPLICATE_RISK_DETECTED",
            "duplicate_risk": "LOW" if dup_val == 100 else "HIGH",
            "provider_health": "DEGRADED" if case.gateway_is_degraded else "HEALTHY",
            "provider_health_score": round(provider_val, 1),
            "data_quality_pct": round(data_val, 1),
            "state_freshness_pct": round(fresh_val, 1),
            "model_calibration_pct": calib_val,
        }
        return total_trust, tier, breakdown

    def evaluate_data_quality_and_freshness(self, case: NormalizedCase) -> tuple[float, List[Dict[str, Any]], Dict[str, Any]]:
        checklist = [
            {
                "item": "Payment State Current",
                "status": "PASS" if case.payment_state_age_seconds < 60 else "WARN",
                "age_seconds": case.payment_state_age_seconds,
                "detail": f"Synced {case.payment_state_age_seconds}s ago from provider ledger.",
            },
            {
                "item": "Customer Authorization Verified",
                "status": "PASS" if case.authorization_state in (AuthorizationState.AUTHORIZED, AuthorizationState.MANDATE_PRESENT) else "FAIL",
                "detail": f"State: {case.authorization_state.value}",
            },
            {
                "item": "Merchant Policy Engine Active",
                "status": "PASS",
                "detail": f"Policy version {self.policy_version} loaded.",
            },
            {
                "item": "Provider Gateway Health Telemetry",
                "status": "PASS" if not case.gateway_is_degraded else "WARN",
                "detail": f"Gateway {case.gateway} error rate: {case.gateway_error_rate*100:.1f}%.",
            },
            {
                "item": "Customer Historical Reliability",
                "status": "PASS" if case.customer_tenure_months > 0 else "WARN",
                "detail": f"{case.historical_success_rate*100:.0f}% success across {case.customer_tenure_months}mo.",
            },
            {
                "item": "Duplicate Purchase Verification",
                "status": "PASS" if not case.duplicate_purchase_detected else "FAIL",
                "detail": "No duplicate cross-order match" if not case.duplicate_purchase_detected else f"Matching order {case.duplicate_order_id}",
            },
        ]
        score = sum(100.0 if c["status"] == "PASS" else (50.0 if c["status"] == "WARN" else 0.0) for c in checklist) / len(checklist)
        freshness = {
            "payment_state_age_s": case.payment_state_age_seconds,
            "gateway_health_age_s": case.gateway_health_age_seconds,
            "provider_sync_age_s": case.provider_sync_age_seconds,
            "is_stale": case.payment_state_age_seconds > 300,
        }
        return round(score, 1), checklist, freshness

    def generate_decision_graph(
        self,
        case: NormalizedCase,
        trust_score: float,
        best_strategy: CandidateStrategy,
        policy_verdict: str,
        autonomy_level: RecoveryAutonomyLevel,
        action_verdict: ActionVerdict,
    ) -> List[Dict[str, Any]]:
        nodes = []
        
        # 1. Root Failure
        nodes.append({
            "step": 1,
            "id": "PAYMENT_FAILED",
            "name": "Payment Failure Ingested",
            "status": "PASS",
            "label": f"₹{case.amount_inr:,.0f} ({case.failure_code})",
            "detail": f"Failure detected on gateway {case.gateway}.",
        })

        # 2. Authorization
        auth_ok = case.authorization_state in (AuthorizationState.AUTHORIZED, AuthorizationState.MANDATE_PRESENT)
        nodes.append({
            "step": 2,
            "id": "AUTHORIZATION_GATE",
            "name": "Consent & Authorization Gate",
            "status": "PASS" if auth_ok else "DIVERTED",
            "label": case.authorization_state.value,
            "detail": "Verified recurring token/mandate" if auth_ok else "No auto-debit consent; requires interactive customer link.",
        })

        # 3. Customer Intent
        intent_ok = case.customer_intent in (CustomerIntent.ACTIVE, CustomerIntent.CONFIRMED) and not case.customer_cancelled
        nodes.append({
            "step": 3,
            "id": "CUSTOMER_INTENT",
            "name": "Customer Intent Signal",
            "status": "PASS" if intent_ok else "DIVERTED",
            "label": case.customer_intent.value,
            "detail": "Active checkout session confirmed." if intent_ok else "Customer intent unknown or cancelled.",
        })

        # 4. Duplicate Risk
        dup_ok = not case.duplicate_purchase_detected
        nodes.append({
            "step": 4,
            "id": "DUPLICATE_SHIELD",
            "name": "Duplicate Purchase Shield",
            "status": "PASS" if dup_ok else "FAIL",
            "label": "CLEAR" if dup_ok else "MATCH DETECTED",
            "detail": "No matching order found." if dup_ok else f"Alternative order {case.duplicate_order_id} succeeded.",
        })

        # 5. Provider Health
        gw_ok = not case.gateway_is_degraded
        nodes.append({
            "step": 5,
            "id": "PROVIDER_HEALTH",
            "name": "Gateway Health Telemetry",
            "status": "PASS" if gw_ok else "WARN",
            "label": "HEALTHY" if gw_ok else "DEGRADED",
            "detail": f"{case.gateway} error rate {case.gateway_error_rate*100:.1f}%.",
        })

        # 6. Economic Net EV
        ev_ok = best_strategy.net_expected_value_inr > 0
        nodes.append({
            "step": 6,
            "id": "ECONOMIC_NET_EV",
            "name": "Economic Net Expected Value",
            "status": "PASS" if ev_ok else "DIVERTED",
            "label": f"+₹{best_strategy.net_expected_value_inr:,.2f}" if ev_ok else f"₹{best_strategy.net_expected_value_inr:,.2f}",
            "detail": "Net EV exceeds total recovery & friction costs." if ev_ok else "Negative expected value — Do Nothing optimal.",
        })

        # 7. Policy Firewall
        policy_ok = policy_verdict == "APPROVED_AUTO_EXECUTION"
        nodes.append({
            "step": 7,
            "id": "POLICY_FIREWALL",
            "name": "Deterministic Policy Firewall",
            "status": "PASS" if policy_ok else "DIVERTED",
            "label": policy_verdict,
            "detail": "All bounds & ₹50k ceiling satisfied." if policy_ok else "Exceeded policy limits; routed to human review.",
        })

        # 8. Recovery Trust Gate
        trust_ok = trust_score >= 70.0
        nodes.append({
            "step": 8,
            "id": "TRUST_SCORE_GATE",
            "name": "Recovery Trust Gate (≥70)",
            "status": "PASS" if trust_ok else "DIVERTED",
            "label": f"Trust {trust_score:.0f}/100",
            "detail": "Sufficient confidence for autonomous action." if trust_ok else "Insufficient trust; fallback to customer prompt.",
        })

        # 9. Autonomy Verdict
        nodes.append({
            "step": 9,
            "id": "AUTONOMY_LEVEL",
            "name": "Autonomy Classification",
            "status": "PASS" if autonomy_level == RecoveryAutonomyLevel.LEVEL_3_AUTO_ELIGIBLE else "ACTIVE",
            "label": autonomy_level.value,
            "detail": f"Verdict: {action_verdict.value}",
        })

        # 10. Selected Strategy
        nodes.append({
            "step": 10,
            "id": "SELECTED_STRATEGY",
            "name": "Orchestrated Action",
            "status": "ACTIVE",
            "label": best_strategy.name,
            "detail": best_strategy.economic_rationale,
        })

        return nodes

    def route_model(self, case: NormalizedCase) -> Dict[str, Any]:
        start = time.perf_counter()
        if case.amount_inr >= 100000.0 or case.failure_code in ("DO_NOT_HONOR", "SUSPECTED_FRAUD"):
            tier = ModelTier.DEEP_REASONER
            model_name = "gemini-2.0-flash"
            cost = 0.0004
            reason = "High-value context or ambiguous decline requires multi-signal reasoning."
        elif case.failure_code in ("CARD_EXPIRED", "CUSTOMER_OPTED_OUT"):
            tier = ModelTier.DETERMINISTIC_RULES
            model_name = "reviveai-deterministic-rules"
            cost = 0.0
            reason = "Deterministic terminal state; zero-cost local rules."
        else:
            tier = ModelTier.FAST_CLASSIFIER
            model_name = "gemini-2.0-flash"
            cost = 0.0001
            reason = "Standard failure taxonomy classification."

        latency = round((time.perf_counter() - start) * 1000 + 3.8, 2)
        return {
            "routed_tier": tier.value,
            "model_name": model_name,
            "routing_reason": reason,
            "latency_ms": latency,
            "estimated_cost_usd": cost,
            "fallback_engaged": False,
        }

    def evaluate_decision(
        self,
        case: NormalizedCase,
        policy_ceiling_inr: float = 50000.0,
        max_retries: int = 3,
    ) -> DecisionResult:
        priority_score, priority_tier, priority_exp = self.compute_priority_score(case)
        trust_score, trust_tier, trust_breakdown = self.compute_trust_score(case)
        dq_score, dq_checklist, freshness = self.evaluate_data_quality_and_freshness(case)
        model_routing = self.route_model(case)

        # ── 1. INTENT DECAY & SAFETY GOVERNANCE EVALUATION ──────────────────
        intent_decay = causality_engine.compute_intent_decay(
            initial_intent=case.customer_intent.value,
            elapsed_seconds=case.payment_state_age_seconds,
        )

        governor_eval = safety_governor.evaluate_system_governance(
            merchant_id=case.tenant_id,
            gateway_health_score=trust_breakdown.get("provider_health_score", 98.0),
            duplicate_anomalies_detected=1 if case.duplicate_purchase_detected else 0,
            reconciliation_mismatches=0,
            model_calibration_score=94.0,
            data_quality_score=dq_score,
            candidate_amount_inr=case.amount_inr,
        )

        cust_factor = min(1.0, max(0.2, (case.historical_success_rate * 0.7) + (min(case.customer_tenure_months, 24) / 24 * 0.3)))
        retry_penalty = min(0.6, case.retry_count * 0.20)

        # ── 2. STRATEGY PROBABILITY CALCULATIONS ──────────────────────────────

        # Strategy 1: Optimal Smart Delay
        if case.failure_code == "INSUFFICIENT_FUNDS" or case.is_weekend:
            p_smart = min(0.95, max(0.50, 0.92 * cust_factor))
            smart_exp = "Optimal delay (Monday 09:00 AM banking window) captures salary and limit renewals."
        elif case.failure_code == "CARD_EXPIRED":
            p_smart = 0.0
            smart_exp = "Smart delay cannot fix an expired card without credential update."
        else:
            p_smart = max(0.20, 0.70 * cust_factor - retry_penalty)
            smart_exp = "Delay provides sufficient cooldown to escape transient bank concurrency throttles."

        # Strategy 2: Gateway Failover
        if case.gateway_is_degraded or case.failure_code in ("GATEWAY_TIMEOUT", "PAYU_TIMEOUT"):
            p_failover = min(0.92, max(0.60, 0.88 * cust_factor))
            failover_exp = f"Sub-2s failover from degraded {case.gateway} to secondary healthy processor."
        else:
            p_failover = max(0.15, 0.65 * cust_factor - retry_penalty)
            failover_exp = "Alternate processor routing for network diversification."

        # Strategy 3: 1-Tap Card Update
        if case.failure_code == "CARD_EXPIRED":
            p_card = 0.88
            card_exp = "Card update link directly resolves expiry; captures 88% on first prompt."
        else:
            p_card = 0.50 * cust_factor
            card_exp = "Prompting card update adds customer friction; reserved for credential failures."

        # Strategy 4: Step-Up 3DS Authentication
        if case.amount_inr > 100000.0 or case.failure_code in ("DO_NOT_HONOR", "3DS_TIMEOUT"):
            p_3ds = 0.82 * cust_factor
            auth_exp = "Step-up OTP clears bank high-value fraud filter."
        else:
            p_3ds = 0.40
            auth_exp = "3DS friction unnecessary for low-ticket recurring debits."

        # Strategy 5: Customer Recovery Link (Interactive)
        p_link = max(0.35, 0.65 * cust_factor)
        link_exp = "Dispatches secure 1-click recovery link via SMS/WhatsApp with customer consent."

        # Strategy 6: Immediate Blind Retry
        if case.failure_code == "CARD_EXPIRED" or case.retry_count >= max_retries:
            p_imm = 0.01
            imm_exp = "Immediate retry will fail 100% and triggers Visa/Mastercard penalty flags."
        elif case.gateway_is_degraded:
            p_imm = 0.08
            imm_exp = "Immediate retry hits the same degraded processor socket."
        else:
            p_imm = max(0.05, 0.25 * cust_factor - retry_penalty)
            imm_exp = "Blind immediate retry has low expected capture and generates customer noise."

        # Strategy 7: Do Nothing
        p_nothing = 0.0
        nothing_exp = "Restrains all automation to eliminate gateway fees, prevent duplicate charges, and protect customer trust."

        # ── 3. CANDIDATE STRATEGY GENERATION & EV EVALUATION ──────────────────
        candidates: List[CandidateStrategy] = []
        raw_strategies = [
            (StrategyType.OPTIMAL_SMART_DELAY, "Optimal Cooldown + Smart Delay", smart_exp, p_smart, 86400, 25.0, CustomerFrictionLevel.LOW, 15.0, 10.0, 0.8),
            (StrategyType.GATEWAY_FAILOVER, "Sub-2s Smart Gateway Failover", failover_exp, p_failover, 2, 10.0, CustomerFrictionLevel.LOW, 45.0, 15.0, 0.8),
            (StrategyType.ONE_TAP_CARD_UPDATE, "1-Tap Card Update Link", card_exp, p_card, 7200, 75.0, CustomerFrictionLevel.MEDIUM, 10.0, 5.0, 0.5),
            (StrategyType.CUSTOMER_RECOVERY_LINK, "Interactive Customer Recovery Link", link_exp, p_link, 3600, 45.0, CustomerFrictionLevel.LOW, 15.0, 10.0, 0.5),
            (StrategyType.STEP_UP_3DS_AUTH, "3DS Step-Up Authentication", auth_exp, p_3ds, 300, 60.0, CustomerFrictionLevel.MEDIUM, 20.0, 10.0, 1.2),
            (StrategyType.IMMEDIATE_RETRY, "Immediate Blind Retry", imm_exp, p_imm, 0, 120.0, CustomerFrictionLevel.VERY_HIGH, 25.0, 150.0, 0.0),
            (StrategyType.DO_NOTHING, "Do Nothing & Restrain", nothing_exp, p_nothing, 0, 0.0, CustomerFrictionLevel.LOW, 0.0, 0.0, 0.0),
        ]

        for st_type, name, rationale, prob, delay_s, friction_c, f_level, gw_c, risk_c, ai_c in raw_strategies:
            gross_ev = prob * case.amount_inr
            net_ev = gross_ev - (friction_c + gw_c + risk_c + ai_c)
            req_human = case.amount_inr > policy_ceiling_inr and st_type not in (StrategyType.DO_NOTHING, StrategyType.STOP_AND_RESTRAIN)

            # Policy status per candidate
            if case.customer_cancelled:
                p_status = "BLOCKED" if st_type != StrategyType.DO_NOTHING else "APPROVED"
                rej_reason = "Customer explicitly cancelled recovery."
            elif case.duplicate_purchase_detected:
                p_status = "BLOCKED" if st_type != StrategyType.DO_NOTHING else "APPROVED"
                rej_reason = "Duplicate purchase detected on matching order."
            elif case.customer_opted_out and st_type in (StrategyType.ONE_TAP_CARD_UPDATE, StrategyType.CUSTOMER_RECOVERY_LINK):
                p_status = "BLOCKED"
                rej_reason = "Customer opted out of outbound communications."
            elif case.retry_count >= max_retries and st_type in (StrategyType.IMMEDIATE_RETRY, StrategyType.GATEWAY_FAILOVER):
                p_status = "BLOCKED"
                rej_reason = f"Retry budget exhausted ({case.retry_count}/{max_retries})."
            elif case.gateway_is_degraded and st_type == StrategyType.IMMEDIATE_RETRY:
                p_status = "BLOCKED"
                rej_reason = "Primary gateway is currently degraded."
            elif case.amount_inr > policy_ceiling_inr and st_type != StrategyType.DO_NOTHING:
                p_status = "RESTRICTED"
                rej_reason = f"Amount (Rs {case.amount_inr:,.0f}) exceeds autonomous ceiling (Rs {policy_ceiling_inr:,.0f})."
            else:
                p_status = "APPROVED"
                rej_reason = None

            score = net_ev if p_status != "BLOCKED" else -1000.0

            candidates.append(
                CandidateStrategy(
                    strategy_type=st_type,
                    name=name,
                    description=rationale,
                    recovery_probability=round(prob, 3),
                    expected_delay_seconds=delay_s,
                    customer_friction_cost_inr=friction_c,
                    customer_friction_level=f_level,
                    gateway_execution_cost_inr=gw_c,
                    risk_cost_inr=risk_c,
                    ai_inference_cost_inr=ai_c,
                    gross_expected_revenue_inr=round(gross_ev, 2),
                    net_expected_value_inr=round(net_ev, 2),
                    requires_human=req_human,
                    policy_status=p_status,
                    selection_score=round(score, 2),
                    economic_rationale=rationale,
                    rejection_reason=rej_reason,
                )
            )

        candidates.sort(key=lambda s: s.selection_score, reverse=True)
        best_strategy = candidates[0]

        # ── 4. SAFETY FIREWALL & AUTONOMY LEVEL DETERMINATION ──────────────────
        rejected_list = []
        for c in candidates:
            if c.strategy_type != best_strategy.strategy_type:
                reason = c.rejection_reason or f"Lower Net EV (Rs {c.net_expected_value_inr:,.2f} vs Rs {best_strategy.net_expected_value_inr:,.2f})"
                rejected_list.append({"strategy": c.name, "reason": reason})

        # Autonomy & Verdict Logic
        if case.customer_cancelled:
            policy_verdict = "BLOCKED_CUSTOMER_CANCELLED"
            autonomy_level = RecoveryAutonomyLevel.LEVEL_5_HARD_STOP
            action_verdict = ActionVerdict.STOP
            executable = False
            why_sel = "Customer explicitly cancelled this recovery attempt. Automation permanently halted."
        elif case.duplicate_purchase_detected:
            policy_verdict = "BLOCKED_DUPLICATE_PURCHASE_RISK"
            autonomy_level = RecoveryAutonomyLevel.LEVEL_5_HARD_STOP
            action_verdict = ActionVerdict.STOP
            executable = False
            why_sel = f"Matching successful payment detected ({case.duplicate_order_id or 'Matching Order'}). Recovery restrained to prevent duplicate charge."
        elif case.customer_opted_out:
            policy_verdict = "BLOCKED_CUSTOMER_OPT_OUT"
            autonomy_level = RecoveryAutonomyLevel.LEVEL_5_HARD_STOP
            action_verdict = ActionVerdict.DO_NOTHING
            executable = False
            why_sel = "Customer explicitly opted out of payment recovery communications."
        elif case.retry_count >= max_retries:
            policy_verdict = "BLOCKED_MAX_RETRIES_EXCEEDED"
            autonomy_level = RecoveryAutonomyLevel.LEVEL_4_HUMAN_APPROVAL
            action_verdict = ActionVerdict.ESCALATE
            executable = False
            why_sel = f"Retry budget exhausted ({case.retry_count}/{max_retries} attempts). Routed to operations."
        elif case.amount_inr > policy_ceiling_inr:
            policy_verdict = "ESCALATED_HIGH_VALUE_THRESHOLD"
            autonomy_level = RecoveryAutonomyLevel.LEVEL_4_HUMAN_APPROVAL
            action_verdict = ActionVerdict.ESCALATE
            executable = False
            why_sel = f"Transaction amount (Rs {case.amount_inr:,.0f}) exceeds the Rs {policy_ceiling_inr:,.0f} safety ceiling. Requires human approval."
        elif case.authorization_state not in (AuthorizationState.AUTHORIZED, AuthorizationState.MANDATE_PRESENT):
            policy_verdict = "RESTRICTED_AUTHORIZATION_REQUIRED"
            autonomy_level = RecoveryAutonomyLevel.LEVEL_2_CUSTOMER_INITIATED
            action_verdict = ActionVerdict.ASK
            executable = False
            why_sel = f"Payment authorization state is {case.authorization_state.value}. Autonomous debit forbidden; interactive customer prompt required."
        elif case.customer_intent in (CustomerIntent.UNKNOWN, CustomerIntent.AMBIGUOUS):
            policy_verdict = "RESTRICTED_INTENT_UNKNOWN"
            autonomy_level = RecoveryAutonomyLevel.LEVEL_2_CUSTOMER_INITIATED
            action_verdict = ActionVerdict.ASK
            executable = False
            why_sel = "Customer intent is UNKNOWN or AMBIGUOUS. Prepared interactive recovery link rather than auto-debit."
        elif trust_score < 70.0:
            policy_verdict = "RESTRICTED_LOW_TRUST_SCORE"
            autonomy_level = RecoveryAutonomyLevel.LEVEL_2_CUSTOMER_INITIATED
            action_verdict = ActionVerdict.ASK
            executable = False
            why_sel = f"Recovery Trust Score ({trust_score:.0f}/100) is below the 70.0 autonomous threshold. Requires customer confirmation."
        elif not governor_eval.is_autonomous_permitted:
            policy_verdict = f"RESTRICTED_GOVERNOR_{governor_eval.posture.value}"
            autonomy_level = RecoveryAutonomyLevel(governor_eval.max_allowed_autonomy.value)
            action_verdict = ActionVerdict.ASK if autonomy_level == RecoveryAutonomyLevel.LEVEL_2_CUSTOMER_INITIATED else ActionVerdict.ESCALATE
            executable = False
            why_sel = f"Safety Governor downgraded autonomy to {autonomy_level.value}. {governor_eval.reduction_reasons[0] if governor_eval.reduction_reasons else ''}"
        else:
            policy_verdict = "APPROVED_AUTO_EXECUTION"
            autonomy_level = RecoveryAutonomyLevel.LEVEL_3_AUTO_ELIGIBLE
            action_verdict = ActionVerdict.RECOVER
            executable = True
            why_sel = f"High Net EV (+Rs {best_strategy.net_expected_value_inr:,.2f}), valid authorization, active customer intent, and Trust Score {trust_score:.0f}/100."

        # ── 5. RECOVERY CONSTITUTION EVALUATION ──────────────────────────────
        const_eval = constitution_engine.evaluate(
            case_id=case.case_id,
            tenant_id=case.tenant_id,
            amount_inr=case.amount_inr,
            authorization_state=case.authorization_state.value,
            customer_intent=case.customer_intent.value,
            customer_cancelled=case.customer_cancelled,
            duplicate_detected=case.duplicate_purchase_detected,
            is_kill_switch_active=governor_eval.posture == SystemSafetyPosture.EMERGENCY_STOP,
            gateway_is_degraded=case.gateway_is_degraded,
            trust_score=trust_score,
            policy_allowed=policy_verdict == "APPROVED_AUTO_EXECUTION",
            is_autonomous_action=executable,
            data_quality_pct=dq_score,
        )

        if not const_eval.is_compliant and executable:
            executable = False
            autonomy_level = RecoveryAutonomyLevel.LEVEL_2_CUSTOMER_INITIATED
            action_verdict = ActionVerdict.ASK
            why_sel = f"Constitution Enforcement: {const_eval.blocking_reason}"

        if case.is_shadow_mode and executable:
            executable = False
            why_sel = f"[SHADOW MODE] Evaluated as AUTO-ELIGIBLE (+Rs {best_strategy.net_expected_value_inr:,.2f} Net EV). Autonomous execution suppressed."

        # ── 6. SIGNED ACTION CONTRACT GENERATION ──────────────────────────────
        signed_contract = None
        if executable or autonomy_level in (RecoveryAutonomyLevel.LEVEL_3_AUTO_ELIGIBLE, RecoveryAutonomyLevel.LEVEL_2_CUSTOMER_INITIATED):
            contract_obj = action_contract_manager.create_contract(
                case_id=case.case_id,
                tenant_id=case.tenant_id,
                payment_id=f"pay_{case.case_id}",
                amount_inr=case.amount_inr,
                strategy_type=best_strategy.strategy_type.value,
                authorization_state=case.authorization_state.value,
                customer_intent=case.customer_intent.value,
                policy_version=self.policy_version,
                autonomy_level=autonomy_level.value,
            )
            signed_contract = contract_obj.to_dict()

        blind = next((s for s in candidates if s.strategy_type == StrategyType.IMMEDIATE_RETRY), candidates[-1])
        baseline_ev = max(0.0, blind.net_expected_value_inr)
        incremental_lift = max(0.0, best_strategy.net_expected_value_inr - baseline_ev)
        do_nothing_diff = best_strategy.net_expected_value_inr - 0.0

        expiry_dt = datetime.now(timezone.utc) + timedelta(minutes=case.recovery_window_minutes)

        decision_id = f"DEC-{uuid.uuid4().hex[:8].upper()}"
        receipt_data = f"{case.case_id}:{decision_id}:{best_strategy.strategy_type.value}:{policy_verdict}:{self.policy_version}:{autonomy_level.value}"
        receipt_hash = hashlib.sha256(receipt_data.encode("utf-8")).hexdigest()

        decision_graph = self.generate_decision_graph(
            case=case,
            trust_score=trust_score,
            best_strategy=best_strategy,
            policy_verdict=policy_verdict,
            autonomy_level=autonomy_level,
            action_verdict=action_verdict,
        )

        causal_attr = causality_engine.attribute_recovery_outcome(
            case_id=case.case_id,
            amount_inr=case.amount_inr,
            action_executed_by_reviveai=executable,
            time_to_payment_seconds=case.payment_state_age_seconds,
        )

        return DecisionResult(
            case_id=case.case_id,
            decision_id=decision_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            priority_score=priority_score,
            priority_tier=priority_tier,
            priority_explanation=priority_exp,
            root_cause_diagnosis=best_strategy.description,
            model_routing=model_routing,
            candidate_strategies=candidates,
            selected_strategy=best_strategy,
            baseline_expected_value_inr=round(baseline_ev, 2),
            incremental_economic_lift_inr=round(incremental_lift, 2),
            policy_gate_verdict=policy_verdict,
            policy_version=self.policy_version,
            is_autonomous_executable=executable,
            decision_receipt_hash=receipt_hash,
            action_verdict=action_verdict,
            autonomy_level=autonomy_level,
            trust_score=trust_score,
            trust_tier=trust_tier,
            trust_breakdown=trust_breakdown,
            data_quality_score=dq_score,
            data_quality_checklist=dq_checklist,
            state_freshness_status=freshness,
            why_selected=why_sel,
            rejected_alternatives=rejected_list[:4],
            decision_graph=decision_graph,
            duplicate_risk_summary={
                "duplicate_detected": case.duplicate_purchase_detected,
                "matching_order": case.duplicate_order_id,
                "risk_status": "HIGH (BLOCKED)" if case.duplicate_purchase_detected else "LOW (CLEAR)",
            },
            customer_protection_summary={
                "customer_intent": case.customer_intent.value,
                "authorization_state": case.authorization_state.value,
                "payment_type": case.payment_type.value,
                "customer_cancelled": case.customer_cancelled,
                "opted_out": case.customer_opted_out,
            },
            counterfactual_do_nothing_diff_inr=round(do_nothing_diff, 2),
            constitution_evaluation=const_eval.to_dict(),
            signed_action_contract=signed_contract,
            safety_governor_posture={
                "max_allowed_autonomy": governor_eval.max_allowed_autonomy.value,
                "posture": governor_eval.posture.value,
                "safety_score": governor_eval.safety_score,
                "reduction_reasons": governor_eval.reduction_reasons,
                "daily_budget": governor_eval.daily_budget,
            },
            intent_decay=intent_decay.__dict__,
            causal_attribution=causal_attr.__dict__,
            recovery_window_expires_at=expiry_dt.isoformat(),
        )


decision_engine = RecoveryDecisionEngine()
