# -*- coding: utf-8 -*-
import pytest
from app.services.opportunity_service import opportunity_service
from app.services.capital_allocator import recovery_capital_allocator
from app.models.opportunity import OpportunityState


def test_historical_failed_payment_cannot_be_resurrected():
    hist_opp = opportunity_service.get_opportunity("OPP-HIST-001")
    assert hist_opp is not None
    assert hist_opp["state"] == OpportunityState.HISTORICAL.value
    assert hist_opp["is_eligible"] is False
    assert "RECOVERY_WINDOW_EXPIRED_HISTORICAL_RECORD" in hist_opp["disqualification_reasons"]

    alloc_res = recovery_capital_allocator.allocate(recovery_budget_inr=1000.0, contact_limit=50)
    pursue_ids = [o["id"] if isinstance(o, dict) else o for o in alloc_res.buckets.get("PURSUE", [])]

    assert "OPP-HIST-001" not in pursue_ids

    hist_ids = [o["id"] if isinstance(o, dict) else o for o in alloc_res.historical_ledger]
    assert "OPP-HIST-001" in hist_ids


def test_customer_returning_spawns_fresh_opportunity_with_context():
    res = opportunity_service.trigger_new_checkout_from_historical_customer(
        customer_id="CUST-OLD-999",
        customer_name="Rohan Deshmukh",
        new_amount_inr=40000.0,
        new_order_id="ORD-IPHONE-TODAY-002",
    )

    new_opp = res["new_opportunity"]
    assert new_opp["id"].startswith("OPP-NEW")
    assert new_opp["is_eligible"] is True
    assert new_opp["state"] == OpportunityState.CUSTOMER_ACTION_REQUIRED.value
    assert "EVT-HIST-001" in new_opp["historical_context_event_ids"]

    hist_opp = opportunity_service.get_opportunity("OPP-HIST-001")
    assert hist_opp["state"] == OpportunityState.HISTORICAL.value
    assert hist_opp["is_eligible"] is False
