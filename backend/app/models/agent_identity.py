# -*- coding: utf-8 -*-
"""
ReviveOS — Agent Identity, Granular Capability Manifest & Key Lifecycle Models
Protocol Version: REVIVEOS-PROTOCOL-1.1
"""
from __future__ import annotations

import enum
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, JSON, Text, Enum as SAEnum
from sqlalchemy.sql import func

from app.database import Base


class AgentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    REGISTERED = "REGISTERED"
    PROBATION = "PROBATION"
    TRUSTED = "TRUSTED"
    DEGRADED = "DEGRADED"
    QUARANTINED = "QUARANTINED"
    SUSPENDED = "SUSPENDED"
    REVOKED = "REVOKED"


class AgentTrustTier(str, enum.Enum):
    TRUSTED = "TRUSTED"        # Trust score >= 80 (Full autonomous permissions)
    MONITORED = "MONITORED"    # Trust score 60-79 (Increased audit logging)
    RESTRICTED = "RESTRICTED"  # Trust score 40-59 (Requires Human Review)
    QUARANTINED = "QUARANTINED"# Trust score < 40 (Proposals blocked)


class AgentCapability(str, enum.Enum):
    READ_RECOVERY_CONTEXT = "READ_RECOVERY_CONTEXT"
    READ_PAYMENT_STATE = "READ_PAYMENT_STATE"
    PROPOSE_MANDATE_RETRY = "PROPOSE_MANDATE_RETRY"
    PROPOSE_PAYMENT_LINK = "PROPOSE_PAYMENT_LINK"
    PROPOSE_CUSTOMER_PROMPT = "PROPOSE_CUSTOMER_PROMPT"
    PROPOSE_DISCOUNT = "PROPOSE_DISCOUNT"
    PROPOSE_INVOICE_REMINDER = "PROPOSE_INVOICE_REMINDER"
    REQUEST_HUMAN_REVIEW = "REQUEST_HUMAN_REVIEW"
    DELIBERATE_ABSTENTION = "DELIBERATE_ABSTENTION"
    # Backward-compatible names
    MANDATE_RETRY = "MANDATE_RETRY"
    PAYMENT_LINK = "PAYMENT_LINK"
    CUSTOMER_PROMPT = "CUSTOMER_PROMPT"
    DISCOUNT_OFFER = "DISCOUNT_OFFER"
    INVOICE_REMINDER = "INVOICE_REMINDER"
    HUMAN_ESCALATION = "HUMAN_ESCALATION"
    WAIT_OBSERVE = "WAIT_OBSERVE"


class KeyStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ROTATING = "ROTATING"  # Accepts signatures while new key is established
    REVOKED = "REVOKED"


# ── SQLAlchemy ORM Models ────────────────────────────────────────────────────

