"""
Tests for Strict Environment Isolation: DEMO vs RAZORPAY_TEST vs RAZORPAY_LIVE
"""
import pytest
from app.state import get_state, set_active_environment, set_provider_cases, reset_state


def test_environment_initialization_and_isolation():
    merchant_id = "test_env_merchant"
    state = reset_state(merchant_id)

    # 1. Initial State must be DEMO with exactly 7 curated scenarios and ₹11,44,898 at risk
    assert state["active_environment"] == "DEMO"
    assert len(state["demo_cases"]) == 7
    assert len(state["cases"]) == 7
    assert state["metrics"]["revenue_at_risk_inr"] == 1144898.0
    assert state["metrics"]["recoverable_revenue_inr"] == 1132398.0
    assert state["metrics"]["is_real_provider_data"] is False

    # 2. Switch to RAZORPAY_TEST with 0 test payments -> Honest Zero state
    set_active_environment(merchant_id, "RAZORPAY_TEST")
    state = get_state(merchant_id)
    assert state["active_environment"] == "RAZORPAY_TEST"
    assert len(state["cases"]) == 0
    assert state["metrics"]["revenue_at_risk_inr"] == 0.0
    assert state["metrics"]["recoverable_revenue_inr"] == 0.0
    assert state["metrics"]["open_cases"] == 0
    assert state["metrics"]["is_real_provider_data"] is True

    # 3. Ingest real test cases -> metrics update strictly for RAZORPAY_TEST
    test_cases = [
        {"id": "rzp_test_1", "amount_inr": 5000, "is_real_provider_data": True, "recovery_probability": 0.8, "expected_recovery_value_inr": 4000},
        {"id": "rzp_test_2", "amount_inr": 12000, "is_real_provider_data": True, "recovery_probability": 0.9, "expected_recovery_value_inr": 10800},
    ]
    set_provider_cases(merchant_id, "test", test_cases)
    
    state = get_state(merchant_id)
    assert state["active_environment"] == "RAZORPAY_TEST"
    assert len(state["cases"]) == 2
    assert state["cases"][0]["id"] == "rzp_test_1"
    assert state["metrics"]["revenue_at_risk_inr"] == 17000.0
    assert state["metrics"]["recoverable_revenue_inr"] == 14800.0

    # 4. Switch back to DEMO -> Demo data remains 100% intact (7 cases, ₹11,44,898)
    set_active_environment(merchant_id, "DEMO")
    state = get_state(merchant_id)
    assert state["active_environment"] == "DEMO"
    assert len(state["cases"]) == 7
    assert state["metrics"]["revenue_at_risk_inr"] == 1144898.0
    assert state["metrics"]["is_real_provider_data"] is False

    # 5. Demo reset preserves connected provider test cases
    reset_state(merchant_id)
    state = get_state(merchant_id)
    assert len(state["provider_test_cases"]) == 2
    assert len(state["demo_cases"]) == 7

