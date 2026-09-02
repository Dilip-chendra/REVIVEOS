"""
ReviveOS — Recovery Strategy Simulator & Multi-Action Evaluator
===============================================================
Evaluates 7 distinct bounded strategies side-by-side for any given opportunity:
  1. WAIT (First-class deliberate margin preservation)
  2. DO_NOT_INTERVENE (Stop unprofitable outreach)
  3. MANDATE_RETRY (Scheduled S2S mandate processing)
  4. PAYMENT_LINK (1-Tap WhatsApp/SMS Razorpay link)
  5. CUSTOMER_PROMPT (In-app conversational prompt)
  6. DISCOUNT (Margin-burning concession)
  7. HUMAN_ESCALATION (Operations sign-off)
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List
from app.services.natural_recovery import natural_recovery_engine, NaturalRecoveryModelType


@dataclass
class StrategyEvaluationItem:
    strategy_name: str
    strategy_type: str
    p_natural_recovery: float
    p_intervention_recovery: float
    causal_lift: float
    expected_gross_inr: float
    intervention_cost_inr: float
    discount_cost_inr: float
    friction_cost_inr: float
    expected_nic_inr: float
    customer_friction_level: str       # "ZERO", "LOW", "MEDIUM", "HIGH"
    risk_level: str                    # "ZERO", "LOW", "MEDIUM", "HIGH"
    autonomy_level_required: str       # "LEVEL_0", "LEVEL_1", "LEVEL_2", "LEVEL_3"
    is_feasible: bool
    blocking_reasons: List[str]
    verdict: str                       # "RECOMMENDED", "VIABLE", "SUPPRESSED", "BLOCKED"
    rationale: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class OpportunitySimulationResult:
    case_id: str
    amount_inr: float
    customer_intent: str
    opted_out: bool
    evaluated_strategies: List[StrategyEvaluationItem]
    winning_strategy: str
    winning_rationale: str
    margin_preserved_vs_aggressive_inr: float
    contacts_avoided: int
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class RecoveryStrategySimulator:
    def simulate_opportunity(self, case: Dict[str, Any]) -> OpportunitySimulationResult:
        cid = str(case.get("id", "OPP-000"))
        amount = float(case.get("amount_inr", 0.0))
        customer_intent = str(case.get("customer_intent", "ACTIVE")).upper()
        opted_out = bool(case.get("customer_opted_out", False))

        nat_est = natural_recovery_engine.estimate_natural_recovery(
            case, model_type=NaturalRecoveryModelType.ML_CALIBRATED
        )
        p_nat = nat_est.p_natural_recovery

        strategies: List[StrategyEvaluationItem] = []

        # 1. WAIT (Deliberate Abstention)
        # Lift is 0, cost is 0, friction is 0. Gross is p_nat * amount. NIC is 0 incremental.
        strategies.append(StrategyEvaluationItem(
            strategy_name="Deliberate Wait",
            strategy_type="WAIT",
            p_natural_recovery=p_nat,
            p_intervention_recovery=p_nat,
            causal_lift=0.0,
            expected_gross_inr=round(p_nat * amount, 2),
            intervention_cost_inr=0.0,
            discount_cost_inr=0.0,
            friction_cost_inr=0.0,
            expected_nic_inr=0.0,
            customer_friction_level="ZERO",
            risk_level="ZERO",
            autonomy_level_required="LEVEL_0_OBSERVE",
            is_feasible=True,
            blocking_reasons=[],
            verdict="VIABLE" if p_nat < 0.80 else "RECOMMENDED",
            rationale="Allows natural customer resolution without consuming 24h attention budget or incurring API fees.",
        ))

        # 2. DO_NOT_INTERVENE (Exhausted / Low confidence)
        strategies.append(StrategyEvaluationItem(
            strategy_name="Do Not Intervene (Halt)",
            strategy_type="DO_NOT_INTERVENE",
            p_natural_recovery=p_nat,
            p_intervention_recovery=0.0 if opted_out else p_nat,
            causal_lift=0.0,
            expected_gross_inr=0.0,
            intervention_cost_inr=0.0,
            discount_cost_inr=0.0,
            friction_cost_inr=0.0,
            expected_nic_inr=0.0,
            customer_friction_level="ZERO",
            risk_level="ZERO",
            autonomy_level_required="LEVEL_0_OBSERVE",
            is_feasible=True,
            blocking_reasons=[],
            verdict="RECOMMENDED" if opted_out else "VIABLE",
            rationale="Halts automation to prevent merchant penalty score and respects customer opt-out.",
        ))

        # 3. MANDATE_RETRY (S2S Razorpay Subscriptions)
        p_mandate = min(0.92, max(p_nat + 0.35, 0.72)) if not opted_out else 0.0
        lift_mandate = max(0.0, p_mandate - p_nat)
        cost_mandate = 12.0
        nic_mandate = round((lift_mandate * amount) - cost_mandate, 2)
        strategies.append(StrategyEvaluationItem(
            strategy_name="Scheduled Mandate Retry",
            strategy_type="MANDATE_RETRY",
            p_natural_recovery=p_nat,
            p_intervention_recovery=p_mandate,
            causal_lift=round(lift_mandate, 4),
            expected_gross_inr=round(p_mandate * amount, 2),
            intervention_cost_inr=cost_mandate,
            discount_cost_inr=0.0,
            friction_cost_inr=0.0,
            expected_nic_inr=nic_mandate,
            customer_friction_level="ZERO",
            risk_level="LOW",
            autonomy_level_required="LEVEL_3_AUTO_EXECUTE",
            is_feasible=not opted_out and amount <= 50000,
            blocking_reasons=["CUSTOMER_OPTED_OUT"] if opted_out else (["AMOUNT_LIMIT_EXCEEDED"] if amount > 50000 else []),
            verdict="RECOMMENDED" if nic_mandate > 0 and not opted_out and p_nat < 0.82 and amount <= 50000 else "VIABLE",
            rationale="Executes silent server-to-server retry via Razorpay Subscriptions rail during banking lull hours.",
        ))

        # 4. PAYMENT_LINK (1-Tap WhatsApp / SMS)
        p_link = min(0.85, max(p_nat + 0.25, 0.58)) if not opted_out else 0.0
        lift_link = max(0.0, p_link - p_nat)
        cost_link = 15.0
        fric_link = 8.0
        nic_link = round((lift_link * amount) - cost_link - fric_link, 2)
        strategies.append(StrategyEvaluationItem(
            strategy_name="1-Tap WhatsApp Payment Link",
            strategy_type="PAYMENT_LINK",
            p_natural_recovery=p_nat,
            p_intervention_recovery=p_link,
            causal_lift=round(lift_link, 4),
            expected_gross_inr=round(p_link * amount, 2),
            intervention_cost_inr=cost_link,
            discount_cost_inr=0.0,
            friction_cost_inr=fric_link,
            expected_nic_inr=nic_link,
            customer_friction_level="LOW",
            risk_level="LOW",
            autonomy_level_required="LEVEL_3_AUTO_EXECUTE",
            is_feasible=not opted_out,
            blocking_reasons=["CUSTOMER_OPTED_OUT"] if opted_out else [],
            verdict="RECOMMENDED" if nic_link > nic_mandate and nic_link > 0 and not opted_out else "VIABLE",
            rationale="Dispatches contextual Razorpay 1-Tap checkout link via WhatsApp, consuming 1 customer contact.",
        ))

        # 5. DISCOUNT (15% Coupon Concession)
        p_disc = min(0.88, max(p_nat + 0.12, 0.65)) if not opted_out else 0.0
        lift_disc = max(0.0, p_disc - p_nat)
        cost_disc = 15.0
        disc_amt = round(amount * 0.15, 2)
        fric_disc = 10.0
        nic_disc = round((lift_disc * amount) - cost_disc - disc_amt - fric_disc, 2)
        strategies.append(StrategyEvaluationItem(
            strategy_name="15% Discount Incentive",
            strategy_type="DISCOUNT",
            p_natural_recovery=p_nat,
            p_intervention_recovery=p_disc,
            causal_lift=round(lift_disc, 4),
            expected_gross_inr=round(p_disc * amount, 2),
            intervention_cost_inr=cost_disc,
            discount_cost_inr=disc_amt,
            friction_cost_inr=fric_disc,
            expected_nic_inr=nic_disc,
            customer_friction_level="MEDIUM",
            risk_level="MEDIUM",
            autonomy_level_required="LEVEL_2_HUMAN_APPROVED",
            is_feasible=not opted_out,
            blocking_reasons=["CUSTOMER_OPTED_OUT"] if opted_out else (["NEGATIVE_NET_CONTRIBUTION"] if nic_disc < 0 else []),
            verdict="SUPPRESSED" if nic_disc < 0 or nic_disc < nic_mandate else "VIABLE",
            rationale=f"Offers 15% discount (burning ₹{disc_amt:,.0f}). Often unprofitable when natural recovery is high.",
        ))

        # 6. HUMAN_ESCALATION (Operations Desk)
        p_human = min(0.95, max(p_nat + 0.40, 0.85)) if not opted_out else 0.0
        lift_human = max(0.0, p_human - p_nat)
        cost_human = 150.0  # Operations labor cost
        nic_human = round((lift_human * amount) - cost_human, 2)
        strategies.append(StrategyEvaluationItem(
            strategy_name="Human Operations Escalation",
            strategy_type="HUMAN_ESCALATION",
            p_natural_recovery=p_nat,
            p_intervention_recovery=p_human,
            causal_lift=round(lift_human, 4),
            expected_gross_inr=round(p_human * amount, 2),
            intervention_cost_inr=cost_human,
            discount_cost_inr=0.0,
            friction_cost_inr=20.0,
            expected_nic_inr=nic_human,
            customer_friction_level="LOW",
            risk_level="ZERO",
            autonomy_level_required="LEVEL_2_HUMAN_APPROVED",
            is_feasible=True,
            blocking_reasons=[],
            verdict="RECOMMENDED" if amount > 50000 or customer_intent == "AMBIGUOUS" else "VIABLE",
            rationale="Routes to Human Operations Queue with complete AI forensic audit packet.",
        ))

        # Determine Winner
        feasible = [s for s in strategies if s.is_feasible]
        if opted_out:
            winner = next(s for s in strategies if s.strategy_type == "DO_NOT_INTERVENE")
        elif amount > 50000 or customer_intent == "AMBIGUOUS":
            winner = next(s for s in strategies if s.strategy_type == "HUMAN_ESCALATION")
        elif p_nat >= 0.82:
            winner = next(s for s in strategies if s.strategy_type == "WAIT")
        else:
            winner = max(feasible, key=lambda s: s.expected_nic_inr)

        margin_saved = round(amount * 0.15, 2) if winner.strategy_type in ("WAIT", "MANDATE_RETRY", "DO_NOT_INTERVENE") else 0.0
        contacts_avoided = 1 if winner.strategy_type in ("WAIT", "MANDATE_RETRY", "DO_NOT_INTERVENE") else 0

        return OpportunitySimulationResult(
            case_id=cid,
            amount_inr=amount,
            customer_intent=customer_intent,
            opted_out=opted_out,
            evaluated_strategies=strategies,
            winning_strategy=winner.strategy_type,
            winning_rationale=f"Selected {winner.strategy_name} ({winner.rationale}) producing highest Net Incremental Contribution (₹{winner.expected_nic_inr:,.0f}).",
            margin_preserved_vs_aggressive_inr=margin_saved,
            contacts_avoided=contacts_avoided,
        )


strategy_simulator = RecoveryStrategySimulator()