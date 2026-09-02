"""
ReviveAI — Global Financial Safety & Customer Protection Verification Suite

Tests the 7 Core Financial Safety & Protection Pillars:
1. Global Emergency Recovery Kill Switch
2. Duplicate Purchase Shield (Cross-Order Double-Charge Prevention)
3. Customer Consent & Authorization Gate (No Auto-Debits without Token/Mandate)
4. Customer Intent Verification (Active vs Unknown vs Cancelled)
5. Customer Explicit Cancellation Permanent Restraint
6. Incident Protection Modes (Normal vs Degraded vs Protective vs Emergency Stop)
7. Recovery Trust Score & Data Quality Telemetry
"""
import pytest
from app.services.decision_engine import (
    decision_engine, NormalizedCase, StrategyType, CustomerIntent,
    AuthorizationState, PaymentType, RecoveryAutonomyLevel, ActionVerdict
)
from app.services.policy_engine import policy_engine, PolicyContext, PolicyCheckStatus, PolicyViolationReason
from app.state import (
    reset_state, get_state, set_global_kill_switch, set_incident_mode,
    get_safety_metrics, record_safety_metric
)


def test_global_emergency_kill_switch_blocks_automation():
    merchant_id = "test_kill_switch_mid"
    reset_state(merchant_id)

    # 1. Arm Kill Switch
    set_global_kill_switch(merchant_id, True)
    state = get_state(merchant_id)
    assert state["global_kill_switch_enabled"] is True

    # 2. Evaluate Policy under Kill Switch
    ctx = PolicyContext(
        case_id="case_ks_001",
        action_type="retry",
        amount_inr=4999.0,
        retry_count=0,
        consecutive_failures=0,
        customer_opted_out=False,
        last_action_at=None,
        last_action_type=None,
        case_type="payment_failure",
        is_kill_switch_active=True,
    )
    result = policy_engine.evaluate(ctx)

    assert result.allowed is False
    assert any(c.reason == PolicyViolationReason.GLOBAL_KILL_SWITCH_ACTIVE for c in result.checks)
    assert "Global Recovery Kill Switch is active" in result.blocking_reason


def test_duplicate_purchase_shield_prevents_double_charging():
    case = NormalizedCase(
        case_id="case_dup_001",
        amount_inr=45000.0,
        failure_code="GATEWAY_TIMEOUT",
        gateway="razorpay",
        customer_id="cust_dup",
        customer_name="Priya Sharma",
        customer_ltv_inr=150000.0,
        customer_tenure_months=12,
        historical_success_rate=0.92,
        retry_count=0,
        duplicate_purchase_detected=True,
        duplicate_order_id="order_B_success_45k",
    )

    decision = decision_engine.evaluate_decision(case)

    # Must be hard stopped
    assert decision.autonomy_level == RecoveryAutonomyLevel.LEVEL_5_HARD_STOP
    assert decision.action_verdict == ActionVerdict.STOP
    assert decision.is_autonomous_executable is False
    assert decision.policy_gate_verdict == "BLOCKED_DUPLICATE_PURCHASE_RISK"
    assert "duplicate" in decision.why_selected.lower()
    assert decision.duplicate_risk_summary["duplicate_detected"] is True


def test_customer_cancellation_permanently_stops_automation():
    case = NormalizedCase(
        case_id="case_cancel_001",
        amount_inr=3499.0,
        failure_code="INSUFFICIENT_FUNDS",
        gateway="razorpay",
        customer_id="cust_cancel",
        customer_name="Rahul Verma",
        customer_ltv_inr=25000.0,
        customer_tenure_months=6,
        historical_success_rate=0.85,
        retry_count=0,
        customer_cancelled=True,
        customer_intent=CustomerIntent.CANCELLED,
    )

    decision = decision_engine.evaluate_decision(case)

    assert decision.autonomy_level == RecoveryAutonomyLevel.LEVEL_5_HARD_STOP
    assert decision.action_verdict == ActionVerdict.STOP
    assert decision.is_autonomous_executable is False
    assert decision.policy_gate_verdict == "BLOCKED_CUSTOMER_CANCELLED"
    assert "cancelled" in decision.why_selected.lower()


