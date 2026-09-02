# -*- coding: utf-8 -*-
"""
ReviveOS — Case-Level Concurrency Coordinator & Two-Phase Attention Reservation Engine
Protocol Version: REVIVEOS-PROTOCOL-1.1
"""
from __future__ import annotations

import asyncio
import enum
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class AttentionReservationState(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    CONSUMED = "CONSUMED"
    COOLDOWN = "COOLDOWN"
    OPTED_OUT = "OPTED_OUT"


@dataclass
class CaseLease:
    tenant_id: str
    case_id: str
    owner_agent_id: str
    acquired_at: float
    expires_at: float
    lease_id: str


@dataclass
class CustomerAttentionReservation:
    reservation_id: str
    customer_id: str
    tenant_id: str
    agent_id: str
    proposal_id: str
    state: AttentionReservationState = AttentionReservationState.RESERVED
    reserved_at: float = field(default_factory=time.time)
    expires_at: float = field(default_factory=lambda: time.time() + 300)
    consumed_at: Optional[float] = None
    released_at: Optional[float] = None


class CaseCoordinator:
    """
    Coordinates multi-agent concurrency, case arbitration leasing,
    and two-phase customer attention capacity reservation.
    """
    def __init__(self, default_lease_seconds: int = 30):
        self.default_lease_seconds = default_lease_seconds
        self._leases: Dict[str, CaseLease] = {}
        self._reservations: Dict[str, CustomerAttentionReservation] = {}
        self._customer_contact_history: Dict[str, List[float]] = {}
        self._recent_agent_proposals: Dict[str, float] = {}  # agent:case:action -> timestamp
        self._lock = asyncio.Lock()

    async def acquire_case_lease(self, tenant_id: str, case_id: str, agent_id: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Acquires an exclusive arbitration lease for (tenant_id, case_id).
        Returns (acquired, lease_id, error_reason).
        """
        async with self._lock:
            key = f"{tenant_id}:{case_id}"
            now = time.time()
            existing = self._leases.get(key)

            if existing and existing.expires_at > now and existing.owner_agent_id != agent_id:
                return False, None, f"CONCURRENT_CASE_LOCK: Case '{case_id}' is actively being arbitrated by agent '{existing.owner_agent_id}'"

            lease_id = f"LEASE-{tenant_id[:4]}-{case_id[:6]}-{int(now)}"
            self._leases[key] = CaseLease(
                tenant_id=tenant_id,
                case_id=case_id,
                owner_agent_id=agent_id,
                acquired_at=now,
                expires_at=now + self.default_lease_seconds,
                lease_id=lease_id,
            )
            return True, lease_id, None

    async def release_case_lease(self, tenant_id: str, case_id: str, lease_id: Optional[str] = None) -> None:
        async with self._lock:
            key = f"{tenant_id}:{case_id}"
            existing = self._leases.get(key)
            if existing and (lease_id is None or existing.lease_id == lease_id):
                self._leases.pop(key, None)

    async def reserve_customer_attention(
        self,
        tenant_id: str,
        customer_id: str,
        agent_id: str,
        proposal_id: str,
        daily_cap: int = 1,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Phase 1: Reserve customer attention slot before issuing Action Contract.
        Returns (success, reservation_id, reason_code).
        """
        async with self._lock:
            now = time.time()
            # Clean expired reservations
            active_res = [
                r for r in self._reservations.values()
                if r.customer_id == customer_id and r.tenant_id == tenant_id and r.state in (AttentionReservationState.RESERVED, AttentionReservationState.CONSUMED) and (r.state == AttentionReservationState.CONSUMED or r.expires_at > now)
            ]

            # Check consumed contacts in the last 24h (86400s)
            contact_timestamps = self._customer_contact_history.setdefault(f"{tenant_id}:{customer_id}", [])
            contact_timestamps = [t for t in contact_timestamps if now - t < 86400]
            self._customer_contact_history[f"{tenant_id}:{customer_id}"] = contact_timestamps

            from app.services.agent_arbitrator import multi_agent_arbitrator
            att_rec = multi_agent_arbitrator.get_attention_record(customer_id)
            if att_rec.contacts_used_today >= daily_cap:
                return False, None, "CUSTOMER_ATTENTION_BUDGET_EXHAUSTED"

            total_used_or_reserved = len(contact_timestamps) + len([r for r in active_res if r.state == AttentionReservationState.RESERVED])
            if total_used_or_reserved >= daily_cap:
                return False, None, "CUSTOMER_ATTENTION_BUDGET_EXHAUSTED"

            res_id = f"RES-{customer_id[:6]}-{proposal_id[:6]}"
            reservation = CustomerAttentionReservation(
                reservation_id=res_id,
                customer_id=customer_id,
                tenant_id=tenant_id,
                agent_id=agent_id,
                proposal_id=proposal_id,
                state=AttentionReservationState.RESERVED,
                reserved_at=now,
                expires_at=now + 300,
            )
            self._reservations[res_id] = reservation
            return True, res_id, None

    async def consume_attention_reservation(self, reservation_id: str) -> None:
        """Phase 2a: Lock attention slot permanently as consumed (communication sent)."""
        async with self._lock:
            res = self._reservations.get(reservation_id)
            if res:
                now = time.time()
                res.state = AttentionReservationState.CONSUMED
                res.consumed_at = now
                key = f"{res.tenant_id}:{res.customer_id}"
                self._customer_contact_history.setdefault(key, []).append(now)

    async def release_attention_reservation(self, reservation_id: str) -> None:
        """Phase 2b: Roll back attention slot if execution failed or was cancelled."""
        async with self._lock:
            res = self._reservations.get(reservation_id)
            if res:
                res.state = AttentionReservationState.AVAILABLE
                res.released_at = time.time()
                self._reservations.pop(reservation_id, None)

    async def check_agent_loop(self, agent_id: str, case_id: str, action_type: str, cooldown_seconds: int = 10) -> Tuple[bool, Optional[str]]:
        """Prevents agents from spamming identical proposals in tight loops."""
        async with self._lock:
            key = f"{agent_id}:{case_id}:{action_type}"
            now = time.time()
            last_time = self._recent_agent_proposals.get(key)
            if last_time and (now - last_time) < cooldown_seconds:
                return False, f"REPEATED_PROPOSAL_SUPPRESSED: Agent '{agent_id}' submitted identical proposal within {cooldown_seconds}s cooldown"
            self._recent_agent_proposals[key] = now
            return True, None


case_coordinator = CaseCoordinator()
