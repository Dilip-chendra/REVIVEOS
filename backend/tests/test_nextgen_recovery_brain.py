"""
ReviveAI — Next-Generation Recovery Brain & Trust-Aware Decision Verification Suite

Verifies:
1. Unified Recovery Brain & 10-Node Decision Graph
2. 5-Tier Recovery Trust Score (0-100) & Sub-Dimensions
3. Multi-Factor Data Quality Score & Real-Time State Freshness
4. First-Class 'Do Nothing' Optimization & Economic Lift vs Restraint
5. 'Why This?' vs 'Why Not That?' Explainability Engine
6. Shadow Recovery Mode & Canary Autonomy Suppressions
"""
import pytest
from app.services.decision_engine import (
    decision_engine, NormalizedCase, CustomerIntent, AuthorizationState,
    PaymentType, RecoveryAutonomyLevel, ActionVerdict, TrustTier, StrategyType
)


def test_canonical_decision_engine_and_10_node_graph():
    case = NormalizedCase(
        case_id="case_brain_001",
        amount_inr=4999.0,
        failure_code="GATEWAY_TIMEOUT",
        gateway="razorpay",
        customer_id="cust_001",
        customer_name="Aarav Mehta",
        customer_ltv_inr=65000.0,
        customer_tenure_months=18,
        historical_success_rate=0.94,
        retry_count=0,
        customer_intent=CustomerIntent.ACTIVE,
        authorization_state=AuthorizationState.AUTHORIZED,
        duplicate_purchase_detected=False,
        gateway_is_degraded=False,
    )

    decision = decision_engine.evaluate_decision(case)

    # Core Decision Invariants
    assert decision.action_verdict == ActionVerdict.RECOVER
    assert decision.autonomy_level == RecoveryAutonomyLevel.LEVEL_3_AUTO_ELIGIBLE
    assert decision.is_autonomous_executable is True
    assert decision.trust_score >= 70.0
    assert decision.trust_tier in (TrustTier.HIGH, TrustTier.VERY_HIGH)

    # 10-Node Decision Graph Invariants
    graph = decision.decision_graph
    assert len(graph) == 10
    node_ids = [n["id"] for n in graph]
    expected_ids = [
        "PAYMENT_FAILED", "AUTHORIZATION_GATE", "CUSTOMER_INTENT",
        "DUPLICATE_SHIELD", "PROVIDER_HEALTH", "ECONOMIC_NET_EV",
        "POLICY_FIREWALL", "TRUST_SCORE_GATE", "AUTONOMY_LEVEL", "SELECTED_STRATEGY"
    ]
    assert node_ids == expected_ids
    assert all(n["status"] in ("PASS", "WARN", "DIVERTED", "FAIL", "ACTIVE") for n in graph)


def test_5_tier_recovery_trust_score_classification():
    # 1. Very High Trust: Valid auth, confirmed intent, healthy gateway, clean duplicate, fresh state
    c_vh = NormalizedCase(
        case_id="c_vh", amount_inr=5000.0, failure_code="NETWORK_ERROR", gateway="razorpay",
        customer_id="c1", customer_name="User 1", customer_ltv_inr=50000.0, customer_tenure_months=12,
        historical_success_rate=0.95, retry_count=0, customer_intent=CustomerIntent.CONFIRMED,
        authorization_state=AuthorizationState.AUTHORIZED, payment_state_age_seconds=2,
    )
    score_vh, tier_vh, b_vh = decision_engine.compute_trust_score(c_vh)
    assert score_vh >= 85.0
    assert tier_vh == TrustTier.VERY_HIGH

    # 2. Moderate Trust: Authorization required (3DS or card update), active intent
    c_mod = NormalizedCase(
        case_id="c_mod", amount_inr=5000.0, failure_code="CARD_EXPIRED", gateway="razorpay",
        customer_id="c2", customer_name="User 2", customer_ltv_inr=50000.0, customer_tenure_months=12,
        historical_success_rate=0.90, retry_count=0, customer_intent=CustomerIntent.ACTIVE,
        authorization_state=AuthorizationState.AUTHORIZATION_REQUIRED,
    )
    score_mod, tier_mod, b_mod = decision_engine.compute_trust_score(c_mod)
    assert 50.0 <= score_mod < 85.0
    assert tier_mod in (TrustTier.MODERATE, TrustTier.HIGH)

    # 3. Very Low Trust: Duplicate detected, unknown intent, revoked auth
    c_vl = NormalizedCase(
        case_id="c_vl", amount_inr=5000.0, failure_code="SUSPECTED_FRAUD", gateway="payu",
        customer_id="c3", customer_name="User 3", customer_ltv_inr=1000.0, customer_tenure_months=1,
        historical_success_rate=0.20, retry_count=2, customer_intent=CustomerIntent.CANCELLED,
        authorization_state=AuthorizationState.AUTHORIZATION_REVOKED, duplicate_purchase_detected=True,
    )
    score_vl, tier_vl, b_vl = decision_engine.compute_trust_score(c_vl)
    assert score_vl < 30.0
    assert tier_vl == TrustTier.VERY_LOW


