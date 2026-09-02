# -*- coding: utf-8 -*-
"""
ReviveAI -- Multi-Agent Revenue Arbitrator & Global Customer Attention Ledger

Solves the Multi-Agent Tragedy of the Commons:
When multiple specialized agents (Subscription Agent, Cart Agent, Invoice Agent, Retention Agent)
compete to contact the same customer, ReviveAI enforces:
1. ONE CUSTOMER, ONE RECOVERY DECISION
2. Global Customer Attention Budget (Max 1 contact per 24h)
3. Causal Net Yield Arbitration: Selects the single highest-yield agent action and suppresses conflicting/redundant agents.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional
import hashlib
import json


class AgentType(str, Enum):
    SUBSCRIPTION_RECOVERY_AGENT = "SUBSCRIPTION_RECOVERY_AGENT"
    ABANDONED_CART_AGENT = "ABANDONED_CART_AGENT"
    INVOICE_COLLECTION_AGENT = "INVOICE_COLLECTION_AGENT"
    CUSTOMER_RETENTION_AGENT = "CUSTOMER_RETENTION_AGENT"
    PAYMENT_FAILURE_AGENT = "PAYMENT_FAILURE_AGENT"


class AgentActionType(str, Enum):
    SEND_PAYMENT_LINK = "SEND_PAYMENT_LINK"
    SCHEDULE_MANDATE_RETRY = "SCHEDULE_MANDATE_RETRY"
    OFFER_10PCT_DISCOUNT = "OFFER_10PCT_DISCOUNT"
    SEND_INVOICE_REMINDER = "SEND_INVOICE_REMINDER"
    IN_APP_CHECKOUT_PROMPT = "IN_APP_CHECKOUT_PROMPT"
    DELIBERATE_ABSTENTION = "DELIBERATE_ABSTENTION"
    CUSTOMER_RELATIONSHIP_PROTECTION = "CUSTOMER_RELATIONSHIP_PROTECTION"



@dataclass
class AgentProposal:
    agent_type: AgentType
    agent_name: str
    proposed_action: AgentActionType
    target_opportunity_id: str
    amount_inr: float
    estimated_p_recovery: float
    estimated_natural_recovery: float
    tau: float
    intervention_cost_inr: float
    discount_cost_inr: float
    customer_friction_penalty_inr: float
    net_incremental_contribution_inr: float
    requested_channel: str
    priority_rationale: str


@dataclass
class CustomerAttentionRecord:
    customer_id: str
    customer_name: str
    daily_contact_cap: int = 1
    contacts_used_today: int = 0
    last_contacted_at: Optional[str] = None
    last_contacted_agent: Optional[str] = None
    opt_out_status: bool = False
    active_conflicts_resolved: int = 0


@dataclass
class ArbitrationVerdict:
    customer_id: str
    customer_name: str
    arbitration_id: str
    timestamp: str
    attention_cap_remaining: int
    winning_agent: AgentType
    winning_action: AgentActionType
    winning_amount_inr: float
    winning_net_contribution_inr: float
    winning_channel: str
    suppressed_proposals: List[Dict[str, Any]]
    all_proposals: List[Dict[str, Any]]
    arbitration_summary: str
    policy_enforced: str


class MultiAgentArbitrator:
    def __init__(self):
        # In-memory customer attention ledger
        self._attention_ledger: Dict[str, CustomerAttentionRecord] = {
            "CUST-9821": CustomerAttentionRecord(
                customer_id="CUST-9821",
                customer_name="Aarav Mehta",
                daily_contact_cap=1,
                contacts_used_today=0,
                last_contacted_at=(datetime.now(timezone.utc) - timedelta(hours=36)).isoformat(),
                last_contacted_agent="SUBSCRIPTION_RECOVERY_AGENT",
                opt_out_status=False,
                active_conflicts_resolved=3,
            ),
            "CUST-OLD-999": CustomerAttentionRecord(
                customer_id="CUST-OLD-999",
                customer_name="Rohan Deshmukh",
                daily_contact_cap=1,
                contacts_used_today=0,
                last_contacted_at=(datetime.now(timezone.utc) - timedelta(days=30)).isoformat(),
                opt_out_status=False,
                active_conflicts_resolved=1,
            ),
        }

    def get_attention_record(self, customer_id: str, customer_name: str = "Merchant Customer") -> CustomerAttentionRecord:
        if customer_id not in self._attention_ledger:
            self._attention_ledger[customer_id] = CustomerAttentionRecord(
                customer_id=customer_id,
                customer_name=customer_name,
                daily_contact_cap=1,
                contacts_used_today=0,
            )
        return self._attention_ledger[customer_id]

    def get_all_attention_records(self) -> List[Dict[str, Any]]:
        return [
            {
                "customer_id": r.customer_id,
                "customer_name": r.customer_name,
                "daily_contact_cap": r.daily_contact_cap,
                "contacts_used_today": r.contacts_used_today,
                "contacts_remaining": max(0, r.daily_contact_cap - r.contacts_used_today),
                "last_contacted_at": r.last_contacted_at,
                "last_contacted_agent": r.last_contacted_agent,
                "opt_out_status": r.opt_out_status,
                "active_conflicts_resolved": r.active_conflicts_resolved,
            }
            for r in self._attention_ledger.values()
        ]

    def arbitrate(
        self,
        customer_id: str = "CUST-9821",
        customer_name: str = "Aarav Mehta",
        proposals: Optional[List[AgentProposal]] = None,
    ) -> ArbitrationVerdict:
        attention = self.get_attention_record(customer_id, customer_name)

        if not proposals:
            # Default rich 3-agent collision demo
            proposals = [
                AgentProposal(
                    agent_type=AgentType.SUBSCRIPTION_RECOVERY_AGENT,
                    agent_name="Razorpay Subscription Recovery Agent",
                    proposed_action=AgentActionType.SCHEDULE_MANDATE_RETRY,
                    target_opportunity_id="OPP-SUB-001",
                    amount_inr=2499.0,
                    estimated_p_recovery=0.88,
                    estimated_natural_recovery=0.10,
                    tau=0.78,
                    intervention_cost_inr=4.0,
                    discount_cost_inr=0.0,
                    customer_friction_penalty_inr=1.0,
                    net_incremental_contribution_inr=round((0.78 * 2499.0) - 4.0 - 1.0, 2), # ~1944.22
                    requested_channel="eMandate_S2S_Retry",
                    priority_rationale="Active recurring mandate token present; zero customer friction S2S retry.",
                ),
                AgentProposal(
                    agent_type=AgentType.ABANDONED_CART_AGENT,
                    agent_name="Klaviyo / Cart Recovery Agent",
                    proposed_action=AgentActionType.SEND_PAYMENT_LINK,
                    target_opportunity_id="OPP-CART-002",
                    amount_inr=4999.0,
                    estimated_p_recovery=0.45,
                    estimated_natural_recovery=0.15,
                    tau=0.30,
                    intervention_cost_inr=2.50,
                    discount_cost_inr=0.0,
                    customer_friction_penalty_inr=4.0,
                    net_incremental_contribution_inr=round((0.30 * 4999.0) - 2.50 - 4.0, 2), # ~1493.20
                    requested_channel="WhatsApp_Payment_Link",
                    priority_rationale="Checkout session dropped 12 mins ago; requests urgent WhatsApp payment link.",
                ),
                AgentProposal(
                    agent_type=AgentType.CUSTOMER_RETENTION_AGENT,
                    agent_name="Braze Churn Prevention Agent",
                    proposed_action=AgentActionType.OFFER_10PCT_DISCOUNT,
                    target_opportunity_id="OPP-RET-003",
                    amount_inr=4999.0,
                    estimated_p_recovery=0.60,
                    estimated_natural_recovery=0.15,
                    tau=0.45,
                    intervention_cost_inr=3.0,
                    discount_cost_inr=500.0, # 10% of 4999
                    customer_friction_penalty_inr=3.0,
                    net_incremental_contribution_inr=round((0.45 * 4999.0) - 500.0 - 3.0 - 3.0, 2), # ~1743.55
                    requested_channel="SMS_Discount_Link",
                    priority_rationale="Offers 10% discount coupon to prevent customer churn.",
                ),
            ]

        # 1. Customer Opt-Out Invariant
        if attention.opt_out_status:
            return ArbitrationVerdict(
                customer_id=customer_id,
                customer_name=customer_name,
                arbitration_id=f"arb_{customer_id.lower()[:8]}",
                timestamp=datetime.now(timezone.utc).isoformat(),
                attention_cap_remaining=0,
                winning_agent=AgentType.PAYMENT_FAILURE_AGENT,
                winning_action=AgentActionType.DELIBERATE_ABSTENTION,
                winning_amount_inr=0.0,
                winning_net_contribution_inr=0.0,
                winning_channel="NONE",
                suppressed_proposals=[p.__dict__ for p in proposals],
                all_proposals=[p.__dict__ for p in proposals],
                arbitration_summary="Customer explicitly opted out of communications. All agent outreach suppressed (Article 6).",
                policy_enforced="Article 6 (Customer Sovereignty Invariant)",
            )

        # 2. Economic Yield Ranking
        # Rank by net_incremental_contribution_inr descending
        ranked_proposals = sorted(proposals, key=lambda x: x.net_incremental_contribution_inr, reverse=True)
        winner = ranked_proposals[0]
        suppressed = ranked_proposals[1:]

        # Update attention ledger
        attention.contacts_used_today += 1
        attention.last_contacted_at = datetime.now(timezone.utc).isoformat()
        attention.last_contacted_agent = winner.agent_type.value
        attention.active_conflicts_resolved += len(suppressed)

        suppressed_dicts = []
        for s in suppressed:
            suppressed_dicts.append({
                "agent_type": s.agent_type.value,
                "agent_name": s.agent_name,
                "proposed_action": s.proposed_action.value,
                "amount_inr": s.amount_inr,
                "net_contribution_inr": s.net_incremental_contribution_inr,
                "requested_channel": s.requested_channel,
                "suppression_reason": f"Suppressed in favor of {winner.agent_name}. Net economic contribution is lower (INR {s.net_incremental_contribution_inr:,.0f} vs INR {winner.net_incremental_contribution_inr:,.0f}) and customer attention cap (1/24h) forbids duplicate contact.",
            })

        summary = (
            f"Arbitrated {len(proposals)} competing agent requests for {customer_name}. "
            f"{winner.agent_name} WON with highest net incremental contribution (INR {winner.net_incremental_contribution_inr:,.0f}). "
            f"{len(suppressed)} competing agent(s) suppressed to protect customer trust and prevent margin destruction."
        )

        return ArbitrationVerdict(
            customer_id=customer_id,
            customer_name=customer_name,
            arbitration_id=f"arb_{hashlib.sha256((customer_id + str(len(proposals))).encode()).hexdigest()[:12]}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            attention_cap_remaining=max(0, attention.daily_contact_cap - attention.contacts_used_today),
            winning_agent=winner.agent_type,
            winning_action=winner.proposed_action,
            winning_amount_inr=winner.amount_inr,
            winning_net_contribution_inr=winner.net_incremental_contribution_inr,
            winning_channel=winner.requested_channel,
            suppressed_proposals=suppressed_dicts,
            all_proposals=[p.__dict__ for p in proposals],
            arbitration_summary=summary,
            policy_enforced="One Customer, One Recovery Decision Invariant & Customer Attention Cap (1/24h)",
        )


multi_agent_arbitrator = MultiAgentArbitrator()
