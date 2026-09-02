# -*- coding: utf-8 -*-
"""
ReviveOS — Multi-Agent Arbitration & Collision API Router
Enforces 'One Customer -> One Recovery Decision' and computes Net Incremental Contribution (NIC).
"""
from __future__ import annotations
from dataclasses import asdict
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.models.user import User
from app.services.agent_arbitrator import (
    multi_agent_arbitrator,
    AgentProposal,
    AgentType,
    AgentActionType,
)

router = APIRouter(prefix="/arbitration", tags=["Agent Arbitration"])


class ProposalRequest(BaseModel):
    agent_id: str = "agent_sub_01"
    agent_name: str = "Subscription Recovery Agent"
    agent_type: str = "SUBSCRIPTION_RECOVERY_AGENT"
    action_type: str = "SCHEDULE_MANDATE_RETRY"
    customer_id: str = "CUST-9821"
    amount_inr: float = 2499.0
    estimated_p_recovery: float = 0.88
    estimated_natural_recovery: float = 0.10
    intervention_cost_inr: float = 4.0
    discount_cost_inr: float = 0.0
    customer_friction_penalty_inr: float = 1.0
    urgency: float = 0.5
    rationale: str = ""


class ArbitrationRequest(BaseModel):
    customer_id: str = "CUST-9821"
    customer_name: str = "Aarav Mehta"
    proposals: Optional[List[ProposalRequest]] = None
    scenario_id: Optional[str] = None


