"""ReviveAI 2.0 — Gateway Incident Commander & Traffic Simulator Router"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.models.user import User
from app.services.incident_commander import incident_commander

router = APIRouter(prefix="/incidents", tags=["Incident Commander"])


class SimulateTrafficRequest(BaseModel):
    requests_count: int = Field(100, ge=10, le=1000)
    payu_error_rate: float = Field(0.35, ge=0.0, le=1.0)
    razorpay_error_rate: float = Field(0.03, ge=0.0, le=1.0)
    cashfree_error_rate: float = Field(0.04, ge=0.0, le=1.0)


class CanaryRequest(BaseModel):
    canary_percentage: int = Field(15, ge=1, le=50)


@router.get("")
async def list_incidents(current_user: User = Depends(get_current_user)):
    """Returns active gateway incidents and mitigation plans."""
    return incident_commander.get_incidents(current_user.merchant_id)


@router.post("/canary")
async def trigger_canary(
    req: CanaryRequest,
    current_user: User = Depends(get_current_user),
):
    """Triggers canary recovery probe traffic to degraded gateway."""
    return incident_commander.trigger_canary_recovery(current_user.merchant_id, req.canary_percentage)


@router.post("/resolve")
async def resolve_incident(current_user: User = Depends(get_current_user)):
    """Resolves active incident and restores normal traffic distribution."""
    return incident_commander.resolve_incident(current_user.merchant_id)


@router.post("/traffic/simulate")
async def simulate_traffic_stream(
    req: SimulateTrafficRequest,
    current_user: User = Depends(get_current_user),
):
    """Simulates real backend checkout traffic with live multi-gateway routing."""
    return incident_commander.simulate_live_traffic(
        requests_count=req.requests_count,
        payu_error_rate=req.payu_error_rate,
        razorpay_error_rate=req.razorpay_error_rate,
        cashfree_error_rate=req.cashfree_error_rate,
    )


@router.get("/clusters")
async def get_failure_clusters(current_user: User = Depends(get_current_user)):
    """
    Returns detected failure clusters grouped by shared provider/gateway/time signature.
    Enables treating systemic outages as bulk incidents rather than isolated retries.
    """
    from app.state import get_state
    from app.services.opportunity_graph import opportunity_graph
    
    mid = current_user.merchant_id
    state = get_state(mid)
    env = state.get("active_environment", "DEMO")
    cases = state.get("cases", [])
    
    if env in ("RAZORPAY_TEST", "RAZORPAY_LIVE") and not cases:
        return {
            "active_environment": env,
            "total_clusters": 0,
            "clusters": [],
            "message": "No real provider failure clusters detected.",
        }
        
    opportunity_graph.build_from_opportunities(cases)
    clusters = opportunity_graph.get_all_clusters()
    return {
        "active_environment": env,
        "total_clusters": len(clusters),
        "clusters": [c.to_dict() for c in clusters],
    }