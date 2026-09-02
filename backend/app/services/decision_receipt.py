# -*- coding: utf-8 -*-
"""
ReviveOS — Cryptographic Decision Receipt & Canonical Decision Hash
Protocol Version: REVIVEOS-PROTOCOL-1.1
"""
from __future__ import annotations

import hashlib
import json
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.security.canonical_signer import CURRENT_PROTOCOL_VERSION
from app.services.proposal_lifecycle import ReasonCode


ACTIVE_POLICY_VERSION = "REVIVEOS-POLICY-2026-09-01"


@dataclass
class DecisionReceipt:
    decision_id: str
    proposal_id: str
    agent_id: str
    tenant_id: str
    case_id: str
    customer_id: str
    decision: str  # APPROVED | WAIT | SUPPRESSED | HUMAN_REVIEW | REJECTED
    reason_code: ReasonCode
    plain_language_reason: str
    policy_version: str = ACTIVE_POLICY_VERSION
    protocol_version: str = CURRENT_PROTOCOL_VERSION
    attention_state: str = "AVAILABLE"
    causal_lift_tau: float = 0.0
    natural_settlement_probability: float = 0.0
    net_incremental_contribution_inr: float = 0.0
    risk_score: float = 0.1
    autonomy_level: str = "LEVEL_3_AUTO_EXECUTE"
    contract_id: Optional[str] = None
    execution_authority: str = "FINANCIAL_GATEWAY_ONLY"
    retryable: bool = False
    next_allowed_at: Optional[str] = None
    issued_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    decision_hash: str = ""

    def __post_init__(self):
        if not self.decision_hash:
            self.decision_hash = self.compute_decision_hash()

    def compute_decision_hash(self) -> str:
        """
        Computes deterministic SHA-256 hash of immutable decision parameters.
        """
        raw = (
            f"{self.tenant_id}:"
            f"{self.case_id}:"
            f"{self.proposal_id}:"
            f"{self.agent_id}:"
            f"{self.decision}:"
            f"{self.reason_code.value}:"
            f"{self.policy_version}:"
            f"{self.net_incremental_contribution_inr:.2f}:"
            f"{self.contract_id or 'NONE'}:"
            f"{self.issued_at}"
        )
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "decision_id": self.decision_id,
            "proposal_id": self.proposal_id,
            "agent_id": self.agent_id,
            "tenant_id": self.tenant_id,
            "case_id": self.case_id,
            "customer_id": self.customer_id,
            "decision": self.decision,
            "status": self.decision,  # Backward compatibility
            "reason_code": self.reason_code.value,
            "plain_language_reason": self.plain_language_reason,
            "policy_version": self.policy_version,
            "protocol_version": self.protocol_version,
            "attention_state": self.attention_state,
            "causal_lift_tau": self.causal_lift_tau,
            "natural_settlement_probability": self.natural_settlement_probability,
            "net_incremental_contribution_inr": self.net_incremental_contribution_inr,
            "risk_score": self.risk_score,
            "autonomy_level": self.autonomy_level,
            "contract_id": self.contract_id,
            "execution_authority": self.execution_authority,
            "retryable": self.retryable,
            "next_allowed_at": self.next_allowed_at,
            "issued_at": self.issued_at,
            "decision_hash": self.decision_hash,
        }


class DecisionReceiptStore:
    def __init__(self):
        self._receipts: Dict[str, DecisionReceipt] = {}

    def store(self, receipt: DecisionReceipt) -> None:
        self._receipts[receipt.decision_id] = receipt
        self._receipts[receipt.proposal_id] = receipt

    def get_by_decision_id(self, decision_id: str) -> Optional[DecisionReceipt]:
        return self._receipts.get(decision_id)

    def get_by_proposal_id(self, proposal_id: str) -> Optional[DecisionReceipt]:
        return self._receipts.get(proposal_id)


decision_receipt_store = DecisionReceiptStore()