def test_authorization_and_consent_gate_forbids_unauthorized_autodebit():
    case = NormalizedCase(
        case_id="case_auth_001",
        amount_inr=1.0,  # "One rupee is still real money" — testing ₹1 low value
        failure_code="GATEWAY_ERROR",
        gateway="razorpay",
        customer_id="cust_lowval",
        customer_name="Test User",
        customer_ltv_inr=500.0,
        customer_tenure_months=1,
        historical_success_rate=0.50,
        retry_count=0,
        authorization_state=AuthorizationState.UNKNOWN,
        customer_intent=CustomerIntent.ACTIVE,
    )

    decision = decision_engine.evaluate_decision(case)

    # Low value ≠ low risk. UNKNOWN authorization must not auto-debit!
    assert decision.is_autonomous_executable is False
    assert decision.autonomy_level == RecoveryAutonomyLevel.LEVEL_2_CUSTOMER_INITIATED
    assert decision.action_verdict == ActionVerdict.ASK
    assert decision.policy_gate_verdict == "RESTRICTED_AUTHORIZATION_REQUIRED"


def test_unknown_customer_intent_prohibits_auto_recovery():
    case = NormalizedCase(
        case_id="case_intent_001",
        amount_inr=45000.0,
        failure_code="GATEWAY_CONNECTION_ERROR",
        gateway="stripe",
        customer_id="cust_intent",
        customer_name="Ananya Roy",
        customer_ltv_inr=80000.0,
        customer_tenure_months=8,
        historical_success_rate=0.90,
        retry_count=0,
        authorization_state=AuthorizationState.AUTHORIZED,
        customer_intent=CustomerIntent.UNKNOWN,  # UNKNOWN intent
    )

    decision = decision_engine.evaluate_decision(case)

    # Must ask customer, not silently auto-debit
    assert decision.is_autonomous_executable is False
    assert decision.autonomy_level == RecoveryAutonomyLevel.LEVEL_2_CUSTOMER_INITIATED
    assert decision.action_verdict == ActionVerdict.ASK
    assert decision.policy_gate_verdict == "RESTRICTED_INTENT_UNKNOWN"


def test_incident_protection_mode_restricts_retries():
    merchant_id = "test_inc_mid"
    reset_state(merchant_id)

    set_incident_mode(merchant_id, "PROTECTIVE")
    state = get_state(merchant_id)
    assert state["incident_mode"] == "PROTECTIVE"

    ctx = PolicyContext(
        case_id="case_inc_001",
        action_type="retry",
        amount_inr=2499.0,
        retry_count=0,
        consecutive_failures=0,
        customer_opted_out=False,
        last_action_at=None,
        last_action_type=None,
        case_type="payment_failure",
        incident_mode="PROTECTIVE",
    )
    result = policy_engine.evaluate(ctx)

    assert result.allowed is False
    assert any(c.reason == PolicyViolationReason.INCIDENT_PROTECTIVE_MODE for c in result.checks)


def test_recovery_trust_score_and_data_quality():
    case = NormalizedCase(
        case_id="case_trust_001",
        amount_inr=14999.0,
        failure_code="GATEWAY_TIMEOUT",
        gateway="razorpay",
        customer_id="cust_trust",
        customer_name="Vikram Seth",
        customer_ltv_inr=95000.0,
        customer_tenure_months=15,
        historical_success_rate=0.95,
        retry_count=0,
        authorization_state=AuthorizationState.AUTHORIZED,
        customer_intent=CustomerIntent.ACTIVE,
        gateway_is_degraded=False,
        duplicate_purchase_detected=False,
        data_quality_pct=98.0,
    )

    trust_score, tier, breakdown = decision_engine.compute_trust_score(case)

    assert trust_score >= 85.0
    assert breakdown["authorization_confidence"] == "HIGH"
    assert breakdown["intent_confidence"] == "HIGH"
    assert breakdown["provider_health"] == "HEALTHY"
    assert breakdown["duplicate_risk"] == "LOW"
    assert breakdown["data_quality_pct"] == 98.0