def test_data_quality_score_and_freshness_tracking():
    case = NormalizedCase(
        case_id="case_dq_001",
        amount_inr=12000.0,
        failure_code="GATEWAY_TIMEOUT",
        gateway="razorpay",
        customer_id="cust_dq",
        customer_name="Rohan Gupta",
        customer_ltv_inr=40000.0,
        customer_tenure_months=6,
        historical_success_rate=0.88,
        retry_count=0,
        payment_state_age_seconds=15,
        gateway_health_age_seconds=4,
        provider_sync_age_seconds=20,
    )

    dq_score, checklist, freshness = decision_engine.evaluate_data_quality_and_freshness(case)

    assert dq_score >= 90.0
    assert len(checklist) == 6
    assert freshness["is_stale"] is False
    assert freshness["payment_state_age_s"] == 15


def test_first_class_do_nothing_strategy_optimization():
    case = NormalizedCase(
        case_id="case_dn_001",
        amount_inr=25000.0,
        failure_code="DO_NOT_HONOR",
        gateway="payu",
        customer_id="cust_dn",
        customer_name="Sanjay Rao",
        customer_ltv_inr=30000.0,
        customer_tenure_months=3,
        historical_success_rate=0.80,
        retry_count=0,
        customer_cancelled=True,  # Customer cancelled
        customer_intent=CustomerIntent.CANCELLED,
    )

    decision = decision_engine.evaluate_decision(case)

    assert decision.autonomy_level == RecoveryAutonomyLevel.LEVEL_5_HARD_STOP
    assert decision.action_verdict == ActionVerdict.STOP
    assert "cancelled" in decision.why_selected.lower()


def test_why_not_engine_rejection_reasons():
    case = NormalizedCase(
        case_id="case_whynot_001",
        amount_inr=45000.0,
        failure_code="GATEWAY_TIMEOUT",
        gateway="razorpay",
        customer_id="cust_wn",
        customer_name="Deepa Patel",
        customer_ltv_inr=90000.0,
        customer_tenure_months=14,
        historical_success_rate=0.92,
        retry_count=0,
        gateway_is_degraded=True,  # Gateway is degraded
    )

    decision = decision_engine.evaluate_decision(case)

    # Should reject immediate retry because gateway is degraded
    imm_candidate = next((c for c in decision.candidate_strategies if c.strategy_type == StrategyType.IMMEDIATE_RETRY), None)
    assert imm_candidate is not None
    assert imm_candidate.policy_status == "BLOCKED"
    assert "degraded" in imm_candidate.rejection_reason.lower()


def test_shadow_mode_execution_suppression():
    case = NormalizedCase(
        case_id="case_shadow_001",
        amount_inr=3999.0,
        failure_code="TRANSIENT_NETWORK",
        gateway="razorpay",
        customer_id="cust_sh",
        customer_name="Karan Johar",
        customer_ltv_inr=50000.0,
        customer_tenure_months=8,
        historical_success_rate=0.90,
        retry_count=0,
        is_shadow_mode=True,  # SHADOW MODE ACTIVE
    )

    decision = decision_engine.evaluate_decision(case)

    # Even though eligible, autonomous execution is suppressed
    assert decision.is_autonomous_executable is False
    assert "[SHADOW MODE]" in decision.why_selected
