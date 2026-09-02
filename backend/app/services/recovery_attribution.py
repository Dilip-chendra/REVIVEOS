"""
ReviveOS — Incremental Recovery Attribution & ROS Engine
========================================================
Distinguishes between:
  1. Gross Recovery
  2. Incremental Recovery (Observed - Natural)
  3. Profitable Recovery (Net Incremental Contribution / NIC)

Calculates the Recovery Opportunity Score (ROS) for priority queue ranking.
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from app.services.natural_recovery import natural_recovery_engine, NaturalRecoveryModelType


class AttributionStatus(str, Enum):
    ESTIMATED = "ESTIMATED"
    OBSERVED = "OBSERVED"
    VALIDATED = "VALIDATED"


@dataclass
class RecoveryOpportunityScore:
    case_id: str
    amount_inr: float
    p_natural_recovery: float
    p_intervention_recovery: float
    causal_lift: float                 # tau = max(0, p_interv - p_natural)
    expected_gross_recovery_inr: float
    expected_incremental_recovery_inr: float
    intervention_cost_inr: float
    discount_cost_inr: float
    friction_cost_inr: float
    expected_nic_inr: float            # (tau * amount) - costs
    ros_score: float                   # 0.0 to 100.0 priority score
    urgency_level: str                 # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    customer_intent: str
    recommended_decision: str          # "MANDATE_RETRY", "PAYMENT_LINK", "WAIT", "DO_NOT_INTERVENE", "HUMAN_REVIEW"
    decision_rationale: str
    is_profitable: bool
    requires_human: bool

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RecoveryOutcomeAttribution:
    outcome_id: str
    case_id: str
    tenant_id: str
    payment_id: str
    action_type: str
    status: AttributionStatus
    gross_at_risk_inr: float
    natural_recovery_estimate_inr: float
    observed_recovery_inr: float
    incremental_recovery_inr: float
    intervention_cost_inr: float
    discount_cost_inr: float
    friction_cost_inr: float
    net_incremental_contribution_inr: float
    attribution_method: str
    model_version: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class RecoveryAttributionEngine:
    MODEL_VERSION = "REVIVEOS-ATTRIBUTION-2026-09"

    def score_opportunity(self, case: Dict[str, Any]) -> RecoveryOpportunityScore:
        cid = str(case.get("id", "OPP-000"))
        amount = float(case.get("amount_inr", 0.0))
        customer_intent = str(case.get("customer_intent", "ACTIVE")).upper()
        customer_opted_out = bool(case.get("customer_opted_out", False))

        # 1. Natural Recovery Estimate
        nat_est = natural_recovery_engine.estimate_natural_recovery(
            case, model_type=NaturalRecoveryModelType.ML_CALIBRATED
        )
        p_natural = nat_est.p_natural_recovery

        # 2. Estimate Intervention Probability based on failure and payment type
        p_intervention = float(case.get("recovery_probability", 0.70))
        if case.get("strategy_type") == "SCHEDULE_MANDATE_RETRY" or case.get("case_type") == "subscription_failure":
            p_intervention = min(0.92, max(p_natural, 0.72))
        elif case.get("case_type") == "checkout_abandonment":
            p_intervention = min(0.85, max(p_natural, 0.58))

        if customer_opted_out or customer_intent == "CANCELLED":
            p_intervention = 0.0

        # 3. Causal Lift (tau)
        causal_lift = max(0.0, p_intervention - p_natural)

        # 4. Economic Costs
        intervention_cost = float(case.get("intervention_cost_inr", 15.0 if p_intervention > 0 else 0.0))
        discount_cost = float(case.get("discount_cost_inr", 0.0))
        friction_cost = float(case.get("friction_cost_inr", 5.0 if p_intervention > 0 else 0.0))

        expected_gross = round(p_intervention * amount, 2)
        expected_incremental = round(causal_lift * amount, 2)
        expected_nic = round(expected_incremental - intervention_cost - discount_cost - friction_cost, 2)

        # 5. Urgency Calculation
        days_overdue = int(case.get("invoice_days_overdue", case.get("days_since_last_success", 0)))
        if days_overdue >= 7 or (amount > 25000 and causal_lift > 0.3):
            urgency = "CRITICAL"
            urgency_weight = 1.35
        elif days_overdue >= 3 or amount > 10000:
            urgency = "HIGH"
            urgency_weight = 1.15
        elif days_overdue >= 1:
            urgency = "MEDIUM"
            urgency_weight = 1.0
        else:
            urgency = "LOW"
            urgency_weight = 0.85

        # 6. Intent multiplier
        intent_map = {
            "CONFIRMED": 1.25,
            "ACTIVE": 1.0,
            "AMBIGUOUS": 0.70,
            "UNKNOWN": 0.50,
            "EXPIRED": 0.10,
            "CANCELLED": 0.0,
        }
        intent_weight = intent_map.get(customer_intent, 0.5)

        # 7. Recovery Opportunity Score (ROS)
        # Bounded between 0 and 100
        raw_ros = (causal_lift * 60.0) + (intent_weight * 20.0) + (urgency_weight * 15.0) + (nat_est.confidence * 5.0)
        if expected_nic < 0:
            raw_ros *= 0.30  # Strong penalty for negative economic value
        if customer_opted_out:
            raw_ros = 0.0

        ros_score = max(0.0, min(100.0, round(raw_ros, 1)))

        # 8. Recommendation
        if customer_opted_out or customer_intent == "CANCELLED":
            rec_action = "DO_NOT_CONTACT"
            rationale = "Customer has exercised sovereignty / opted out. Outreach permanently blocked."
            requires_human = False
        elif p_natural >= 0.82 and causal_lift < 0.08:
            rec_action = "WAIT"
            rationale = (
                f"Natural recovery is high ({p_natural:.1%}) with negligible incremental lift ({causal_lift:.1%}). "
                f"Abstention preserves gross margin and customer attention."
            )
            requires_human = False
        elif expected_nic < 0:
            rec_action = "DO_NOT_INTERVENE"
            rationale = f"Negative expected NIC (₹{expected_nic:,.0f}). Cost exceeds incremental lift."
            requires_human = False
        elif amount > 50000 or customer_intent == "AMBIGUOUS":
            rec_action = "HUMAN_REVIEW"
            rationale = f"High ticket value (₹{amount:,.0f}) or ambiguous intent requires human governance sign-off."
            requires_human = True
        elif case.get("case_type") == "subscription_failure":
            rec_action = "MANDATE_RETRY"
            rationale = f"High incremental lift (+{causal_lift:.1%}) and positive NIC (+₹{expected_nic:,.0f}). Scheduled off-peak S2S retry."
            requires_human = False
        else:
            rec_action = "PAYMENT_LINK"
            rationale = f"Positive incremental contribution (+₹{expected_nic:,.0f}). Dispatching 1-Tap Razorpay payment link via WhatsApp."
            requires_human = False

        return RecoveryOpportunityScore(
            case_id=cid,
            amount_inr=amount,
            p_natural_recovery=p_natural,
            p_intervention_recovery=p_intervention,
            causal_lift=round(causal_lift, 4),
            expected_gross_recovery_inr=expected_gross,
            expected_incremental_recovery_inr=expected_incremental,
            intervention_cost_inr=intervention_cost,
            discount_cost_inr=discount_cost,
            friction_cost_inr=friction_cost,
            expected_nic_inr=expected_nic,
            ros_score=ros_score,
            urgency_level=urgency,
            customer_intent=customer_intent,
            recommended_decision=rec_action,
            decision_rationale=rationale,
            is_profitable=expected_nic > 0,
            requires_human=requires_human,
        )

    def attribute_outcome(
        self,
        case: Dict[str, Any],
        observed_recovered_inr: float,
        action_type: str,
        intervention_cost_inr: float = 15.0,
        discount_cost_inr: float = 0.0,
        friction_cost_inr: float = 5.0,
    ) -> RecoveryOutcomeAttribution:
        cid = str(case.get("id", "UNKNOWN"))
        tid = str(case.get("merchant_id", "MERCH-001"))
        pid = str(case.get("payment_id", f"pay_{cid}"))
        gross_at_risk = float(case.get("amount_inr", observed_recovered_inr))

        # Compute natural recovery baseline expectation
        nat_est = natural_recovery_engine.estimate_natural_recovery(
            case, model_type=NaturalRecoveryModelType.ML_CALIBRATED
        )
        natural_expected_inr = round(nat_est.p_natural_recovery * gross_at_risk, 2)

        if observed_recovered_inr > 0:
            incremental_recovered = max(0.0, round(observed_recovered_inr - natural_expected_inr, 2))
            nic = round(incremental_recovered - intervention_cost_inr - discount_cost_inr - friction_cost_inr, 2)
            status = AttributionStatus.OBSERVED
        else:
            incremental_recovered = 0.0
            nic = -round(intervention_cost_inr + discount_cost_inr + friction_cost_inr, 2)
            status = AttributionStatus.VALIDATED

        import uuid
        return RecoveryOutcomeAttribution(
            outcome_id=f"out_{uuid.uuid4().hex[:10]}",
            case_id=cid,
            tenant_id=tid,
            payment_id=pid,
            action_type=action_type,
            status=status,
            gross_at_risk_inr=gross_at_risk,
            natural_recovery_estimate_inr=natural_expected_inr,
            observed_recovery_inr=observed_recovered_inr,
            incremental_recovery_inr=incremental_recovered,
            intervention_cost_inr=intervention_cost_inr,
            discount_cost_inr=discount_cost_inr,
            friction_cost_inr=friction_cost_inr,
            net_incremental_contribution_inr=nic,
            attribution_method="COUNTERFACTUAL_INCREMENTAL_DIFFERENCE",
            model_version=self.MODEL_VERSION,
        )


recovery_attribution_engine = RecoveryAttributionEngine()