@router.get("/scenarios")
async def get_collision_scenarios(current_user: User = Depends(get_current_user)):
    """Return pre-configured agent collision scenarios for the Collision Lab."""
    return [
        {
            "id": "scenario_a_3way",
            "name": "Subscription vs Cart vs Retention (3-Way Conflict)",
            "customer_id": "CUST-9821",
            "customer_name": "Aarav Mehta",
            "description": "3 autonomous agents simultaneously target a ₹4,999 dropped order. ReviveOS selects the mandate retry with highest NIC (+₹1,944) and suppresses the 15% discount coupon.",
            "data_provenance": "SIMULATION",
            "proposals": [
                {
                    "agent_id": "sub_agent",
                    "agent_name": "AI Subscription Agent",
                    "agent_type": "SUBSCRIPTION_RECOVERY_AGENT",
                    "action_type": "SCHEDULE_MANDATE_RETRY",
                    "amount_inr": 2499.0,
                    "estimated_p_recovery": 0.88,
                    "estimated_natural_recovery": 0.10,
                    "intervention_cost_inr": 4.0,
                    "discount_cost_inr": 0.0,
                    "customer_friction_penalty_inr": 1.0,
                    "urgency": 0.8,
                    "rationale": "Active recurring mandate token on file. Zero-friction S2S debit.",
                },
                {
                    "agent_id": "cart_agent",
                    "agent_name": "AI Cart Recovery Agent",
                    "agent_type": "ABANDONED_CART_AGENT",
                    "action_type": "SEND_PAYMENT_LINK",
                    "amount_inr": 4999.0,
                    "estimated_p_recovery": 0.45,
                    "estimated_natural_recovery": 0.15,
                    "intervention_cost_inr": 2.50,
                    "discount_cost_inr": 0.0,
                    "customer_friction_penalty_inr": 4.0,
                    "urgency": 0.6,
                    "rationale": "Checkout abandoned 12m ago. Requests WhatsApp payment link.",
                },
                {
                    "agent_id": "retention_agent",
                    "agent_name": "AI Retention Agent",
                    "agent_type": "CUSTOMER_RETENTION_AGENT",
                    "action_type": "OFFER_10PCT_DISCOUNT",
                    "amount_inr": 4999.0,
                    "estimated_p_recovery": 0.60,
                    "estimated_natural_recovery": 0.15,
                    "intervention_cost_inr": 3.0,
                    "discount_cost_inr": 500.0,
                    "customer_friction_penalty_inr": 3.0,
                    "urgency": 0.4,
                    "rationale": "Proposes 10% discount code to prevent churn (destroys ₹500 margin).",
                },
            ],
        },
        {
            "id": "scenario_b_4way",
            "name": "4-Way Autonomous Swarm Collision",
            "customer_id": "CUST-4821",
            "customer_name": "Kavita Nair",
            "description": "Subscription, Cart, Retention, and Human Collections all bid on the same customer. ReviveOS locks single winner.",
            "data_provenance": "SIMULATION",
            "proposals": [
                {
                    "agent_id": "sub_agent",
                    "agent_name": "AI Subscription Agent",
                    "agent_type": "SUBSCRIPTION_RECOVERY_AGENT",
                    "action_type": "SCHEDULE_MANDATE_RETRY",
                    "amount_inr": 5000.0,
                    "estimated_p_recovery": 0.85,
                    "estimated_natural_recovery": 0.08,
                    "intervention_cost_inr": 4.0,
                    "discount_cost_inr": 0.0,
                    "customer_friction_penalty_inr": 0.0,
                    "urgency": 0.9,
                    "rationale": "Autopay retry window at HDFC bank opening.",
                },
                {
                    "agent_id": "cart_agent",
                    "agent_name": "AI Cart Agent",
                    "agent_type": "ABANDONED_CART_AGENT",
                    "action_type": "SEND_PAYMENT_LINK",
                    "amount_inr": 8500.0,
                    "estimated_p_recovery": 0.42,
                    "estimated_natural_recovery": 0.14,
                    "intervention_cost_inr": 5.50,
                    "discount_cost_inr": 0.0,
                    "customer_friction_penalty_inr": 3.0,
                    "urgency": 0.5,
                    "rationale": "WhatsApp dynamic link with pre-selected UPI intent.",
                },
                {
                    "agent_id": "retention_agent",
                    "agent_name": "AI Retention Agent",
                    "agent_type": "CUSTOMER_RETENTION_AGENT",
                    "action_type": "OFFER_10PCT_DISCOUNT",
                    "amount_inr": 5000.0,
                    "estimated_p_recovery": 0.62,
                    "estimated_natural_recovery": 0.17,
                    "intervention_cost_inr": 4.0,
                    "discount_cost_inr": 750.0,
                    "customer_friction_penalty_inr": 4.0,
                    "urgency": 0.3,
                    "rationale": "15% discount coupon offered to avoid churn.",
                },
                {
                    "agent_id": "collections_agent",
                    "agent_name": "AI Collections Agent",
                    "agent_type": "INVOICE_COLLECTION_AGENT",
                    "action_type": "SEND_INVOICE_REMINDER",
                    "amount_inr": 5000.0,
                    "estimated_p_recovery": 0.35,
                    "estimated_natural_recovery": 0.15,
                    "intervention_cost_inr": 50.0,
                    "discount_cost_inr": 0.0,
                    "customer_friction_penalty_inr": 15.0,
                    "urgency": 0.2,
                    "rationale": "Escalate to phone agent support queue.",
                },
            ],
        },
        {
            "id": "scenario_c_do_nothing",
            "name": "DO NOTHING is Optimal (High Natural Recovery)",
            "customer_id": "CUST-1044",
            "customer_name": "Vikram Seth",
            "description": "Transient UPI timeout where P(Natural Recovery) is 89%. ReviveOS deliberately abstains to save merchant fees.",
            "data_provenance": "SIMULATION",
            "proposals": [
                {
                    "agent_id": "cart_agent",
                    "agent_name": "AI Cart Agent",
                    "agent_type": "ABANDONED_CART_AGENT",
                    "action_type": "SEND_PAYMENT_LINK",
                    "amount_inr": 18500.0,
                    "estimated_p_recovery": 0.91,
                    "estimated_natural_recovery": 0.89,
                    "intervention_cost_inr": 5.0,
                    "discount_cost_inr": 0.0,
                    "customer_friction_penalty_inr": 8.0,
                    "urgency": 0.1,
                    "rationale": "Send SMS reminder immediately after bank socket timeout.",
                }
            ],
        },
        {
            "id": "scenario_d_opt_out",
            "name": "Customer Sovereignty (Explicit Opt-Out)",
            "customer_id": "CUST-OPTOUT-99",
            "customer_name": "Priya Sharma",
            "description": "Customer requested DND. ReviveOS enforces Article 6 (Customer Sovereignty) and blocks all outbound communication.",
            "data_provenance": "SIMULATION",
            "proposals": [
                {
                    "agent_id": "sub_agent",
                    "agent_name": "AI Subscription Agent",
                    "agent_type": "SUBSCRIPTION_RECOVERY_AGENT",
                    "action_type": "SCHEDULE_MANDATE_RETRY",
                    "amount_inr": 3499.0,
                    "estimated_p_recovery": 0.75,
                    "estimated_natural_recovery": 0.10,
                    "intervention_cost_inr": 4.0,
                    "discount_cost_inr": 0.0,
                    "customer_friction_penalty_inr": 0.0,
                    "urgency": 0.7,
                    "rationale": "Mandate retry attempt.",
                }
            ],
        },
    ]


