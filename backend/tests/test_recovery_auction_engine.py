# -*- coding: utf-8 -*-
"""
ReviveOS -- Recovery Auction & Multi-Agent Economic Control Plane Tests
"""
import pytest
from app.models.action_proposal import ActionProposal, ProposalStatus, AgentCategory
from app.services.recovery_auction_engine import recovery_auction_engine


def test_recovery_auction_one_customer_one_decision():
    # Customer Aarav Mehta (CUST-9821) has 3 competing agent proposals
    res = recovery_auction_engine.run_auction(recovery_budget_inr=500.0, contact_limit=50)
    approved = res["approved_proposals"]
    suppressed = res["suppressed_proposals"]

    # Subscription agent must win for Aarav Mehta
    aarav_winner = next((p for p in approved if p["customer_id"] == "CUST-9821"), None)
    assert aarav_winner is not None
    assert aarav_winner["agent_type"] == AgentCategory.SUBSCRIPTION_AGENT.value
    assert aarav_winner["action_type"] == "SCHEDULE_MANDATE_RETRY"

    # Cart and Retention proposals for Aarav must be suppressed
    aarav_suppressed = [p for p in suppressed if p["customer_id"] == "CUST-9821"]
    assert len(aarav_suppressed) == 2
    assert any("Discount leakage" in p["suppression_reason"] for p in aarav_suppressed)


def test_amount_trap_inversion_in_auction():
    # Whale (₹1,20,000 @ 4% lift) vs Subscription (₹2,499 @ 78% lift)
    res = recovery_auction_engine.run_auction(recovery_budget_inr=500.0, contact_limit=50)
    all_props = res["all_proposals"]

    sub_prop = next(p for p in all_props if p["proposal_id"] == "PROP-SUB-001")
    whale_prop = next(p for p in all_props if p["proposal_id"] == "PROP-WHALE-004")

    # Subscription efficiency must be higher than Whale efficiency
    assert sub_prop["capacity_efficiency_score"] > whale_prop["capacity_efficiency_score"]


def test_natural_recovery_restraint_abstains():
    res = recovery_auction_engine.run_auction(recovery_budget_inr=500.0, contact_limit=50)
    abstained = res["abstained_proposals"]

    # Priya Sharma (PROP-NAT-005) has 85% natural recovery -> Must abstain
    priya_prop = next((p for p in abstained if p["customer_id"] == "CUST-NAT-202"), None)
    assert priya_prop is not None
    assert "deliberately abstains" in priya_prop["suppression_reason"]


def test_counterfactual_breakdown_and_opportunity_cost():
    cf = recovery_auction_engine.get_counterfactual_breakdown("CUST-9821")
    assert cf["winner"]["agent_type"] == AgentCategory.SUBSCRIPTION_AGENT.value
    assert cf["runner_up"]["agent_type"] == AgentCategory.CUSTOMER_RETENTION_AGENT.value
    assert cf["opportunity_cost_inr"] > 0
    assert "was selected over" in cf["decision_explanation"]


def test_budget_capacity_displacement():
    # Extremely low budget: ₹5 -> Displaces proposals that exceed usable budget
    res = recovery_auction_engine.run_auction(recovery_budget_inr=5.0, contact_limit=1, reserve_budget_pct=0.20)
    assert res["capacity_spent"]["spent_budget_inr"] <= 4.0
