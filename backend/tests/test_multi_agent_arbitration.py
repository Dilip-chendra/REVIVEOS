# -*- coding: utf-8 -*-
"""
ReviveAI -- Multi-Agent Arbitration & Customer Attention Ledger Tests
"""
import pytest
from app.services.agent_arbitrator import (
    multi_agent_arbitrator, AgentType, AgentActionType, AgentProposal
)


def test_multi_agent_arbitration_subscription_beats_cart_and_retention():
    # Customer Aarav Mehta with 3 competing agents
    verdict = multi_agent_arbitrator.arbitrate(
        customer_id="CUST-9821",
        customer_name="Aarav Mehta",
    )
    
    # Subscription Recovery Agent should WIN because it has INR 1,944 net contribution (zero discount cost, low friction)
    assert verdict.winning_agent == AgentType.SUBSCRIPTION_RECOVERY_AGENT
    assert verdict.winning_action == AgentActionType.SCHEDULE_MANDATE_RETRY
    assert len(verdict.suppressed_proposals) == 2
    assert "Razorpay Subscription Recovery Agent WON" in verdict.arbitration_summary


def test_customer_attention_cap_enforced():
    attention = multi_agent_arbitrator.get_attention_record("CUST-ATTN-TEST", "Vikram Patel")
    assert attention.contacts_used_today == 0

    # First arbitration uses 1 contact slot
    verdict = multi_agent_arbitrator.arbitrate(
        customer_id="CUST-ATTN-TEST",
        customer_name="Vikram Patel",
    )
    assert verdict.winning_agent is not None
    assert attention.contacts_used_today == 1


def test_customer_opt_out_suppresses_all_agents():
    # Mark customer as opted out
    attention = multi_agent_arbitrator.get_attention_record("CUST-OPTED-OUT", "Pooja Sharma")
    attention.opt_out_status = True

    verdict = multi_agent_arbitrator.arbitrate(
        customer_id="CUST-OPTED-OUT",
        customer_name="Pooja Sharma",
    )
    assert verdict.winning_action == AgentActionType.DELIBERATE_ABSTENTION
    assert "Customer explicitly opted out" in verdict.arbitration_summary
    assert len(verdict.suppressed_proposals) == 3


def test_attention_ledger_overview():
    records = multi_agent_arbitrator.get_all_attention_records()
    assert len(records) >= 2
    assert any(r["customer_id"] == "CUST-9821" for r in records)
