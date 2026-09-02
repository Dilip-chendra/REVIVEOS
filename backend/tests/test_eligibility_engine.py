# -*- coding: utf-8 -*-
import pytest
from datetime import datetime, timezone, timedelta
from app.services.eligibility_engine import eligibility_engine, EligibilityContext
from app.models.opportunity import OpportunityState, IntentLevel, RecoveryWindowType, CustomerFatigueLevel


def test_immediate_window_and_high_intent():
    now = datetime.now(timezone.utc)
    ctx = EligibilityContext(
        event_id="EVT-TEST-001",
        merchant_id="MERCH-001",
        customer_id="CUST-001",
        amount_inr=2500.0,
        event_timestamp=now - timedelta(minutes=2),
        is_pre_authorized=True,
    )
    res = eligibility_engine.evaluate(ctx)
    assert res.is_eligible is True
    assert res.target_state == OpportunityState.ACTIONABLE
    assert res.window_type == RecoveryWindowType.IMMEDIATE
    assert res.intent_level == IntentLevel.HIGH_CURRENT_INTENT


def test_expired_window_blocks_resurrection():
    now = datetime.now(timezone.utc)
    ctx = EligibilityContext(
        event_id="EVT-OLD-001",
        merchant_id="MERCH-001",
        customer_id="CUST-002",
        amount_inr=40000.0,
        event_timestamp=now - timedelta(days=30),
        order_status="closed",
        customer_active_checkout=False,
    )
    res = eligibility_engine.evaluate(ctx)
    assert res.is_eligible is False
    assert res.target_state == OpportunityState.HISTORICAL
    assert res.window_type == RecoveryWindowType.EXPIRED
    assert res.intent_level == IntentLevel.EXPIRED
    assert "RECOVERY_WINDOW_EXPIRED_HISTORICAL_RECORD" in res.disqualification_reasons


def test_customer_cancellation_sovereignty():
    now = datetime.now(timezone.utc)
    ctx = EligibilityContext(
        event_id="EVT-CANCEL-001",
        merchant_id="MERCH-001",
        customer_id="CUST-003",
        amount_inr=1500.0,
        event_timestamp=now - timedelta(minutes=5),
        customer_cancelled_explicitly=True,
    )
    res = eligibility_engine.evaluate(ctx)
    assert res.is_eligible is False
    assert res.target_state == OpportunityState.CANCELLED
    assert "CUSTOMER_EXPLICIT_CANCELLATION" in res.disqualification_reasons


def test_duplicate_purchase_shield():
    now = datetime.now(timezone.utc)
    ctx = EligibilityContext(
        event_id="EVT-DUP-001",
        merchant_id="MERCH-001",
        customer_id="CUST-004",
        amount_inr=5000.0,
        event_timestamp=now - timedelta(minutes=10),
        has_duplicate_successful_payment=True,
    )
    res = eligibility_engine.evaluate(ctx)
    assert res.is_eligible is False
    assert res.target_state == OpportunityState.BLOCKED
    assert "DUPLICATE_PURCHASE_DETECTED_FOR_CART" in res.disqualification_reasons


def test_high_ticket_human_review_ceiling():
    now = datetime.now(timezone.utc)
    ctx = EligibilityContext(
        event_id="EVT-HIGH-001",
        merchant_id="MERCH-001",
        customer_id="CUST-005",
        amount_inr=120000.0,
        event_timestamp=now - timedelta(minutes=15),
        is_pre_authorized=True,
    )
    res = eligibility_engine.evaluate(ctx)
    assert res.is_eligible is True
    assert res.target_state == OpportunityState.HUMAN_REVIEW
    assert res.requires_human is True


def test_gateway_degradation_triggers_auto_wait():
    now = datetime.now(timezone.utc)
    ctx = EligibilityContext(
        event_id="EVT-DEGRADED-001",
        merchant_id="MERCH-001",
        customer_id="CUST-006",
        amount_inr=3000.0,
        event_timestamp=now - timedelta(minutes=5),
        provider_failure_rate=0.40,
    )
    res = eligibility_engine.evaluate(ctx)
    assert res.is_eligible is True
    assert res.target_state == OpportunityState.WAITING
    assert res.action_required == "HOLD_FOR_PROVIDER_RECOVERY"


def test_unauthorized_one_time_cart_requires_customer_action():
    now = datetime.now(timezone.utc)
    ctx = EligibilityContext(
        event_id="EVT-CONSENT-001",
        merchant_id="MERCH-001",
        customer_id="CUST-007",
        amount_inr=1.0,
        event_timestamp=now - timedelta(minutes=3),
        is_pre_authorized=False,
        subscription_id=None,
    )
    res = eligibility_engine.evaluate(ctx)
    assert res.is_eligible is True
    assert res.target_state == OpportunityState.CUSTOMER_ACTION_REQUIRED
    assert res.action_required == "REQUEST_CUSTOMER_CONFIRMATION"
