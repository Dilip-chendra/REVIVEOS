# -*- coding: utf-8 -*-
"""
ReviveOS -- Multi-Agent Recovery Auction & Economic Control Plane

Executes deterministic multi-constraint Knapsack optimization across competing agent proposals.
Enforces:
1. One Customer, One Recovery Decision (Collision Arbitration)
2. Global Knapsack Optimization over Spend Budget & Customer Attention Caps
3. Resolves The Amount Trap (High-Yield Subscriptions outrank Low-Yield Whales)
4. Counterfactual Winner vs. Runner-Up Opportunity Cost Analysis
5. Natural Settlement Restraint (Abstains when natural recovery >= 75%)
"""
from __future__ import annotations
import math
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple

from app.models.action_proposal import ActionProposal, ProposalStatus, AgentCategory
from app.services.agent_arbitrator import multi_agent_arbitrator


class RecoveryAuctionEngine:
    def __init__(self):
        self._proposals_pool: List[ActionProposal] = []
        self._seed_proposals()

    def _seed_proposals(self):
        """Seed a rich, realistic benchmark of competing proposals."""
        self._proposals_pool = [
            # ── CUSTOMER 1: Aarav Mehta (CUST-9821) — 3-Way Agent Collision ──
            ActionProposal(
                proposal_id="PROP-SUB-001",
                tenant_id="MERCH-001",
                customer_id="CUST-9821",
                customer_name="Aarav Mehta",
                opportunity_id="OPP-002",
                agent_id="AGENT-DUNNING-RZP",
                agent_type=AgentCategory.SUBSCRIPTION_AGENT,
                action_type="SCHEDULE_MANDATE_RETRY",
                amount_paise=249900,  # ₹2,499.00
                direct_cost_paise=400, # ₹4.00
                discount_cost_paise=0,  # No discount
                expected_recovery_probability=0.88,
                expected_natural_recovery_probability=0.10,
                estimated_incremental_uplift=0.78,
                friction_score=0.10,
                customer_attention_units=1,
                urgency_score=0.90,
                risk_score=0.05,
                authorization_state="PRE_AUTHORIZED",
            ),
            ActionProposal(
                proposal_id="PROP-CART-002",
                tenant_id="MERCH-001",
                customer_id="CUST-9821",
                customer_name="Aarav Mehta",
                opportunity_id="OPP-002",
                agent_id="AGENT-KLAVIYO-CART",
                agent_type=AgentCategory.ABANDONED_CART_AGENT,
                action_type="SEND_PAYMENT_LINK",
                amount_paise=499900,  # ₹4,999.00
                direct_cost_paise=250, # ₹2.50
                discount_cost_paise=0,
                expected_recovery_probability=0.45,
                expected_natural_recovery_probability=0.15,
                estimated_incremental_uplift=0.30,
                friction_score=0.45,
                customer_attention_units=1,
                urgency_score=0.75,
                risk_score=0.10,
                authorization_state="CUSTOMER_ACTION_REQUIRED",
            ),
            ActionProposal(
                proposal_id="PROP-RET-003",
                tenant_id="MERCH-001",
                customer_id="CUST-9821",
                customer_name="Aarav Mehta",
                opportunity_id="OPP-002",
                agent_id="AGENT-BRAZE-CHURN",
                agent_type=AgentCategory.CUSTOMER_RETENTION_AGENT,
                action_type="OFFER_10PCT_DISCOUNT",
                amount_paise=499900,  # ₹4,999.00
                direct_cost_paise=300, # ₹3.00
                discount_cost_paise=50000, # ₹500.00 (10% discount leakage!)
                expected_recovery_probability=0.60,
                expected_natural_recovery_probability=0.15,
                estimated_incremental_uplift=0.45,
                friction_score=0.30,
                customer_attention_units=1,
                urgency_score=0.60,
                risk_score=0.15,
                authorization_state="CUSTOMER_ACTION_REQUIRED",
            ),

            # ── CUSTOMER 2: The Amount Trap Whale (Vikram Singhania) ──
            ActionProposal(
                proposal_id="PROP-WHALE-004",
                tenant_id="MERCH-001",
                customer_id="CUST-WHALE-101",
                customer_name="Vikram Singhania",
                opportunity_id="OPP-WHALE-001",
                agent_id="AGENT-SALES-COLLECT",
                agent_type=AgentCategory.INVOICE_COLLECTION_AGENT,
                action_type="HUMAN_SALES_OUTREACH",
                amount_paise=12000000, # ₹1,20,000.00
                direct_cost_paise=8000,  # ₹80.00 (Human rep time)
                discount_cost_paise=0,
                expected_recovery_probability=0.08,
                expected_natural_recovery_probability=0.04,
                estimated_incremental_uplift=0.04,  # Only 4% lift!
                friction_score=0.90,
                customer_attention_units=2,
                urgency_score=0.30,
                risk_score=0.40,
                authorization_state="CUSTOMER_ACTION_REQUIRED",
            ),

            # ── CUSTOMER 3: Natural Recovery Restraint (Priya Sharma) ──
            ActionProposal(
                proposal_id="PROP-NAT-005",
                tenant_id="MERCH-001",
                customer_id="CUST-NAT-202",
                customer_name="Priya Sharma",
                opportunity_id="OPP-NAT-003",
                agent_id="AGENT-PAYMENT-FAIL",
                agent_type=AgentCategory.PAYMENT_FAILURE_AGENT,
                action_type="SEND_PAYMENT_LINK",
                amount_paise=1850000, # ₹18,500.00
                direct_cost_paise=300,
                discount_cost_paise=0,
                expected_recovery_probability=0.89,
                expected_natural_recovery_probability=0.85, # 85% Natural Settlement!
                estimated_incremental_uplift=0.04,
                friction_score=0.50,
                customer_attention_units=1,
                urgency_score=0.20,
                risk_score=0.05,
                authorization_state="CUSTOMER_ACTION_REQUIRED",
            ),
        ]

        # Compute initial metrics
        for p in self._proposals_pool:
            p.compute_auction_metrics()

    def get_proposals_for_workspace(self, merchant_id: str = "default", is_real_mode: bool = False) -> List[ActionProposal]:
        if is_real_mode:
            from app.state import get_state
            st = get_state(merchant_id)
            env = st.get("active_environment", "RAZORPAY_TEST")
            target_key = "provider_test_cases" if env in ("RAZORPAY_TEST", "REAL") else "provider_live_cases"
            cases = st.get(target_key, [])
            real_proposals: List[ActionProposal] = []
            for c in cases:
                amt = c.get("amount_inr", 0.0)
                cid = c.get("customer_id", f"CUST-{c.get('id', 'PROV')}")
                cname = c.get("customer_name") or c.get("customer_context", {}).get("name", "Real Customer")
                real_proposals.append(
                    ActionProposal(
                        proposal_id=f"PROP-{c.get('id', uuid.uuid4().hex[:6])}",
                        tenant_id=merchant_id,
                        customer_id=cid,
                        customer_name=cname,
                        opportunity_id=c.get("id", f"OPP-{c.get('id', '1')}"),
                        agent_id="AGENT-LIVE-RZP",
                        agent_type=AgentCategory.SUBSCRIPTION_AGENT,
                        action_type="SCHEDULE_MANDATE_RETRY",
                        amount_paise=int(round(amt * 100)),
                        direct_cost_paise=400,
                        discount_cost_paise=0,
                        expected_recovery_probability=c.get("recovery_probability", 0.75),
                        expected_natural_recovery_probability=0.15,
                        estimated_incremental_uplift=max(0.0, c.get("recovery_probability", 0.75) - 0.15),
                        friction_score=0.10,
                        customer_attention_units=1,
                        urgency_score=0.80,
                        risk_score=c.get("risk_score", 0.1),
                        authorization_state="AUTHORIZED",
                    )
                )
            return real_proposals
        else:
            return list(self._proposals_pool)

    def get_all_proposals(self, merchant_id: str = "default", is_real_mode: bool = False) -> List[Dict[str, Any]]:
        pool = self.get_proposals_for_workspace(merchant_id=merchant_id, is_real_mode=is_real_mode)
        for p in pool:
            p.compute_auction_metrics()
        return [p.to_dict() for p in pool]

    def run_auction(
        self,
        recovery_budget_inr: float = 500.0,
        contact_limit: int = 50,
        reserve_budget_pct: float = 0.20,
        merchant_id: str = "default",
        is_real_mode: bool = False,
    ) -> Dict[str, Any]:
        """
        Runs the Global Recovery Auction:
        1. Pre-Auction Filter: Natural recovery >= 75% -> REJECTED_NATURAL / ABSTAIN.
        2. Per-Customer Collision Arbitration: Ranks proposals for same customer, awards highest net contribution.
        3. Global Knapsack Allocation: Fits winning proposals into spend budget & contact limit.
        4. Counterfactual Delta: Calculates opportunity cost against runner-up proposal.
        """
        pool = self.get_proposals_for_workspace(merchant_id=merchant_id, is_real_mode=is_real_mode)
        usable_budget_inr = round(recovery_budget_inr * (1.0 - reserve_budget_pct), 2)
        usable_budget_paise = int(round(usable_budget_inr * 100))
        reserve_budget_inr = round(recovery_budget_inr * reserve_budget_pct, 2)

        # 1. Compute metrics for all proposals
        for p in pool:
            p.compute_auction_metrics()
            p.status = ProposalStatus.PENDING
            p.suppression_reason = None
            p.runner_up_delta_paise = None

        # 2. Group by Customer ID to enforce One Customer, One Recovery Decision
        customer_proposals: Dict[str, List[ActionProposal]] = {}
        for p in pool:
            customer_proposals.setdefault(p.customer_id, []).append(p)

        candidate_winners: List[ActionProposal] = []
        suppressed_proposals: List[ActionProposal] = []
        abstained_proposals: List[ActionProposal] = []

        for cust_id, props in customer_proposals.items():
            # Check natural recovery restraint
            if any(p.expected_natural_recovery_probability >= 0.75 for p in props):
                for p in props:
                    p.status = ProposalStatus.REJECTED_NATURAL
                    p.suppression_reason = (
                        f"Natural recovery probability is {int(p.expected_natural_recovery_probability*100)}%. "
                        "ReviveOS deliberately abstains to save merchant messaging fees and avoid customer annoyance."
                    )
                    abstained_proposals.append(p)
                continue

            # Rank proposals by net_contribution_paise descending
            ranked = sorted(props, key=lambda x: x.net_contribution_paise, reverse=True)
            winner = ranked[0]
            runner_up = ranked[1] if len(ranked) > 1 else None

            # Record Counterfactual Delta (Opportunity Cost)
            if runner_up:
                delta = winner.net_contribution_paise - runner_up.net_contribution_paise
                winner.runner_up_delta_paise = delta

            candidate_winners.append(winner)

            # Suppress all competing proposals for this customer
            for loser in ranked[1:]:
                loser.status = ProposalStatus.SUPPRESSED
                if loser.discount_cost_paise > 0:
                    loser.suppression_reason = (
                        f"Suppressed in favor of {winner.agent_type.value}. "
                        f"Discount leakage of INR {loser.discount_cost_inr:,.0f} destroys more margin than alternative."
                    )
                else:
                    loser.suppression_reason = (
                        f"Suppressed in favor of {winner.agent_type.value}. "
                        f"Lower Net Economic Contribution (INR {loser.net_contribution_inr:,.0f} vs INR {winner.net_contribution_inr:,.0f})."
                    )
                suppressed_proposals.append(loser)

        # 3. Global Knapsack Allocation over candidate winners
        # Sort candidates by capacity_efficiency_score descending
        candidate_winners.sort(key=lambda x: x.capacity_efficiency_score, reverse=True)

        spent_budget_paise = 0
        spent_contacts = 0
        approved_proposals: List[ActionProposal] = []

        for p in candidate_winners:
            cost_paise = p.direct_cost_paise
            contacts = p.customer_attention_units

            if (spent_budget_paise + cost_paise <= usable_budget_paise) and (spent_contacts + contacts <= contact_limit):
                p.status = ProposalStatus.APPROVED
                spent_budget_paise += cost_paise
                spent_contacts += contacts
                approved_proposals.append(p)
            else:
                p.status = ProposalStatus.REJECTED_CAPACITY
                p.suppression_reason = (
                    f"Displaced due to scarce recovery capacity. Usable budget cap of INR {usable_budget_inr:,.0f} reached. "
                    "Held in queue for next allocation cycle."
                )
                suppressed_proposals.append(p)

        # Aggregate Auction Economics
        total_incremental_recovery_paise = sum(p.incremental_value_paise for p in approved_proposals)
        total_net_contribution_paise = sum(p.net_contribution_paise for p in approved_proposals)
        total_discount_saved_paise = sum(p.discount_cost_paise for p in suppressed_proposals)

        return {
            "auction_id": f"AUC-{uuid.uuid4().hex[:8].upper()}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "policy_limits": {
                "recovery_budget_inr": recovery_budget_inr,
                "usable_budget_inr": usable_budget_inr,
                "reserve_budget_inr": reserve_budget_inr,
                "contact_limit": contact_limit,
            },
            "capacity_spent": {
                "spent_budget_inr": round(spent_budget_paise / 100.0, 2),
                "spent_budget_paise": spent_budget_paise,
                "remaining_budget_inr": round((usable_budget_paise - spent_budget_paise) / 100.0, 2),
                "spent_contacts": spent_contacts,
                "remaining_contacts": max(0, contact_limit - spent_contacts),
            },
            "auction_summary": {
                "total_proposals_evaluated": len(pool),
                "approved_count": len(approved_proposals),
                "suppressed_count": len(suppressed_proposals),
                "abstained_count": len(abstained_proposals),
                "total_incremental_recovery_inr": round(total_incremental_recovery_paise / 100.0, 2),
                "total_net_contribution_inr": round(total_net_contribution_paise / 100.0, 2),
                "total_discount_leakage_prevented_inr": round(total_discount_saved_paise / 100.0, 2),
            },
            "approved_proposals": [p.to_dict() for p in approved_proposals],
            "suppressed_proposals": [p.to_dict() for p in suppressed_proposals],
            "abstained_proposals": [p.to_dict() for p in abstained_proposals],
            "all_proposals": [p.to_dict() for p in pool],
        }

    def get_counterfactual_breakdown(
        self,
        customer_id: str = "CUST-9821",
        merchant_id: str = "default",
        is_real_mode: bool = False,
    ) -> Dict[str, Any]:
        """
        Provides the forensic counterfactual Winner vs. Runner-Up analysis for a specific customer.
        """
        pool = self.get_proposals_for_workspace(merchant_id=merchant_id, is_real_mode=is_real_mode)
        props = [p for p in pool if p.customer_id == customer_id]
        if not props:
            if is_real_mode:
                return {
                    "customer_id": customer_id,
                    "customer_name": "Active Customer",
                    "winner": None,
                    "runner_up": None,
                    "opportunity_cost_inr": 0.0,
                    "decision_explanation": "No active competing proposals found for this customer in live environment.",
                    "competing_proposals": [],
                }
            raise ValueError(f"No proposals found for customer {customer_id}")

        for p in props:
            p.compute_auction_metrics()

        ranked = sorted(props, key=lambda x: x.net_contribution_paise, reverse=True)
        winner = ranked[0]
        runner_up = ranked[1] if len(ranked) > 1 else None
        delta_inr = (winner.net_contribution_paise - runner_up.net_contribution_paise) / 100.0 if runner_up else 0.0

        explanation = (
            f"{winner.agent_type.value} was selected over {runner_up.agent_type.value if runner_up else 'None'} "
            f"because it produces INR {delta_inr:,.0f} more Net Economic Contribution while requiring "
            f"zero discount margin dilution and lower customer friction."
        )

        return {
            "customer_id": customer_id,
            "customer_name": winner.customer_name,
            "winner": winner.to_dict(),
            "runner_up": runner_up.to_dict() if runner_up else None,
            "opportunity_cost_inr": delta_inr,
            "decision_explanation": explanation,
            "competing_proposals": [p.to_dict() for p in ranked],
        }


recovery_auction_engine = RecoveryAuctionEngine()
