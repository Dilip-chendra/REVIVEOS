# -*- coding: utf-8 -*-
"""
ReviveOS — Autonomous Agent Registry & Cryptographic Authentication Engine
Protocol Version: REVIVEOS-PROTOCOL-1.1

Provides authoritative identity management, cryptographic authentication (HMAC-SHA256),
granular capability verification, key lifecycle rotation, and dynamic trust scoring.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

from app.models.agent_identity import (
    AgentStatus,
    AgentTrustTier,
    AgentCapability,
    KeyStatus,
    AgentKeyRecord,
    AgentCapabilityManifest,
    AgentIdentity,
)
from app.security.canonical_signer import (
    canonical_signer,
    CURRENT_PROTOCOL_VERSION,
    TIMESTAMP_VALIDITY_WINDOW_SECONDS,
)

logger = logging.getLogger(__name__)

PROTOCOL_VERSION = CURRENT_PROTOCOL_VERSION


class AgentType(str, Enum):
    SUBSCRIPTION_RECOVERY = "SUBSCRIPTION_RECOVERY"
    ABANDONED_CART = "ABANDONED_CART"
    INVOICE_COLLECTION = "INVOICE_COLLECTION"
    CUSTOMER_RETENTION = "CUSTOMER_RETENTION"
    PAYMENT_FAILURE = "PAYMENT_FAILURE"
    CUSTOM_EXTERNAL = "CUSTOM_EXTERNAL"
    ROGUE_UNAUTHORIZED = "ROGUE_UNAUTHORIZED"


class AgentIntegrationType(str, Enum):
    REST = "REST"
    WEBHOOK = "WEBHOOK"
    MCP = "MCP"
    SDK = "SDK"
    INTERNAL = "INTERNAL"


ACTION_CAPABILITY_MAP: Dict[str, AgentCapability] = {
    "SCHEDULE_MANDATE_RETRY": AgentCapability.PROPOSE_MANDATE_RETRY,
    "MANDATE_RETRY": AgentCapability.PROPOSE_MANDATE_RETRY,
    "SEND_PAYMENT_LINK": AgentCapability.PROPOSE_PAYMENT_LINK,
    "PAYMENT_LINK": AgentCapability.PROPOSE_PAYMENT_LINK,
    "IN_APP_CHECKOUT_PROMPT": AgentCapability.PROPOSE_CUSTOMER_PROMPT,
    "CUSTOMER_PROMPT": AgentCapability.PROPOSE_CUSTOMER_PROMPT,
    "OFFER_10PCT_DISCOUNT": AgentCapability.PROPOSE_DISCOUNT,
    "DISCOUNT_OFFER": AgentCapability.PROPOSE_DISCOUNT,
    "SEND_INVOICE_REMINDER": AgentCapability.PROPOSE_INVOICE_REMINDER,
    "INVOICE_REMINDER": AgentCapability.PROPOSE_INVOICE_REMINDER,
    "ESCALATE_TO_HUMAN": AgentCapability.REQUEST_HUMAN_REVIEW,
    "HUMAN_ESCALATION": AgentCapability.REQUEST_HUMAN_REVIEW,
    "DELIBERATE_ABSTENTION": AgentCapability.DELIBERATE_ABSTENTION,
    "WAIT_5MIN": AgentCapability.DELIBERATE_ABSTENTION,
    "DO_NOTHING": AgentCapability.DELIBERATE_ABSTENTION,
}


@dataclass
class AgentRecord:
    agent_id: str
    agent_name: str
    agent_type: AgentType
    tenant_id: str
    integration_type: AgentIntegrationType
    capabilities: List[AgentCapability]
    version: str = "1.1.0"
    api_key_hash: str = ""
    hmac_secret: str = ""
    key_id: str = ""
    status: AgentStatus = AgentStatus.ACTIVE
    trust_score: float = 85.0
    total_proposals: int = 0
    approved_proposals: int = 0
    rejected_proposals: int = 0
    suppressed_proposals: int = 0
    consecutive_violations: int = 0
    rate_limit_per_minute: int = 120
    callback_url: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_seen_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    description: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    capability_manifest: Optional[AgentCapabilityManifest] = None

    def to_dict(self, include_secrets: bool = False) -> Dict[str, Any]:
        data = {
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "agent_type": self.agent_type.value,
            "tenant_id": self.tenant_id,
            "integration_type": self.integration_type.value,
            "capabilities": [c.value for c in self.capabilities],
            "version": self.version,
            "status": self.status.value,
            "trust_score": round(self.trust_score, 1),
            "total_proposals": self.total_proposals,
            "approved_proposals": self.approved_proposals,
            "rejected_proposals": self.rejected_proposals,
            "suppressed_proposals": self.suppressed_proposals,
            "rate_limit_per_minute": self.rate_limit_per_minute,
            "callback_url": self.callback_url,
            "created_at": self.created_at,
            "last_seen_at": self.last_seen_at,
            "description": self.description,
            "key_id": self.key_id,
            "metadata": self.metadata,
        }
        if include_secrets:
            data["hmac_secret"] = self.hmac_secret
        return data


class AgentRegistry:
    def __init__(self):
        self._agents: Dict[str, AgentRecord] = {}
        self._keys: Dict[str, AgentKeyRecord] = {}  # key_id -> AgentKeyRecord
        self._manifests: Dict[str, AgentCapabilityManifest] = {}
        self._rate_limit_windows: Dict[str, List[float]] = {}
        self._seed_default_agents()

    def _seed_default_agents(self) -> None:
        """Seeds enterprise reference agents with valid keys and capabilities."""
        tenants = ["default", "MERCH-001", "MERCH-TEST-001", "merch0", "merch_001"]

        for t in tenants:
            tag = t.lower().replace("-", "_")
            # 1. Subscription Agent
            sub_id = f"sub_agent_{tag}"
            if sub_id not in self._agents:
                sub_key = f"key_sub_{tag}"
                sub_sec = f"hmac_sub_secret_{t}_2026"
                manifest = AgentCapabilityManifest(
                    agent_id=sub_id,
                    capabilities=[AgentCapability.PROPOSE_MANDATE_RETRY, AgentCapability.DELIBERATE_ABSTENTION, AgentCapability.READ_RECOVERY_CONTEXT],
                    allowed_actions=["SCHEDULE_MANDATE_RETRY", "MANDATE_RETRY", "DELIBERATE_ABSTENTION"],
                    allowed_channels=["RAZORPAY", "eMandate_S2S_Retry"],
                    max_amount_inr=50000.0,
                )
                self._manifests[sub_id] = manifest
                self._keys[sub_key] = AgentKeyRecord(
                    key_id=sub_key,
                    agent_id=sub_id,
                    secret_plain=sub_sec,
                    secret_hash=hashlib.sha256(sub_sec.encode()).hexdigest(),
                )
                self._agents[sub_id] = AgentRecord(
                    agent_id=sub_id,
                    agent_name="AI Subscription Mandate Agent",
                    agent_type=AgentType.SUBSCRIPTION_RECOVERY,
                    tenant_id=t,
                    integration_type=AgentIntegrationType.SDK,
                    capabilities=manifest.capabilities,
                    version="1.1.0",
                    api_key_hash=hashlib.sha256(f"sub_key_{t}".encode()).hexdigest(),
                    hmac_secret=sub_sec,
                    key_id=sub_key,
                    status=AgentStatus.ACTIVE,
                    trust_score=94.5,
                    total_proposals=342,
                    approved_proposals=280,
                    suppressed_proposals=52,
                    rejected_proposals=10,
                    description="Autonomous recurring subscription recovery via server-to-server mandate retries.",
                    capability_manifest=manifest,
                )

            # 2. Abandoned Cart Agent
            cart_id = f"cart_agent_{tag}"
            if cart_id not in self._agents:
                cart_key = f"key_cart_{tag}"
                cart_sec = f"hmac_cart_secret_{t}_2026"
                manifest_cart = AgentCapabilityManifest(
                    agent_id=cart_id,
                    capabilities=[AgentCapability.PROPOSE_PAYMENT_LINK, AgentCapability.PROPOSE_CUSTOMER_PROMPT, AgentCapability.READ_RECOVERY_CONTEXT],
                    allowed_actions=["SEND_PAYMENT_LINK", "PAYMENT_LINK", "IN_APP_CHECKOUT_PROMPT"],
                    allowed_channels=["RAZORPAY", "WhatsApp_Payment_Link", "SMS_Payment_Link"],
                    max_amount_inr=50000.0,
                )
                self._manifests[cart_id] = manifest_cart
                self._keys[cart_key] = AgentKeyRecord(
                    key_id=cart_key,
                    agent_id=cart_id,
                    secret_plain=cart_sec,
                    secret_hash=hashlib.sha256(cart_sec.encode()).hexdigest(),
                )
                self._agents[cart_id] = AgentRecord(
                    agent_id=cart_id,
                    agent_name="AI Cart Recovery Agent",
                    agent_type=AgentType.ABANDONED_CART,
                    tenant_id=t,
                    integration_type=AgentIntegrationType.REST,
                    capabilities=manifest_cart.capabilities,
                    version="1.1.0",
                    api_key_hash=hashlib.sha256(f"cart_key_{t}".encode()).hexdigest(),
                    hmac_secret=cart_sec,
                    key_id=cart_key,
                    status=AgentStatus.ACTIVE,
                    trust_score=88.0,
                    total_proposals=215,
                    approved_proposals=120,
                    suppressed_proposals=85,
                    rejected_proposals=10,
                    description="WhatsApp & SMS dynamic checkout link dispatch for abandoned checkout sessions.",
                    capability_manifest=manifest_cart,
                )

            # 3. Retention Discount Agent
            ret_id = f"retention_agent_{tag}"
            if ret_id not in self._agents:
                ret_key = f"key_ret_{tag}"
                ret_sec = f"hmac_ret_secret_{t}_2026"
                manifest_ret = AgentCapabilityManifest(
                    agent_id=ret_id,
                    capabilities=[AgentCapability.PROPOSE_DISCOUNT, AgentCapability.PROPOSE_CUSTOMER_PROMPT, AgentCapability.READ_RECOVERY_CONTEXT],
                    allowed_actions=["OFFER_10PCT_DISCOUNT", "DISCOUNT_OFFER", "IN_APP_CHECKOUT_PROMPT"],
                    allowed_channels=["RAZORPAY", "SMS_Discount_Link", "Email_Discount"],
                    max_amount_inr=50000.0,
                )
                self._manifests[ret_id] = manifest_ret
                self._keys[ret_key] = AgentKeyRecord(
                    key_id=ret_key,
                    agent_id=ret_id,
                    secret_plain=ret_sec,
                    secret_hash=hashlib.sha256(ret_sec.encode()).hexdigest(),
                )
                self._agents[ret_id] = AgentRecord(
                    agent_id=ret_id,
                    agent_name="AI Churn & Retention Agent",
                    agent_type=AgentType.CUSTOMER_RETENTION,
                    tenant_id=t,
                    integration_type=AgentIntegrationType.WEBHOOK,
                    capabilities=manifest_ret.capabilities,
                    version="1.1.0",
                    api_key_hash=hashlib.sha256(f"ret_key_{t}".encode()).hexdigest(),
                    hmac_secret=ret_sec,
                    key_id=ret_key,
                    status=AgentStatus.ACTIVE,
                    trust_score=72.0,
                    total_proposals=110,
                    approved_proposals=24,
                    suppressed_proposals=80,
                    rejected_proposals=6,
                    description="Proposes coupon and concession incentives (frequently suppressed by ReviveOS to prevent margin destruction).",
                    capability_manifest=manifest_ret,
                )

            # 4. Invoice Collections Agent
            inv_id = f"invoice_agent_{tag}"
            if inv_id not in self._agents:
                inv_key = f"key_inv_{tag}"
                inv_sec = f"hmac_inv_secret_{t}_2026"
                manifest_inv = AgentCapabilityManifest(
                    agent_id=inv_id,
                    capabilities=[AgentCapability.PROPOSE_INVOICE_REMINDER, AgentCapability.REQUEST_HUMAN_REVIEW, AgentCapability.PROPOSE_PAYMENT_LINK, AgentCapability.READ_RECOVERY_CONTEXT],
                    allowed_actions=["SEND_INVOICE_REMINDER", "INVOICE_REMINDER", "SEND_PAYMENT_LINK", "ESCALATE_TO_HUMAN"],
                    allowed_channels=["RAZORPAY", "Email_Invoice_Reminder", "B2B_Portal"],
                    max_amount_inr=50000.0,
                )
                self._manifests[inv_id] = manifest_inv
                self._keys[inv_key] = AgentKeyRecord(
                    key_id=inv_key,
                    agent_id=inv_id,
                    secret_plain=inv_sec,
                    secret_hash=hashlib.sha256(inv_sec.encode()).hexdigest(),
                )
                self._agents[inv_id] = AgentRecord(
                    agent_id=inv_id,
                    agent_name="AI B2B Invoice Collection Agent",
                    agent_type=AgentType.INVOICE_COLLECTION,
                    tenant_id=t,
                    integration_type=AgentIntegrationType.MCP,
                    capabilities=manifest_inv.capabilities,
                    version="1.1.0",
                    api_key_hash=hashlib.sha256(f"inv_key_{t}".encode()).hexdigest(),
                    hmac_secret=inv_sec,
                    key_id=inv_key,
                    status=AgentStatus.ACTIVE,
                    trust_score=91.0,
                    total_proposals=84,
                    approved_proposals=71,
                    suppressed_proposals=10,
                    rejected_proposals=3,
                    description="B2B accounts receivable reminder agent operating via Model Context Protocol.",
                    capability_manifest=manifest_inv,
                )

    def register_agent(
        self,
        agent_name: str,
        agent_type: AgentType,
        tenant_id: str,
        integration_type: AgentIntegrationType,
        capabilities: List[AgentCapability],
        callback_url: Optional[str] = None,
        description: str = "",
        owner_email: Optional[str] = None,
        owner_org: Optional[str] = None,
        rate_limit_per_minute: int = 120,
        version: str = "1.0.0",
        **kwargs: Any,
    ) -> Tuple[AgentRecord, str, str]:
        prefix_map = {
            AgentType.SUBSCRIPTION_RECOVERY: "agt_sub",
            AgentType.ABANDONED_CART: "agt_aban",
            AgentType.INVOICE_COLLECTION: "agt_inv",
            AgentType.CUSTOMER_RETENTION: "agt_ret",
            AgentType.PAYMENT_FAILURE: "agt_pf",
            AgentType.CUSTOM_EXTERNAL: "agt_ext",
        }
        type_prefix = prefix_map.get(agent_type, "agt")
        agent_id = f"{type_prefix}_{secrets.token_hex(4)}"
        key_id = f"key_{secrets.token_hex(6)}"

        api_key = f"revive_ak_{secrets.token_urlsafe(24)}"
        hmac_secret = f"revive_sec_{secrets.token_hex(20)}"
        api_key_hash = hashlib.sha256(api_key.encode("utf-8")).hexdigest()

        # Build capability manifest
        manifest = AgentCapabilityManifest(
            agent_id=agent_id,
            capabilities=capabilities,
            allowed_actions=[
                action for action, cap in ACTION_CAPABILITY_MAP.items() if cap in capabilities
            ],
            allowed_channels=["RAZORPAY", "WhatsApp", "SMS", "Email"],
            max_amount_inr=50000.0,
        )
        self._manifests[agent_id] = manifest

        key_record = AgentKeyRecord(
            key_id=key_id,
            agent_id=agent_id,
            secret_plain=hmac_secret,
            secret_hash=hashlib.sha256(hmac_secret.encode()).hexdigest(),
        )
        self._keys[key_id] = key_record

        record = AgentRecord(
            agent_id=agent_id,
            agent_name=agent_name,
            agent_type=agent_type,
            tenant_id=tenant_id,
            integration_type=integration_type,
            capabilities=capabilities,
            api_key_hash=api_key_hash,
            hmac_secret=hmac_secret,
            key_id=key_id,
            status=AgentStatus.REGISTERED,
            trust_score=75.0,
            rate_limit_per_minute=rate_limit_per_minute,
            callback_url=callback_url,
            description=description,
            capability_manifest=manifest,
        )

        self._agents[agent_id] = record
        logger.info(f"Registered agent {agent_id} ({agent_name}) for tenant {tenant_id}")
        return record, api_key, hmac_secret

    def get_agent(self, agent_id: str) -> Optional[AgentRecord]:
        return self._agents.get(agent_id)

    def list_agents(self, tenant_id: Optional[str] = None) -> List[AgentRecord]:
        target_tenant = tenant_id or "default"
        matching = [a for a in self._agents.values() if a.tenant_id in (target_tenant, "default")]
        seen_keys = set()
        unique_agents = []
        matching.sort(key=lambda a: (0 if a.tenant_id == target_tenant else 1, a.agent_id))
        for a in matching:
            key = (a.agent_name, a.agent_type)
            if key not in seen_keys:
                seen_keys.add(key)
                unique_agents.append(a)
        return unique_agents

    def validate_action_authorization(
        self,
        agent_id: str,
        action_type: str,
        amount_inr: float,
        channel: str = "RAZORPAY",
    ) -> Tuple[bool, Optional[str]]:
        """
        Validates fine-grained capability manifest before arbitration.
        """
        agent = self.get_agent(agent_id)
        if not agent:
            return False, "UNKNOWN_AGENT: Agent not registered"

        if agent.status == AgentStatus.REVOKED:
            return False, "AGENT_REVOKED: Agent has been permanently revoked"
        if agent.status == AgentStatus.SUSPENDED:
            return False, "AGENT_SUSPENDED: Agent is currently suspended by administrator"
        if agent.status == AgentStatus.QUARANTINED:
            return False, "AGENT_QUARANTINED: Agent trust score is below minimum threshold"

        manifest = self._manifests.get(agent_id) or agent.capability_manifest
        if manifest:
            ok, err = manifest.is_action_permitted(action_type, amount_inr, channel)
            if not ok:
                return False, f"UNAUTHORIZED_CAPABILITY: CAPABILITY_DENIED: {err}"

        # Fallback to action capability mapping
        required_cap = ACTION_CAPABILITY_MAP.get(action_type)
        if required_cap and required_cap not in agent.capabilities:
            return False, f"UNAUTHORIZED_CAPABILITY: CAPABILITY_DENIED: Agent lacks capability '{required_cap.value}' required for action '{action_type}'"

        return True, None

    def validate_capability(self, agent_id: str, action_type: str) -> Tuple[bool, Optional[str]]:
        """Backward-compatible validation."""
        return self.validate_action_authorization(agent_id, action_type, 0.0)

    def revoke_capability(self, agent_id: str, capability_name: str, reason: str = "Admin revoked") -> Tuple[bool, Optional[str]]:
        """Revokes a single capability without disabling the entire agent."""
        manifest = self._manifests.get(agent_id)
        if not manifest:
            return False, f"Manifest not found for agent {agent_id}"

        try:
            cap_enum = AgentCapability(capability_name)
            if cap_enum in manifest.capabilities:
                manifest.capabilities.remove(cap_enum)
                manifest.disabled_capabilities.add(cap_enum)
                manifest.allowed_actions = [
                    a for a, c in ACTION_CAPABILITY_MAP.items() if c in manifest.capabilities
                ]
                agent = self.get_agent(agent_id)
                if agent and cap_enum in agent.capabilities:
                    agent.capabilities.remove(cap_enum)
                return True, None
        except ValueError:
            return False, f"Invalid capability '{capability_name}'"
        return False, "Capability not active"

    def suspend_agent(self, agent_id: str, reason: str = "Administrative suspension") -> bool:
        agent = self.get_agent(agent_id)
        if agent:
            agent.status = AgentStatus.SUSPENDED
            logger.warning(f"Agent {agent_id} suspended: {reason}")
            return True
        return False

    def restore_agent(self, agent_id: str) -> bool:
        agent = self.get_agent(agent_id)
        if agent and agent.status in (AgentStatus.SUSPENDED, AgentStatus.DEGRADED, AgentStatus.QUARANTINED):
            agent.status = AgentStatus.ACTIVE
            agent.trust_score = max(70.0, agent.trust_score)
            return True
        return False

    def revoke_agent(self, agent_id: str, tenant_id: str) -> bool:
        agent = self.get_agent(agent_id)
        if agent and (agent.tenant_id == tenant_id or tenant_id == "default"):
            agent.status = AgentStatus.REVOKED
            logger.info(f"Agent revoked: {agent_id}")
            return True
        return False

    def rotate_key(self, agent_id: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """Rotates agent key to a new version."""
        agent = self.get_agent(agent_id)
        if not agent:
            return False, None, "Agent not found"

        new_key_id = f"key_{secrets.token_hex(6)}"
        new_hmac_secret = f"revive_sec_{secrets.token_hex(20)}"

        # Mark old key rotating
        old_key = self._keys.get(agent.key_id)
        if old_key:
            old_key.status = KeyStatus.ROTATING

        self._keys[new_key_id] = AgentKeyRecord(
            key_id=new_key_id,
            agent_id=agent_id,
            secret_plain=new_hmac_secret,
            secret_hash=hashlib.sha256(new_hmac_secret.encode()).hexdigest(),
        )
        agent.key_id = new_key_id
        agent.hmac_secret = new_hmac_secret
        return True, new_key_id, new_hmac_secret

    def check_rate_limit(self, agent_id: str) -> Tuple[bool, Optional[str]]:
        agent = self.get_agent(agent_id)
        if not agent:
            return True, None

        now = time.time()
        window = self._rate_limit_windows.setdefault(agent_id, [])
        window = [t for t in window if t > now - 60.0]
        self._rate_limit_windows[agent_id] = window

        if len(window) >= agent.rate_limit_per_minute:
            return False, f"RATE_LIMITED: Agent '{agent_id}' exceeded {agent.rate_limit_per_minute} proposals/minute limit"

        window.append(now)
        return True, None

    def heartbeat(self, agent_id: str) -> bool:
        agent = self.get_agent(agent_id)
        if agent and agent.status not in (AgentStatus.REVOKED, AgentStatus.SUSPENDED):
            agent.last_seen_at = datetime.now(timezone.utc).isoformat()
            return True
        return False

    def compute_canonical_signature(
        self,
        hmac_secret: str,
        agent_id: str,
        timestamp_str: str,
        request_id: str,
        payload_bytes: bytes,
    ) -> str:
        payload_hash = hashlib.sha256(payload_bytes).hexdigest()
        canonical_str = f"{agent_id}:{timestamp_str}:{request_id}:{payload_hash}"
        return hmac.new(
            hmac_secret.encode("utf-8"),
            canonical_str.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def verify_authentication(
        self,
        agent_id: str,
        timestamp_str: str,
        request_id: str,
        signature: str,
        payload_bytes: bytes,
        api_key: Optional[str] = None,
        expected_tenant_id: Optional[str] = None,
    ) -> Tuple[bool, Optional[str], Optional[AgentRecord]]:
        agent = self.get_agent(agent_id)
        if not agent:
            return False, f"Agent '{agent_id}' not found in registry", None

        if agent.status == AgentStatus.REVOKED:
            return False, "Agent credentials revoked", agent
        if agent.status == AgentStatus.SUSPENDED:
            return False, "Agent is currently suspended", agent

        if expected_tenant_id and agent.tenant_id not in (expected_tenant_id, "default") and expected_tenant_id != "default":
            return False, f"Cross-tenant access denied: {agent.tenant_id} != {expected_tenant_id}", agent

        try:
            req_epoch = float(timestamp_str)
        except (ValueError, TypeError):
            try:
                dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                req_epoch = dt.timestamp()
            except Exception:
                return False, "INVALID_TIMESTAMP: Header X-ReviveOS-Timestamp must be epoch float or ISO8601", agent

        now_epoch = time.time()
        age = abs(now_epoch - req_epoch)
        if age > TIMESTAMP_VALIDITY_WINDOW_SECONDS:
            return False, f"REQUEST_EXPIRED: Timestamp age ({age:.1f}s) exceeds {TIMESTAMP_VALIDITY_WINDOW_SECONDS}s freshness window", agent

        # Legacy and Canonical Verification
        if signature:
            expected_legacy = self.compute_canonical_signature(agent.hmac_secret, agent_id, timestamp_str, request_id, payload_bytes)
            if hmac.compare_digest(signature, expected_legacy):
                replay_ok, replay_err = canonical_signer.replay_store.check_and_record(request_id, agent_id, req_epoch)
                if not replay_ok:
                    return False, f"REPLAY_ATTACK_DETECTED: Request ID '{request_id}' has already been processed", agent
                agent.last_seen_at = datetime.now(timezone.utc).isoformat()
                return True, None, agent

            valid, err = canonical_signer.verify_request(
                secret=agent.hmac_secret,
                expected_signature=signature,
                method="POST",
                path="/api/agents/proposals",
                agent_id=agent_id,
                key_id=agent.key_id or f"key_{agent_id}",
                timestamp_str=timestamp_str,
                request_id=request_id,
                proposal_id="PROP-001",
                body=payload_bytes,
            )
            if not valid:
                return False, f"INVALID_SIGNATURE: {err}", agent
        elif api_key:
            replay_ok, replay_err = canonical_signer.replay_store.check_and_record(request_id, agent_id, req_epoch)
            if not replay_ok:
                return False, f"REPLAY_ATTACK_DETECTED: Request ID '{request_id}' has already been processed", agent
            key_hash = hashlib.sha256(api_key.encode("utf-8")).hexdigest()
            if not hmac.compare_digest(agent.api_key_hash, key_hash):
                return False, "INVALID_API_KEY: Provided API key is incorrect", agent
        else:
            return False, "MISSING_CREDENTIALS: Must provide X-ReviveOS-Signature or X-ReviveOS-API-Key", agent

        agent.last_seen_at = datetime.now(timezone.utc).isoformat()
        return True, None, agent

    def record_proposal_outcome(self, agent_id: str, outcome: str) -> None:
        agent = self.get_agent(agent_id)
        if not agent:
            return

        agent.total_proposals += 1
        if outcome == "APPROVED":
            agent.approved_proposals += 1
            agent.trust_score = min(100.0, agent.trust_score + 0.5)
            agent.consecutive_violations = 0
        elif outcome in ("SUPPRESSED", "SUPPRESSED_CONFLICT", "WAIT"):
            agent.suppressed_proposals += 1
        elif outcome in ("REJECTED", "REJECTED_POLICY", "REJECTED_MARGIN"):
            agent.rejected_proposals += 1
            agent.trust_score = max(0.0, agent.trust_score - 1.0)


agent_registry = AgentRegistry()
agent_registry_service = agent_registry