@router.post("/simulate")
async def simulate_arbitration(
    req: ArbitrationRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Arbitrate competing agent proposals for a customer in real-time.
    Computes τ (Causal Lift), NIC (Net Incremental Contribution), and returns winning decision.
    """
    if req.customer_id == "CUST-OPTOUT-99":
        rec = multi_agent_arbitrator.get_attention_record(req.customer_id, req.customer_name)
        rec.opt_out_status = True

    proposals_list: Optional[List[AgentProposal]] = None

    if req.proposals:
        proposals_list = []
        for p in req.proposals:
            tau = max(0.0, round(p.estimated_p_recovery - p.estimated_natural_recovery, 4))
            nic = round(
                (tau * p.amount_inr)
                - p.intervention_cost_inr
                - p.discount_cost_inr
                - p.customer_friction_penalty_inr,
                2,
            )

            try:
                a_type = AgentType(p.agent_type)
            except ValueError:
                a_type = AgentType.PAYMENT_FAILURE_AGENT

            try:
                act_type = AgentActionType(p.action_type)
            except ValueError:
                act_type = AgentActionType.SEND_PAYMENT_LINK

            proposals_list.append(
                AgentProposal(
                    agent_type=a_type,
                    agent_name=p.agent_name,
                    proposed_action=act_type,
                    target_opportunity_id=f"OPP-{p.agent_id}",
                    amount_inr=p.amount_inr,
                    estimated_p_recovery=p.estimated_p_recovery,
                    estimated_natural_recovery=p.estimated_natural_recovery,
                    tau=tau,
                    intervention_cost_inr=p.intervention_cost_inr,
                    discount_cost_inr=p.discount_cost_inr,
                    customer_friction_penalty_inr=p.customer_friction_penalty_inr,
                    net_incremental_contribution_inr=nic,
                    requested_channel=act_type.value,
                    priority_rationale=p.rationale or f"Action proposed by {p.agent_name}",
                )
            )

    verdict = multi_agent_arbitrator.arbitrate(
        customer_id=req.customer_id,
        customer_name=req.customer_name,
        proposals=proposals_list,
    )

    result = asdict(verdict)
    result["data_provenance"] = "SIMULATION"
    return result


@router.get("/customer/{customer_id}/status")
async def get_customer_attention_status(
    customer_id: str,
    current_user: User = Depends(get_current_user),
):
    """Return customer recovery memory and attention ledger budget."""
    rec = multi_agent_arbitrator.get_attention_record(customer_id)
    return {
        "customer_id": rec.customer_id,
        "customer_name": rec.customer_name,
        "daily_contact_cap": rec.daily_contact_cap,
        "contacts_used_today": rec.contacts_used_today,
        "contacts_remaining": max(0, rec.daily_contact_cap - rec.contacts_used_today),
        "last_contacted_at": rec.last_contacted_at,
        "last_contacted_agent": rec.last_contacted_agent,
        "opt_out_status": rec.opt_out_status,
        "active_conflicts_resolved": rec.active_conflicts_resolved,
        "data_provenance": "SIMULATION",
    }


@router.get("/do-nothing/example")
async def get_do_nothing_example(current_user: User = Depends(get_current_user)):
    """Return an authoritative worked example of DO NOTHING being optimal."""
    return {
        "scenario": "Transient Bank UPI Webhook Sync Latency",
        "order_amount_inr": 18500.0,
        "natural_recovery_probability": 0.89,
        "intervention_recovery_probability": 0.91,
        "causal_lift_tau": 0.02,
        "expected_gross_lift_inr": 370.0,
        "intervention_cost_inr": 5.0,
        "customer_friction_penalty_inr": 8.0,
        "net_incremental_contribution_inr": 357.0,
        "decision": "DO_NOTHING",
        "verdict_reason": "P(Natural Settle) is 89%. 9 out of 10 customers complete payment independently within 2 hours. Sending WhatsApp/SMS spam creates customer friction and burns gateway quota for a marginal 2pp lift.",
        "data_provenance": "SIMULATION",
    }
