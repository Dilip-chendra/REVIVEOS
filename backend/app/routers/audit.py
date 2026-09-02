"""ReviveAI — Audit Router (merchant-scoped)

Provides tamper-evident audit trail with SHA-256 hash chain verification.
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.models.user import User
from app.state import get_state, verify_audit_chain

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/events")
async def get_events(
    page: int = 1,
    per_page: int = 100,
    event_type: str = None,
    actor: str = None,
    case_id: str = None,
    current_user: User = Depends(get_current_user),
):
    audit_events = get_state(current_user.merchant_id).get("audit_events", [])
    per_page = min(per_page, 500)  # Bounded to prevent DoS

    filtered = audit_events
    if event_type:
        filtered = [e for e in filtered if e["event_type"] == event_type]
    if actor:
        filtered = [e for e in filtered if e["actor"] == actor]
    if case_id:
        filtered = [e for e in filtered if e.get("case_id") == case_id]

    start = (page - 1) * per_page
    return filtered[start: start + per_page]


@router.get("/events/{case_id}")
async def get_events_for_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
):
    audit_events = get_state(current_user.merchant_id).get("audit_events", [])
    return [e for e in audit_events if e.get("case_id") == case_id]


@router.get("/summary")
async def get_summary(current_user: User = Depends(get_current_user)):
    audit_events = get_state(current_user.merchant_id).get("audit_events", [])
    events_by_type: dict = {}
    for e in audit_events:
        events_by_type[e["event_type"]] = events_by_type.get(e["event_type"], 0) + 1

    # Compute real 24h count
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    events_last_24h = sum(1 for e in audit_events if e.get("timestamp", "") >= cutoff)

    # Compute real recovered amount from audit events
    total_recovered_inr = sum(
        e.get("amount_inr", 0) or 0
        for e in audit_events
        if e["event_type"] in ("PAYMENT_RECOVERED", "AMOUNT_RECOVERED")
        and e.get("amount_inr")
    )

    return {
        "total_events": len(audit_events),
        "events_by_type": events_by_type,
        "events_last_24h": events_last_24h,
        "total_recovered_inr": total_recovered_inr,
        "blocked_actions": events_by_type.get("AUTOMATION_STOPPED", 0),
    }


@router.get("/correlation/{correlation_id}")
async def get_correlation_events(
    correlation_id: str,
    current_user: User = Depends(get_current_user),
):
    audit_events = get_state(current_user.merchant_id).get("audit_events", [])
    return [e for e in audit_events if e["correlation_id"] == correlation_id]


@router.post("/verify")
async def verify_chain(current_user: User = Depends(get_current_user)):
    """
    Verify the SHA-256 hash chain integrity of all audit events.
    Returns VALID if chain is intact, TAMPER DETECTED if any event was modified.
    This is a real cryptographic verification — not a simulated check.
    """
    result = verify_audit_chain(current_user.merchant_id)
    return result

