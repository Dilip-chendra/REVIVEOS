# -*- coding: utf-8 -*-
import pytest
from app.services.opportunity_service import opportunity_service
from app.services.capital_allocator import recovery_capital_allocator
from app.models.opportunity import OpportunityState


def test_customer_cancellation_race_condition():
    cancel_res = opportunity_service.cancel_opportunity_by_customer("OPP-002")
    assert cancel_res["sovereignty_stop_applied"] is True
    assert cancel_res["state"] == OpportunityState.CANCELLED.value

    opp = opportunity_service.get_opportunity("OPP-002")
    assert opp["state"] == OpportunityState.CANCELLED.value
    assert opp["is_eligible"] is False

    alloc_res = recovery_capital_allocator.allocate(recovery_budget_inr=500.0)
    pursue_ids = [o["id"] if isinstance(o, dict) else o for o in alloc_res.buckets.get("PURSUE", [])]
    assert "OPP-002" not in pursue_ids


def test_duplicate_purchase_shield_multi_cart_completion():
    blocked_count = opportunity_service.mark_cart_purchased_elsewhere(
        customer_id="CUST-WHALE-001",
        order_id="ORD-ENT-001"
    )
    assert blocked_count >= 1

    whale_opp = opportunity_service.get_opportunity("OPP-001")
    assert whale_opp["state"] == OpportunityState.BLOCKED.value
    assert whale_opp["is_eligible"] is False
    assert "DUPLICATE_PURCHASE_DETECTED_FOR_CART" in whale_opp["disqualification_reasons"]


def test_reserve_recovery_capacity_enforcement():
    alloc_res = recovery_capital_allocator.allocate(
        recovery_budget_inr=500.0,
        contact_limit=50,
        reserve_budget_pct=0.20,
    )
    assert alloc_res.reserved_budget_inr == 100.0
    assert alloc_res.allocated_budget_inr <= 400.0
    assert alloc_res.remaining_budget_inr >= 100.0
