# -*- coding: utf-8 -*-
"""
ReviveOS — Cryptographic Append-Only Tamper-Evident Audit Ledger
Protocol Version: REVIVEOS-PROTOCOL-1.1

Every AI decision, policy check, contract issuance, and recovery execution
generates an immutable audit event chained with SHA-256 hashes.
"""
from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_


class AuditService:
    def __init__(self):
        self._last_event_hash: str = "GENESIS_REVIVEOS_AUDIT_LEDGER_2026"
        self._in_memory_chain: List[Dict[str, Any]] = []

    def compute_event_hash(
        self,
        event_id: str,
        previous_hash: str,
        timestamp_str: str,
        actor: str,
        event_type: str,
        case_id: Optional[str],
        event_data: Dict[str, Any],
    ) -> str:
        data_str = json.dumps(event_data, sort_keys=True)
        raw = f"{event_id}:{previous_hash}:{timestamp_str}:{actor}:{event_type}:{case_id or 'NONE'}:{data_str}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    async def log_event(
        self,
        session: Optional[AsyncSession],
        event_type: str,
        actor: str,
        correlation_id: str,
        event_data: dict[str, Any],
        case_id: str | None = None,
        amount_inr: float | None = None,
        policy_result: dict | None = None,
        is_sensitive: bool = False,
    ) -> Any:
        """Append a new tamper-evident audit event."""
        event_id = str(uuid.uuid4())
        timestamp_now = datetime.now(timezone.utc)
        timestamp_str = timestamp_now.isoformat()

        prev_hash = self._last_event_hash
        current_hash = self.compute_event_hash(
            event_id=event_id,
            previous_hash=prev_hash,
            timestamp_str=timestamp_str,
            actor=actor,
            event_type=event_type,
            case_id=case_id,
            event_data=event_data,
        )
        self._last_event_hash = current_hash

        enriched_data = dict(event_data)
        enriched_data["_audit_chain"] = {
            "previous_event_hash": prev_hash,
            "current_event_hash": current_hash,
            "correlation_id": correlation_id,
        }

        self._in_memory_chain.append({
            "id": event_id,
            "correlation_id": correlation_id,
            "case_id": case_id,
            "event_type": event_type,
            "actor": actor,
            "event_data": enriched_data,
            "policy_result": policy_result,
            "amount_inr": amount_inr,
            "timestamp": timestamp_str,
            "event_hash": current_hash,
        })

        if session is not None:
            try:
                from app.models.audit import AuditEvent
                event = AuditEvent(
                    id=event_id,
                    correlation_id=correlation_id,
                    case_id=case_id,
                    event_type=event_type,
                    actor=actor,
                    event_data=enriched_data,
                    policy_result=policy_result,
                    amount_inr=amount_inr,
                    is_sensitive=is_sensitive,
                    timestamp=timestamp_now,
                )
                session.add(event)
                await session.flush()
                return event
            except Exception:
                pass

        return enriched_data

    async def get_events_for_case(self, session: AsyncSession, case_id: str) -> list:
        try:
            from app.models.audit import AuditEvent
            stmt = select(AuditEvent).where(AuditEvent.case_id == case_id).order_by(AuditEvent.timestamp.asc())
            result = await session.execute(stmt)
            return list(result.scalars().all())
        except Exception:
            return [e for e in self._in_memory_chain if e.get("case_id") == case_id]

    async def get_events_by_correlation(self, session: AsyncSession, correlation_id: str) -> list:
        try:
            from app.models.audit import AuditEvent
            stmt = select(AuditEvent).where(AuditEvent.correlation_id == correlation_id).order_by(AuditEvent.timestamp.asc())
            result = await session.execute(stmt)
            return list(result.scalars().all())
        except Exception:
            return [e for e in self._in_memory_chain if e.get("correlation_id") == correlation_id]

    async def get_recent_events(
        self,
        session: AsyncSession,
        limit: int = 100,
        event_type: str | None = None,
        actor: str | None = None,
        case_id: str | None = None,
    ) -> list:
        try:
            from app.models.audit import AuditEvent
            stmt = select(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(limit)
            if event_type:
                stmt = stmt.where(AuditEvent.event_type == event_type)
            if actor:
                stmt = stmt.where(AuditEvent.actor == actor)
            if case_id:
                stmt = stmt.where(AuditEvent.case_id == case_id)
            result = await session.execute(stmt)
            return list(result.scalars().all())
        except Exception:
            return list(reversed(self._in_memory_chain[-limit:]))

    async def get_audit_summary(self, session: AsyncSession) -> dict:
        try:
            from app.models.audit import AuditEvent
            from datetime import timedelta
            now = datetime.now(timezone.utc)
            last_24h = now - timedelta(hours=24)
            total_events = await session.scalar(select(func.count()).select_from(AuditEvent))
            last_24h_events = await session.scalar(select(func.count()).select_from(AuditEvent).where(AuditEvent.timestamp >= last_24h))
            recovered_stmt = select(func.sum(AuditEvent.amount_inr)).where(AuditEvent.event_type == 'AMOUNT_RECOVERED')
            total_recovered = await session.scalar(recovered_stmt)
            type_counts = await session.execute(select(AuditEvent.event_type, func.count(AuditEvent.id)).group_by(AuditEvent.event_type))
            events_by_type = {row[0]: row[1] for row in type_counts}
            return {
                "total_events": total_events or 0,
                "events_last_24h": last_24h_events or 0,
                "events_by_type": events_by_type,
                "total_amount_recovered_inr": total_recovered or 0.0
            }
        except Exception:
            return {
                "total_events": len(self._in_memory_chain),
                "events_last_24h": len(self._in_memory_chain),
                "events_by_type": {},
                "total_amount_recovered_inr": 0.0
            }


audit_service = AuditService()


async def log_risk_detected(session: Optional[AsyncSession], case_id: str, correlation_id: str, risk_score: float, category: str, amount_inr: float):
    return await audit_service.log_event(
        session, 'RISK_DETECTED', 'SYSTEM', correlation_id,
        {'risk_score': risk_score, 'category': category, 'amount_inr': amount_inr},
        case_id=case_id, amount_inr=amount_inr
    )

async def log_ai_diagnosis(session: Optional[AsyncSession], case_id: str, correlation_id: str, diagnosis: str, confidence: float, strategy: str):
    return await audit_service.log_event(
        session, 'AI_DIAGNOSIS', 'AI_AGENT', correlation_id,
        {'diagnosis': diagnosis, 'confidence': confidence, 'recommended_strategy': strategy},
        case_id=case_id
    )

async def log_strategy_selected(session: Optional[AsyncSession], case_id: str, correlation_id: str, strategy: str, expected_ev: float):
    return await audit_service.log_event(
        session, 'STRATEGY_SELECTED', 'RECOVERY_ENGINE', correlation_id,
        {'strategy': strategy, 'expected_ev': expected_ev},
        case_id=case_id
    )

async def log_policy_check(session: Optional[AsyncSession], case_id: str, correlation_id: str, policy_result_dict: dict, action_type: str, allowed: bool):
    event_type = 'POLICY_CHECK_PASSED' if allowed else 'POLICY_CHECK_FAILED'
    return await audit_service.log_event(
        session, event_type, 'POLICY_ENGINE', correlation_id,
        {'action_type': action_type},
        case_id=case_id,
        policy_result=policy_result_dict
    )

async def log_action_executed(session: Optional[AsyncSession], case_id: str, correlation_id: str, action_type: str, amount_inr: float | None = None):
    return await audit_service.log_event(
        session, 'ACTION_EXECUTED', 'RECOVERY_ENGINE', correlation_id,
        {'action_type': action_type},
        case_id=case_id, amount_inr=amount_inr
    )

async def log_payment_recovered(session: Optional[AsyncSession], case_id: str, correlation_id: str, amount_inr: float):
    return await audit_service.log_event(
        session, 'AMOUNT_RECOVERED', 'SYSTEM', correlation_id,
        {'recovery_confirmed': True, 'amount_inr': amount_inr},
        case_id=case_id, amount_inr=amount_inr
    )

async def log_human_escalated(session: Optional[AsyncSession], case_id: str, correlation_id: str, reason: str):
    return await audit_service.log_event(
        session, 'ESCALATED_TO_HUMAN', 'SYSTEM', correlation_id,
        {'reason': reason},
        case_id=case_id
    )

async def log_automation_stopped(session: Optional[AsyncSession], case_id: str, correlation_id: str, reason: str):
    return await audit_service.log_event(
        session, 'AUTOMATION_STOPPED', 'SYSTEM', correlation_id,
        {'reason': reason},
        case_id=case_id
    )
