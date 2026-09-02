# -*- coding: utf-8 -*-
"""
ReviveOS — Proposal State Machine & Stable Reason Code Taxonomy
Protocol Version: REVIVEOS-PROTOCOL-1.1
"""
from __future__ import annotations

import enum
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.security.canonical_signer import CURRENT_PROTOCOL_VERSION


class ProposalState(str, enum.Enum):
    CREATED = "CREATED"
    AUTHENTICATED = "AUTHENTICATED"
    AUTHORIZED = "AUTHORIZED"
    VALIDATED = "VALIDATED"
    ARBITRATING = "ARBITRATING"
    APPROVED = "APPROVED"
    WAIT = "WAIT"
    SUPPRESSED = "SUPPRESSED"
    HUMAN_REVIEW = "HUMAN_REVIEW"
    REJECTED = "REJECTED"
    CONTRACT_ISSUED = "CONTRACT_ISSUED"
    EXECUTION_PENDING = "EXECUTION_PENDING"
    EXECUTING = "EXECUTING"
    EXECUTED = "EXECUTED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"
    CANCELLED = "CANCELLED"


class ReasonCode(str, enum.Enum):
    # Customer Protection Invariants
    CUSTOMER_SOVEREIGNTY_OPT_OUT = "CUSTOMER_SOVEREIGNTY_OPT_OUT"
    CUSTOMER_ATTENTION_BUDGET_EXHAUSTED = "CUSTOMER_ATTENTION_BUDGET_EXHAUSTED"
    CUSTOMER_EXPLICIT_CANCELLATION = "CUSTOMER_EXPLICIT_CANCELLATION"

    # Economic & Causal Governance
    POSITIVE_NET_CONTRIBUTION = "POSITIVE_NET_CONTRIBUTION"
    NEGATIVE_NET_CONTRIBUTION = "NEGATIVE_NET_CONTRIBUTION"
    INSUFFICIENT_CAUSAL_LIFT = "INSUFFICIENT_CAUSAL_LIFT"
    NATURAL_SETTLEMENT_PREDICTED = "NATURAL_SETTLEMENT_PREDICTED"
    HIGHEST_NET_INCREMENTAL_CONTRIBUTION = "HIGHEST_NET_INCREMENTAL_CONTRIBUTION"
    SUPPRESSED_LOWER_NIC = "SUPPRESSED_LOWER_NIC"

    # Concurrency & Lease Invariants
    CONCURRENT_CASE_LOCK = "CONCURRENT_CASE_LOCK"
    DUPLICATE_ACTIVE_ACTION = "DUPLICATE_ACTIVE_ACTION"
    REPEATED_PROPOSAL_SUPPRESSED = "REPEATED_PROPOSAL_SUPPRESSED"

    # Capability & Access Authorization
    CAPABILITY_DENIED = "CAPABILITY_DENIED"
    AGENT_SUSPENDED = "AGENT_SUSPENDED"
    AGENT_REVOKED = "AGENT_REVOKED"
    AGENT_QUARANTINED = "AGENT_QUARANTINED"
    AMOUNT_LIMIT_EXCEEDED = "AMOUNT_LIMIT_EXCEEDED"
    PAYMENT_TYPE_NOT_ALLOWED = "PAYMENT_TYPE_NOT_ALLOWED"
    UNAUTHORIZED_TENANT = "UNAUTHORIZED_TENANT"
    UNKNOWN_AGENT = "UNKNOWN_AGENT"

    # Cryptographic & Protocol Integrity
    INVALID_SIGNATURE = "INVALID_SIGNATURE"
    REQUEST_REPLAYED = "REQUEST_REPLAYED"
    REQUEST_TIMESTAMP_INVALID = "REQUEST_TIMESTAMP_INVALID"
    PROTOCOL_VERSION_UNSUPPORTED = "PROTOCOL_VERSION_UNSUPPORTED"
    POLICY_VERSION_MISMATCH = "POLICY_VERSION_MISMATCH"
    INVALID_PROPOSAL = "INVALID_PROPOSAL"
    MISSING_ACTION_CONTRACT = "MISSING_ACTION_CONTRACT"

    # Action Contract State
    CONTRACT_EXPIRED = "CONTRACT_EXPIRED"
    CONTRACT_REVOKED = "CONTRACT_REVOKED"
    CONTRACT_ALREADY_CONSUMED = "CONTRACT_ALREADY_CONSUMED"
    PAYMENT_STATE_CHANGED = "PAYMENT_STATE_CHANGED"

    # Operational & Execution
    HUMAN_REVIEW_REQUIRED = "HUMAN_REVIEW_REQUIRED"
    PROVIDER_EXECUTION_FAILURE = "PROVIDER_EXECUTION_FAILURE"
    STALE_PROPOSAL = "STALE_PROPOSAL"


