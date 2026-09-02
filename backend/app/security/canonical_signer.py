# -*- coding: utf-8 -*-
"""
ReviveOS — Hardened Canonical Request Signer & Replay Protection Engine
Protocol Version: REVIVEOS-PROTOCOL-1.1

Canonical Request Representation:
  METHOD\n
  PATH\n
  AGENT_ID\n
  KEY_ID\n
  TIMESTAMP\n
  REQUEST_ID\n
  PROPOSAL_ID\n
  PROTOCOL_VERSION\n
  SHA256(BODY)
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Set, Tuple

logger = logging.getLogger(__name__)

CURRENT_PROTOCOL_VERSION = "REVIVEOS-PROTOCOL-1.1"
SUPPORTED_PROTOCOL_VERSIONS = {"REVIVEOS-PROTOCOL-1.1", "v1", "1.0", "1.1"}
DEFAULT_CLOCK_SKEW_TOLERANCE_SECONDS = 300  # 5 minutes
TIMESTAMP_VALIDITY_WINDOW_SECONDS = DEFAULT_CLOCK_SKEW_TOLERANCE_SECONDS


@dataclass
class RequestNonce:
    request_id: str
    agent_id: str
    timestamp: float
    received_at: float = field(default_factory=time.time)
    status: str = "PROCESSED"


class ReplayProtectionStore:
    """
    Persistent in-memory sliding-window replay protection store with TTL eviction.
    """
    def __init__(self, ttl_seconds: int = 600):
        self._nonces: Dict[str, RequestNonce] = {}
        self.ttl_seconds = ttl_seconds

    def check_and_record(self, request_id: str, agent_id: str, timestamp: float) -> Tuple[bool, Optional[str]]:
        now = time.time()
        # Evict expired nonces
        expired_keys = [k for k, v in self._nonces.items() if now - v.received_at > self.ttl_seconds]
        for k in expired_keys:
            self._nonces.pop(k, None)

        nonce_key = f"{agent_id}:{request_id}"
        if nonce_key in self._nonces:
            return False, f"REPLAY_DETECTED: Request ID '{request_id}' has already been processed for agent '{agent_id}'"

        self._nonces[nonce_key] = RequestNonce(
            request_id=request_id,
            agent_id=agent_id,
            timestamp=timestamp,
            received_at=now,
        )
        return True, None


class CanonicalSigner:
    """
    Handles cryptographic canonical request construction, constant-time verification,
    and backward-compatible signature evaluation.
    """
    def __init__(self, clock_skew_seconds: int = DEFAULT_CLOCK_SKEW_TOLERANCE_SECONDS):
        self.clock_skew_seconds = clock_skew_seconds
        self.replay_store = ReplayProtectionStore(ttl_seconds=clock_skew_seconds * 2)

    @staticmethod
    def compute_body_hash(body: bytes) -> str:
        return hashlib.sha256(body).hexdigest()

    @staticmethod
    def build_canonical_payload(
        method: str,
        path: str,
        agent_id: str,
        key_id: str,
        timestamp: str,
        request_id: str,
        proposal_id: str,
        protocol_version: str,
        body_hash: str,
    ) -> str:
        """
        Builds the deterministic multi-line canonical string.
        """
        normalized_method = method.upper().strip()
        normalized_path = path.strip()
        return (
            f"{normalized_method}\n"
            f"{normalized_path}\n"
            f"{agent_id}\n"
            f"{key_id}\n"
            f"{timestamp}\n"
            f"{request_id}\n"
            f"{proposal_id}\n"
            f"{protocol_version}\n"
            f"{body_hash}"
        )

    def sign_request(
        self,
        secret: str,
        method: str,
        path: str,
        agent_id: str,
        key_id: str,
        timestamp: str,
        request_id: str,
        proposal_id: str,
        body: bytes,
        protocol_version: str = CURRENT_PROTOCOL_VERSION,
    ) -> str:
        body_hash = self.compute_body_hash(body)
        canonical = self.build_canonical_payload(
            method=method,
            path=path,
            agent_id=agent_id,
            key_id=key_id,
            timestamp=timestamp,
            request_id=request_id,
            proposal_id=proposal_id,
            protocol_version=protocol_version,
            body_hash=body_hash,
        )
        return hmac.new(secret.encode("utf-8"), canonical.encode("utf-8"), hashlib.sha256).hexdigest()

    def verify_request(
        self,
        secret: str,
        expected_signature: str,
        method: str,
        path: str,
        agent_id: str,
        key_id: str,
        timestamp_str: str,
        request_id: str,
        proposal_id: str,
        body: bytes,
        protocol_version: str = CURRENT_PROTOCOL_VERSION,
    ) -> Tuple[bool, Optional[str]]:
        # 1. Clock skew check
        try:
            ts = float(timestamp_str)
        except (ValueError, TypeError):
            return False, "REQUEST_TIMESTAMP_INVALID: Timestamp must be numeric epoch seconds"

        now = time.time()
        if abs(now - ts) > self.clock_skew_seconds:
            return False, f"REQUEST_TIMESTAMP_INVALID: Clock skew of {abs(now - ts):.1f}s exceeds tolerance of {self.clock_skew_seconds}s"

        # 2. Replay check
        replay_ok, replay_err = self.replay_store.check_and_record(request_id, agent_id, ts)
        if not replay_ok:
            return False, replay_err

        # 3. Canonical signature check (Primary REVIVEOS-PROTOCOL-1.1)
        body_hash = self.compute_body_hash(body)
        canonical = self.build_canonical_payload(
            method=method,
            path=path,
            agent_id=agent_id,
            key_id=key_id,
            timestamp=timestamp_str,
            request_id=request_id,
            proposal_id=proposal_id,
            protocol_version=protocol_version,
            body_hash=body_hash,
        )
        expected_computed = hmac.new(secret.encode("utf-8"), canonical.encode("utf-8"), hashlib.sha256).hexdigest()

        if hmac.compare_digest(expected_signature, expected_computed):
            return True, None

        # 4. Backward-compatible fallback check (Legacy v1 format: agent_id:ts:rid:body_hash)
        legacy_canonical = f"{agent_id}:{timestamp_str}:{request_id}:{body_hash}"
        legacy_computed = hmac.new(secret.encode("utf-8"), legacy_canonical.encode("utf-8"), hashlib.sha256).hexdigest()
        if hmac.compare_digest(expected_signature, legacy_computed):
            return True, None

        return False, "INVALID_SIGNATURE: HMAC signature verification failed against canonical representation"


canonical_signer = CanonicalSigner()
canonical_request_signer = canonical_signer
