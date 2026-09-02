# -*- coding: utf-8 -*-
import pytest
from app.services.agent_arbitrator import (
    multi_agent_arbitrator,
    AgentProposal,
    AgentType,
    AgentActionType,
)

def test_single_agent_proposal_wins():
    prop = AgentProposal(
        agent_type=AgentType.SUBSCRIPTION_RECOVERY_AGENT,
        agent_name="AI Subscription Agent",
        proposed_action=AgentActionType.SCHEDULE_MANDATE_RETRY,
        target_opportunity_id="OPP-1",
        amount_inr=1000.0,
        estimated_p_recovery=0.80,
        estimated_natural_recovery=0.10,
        tau=0.70,
        intervention_cost_inr=2.0,
        discount_cost_inr=0.0,
        customer_friction_penalty_inr=0.0,
        net_incremental_contribution_inr=698.0,
        requested_channel="eMandate",
        priority_rationale="High lift retry",
    )
    verdict = multi_agent_arbitrator.arbitrate(
        customer_id="CUST-TEST-1",
        customer_name="Test User",
        proposals=[prop],
    )
    assert verdict.winning_agent == AgentType.SUBSCRIPTION_RECOVERY_AGENT
    assert verdict.winning_net_contribution_inr == 698.0
    assert len(verdict.suppressed_proposals) == 0

def test_multi_agent_collision_highest_nic_wins():
    p1 = AgentProposal(
        agent_type=AgentType.ABANDONED_CART_AGENT,
        agent_name="Cart Agent",
        proposed_action=AgentActionType.SEND_PAYMENT_LINK,
        target_opportunity_id="OPP-CART",
        amount_inr=5000.0,
        estimated_p_recovery=0.50,
        estimated_natural_recovery=0.10,
        tau=0.40,
        intervention_cost_inr=5.0,
        discount_cost_inr=0.0,
        customer_friction_penalty_inr=0.0,
        net_incremental_contribution_inr=1995.0,
        requested_channel="WhatsApp",
        priority_rationale="Link sent",
    )
    p2 = AgentProposal(
        agent_type=AgentType.CUSTOMER_RETENTION_AGENT,
        agent_name="Retention Agent",
        proposed_action=AgentActionType.OFFER_10PCT_DISCOUNT,
        target_opportunity_id="OPP-RET",
        amount_inr=5000.0,
        estimated_p_recovery=0.65,
        estimated_natural_recovery=0.10,
        tau=0.55,
        intervention_cost_inr=5.0,
        discount_cost_inr=1000.0,
        customer_friction_penalty_inr=0.0,
        net_incremental_contribution_inr=1745.0,
        requested_channel="SMS",
        priority_rationale="Discount coupon",
    )
    verdict = multi_agent_arbitrator.arbitrate(
        customer_id="CUST-TEST-2",
        customer_name="Collision User",
        proposals=[p1, p2],
    )
    assert verdict.winning_agent == AgentType.ABANDONED_CART_AGENT
    assert verdict.winning_net_contribution_inr == 1995.0
    assert len(verdict.suppressed_proposals) == 1
    assert verdict.suppressed_proposals[0]["agent_name"] == "Retention Agent"

def test_opt_out_customer_suppresses_all():
    rec = multi_agent_arbitrator.get_attention_record("CUST-OPTOUT-TEST")
    rec.opt_out_status = True
    prop = AgentProposal(
        agent_type=AgentType.SUBSCRIPTION_RECOVERY_AGENT,
        agent_name="Subscription Agent",
        proposed_action=AgentActionType.SCHEDULE_MANDATE_RETRY,
        target_opportunity_id="OPP-3",
        amount_inr=3000.0,
        estimated_p_recovery=0.90,
        estimated_natural_recovery=0.10,
        tau=0.80,
        intervention_cost_inr=2.0,
        discount_cost_inr=0.0,
        customer_friction_penalty_inr=0.0,
        net_incremental_contribution_inr=2398.0,
        requested_channel="eMandate",
        priority_rationale="Retry",
    )
    verdict = multi_agent_arbitrator.arbitrate(
        customer_id="CUST-OPTOUT-TEST",
        customer_name="Opted Out User",
        proposals=[prop],
    )
    assert verdict.winning_action == AgentActionType.DELIBERATE_ABSTENTION
    assert "Article 6" in verdict.policy_enforced