VALID_STATE_TRANSITIONS: Dict[ProposalState, Set[ProposalState]] = {
    ProposalState.CREATED: {ProposalState.AUTHENTICATED, ProposalState.REJECTED},
    ProposalState.AUTHENTICATED: {ProposalState.AUTHORIZED, ProposalState.REJECTED},
    ProposalState.AUTHORIZED: {ProposalState.VALIDATED, ProposalState.REJECTED},
    ProposalState.VALIDATED: {ProposalState.ARBITRATING, ProposalState.REJECTED},
    ProposalState.ARBITRATING: {
        ProposalState.APPROVED,
        ProposalState.WAIT,
        ProposalState.SUPPRESSED,
        ProposalState.HUMAN_REVIEW,
        ProposalState.REJECTED,
    },
    ProposalState.APPROVED: {ProposalState.CONTRACT_ISSUED, ProposalState.REVOKED, ProposalState.CANCELLED},
    ProposalState.CONTRACT_ISSUED: {ProposalState.EXECUTION_PENDING, ProposalState.REVOKED, ProposalState.EXPIRED, ProposalState.CANCELLED},
    ProposalState.EXECUTION_PENDING: {ProposalState.EXECUTING, ProposalState.REVOKED, ProposalState.CANCELLED},
    ProposalState.EXECUTING: {ProposalState.EXECUTED, ProposalState.FAILED, ProposalState.REVOKED},
    ProposalState.WAIT: {ProposalState.CANCELLED, ProposalState.EXPIRED},
    ProposalState.SUPPRESSED: {ProposalState.CANCELLED},
    ProposalState.HUMAN_REVIEW: {ProposalState.APPROVED, ProposalState.REJECTED, ProposalState.CANCELLED},
    ProposalState.REJECTED: set(),
    ProposalState.EXECUTED: set(),
    ProposalState.FAILED: set(),
    ProposalState.EXPIRED: set(),
    ProposalState.REVOKED: set(),
    ProposalState.CANCELLED: set(),
}


@dataclass
class ProposalRecord:
    proposal_id: str
    agent_id: str
    tenant_id: str
    case_id: str
    customer_id: str
    customer_name: str
    action_type: str
    amount_inr: float
    amount_paise: int
    proposal_version: int = 1
    currency: str = "INR"
    state: ProposalState = ProposalState.CREATED
    reason_code: Optional[ReasonCode] = None
    plain_language_reason: str = ""
    rationale: str = ""
    requested_channel: str = "RAZORPAY"
    idempotency_key: str = field(default_factory=lambda: f"IDEM-{uuid.uuid4().hex[:8].upper()}")
    protocol_version: str = CURRENT_PROTOCOL_VERSION
    estimated_recovery_probability: float = 0.85
    estimated_natural_recovery: float = 0.10
    tau: float = 0.75
    estimated_cost_inr: float = 4.0
    estimated_discount_inr: float = 0.0
    estimated_friction_inr: float = 1.0
    net_incremental_contribution_inr: float = 0.0
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at_epoch: int = field(default_factory=lambda: int(time.time()) + 300)
    decision_id: Optional[str] = None
    contract_id: Optional[str] = None
    state_history: List[Dict[str, Any]] = field(default_factory=list)

    def transition_to(self, new_state: ProposalState, reason: str = "") -> None:
        """Enforces deterministic state transitions."""
        allowed = VALID_STATE_TRANSITIONS.get(self.state, set())
        if new_state not in allowed:
            raise ValueError(f"Illegal state transition from {self.state.value} to {new_state.value}")
        
        timestamp = datetime.now(timezone.utc).isoformat()
        self.state_history.append({
            "from_state": self.state.value,
            "to_state": new_state.value,
            "timestamp": timestamp,
            "reason": reason,
        })
        self.state = new_state
        self.updated_at = timestamp

    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposal_id": self.proposal_id,
            "proposal_version": self.proposal_version,
            "agent_id": self.agent_id,
            "tenant_id": self.tenant_id,
            "case_id": self.case_id,
            "customer_id": self.customer_id,
            "customer_name": self.customer_name,
            "action_type": self.action_type,
            "amount_inr": self.amount_inr,
            "amount_paise": self.amount_paise,
            "currency": self.currency,
            "state": self.state.value,
            "reason_code": self.reason_code.value if self.reason_code else None,
            "plain_language_reason": self.plain_language_reason,
            "rationale": self.rationale,
            "requested_channel": self.requested_channel,
            "idempotency_key": self.idempotency_key,
            "protocol_version": self.protocol_version,
            "estimated_recovery_probability": self.estimated_recovery_probability,
            "estimated_natural_recovery": self.estimated_natural_recovery,
            "tau": self.tau,
            "estimated_cost_inr": self.estimated_cost_inr,
            "estimated_discount_inr": self.estimated_discount_inr,
            "estimated_friction_inr": self.estimated_friction_inr,
            "net_incremental_contribution_inr": self.net_incremental_contribution_inr,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "expires_at_epoch": self.expires_at_epoch,
            "decision_id": self.decision_id,
            "contract_id": self.contract_id,
            "state_history": self.state_history,
        }