class AgentIdentityModel(Base):
    __tablename__ = "agent_identities"

    agent_id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), nullable=False, index=True)
    agent_name = Column(String(128), nullable=False)
    agent_type = Column(String(64), nullable=False)
    status = Column(String(32), default=AgentStatus.ACTIVE.value, nullable=False)
    key_id = Column(String(64), nullable=False)
    key_version = Column(Integer, default=1, nullable=False)
    trust_score = Column(Float, default=85.0, nullable=False)
    capability_version = Column(String(32), default="v1.1", nullable=False)
    rate_limit_per_minute = Column(Integer, default=120, nullable=False)
    owner_email = Column(String(128), nullable=True)
    owner_org = Column(String(128), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_seen_at = Column(DateTime(timezone=True), nullable=True)


class AgentCapabilityManifestModel(Base):
    __tablename__ = "agent_capability_manifests"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(64), nullable=False, index=True)
    capabilities = Column(JSON, default=list, nullable=False)
    allowed_actions = Column(JSON, default=list, nullable=False)
    allowed_channels = Column(JSON, default=list, nullable=False)
    max_amount_inr = Column(Float, default=50000.0, nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    revocation_reason = Column(String(256), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AgentKeyRecordModel(Base):
    __tablename__ = "agent_key_records"

    key_id = Column(String(64), primary_key=True, index=True)
    agent_id = Column(String(64), nullable=False, index=True)
    secret_hash = Column(String(128), nullable=False)
    version = Column(Integer, default=1, nullable=False)
    status = Column(String(32), default=KeyStatus.ACTIVE.value, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    activated_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)


# ── Dataclasses for In-Memory & Runtime Processing ────────────────────────────

@dataclass
class AgentKeyRecord:
    key_id: str
    agent_id: str
    secret_plain: str
    secret_hash: str
    version: int = 1
    status: KeyStatus = KeyStatus.ACTIVE
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    activated_at: Optional[str] = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    revoked_at: Optional[str] = None


@dataclass
class AgentCapabilityManifest:
    agent_id: str
    capabilities: List[AgentCapability] = field(default_factory=list)
    allowed_actions: List[str] = field(default_factory=list)
    allowed_channels: List[str] = field(default_factory=list)
    max_amount_inr: float = 50000.0
    is_revoked: bool = False
    revocation_reason: Optional[str] = None
    disabled_capabilities: Set[AgentCapability] = field(default_factory=set)

    def is_action_permitted(self, action_type: str, amount_inr: float, channel: str = "RAZORPAY") -> Tuple[bool, Optional[str]]:
        if self.is_revoked:
            return False, f"Capability manifest revoked for agent '{self.agent_id}': {self.revocation_reason}"
        if amount_inr > self.max_amount_inr:
            return False, f"Proposed amount INR {amount_inr:,.2f} exceeds agent ceiling of INR {self.max_amount_inr:,.2f}"
        if self.allowed_actions and action_type not in self.allowed_actions:
            return False, f"Action '{action_type}' is not authorized in manifest for agent '{self.agent_id}'"
        if self.allowed_channels and channel not in self.allowed_channels:
            return False, f"Channel '{channel}' is not authorized in manifest for agent '{self.agent_id}'"
        return True, None


@dataclass
class AgentIdentity:
    agent_id: str
    tenant_id: str
    agent_name: str
    agent_type: str
    status: AgentStatus = AgentStatus.ACTIVE
    key_id: str = ""
    key_version: int = 1
    trust_score: float = 85.0
    capability_version: str = "v1.1"
    rate_limit_per_minute: int = 120
    owner_email: Optional[str] = None
    owner_org: Optional[str] = None
    description: Optional[str] = None
    consecutive_violations: int = 0
    total_proposals: int = 0
    approved_proposals: int = 0
    rejected_proposals: int = 0
    suppressed_proposals: int = 0
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_seen_at: Optional[str] = None

    @property
    def trust_tier(self) -> AgentTrustTier:
        if self.status in (AgentStatus.REVOKED, AgentStatus.SUSPENDED, AgentStatus.QUARANTINED):
            return AgentTrustTier.QUARANTINED
        if self.trust_score >= 80.0:
            return AgentTrustTier.TRUSTED
        elif self.trust_score >= 60.0:
            return AgentTrustTier.MONITORED
        elif self.trust_score >= 40.0:
            return AgentTrustTier.RESTRICTED
        else:
            return AgentTrustTier.QUARANTINED

    def recalculate_trust(self) -> None:
        """
        Deterministic Trust Score Formula:
        Trust = Base (80.0)
                + (0.2 * approved_proposals)
                - (2.0 * rejected_proposals)
                - (5.0 * consecutive_violations)
        Clamped between 0.0 and 100.0.
        """
        raw_score = 80.0 + (0.2 * self.approved_proposals) - (2.0 * self.rejected_proposals) - (5.0 * self.consecutive_violations)
        self.trust_score = max(0.0, min(100.0, round(raw_score, 1)))

        # Automatically downgrade lifecycle status if trust collapses
        if self.trust_score < 40.0 and self.status == AgentStatus.ACTIVE:
            self.status = AgentStatus.QUARANTINED
        elif self.trust_score < 60.0 and self.status == AgentStatus.ACTIVE:
            self.status = AgentStatus.DEGRADED


def compute_deterministic_trust_score(
    approved_count: int,
    rejected_count: int,
    total_proposals: int,
    consecutive_violations: int = 0,
    base_score: float = 80.0,
) -> float:
    raw = base_score + (0.2 * approved_count) - (2.0 * rejected_count) - (5.0 * consecutive_violations)
    return max(0.0, min(100.0, round(raw, 1)))
