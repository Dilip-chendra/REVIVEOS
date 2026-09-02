# -*- coding: utf-8 -*-
"""
ReviveOS Agent Client SDK (Python)
Protocol Version: REVIVEOS-PROTOCOL-1.1

Allows external AI recovery agents (LangChain, CrewAI, AutoGen, or custom microservices)
to register, authenticate, submit structured proposals, and receive authoritative
governance decisions from ReviveOS.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time
import uuid
from typing import Any, Dict, List, Optional, Union

import requests


class ReviveOSAgentClient:
    def __init__(
        self,
        base_url: str = "http://127.0.0.1:8000",
        agent_id: Optional[str] = None,
        hmac_secret: Optional[str] = None,
        key_id: Optional[str] = None,
        api_key: Optional[str] = None,
        tenant_id: str = "default",
        timeout: float = 10.0,
        protocol_version: str = "REVIVEOS-PROTOCOL-1.1",
    ):
        self.base_url = base_url.rstrip("/")
        self.agent_id = agent_id
        self.hmac_secret = hmac_secret
        self.key_id = key_id or (f"key_{agent_id}" if agent_id else None)
        self.api_key = api_key
        self.tenant_id = tenant_id
        self.timeout = timeout
        self.protocol_version = protocol_version

    def register(
        self,
        agent_name: str,
        agent_type: str = "CUSTOM_EXTERNAL",
        capabilities: Optional[List[str]] = None,
        integration_type: str = "SDK",
        callback_url: Optional[str] = None,
        description: str = "External AI Recovery Agent",
        rate_limit_per_minute: int = 120,
    ) -> Dict[str, Any]:
        """Registers this agent with ReviveOS to obtain credentials."""
        payload = {
            "agent_name": agent_name,
            "agent_type": agent_type,
            "integration_type": integration_type,
            "capabilities": capabilities or ["PAYMENT_LINK", "MANDATE_RETRY"],
            "version": "1.1.0",
            "callback_url": callback_url,
            "description": description,
            "tenant_id": self.tenant_id,
            "rate_limit_per_minute": rate_limit_per_minute,
        }

        url = f"{self.base_url}/api/agents/register"
        resp = requests.post(url, json=payload, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()

        self.agent_id = data["agent"]["agent_id"]
        self.api_key = data["credentials"]["api_key"]
        self.hmac_secret = data["credentials"]["hmac_secret"]
        self.key_id = data["credentials"]["key_id"]
        return data

    def _generate_canonical_headers(
        self,
        method: str,
        path: str,
        payload_bytes: bytes,
        proposal_id: str = "PROP-001",
    ) -> Dict[str, str]:
        """Generates canonical HMAC-SHA256 signature headers for request verification."""
        if not self.agent_id:
            raise ValueError("Agent ID not configured. Call register() or provide agent_id.")

        timestamp_str = str(time.time())
        request_id = f"req_{uuid.uuid4().hex[:12]}"
        key_id = self.key_id or f"key_{self.agent_id}"

        headers = {
            "Content-Type": "application/json",
            "X-ReviveOS-Agent-ID": self.agent_id,
            "X-ReviveOS-Key-ID": key_id,
            "X-ReviveOS-Timestamp": timestamp_str,
            "X-ReviveOS-Request-ID": request_id,
            "X-ReviveOS-Proposal-ID": proposal_id,
            "X-ReviveOS-Protocol-Version": self.protocol_version,
        }

        if self.hmac_secret:
            payload_hash = hashlib.sha256(payload_bytes).hexdigest()
            canonical_str = (
                f"{method.upper().strip()}\n"
                f"{path.strip()}\n"
                f"{self.agent_id}\n"
                f"{key_id}\n"
                f"{timestamp_str}\n"
                f"{request_id}\n"
                f"{proposal_id}\n"
                f"{self.protocol_version}\n"
                f"{payload_hash}"
            )
            sig = hmac.new(
                self.hmac_secret.encode("utf-8"),
                canonical_str.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            headers["X-ReviveOS-Signature"] = sig
        elif self.api_key:
            headers["X-ReviveOS-API-Key"] = self.api_key

        return headers

    def get_opportunity_context(self, opportunity_id: str) -> Dict[str, Any]:
        """Fetch non-PII scoped signals, half-life decay, and eligible recovery actions."""
        url = f"{self.base_url}/api/agents/opportunities/{opportunity_id}/context"
        headers = {}
        if self.agent_id:
            headers["X-ReviveOS-Agent-ID"] = self.agent_id

        resp = requests.get(url, headers=headers, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def submit_proposal(
        self,
        opportunity_id: str,
        customer_id: str,
        action_type: str,
        amount_paise: int,
        customer_name: str = "Valued Customer",
        estimated_recovery_probability: float = 0.85,
        estimated_natural_recovery: float = 0.10,
        estimated_cost_paise: int = 400,
        estimated_discount_paise: int = 0,
        estimated_friction: float = 0.0,
        confidence: float = 0.90,
        reason: str = "Agent recovery hypothesis",
        idempotency_key: Optional[str] = None,
        callback_url: Optional[str] = None,
        auto_execute: bool = False,
    ) -> Dict[str, Any]:
        """
        Submits an authenticated recovery proposal to ReviveOS for arbitration.
        Returns: Decision receipt (APPROVED, WAIT, SUPPRESSED_CONFLICT, REJECTED).
        """
        prop_id = f"PROP-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "proposal_id": prop_id,
            "protocol_version": self.protocol_version,
            "agent_id": self.agent_id,
            "tenant_id": self.tenant_id,
            "opportunity_id": opportunity_id,
            "customer_id": customer_id,
            "customer_name": customer_name,
            "proposed_action": {
                "type": action_type,
                "amount_paise": amount_paise,
                "channel": "RAZORPAY",
            },
            "estimated_cost_paise": estimated_cost_paise,
            "estimated_discount_paise": estimated_discount_paise,
            "estimated_friction": estimated_friction,
            "estimated_recovery_probability": estimated_recovery_probability,
            "estimated_natural_recovery": estimated_natural_recovery,
            "confidence": confidence,
            "reason": reason,
            "idempotency_key": idempotency_key or f"idem_{uuid.uuid4().hex[:12]}",
            "callback_url": callback_url,
            "auto_execute": auto_execute,
        }

        body_bytes = json.dumps(payload).encode("utf-8")
        headers = self._generate_canonical_headers(
            method="POST",
            path="/api/agents/proposals",
            payload_bytes=body_bytes,
            proposal_id=prop_id,
        )

        url = f"{self.base_url}/api/agents/proposals"
        resp = requests.post(url, data=body_bytes, headers=headers, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def execute_with_contract(self, case_id: str, action_type: str, signed_contract: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatches an authorized action with signed Action Contract to the Financial Gateway."""
        url = f"{self.base_url}/api/recovery/{case_id}/execute-action"
        payload = {
            "action_type": action_type,
            "signed_contract": signed_contract,
        }
        headers = {
            "Content-Type": "application/json",
            "X-ReviveOS-Agent-ID": self.agent_id or "",
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def get_decision(self, proposal_id: str) -> Dict[str, Any]:
        """Poll decision status by proposal ID."""
        url = f"{self.base_url}/api/agents/decisions/{proposal_id}"
        resp = requests.get(url, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def heartbeat(self) -> Dict[str, Any]:
        """Send a liveness heartbeat."""
        if not self.agent_id:
            raise ValueError("No agent_id configured.")
        url = f"{self.base_url}/api/agents/{self.agent_id}/heartbeat"
        resp = requests.post(url, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()
