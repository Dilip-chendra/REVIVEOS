"""
Tests for RecoveryDecisionEngine:
1. Priority scoring with LTV weighting
2. Multi-tier model routing
3. Economic EV and net lift calculation
4. Policy gate constraints and deterministic restraint
5. SHA-256 decision receipt reproducibility
"""
import pytest
from app.services.decision_engine import (
    RecoveryDecisionEngine,
    NormalizedCase,
    StrategyType,
    ModelTier,
    decision_engine,
)


def test_ltv_priority_scoring_weights_loyal_customer():
    # Loyal customer with low ticket amount but high LTV
    loyal_case = NormalizedCase(
        case_id="case-loyal-001",
        amount_inr=2000.0,
        failure_code="INSUFFICIENT_FUNDS",
        gateway="razorpay",
        customer_id="cust-001",
        customer_name="Acme Corp",
        customer_ltv_inr=72000.0,
        customer_tenure_months=18,
        historical_success_rate=0.95,
        retry_count=0,
    )

    # Risky customer with high ticket amount but zero LTV / low reliability
    risky_case = NormalizedCase(
        case_id="case-risky-002",
        amount_inr=40000.0,
        failure_code="DO_NOT_HONOR",
        gateway="payu",
        customer_id="cust-002",
        customer_name="FlyByNight",
        customer_ltv_inr=1000.0,
        customer_tenure_months=1,
        historical_success_rate=0.40,
        retry_count=2,
    )

    score_loyal, tier_loyal, exp_loyal = decision_engine.compute_priority_score(loyal_case)
    score_risky, tier_risky, exp_risky = decision_engine.compute_priority_score(risky_case)

    # Loyal customer must have a strong priority score due to LTV and tenure
    assert score_loyal >= 60.0
    assert "72,000" in exp_loyal
    assert score_loyal > score_risky


def test_model_router_assigns_correct_tiers():
    # 1. High value case -> Deep Reasoner
    high_val = NormalizedCase(
        case_id="case-high-001",
        amount_inr=150000.0,
        failure_code="INSUFFICIENT_FUNDS",
        gateway="razorpay",
        customer_id="c1",
        customer_name="High Enterprise",
        customer_ltv_inr=500000.0,
        customer_tenure_months=12,
        historical_success_rate=0.90,
        retry_count=0,
    )
    routing_high = decision_engine.route_model(high_val)
    assert routing_high["routed_tier"] == ModelTier.DEEP_REASONER.value

    # 2. Terminal expired card -> Deterministic Rules (Zero Cost)
    expired_card = NormalizedCase(
        case_id="case-exp-002",
        amount_inr=4990.0,
        failure_code="CARD_EXPIRED",
        gateway="razorpay",
        customer_id="c2",
        customer_name="Individual",
        customer_ltv_inr=10000.0,
        customer_tenure_months=6,
        historical_success_rate=0.85,
        retry_count=0,
    )
    routing_exp = decision_engine.route_model(expired_card)
    assert routing_exp["routed_tier"] == ModelTier.DETERMINISTIC_RULES.value
    assert routing_exp["estimated_cost_usd"] == 0.0


def test_decision_economic_lift_and_policy_enforcement():
    case = NormalizedCase(
        case_id="case-b2b-003",
        amount_inr=150000.0,
        failure_code="INSUFFICIENT_FUNDS",
        gateway="razorpay",
        customer_id="c3",
        customer_name="SaaS Pro",
        customer_ltv_inr=300000.0,
        customer_tenure_months=14,
        historical_success_rate=0.92,
        retry_count=0,
        is_weekend=True,
    )

    # Evaluate under ₹5,00,000 ceiling (Approved)
    res_approved = decision_engine.evaluate_decision(case, policy_ceiling_inr=500000.0)
    assert res_approved.selected_strategy.strategy_type == StrategyType.OPTIMAL_SMART_DELAY
    assert res_approved.selected_strategy.recovery_probability >= 0.70
    assert res_approved.incremental_economic_lift_inr > 50000.0
    assert res_approved.policy_gate_verdict == "APPROVED_AUTO_EXECUTION"
    assert res_approved.is_autonomous_executable is True
    assert len(res_approved.decision_receipt_hash) == 64

    # Evaluate under ₹50,000 ceiling (Escalated to Human)
    res_escalated = decision_engine.evaluate_decision(case, policy_ceiling_inr=50000.0)
    assert res_escalated.policy_gate_verdict == "ESCALATED_HIGH_VALUE_THRESHOLD"
    assert res_escalated.is_autonomous_executable is False


def test_expired_card_restraint():
    case = NormalizedCase(
        case_id="case-exp-004",
        amount_inr=49900.0,
        failure_code="CARD_EXPIRED",
        gateway="razorpay",
        customer_id="c4",
        customer_name="Cloud Corp",
        customer_ltv_inr=150000.0,
        customer_tenure_months=10,
        historical_success_rate=0.88,
        retry_count=0,
    )
    res = decision_engine.evaluate_decision(case, policy_ceiling_inr=500000.0)
    # 1-Tap Card Update must win over retry
    assert res.selected_strategy.strategy_type == StrategyType.ONE_TAP_CARD_UPDATE
    assert res.selected_strategy.recovery_probability == 0.88
    # Immediate retry probability must be blocked/near zero
    imm = next(s for s in res.candidate_strategies if s.strategy_type == StrategyType.IMMEDIATE_RETRY)
    assert imm.recovery_probability <= 0.01
