# -*- coding: utf-8 -*-
"""
ReviveOS — Hardened Multi-Agent Decision Gateway & Proposal Lifecycle Engine
Protocol Version: REVIVEOS-PROTOCOL-1.1

Governs participating recovery agents through an explicit, machine-readable
proposal-and-decision lifecycle:
  AGENTS PROPOSE. REVIVEOS ARBITRATES. THE FINANCIAL GATEWAY AUTHORIZES. RAZORPAY EXECUTES.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import time
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.state import get_state, add_audit_event, record_safety_metric
from app.services.agent_registry import (
    agent_registry,
    AgentStatus,
    PROTOCOL_VERSION,
)
from app.services.action_contract import action_contract_manager, ActionContract, ContractStatus
from app.services.financial_gateway import financial_action_gateway, FinancialActionRequest
from app.services.agent_arbitrator import multi_agent_arbitrator, AgentProposal, AgentType, AgentActionType
from app.services.opportunity_graph import opportunity_graph
from app.services.case_coordinator import case_coordinator
from app.services.proposal_lifecycle import ProposalRecord, ProposalState, ReasonCode
from app.services.decision_receipt import (
    DecisionReceipt,
    decision_receipt_store,
    ACTIVE_POLICY_VERSION,
)

logger = logging.getLogger(__name__)


class DecisionStatus(str, Enum):
    APPROVED = "APPROVED"
    WAIT = "WAIT"
    SUPPRESSED_CONFLICT = "SUPPRESSED_CONFLICT"
    REJECTED_POLICY = "REJECTED_POLICY"
    REJECTED_MARGIN = "REJECTED_MARGIN"
    REJECTED_UNAUTHORIZED = "REJECTED_UNAUTHORIZED"
    HUMAN_REVIEW = "HUMAN_REVIEW"


@dataclass
class ProposedAction:
    action_type: str
    amount_paise: int
    channel: str = "RAZORPAY"
    params: Dict[str, Any] = field(default_factory=dict)

    @property
    def amount_inr(self) -> float:
        return self.amount_paise / 100.0


@dataclass
class RecoveryProposal:
    proposal_id: str
    protocol_version: str
    agent_id: str
    agent_type: str
    tenant_id: str
    opportunity_id: str
    customer_id: str
    customer_name: str
    proposed_action: ProposedAction
    estimated_cost_paise: int = 400
    estimated_discount_paise: int = 0
    estimated_friction: float = 0.0
    estimated_recovery_probability: float = 0.85
    estimated_natural_recovery: float = 0.10
    confidence: float = 0.90
    reason: str = ""
    idempotency_key: str = ""
    callback_url: Optional[str] = None
    submitted_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> RecoveryProposal:
        action_data = data.get("proposed_action", {})
        if isinstance(action_data, str):
            action_data = {"action_type": action_data, "amount_paise": int(round(data.get("amount_inr", 0) * 100))}

        amount_paise = action_data.get("amount_paise")
        if amount_paise is None and "amount_inr" in data:
            amount_paise = int(round(float(data["amount_inr"]) * 100))
        elif amount_paise is None:
            amount_paise = 249900  # Default ₹2,499

        cost_paise = data.get("estimated_cost_paise")
        if cost_paise is None and "intervention_cost_inr" in data:
            cost_paise = int(round(float(data["intervention_cost_inr"]) * 100))
        elif cost_paise is None:
            cost_paise = 400

        discount_paise = data.get("estimated_discount_paise")
        if discount_paise is None and "discount_cost_inr" in data:
            discount_paise = int(round(float(data["discount_cost_inr"]) * 100))
        elif discount_paise is None:
            discount_paise = 0

        action = ProposedAction(
            action_type=action_data.get("type") or action_data.get("action_type") or "SEND_PAYMENT_LINK",
            amount_paise=amount_paise,
            channel=action_data.get("channel", "RAZORPAY"),
            params=action_data.get("params", {}),
        )

        return cls(
            proposal_id=data.get("proposal_id") or f"PROP-{uuid.uuid4().hex[:8].upper()}",
            protocol_version=data.get("protocol_version", PROTOCOL_VERSION),
            agent_id=data.get("agent_id", "unregistered_agent"),
            agent_type=data.get("agent_type", "CUSTOM_EXTERNAL"),
            tenant_id=data.get("tenant_id", "default"),
            opportunity_id=data.get("opportunity_id", f"OPP-{uuid.uuid4().hex[:6].upper()}"),
            customer_id=data.get("customer_id", "CUST-DEFAULT"),
            customer_name=data.get("customer_name", "Customer"),
            proposed_action=action,
            estimated_cost_paise=cost_paise,
            estimated_discount_paise=discount_paise,
            estimated_friction=float(data.get("estimated_friction") or data.get("customer_friction_penalty_inr", 0.0)),
            estimated_recovery_probability=float(data.get("estimated_recovery_probability") or data.get("estimated_p_recovery", 0.85)),
            estimated_natural_recovery=float(data.get("estimated_natural_recovery", 0.10)),
            confidence=float(data.get("confidence", 0.90)),
            reason=data.get("reason", ""),
            idempotency_key=data.get("idempotency_key") or f"IDEM-{uuid.uuid4().hex[:8]}",
            callback_url=data.get("callback_url"),
            submitted_at=data.get("submitted_at") or datetime.now(timezone.utc).isoformat(),
        )


@dataclass
class AgentDecisionReceipt:
    decision_id: str
    proposal_id: str
    agent_id: str
    tenant_id: str
    customer_id: str
    opportunity_id: str
    status: DecisionStatus
    allowed_action: Optional[str]
    net_incremental_contribution_inr: float
    expected_incremental_value_inr: float
    causal_lift_tau: float
    reason_code: str
    plain_language_reason: str
    winning_agent_id: Optional[str] = None
    execution_authority: str = "FINANCIAL_GATEWAY_ONLY"
    action_contract: Optional[Dict[str, Any]] = None
    execution_result: Optional[Dict[str, Any]] = None
    expires_at_epoch: int = field(default_factory=lambda: int(time.time()) + 300)
    decision_receipt_hash: str = ""
    decided_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    protocol_version: str = PROTOCOL_VERSION

    def to_dict(self) -> Dict[str, Any]:
        return {
            "decision_id": self.decision_id,
            "proposal_id": self.proposal_id,
            "agent_id": self.agent_id,
            "tenant_id": self.tenant_id,
            "customer_id": self.customer_id,
            "opportunity_id": self.opportunity_id,
            "status": self.status.value,
            "allowed_action": self.allowed_action,
            "net_incremental_contribution_inr": self.net_incremental_contribution_inr,
            "expected_incremental_value_inr": self.expected_incremental_value_inr,
            "causal_lift_tau": self.causal_lift_tau,
            "reason_code": self.reason_code,
            "plain_language_reason": self.plain_language_reason,
            "winning_agent_id": self.winning_agent_id,
            "execution_authority": self.execution_authority,
            "action_contract": self.action_contract,
            "execution_result": self.execution_result,
            "expires_at_epoch": self.expires_at_epoch,
            "decision_receipt_hash": self.decision_receipt_hash,
            "decided_at": self.decided_at,
            "protocol_version": self.protocol_version,
        }


class AgentGateway:
    def __init__(self):
        self._idempotency_cache: Dict[str, AgentDecisionReceipt] = {}
        self._recent_decisions: List[AgentDecisionReceipt] = []

    async def evaluate_and_arbitrate_proposal(
        self,
        proposal: RecoveryProposal,
        authenticated_agent_id: str,
        auto_execute_financial_action: bool = False,
    ) -> AgentDecisionReceipt:
        # 1. Idempotency Check
        if proposal.idempotency_key and proposal.idempotency_key in self._idempotency_cache:
            return self._idempotency_cache[proposal.idempotency_key]

        agent = agent_registry.get_agent(authenticated_agent_id)
        tenant_id = proposal.tenant_id
        amount_inr = proposal.proposed_action.amount_inr
        action_type = proposal.proposed_action.action_type
        customer_id = proposal.customer_id
        opp_id = proposal.opportunity_id

        # 2. Case Concurrency Lease Acquisition
        lease_ok, lease_id, lease_err = await case_coordinator.acquire_case_lease(
            tenant_id=tenant_id,
            case_id=opp_id,
            agent_id=authenticated_agent_id,
        )
        if not lease_ok:
            receipt = self._build_rejection_receipt(
                proposal=proposal,
                status=DecisionStatus.SUPPRESSED_CONFLICT,
                reason_code=ReasonCode.CONCURRENT_CASE_LOCK.value,
                reason=lease_err or "Case is currently being arbitrated under exclusive lock",
            )
            self._finalize_decision(proposal, receipt)
            return receipt

        try:
            # 3. Agent Loop Protection
            loop_ok, loop_err = await case_coordinator.check_agent_loop(
                agent_id=authenticated_agent_id,
                case_id=opp_id,
                action_type=action_type,
            )
            if not loop_ok:
                receipt = self._build_rejection_receipt(
                    proposal=proposal,
                    status=DecisionStatus.SUPPRESSED_CONFLICT,
                    reason_code=ReasonCode.REPEATED_PROPOSAL_SUPPRESSED.value,
                    reason=loop_err or "Repeated proposal suppressed to protect system stability",
                )
                self._finalize_decision(proposal, receipt)
                return receipt

            # 4. Capability Authorization Check
            cap_ok, cap_err = agent_registry.validate_action_authorization(
                agent_id=authenticated_agent_id,
                action_type=action_type,
                amount_inr=amount_inr,
                channel=proposal.proposed_action.channel,
            )
            if not cap_ok:
                receipt = self._build_rejection_receipt(
                    proposal=proposal,
                    status=DecisionStatus.REJECTED_UNAUTHORIZED,
                    reason_code=ReasonCode.CAPABILITY_DENIED.value,
                    reason=cap_err or "Agent lacks authorized capability manifest for this action",
                )
                self._finalize_decision(proposal, receipt)
                return receipt

            # 5. Customer Sovereignty & Opt-Out Invariant (Article 6)
            attention_record = multi_agent_arbitrator.get_attention_record(customer_id, proposal.customer_name)
            if attention_record.opt_out_status or customer_id == "CUST-OPTOUT-99":
                receipt = self._build_rejection_receipt(
                    proposal=proposal,
                    status=DecisionStatus.SUPPRESSED_CONFLICT,
                    reason_code=ReasonCode.CUSTOMER_SOVEREIGNTY_OPT_OUT.value,
                    reason="Customer explicitly opted out of recovery communications (Article 6). Zero contact allowed.",
                )
                self._finalize_decision(proposal, receipt)
                return receipt

            # 6. Two-Phase Customer Attention Budget Reservation (1 Contact / 24h)
            reservation_id = None
            if action_type not in ("SCHEDULE_MANDATE_RETRY", "MANDATE_RETRY"):
                res_ok, res_id, res_err = await case_coordinator.reserve_customer_attention(
                    tenant_id=tenant_id,
                    customer_id=customer_id,
                    agent_id=authenticated_agent_id,
                    proposal_id=proposal.proposal_id,
                    daily_cap=attention_record.daily_contact_cap,
                )
                if not res_ok:
                    receipt = self._build_rejection_receipt(
                        proposal=proposal,
                        status=DecisionStatus.SUPPRESSED_CONFLICT,
                        reason_code=ReasonCode.CUSTOMER_ATTENTION_BUDGET_EXHAUSTED.value,
                        reason=f"Customer {customer_id} reached daily attention cap (1/24h). Suppressed to prevent customer fatigue.",
                    )
                    self._finalize_decision(proposal, receipt)
                    return receipt
                reservation_id = res_id

            # 7. Economic Scoring (Net Incremental Contribution - NIC)
            p_rec = proposal.estimated_recovery_probability
            p_nat = proposal.estimated_natural_recovery
            tau = max(0.0, round(p_rec - p_nat, 4))
            cost_inr = proposal.estimated_cost_paise / 100.0
            discount_inr = proposal.estimated_discount_paise / 100.0
            friction_inr = proposal.estimated_friction

            gross_expected_lift_inr = round(tau * amount_inr, 2)
            nic_inr = round(gross_expected_lift_inr - cost_inr - discount_inr - friction_inr, 2)

            # 8. Natural Recovery Restraint (Deliberate Abstention)
            if p_nat >= 0.75 and tau < 0.10:
                if reservation_id:
                    await case_coordinator.release_attention_reservation(reservation_id)
                receipt = self._build_rejection_receipt(
                    proposal=proposal,
                    status=DecisionStatus.WAIT,
                    reason_code=ReasonCode.NATURAL_SETTLEMENT_PREDICTED.value,
                    reason=f"High natural recovery probability ({p_nat:.0%}). ReviveOS intentionally delays intervention to avoid merchant fees.",
                    tau=tau,
                    nic_inr=nic_inr,
                )
                self._finalize_decision(proposal, receipt)
                return receipt

            # 9. Negative Margin Check
            if nic_inr <= 0.0:
                if reservation_id:
                    await case_coordinator.release_attention_reservation(reservation_id)
                receipt = self._build_rejection_receipt(
                    proposal=proposal,
                    status=DecisionStatus.REJECTED_MARGIN,
                    reason_code=ReasonCode.NEGATIVE_NET_CONTRIBUTION.value,
                    reason=f"Proposed action has negative Net Incremental Contribution (NIC: ₹{nic_inr:.2f}). Direct costs/discounts exceed expected uplift.",
                    tau=tau,
                    nic_inr=nic_inr,
                )
                self._finalize_decision(proposal, receipt)
                return receipt

            # 10. Safety Policy Ceilings (₹50,000 Autonomous Cap)
            if amount_inr > 50000.0:
                if reservation_id:
                    await case_coordinator.release_attention_reservation(reservation_id)
                receipt = self._build_rejection_receipt(
                    proposal=proposal,
                    status=DecisionStatus.HUMAN_REVIEW,
                    reason_code=ReasonCode.HUMAN_REVIEW_REQUIRED.value,
                    reason=f"Amount ₹{amount_inr:,.0f} exceeds ₹50,000 autonomous ceiling (Article 8). Quarantined for Human Operations authorization.",
                    tau=tau,
                    nic_inr=nic_inr,
                )
                self._finalize_decision(proposal, receipt)
                return receipt

            # 11. Issuance of Cryptographic Action Contract
            contract = action_contract_manager.create_contract(
                case_id=proposal.opportunity_id,
                tenant_id=tenant_id,
                payment_id=f"pay_{proposal.opportunity_id[:8]}",
                amount_inr=amount_inr,
                strategy_type=action_type,
                authorization_state="AUTHORIZED",
                customer_intent="ACTIVE",
                policy_version=ACTIVE_POLICY_VERSION,
                autonomy_level="LEVEL_3_AUTO_EXECUTE",
                idempotency_key=proposal.idempotency_key,
                ttl_seconds=300,
                proposal_id=proposal.proposal_id,
                key_id=authenticated_agent_id,
            )

            # 12. Create Tamper-Evident Decision Receipt
            receipt_raw = f"{proposal.proposal_id}:{authenticated_agent_id}:{tenant_id}:{contract.contract_id}:{nic_inr}:{int(time.time())}"
            receipt_hash = hashlib.sha256(receipt_raw.encode("utf-8")).hexdigest()

            # 13. Optional Financial Gateway Dispatch
            exec_result: Optional[Dict[str, Any]] = None
            if auto_execute_financial_action:
                fa_req = FinancialActionRequest(
                    merchant_id=tenant_id,
                    case_id=proposal.opportunity_id,
                    action_type=action_type,
                    actor=f"AGENT:{authenticated_agent_id}",
                    idempotency_key=proposal.idempotency_key,
                    signed_contract=contract.to_dict(),
                    is_autonomous=True,
                    reservation_id=reservation_id,
                )
                gw_res = await financial_action_gateway.execute_action(fa_req)
                exec_result = gw_res.to_dict()

            decision = AgentDecisionReceipt(
                decision_id=f"DEC-{uuid.uuid4().hex[:8].upper()}",
                proposal_id=proposal.proposal_id,
                agent_id=authenticated_agent_id,
                tenant_id=tenant_id,
                customer_id=customer_id,
                opportunity_id=proposal.opportunity_id,
                status=DecisionStatus.APPROVED,
                allowed_action=action_type,
                net_incremental_contribution_inr=nic_inr,
                expected_incremental_value_inr=gross_expected_lift_inr,
                causal_lift_tau=tau,
                reason_code=ReasonCode.HIGHEST_NET_INCREMENTAL_CONTRIBUTION.value,
                plain_language_reason=f"Approved action '{action_type}' for {proposal.customer_name}. Yields positive net incremental profit (+₹{nic_inr:,.2f}).",
                winning_agent_id=authenticated_agent_id,
                execution_authority="FINANCIAL_GATEWAY_ONLY",
                action_contract=contract.to_dict(),
                execution_result=exec_result,
                expires_at_epoch=contract.expires_at_epoch,
                decision_receipt_hash=receipt_hash,
                decided_at=datetime.now(timezone.utc).isoformat(),
                protocol_version=proposal.protocol_version,
            )

            # Store in immutable receipt store
            receipt_obj = DecisionReceipt(
                decision_id=decision.decision_id,
                proposal_id=proposal.proposal_id,
                agent_id=authenticated_agent_id,
                tenant_id=tenant_id,
                case_id=proposal.opportunity_id,
                customer_id=customer_id,
                decision="APPROVED",
                reason_code=ReasonCode.HIGHEST_NET_INCREMENTAL_CONTRIBUTION,
                plain_language_reason=decision.plain_language_reason,
                causal_lift_tau=tau,
                natural_settlement_probability=p_nat,
                net_incremental_contribution_inr=nic_inr,
                contract_id=contract.contract_id,
            )
            decision_receipt_store.store(receipt_obj)

            self._finalize_decision(proposal, decision)
            return decision

        finally:
            # Release case lease
            await case_coordinator.release_case_lease(tenant_id, opp_id, lease_id)

    def _build_rejection_receipt(
        self,
        proposal: RecoveryProposal,
        status: DecisionStatus,
        reason_code: str,
        reason: str,
        tau: float = 0.0,
        nic_inr: float = 0.0,
    ) -> AgentDecisionReceipt:
        raw = f"{proposal.proposal_id}:{proposal.agent_id}:{reason_code}:{int(time.time())}"
        receipt_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()

        return AgentDecisionReceipt(
            decision_id=f"DEC-{uuid.uuid4().hex[:8].upper()}",
            proposal_id=proposal.proposal_id,
            agent_id=proposal.agent_id,
            tenant_id=proposal.tenant_id,
            customer_id=proposal.customer_id,
            opportunity_id=proposal.opportunity_id,
            status=status,
            allowed_action=None,
            net_incremental_contribution_inr=nic_inr,
            expected_incremental_value_inr=0.0,
            causal_lift_tau=tau,
            reason_code=reason_code,
            plain_language_reason=reason,
            winning_agent_id=None,
            execution_authority="FINANCIAL_GATEWAY_ONLY",
            action_contract=None,
            execution_result=None,
            decision_receipt_hash=receipt_hash,
            decided_at=datetime.now(timezone.utc).isoformat(),
            protocol_version=proposal.protocol_version,
        )

    def _finalize_decision(self, proposal: RecoveryProposal, decision: AgentDecisionReceipt) -> None:
        if proposal.idempotency_key:
            self._idempotency_cache[proposal.idempotency_key] = decision

        self._recent_decisions.append(decision)
        if len(self._recent_decisions) > 200:
            self._recent_decisions.pop(0)

        # Update dynamic agent trust score
        agent_registry.record_proposal_outcome(proposal.agent_id, decision.status.value)

        # Append to SHA-256 audit ledger
        add_audit_event(
            merchant_id=proposal.tenant_id,
            event_type=f"AGENT_DECISION_{decision.status.value}",
            actor=f"REVIVEOS_GOVERNOR",
            correlation_id=proposal.opportunity_id,
            event_data={
                "proposal_id": proposal.proposal_id,
                "agent_id": proposal.agent_id,
                "status": decision.status.value,
                "reason_code": decision.reason_code,
                "nic_inr": decision.net_incremental_contribution_inr,
                "tau": decision.causal_lift_tau,
                "contract_id": decision.action_contract.get("contract_id") if decision.action_contract else None,
                "decision_receipt_hash": decision.decision_receipt_hash,
            },
            case_id=proposal.opportunity_id,
            amount_inr=proposal.proposed_action.amount_inr,
        )

        if proposal.callback_url:
            asyncio.create_task(self._dispatch_callback(proposal.callback_url, decision))

    async def _dispatch_callback(self, callback_url: str, decision: AgentDecisionReceipt) -> None:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                body = decision.to_dict()
                await client.post(callback_url, json=body)
        except Exception as e:
            logger.debug(f"Async callback dispatch to {callback_url} failed: {e}")


agent_gateway = AgentGateway()
