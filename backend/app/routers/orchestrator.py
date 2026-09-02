"""ReviveAI 2.0 — Recovery Orchestrator & Action Graph Router"""
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.models.user import User
from app.state import get_state
from app.services.orchestrator import recovery_orchestrator

router = APIRouter(prefix="/orchestrator", tags=["Orchestrator"])


@router.get("/case/{case_id}/action-graph")
async def get_case_action_graph(
    case_id: str,
    current_user: User = Depends(get_current_user),
):
    """Returns the ordered Action Graph step sequence for the case."""
    state = get_state(current_user.merchant_id)
    cases = state.get("cases", [])
    case = next((c for c in cases if c["id"] == case_id), None)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    return {
        "case_id": case_id,
        "status": case.get("status", "open"),
        "steps": recovery_orchestrator.get_action_graph(case),
    }


@router.post("/case/{case_id}/rewind")
async def rewind_case_state(
    case_id: str,
    current_user: User = Depends(get_current_user),
):
    """Rewinds a case to its initial state for live judge replay."""
    res = recovery_orchestrator.rewind_case(current_user.merchant_id, case_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res


@router.get("/case/{case_id}/receipt")
async def get_case_decision_receipt(
    case_id: str,
    current_user: User = Depends(get_current_user),
):
    """Returns the tamper-evident Decision Receipt with SHA-256 fingerprint."""
    state = get_state(current_user.merchant_id)
    cases = state.get("cases", [])
    case = next((c for c in cases if c["id"] == case_id), None)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    return recovery_orchestrator.generate_decision_receipt(case, current_user.merchant_id)