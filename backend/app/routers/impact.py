"""ReviveAI — Impact Router (merchant-scoped)"""
from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.models.user import User
from app.services.counterfactual_simulator import counterfactual_simulator
from app.data.generator import DataGenerator
from app.state import get_state, add_audit_event

router = APIRouter(prefix="/impact")

# Per-merchant cached impact results
_impact_results: dict[str, dict] = {}


@router.post("/run")
async def run_counterfactual(
    scale: int = 10000,
    seed: int = 42,
    current_user: User = Depends(get_current_user),
):
    mid = current_user.merchant_id
    generator = DataGenerator(scale=scale, seed=seed)
    dataset = generator.generate()

    result = counterfactual_simulator.run_simulation(dataset.all_records, seed=seed)
    _impact_results[mid] = result

    add_audit_event(
        merchant_id=mid,
        event_type="COUNTERFACTUAL_SIMULATION",
        actor="system",
        correlation_id=result["metadata"]["simulation_id"],
        event_data={
            "scale": scale,
            "incremental_revenue": result["metrics"]["incremental_revenue_inr"],
            "recovery_lift": result["metrics"]["recovery_lift_percentage"],
        },
    )
    return result


@router.get("/latest")
async def get_latest_impact(current_user: User = Depends(get_current_user)):
    mid = current_user.merchant_id
    result = _impact_results.get(mid)
    if not result:
        return {"error": "No simulation has been run yet."}
    return {
        "metadata": result["metadata"],
        "metrics": result["metrics"],
        "distributions": result["distributions"],
    }


@router.get("/summary")
async def get_impact_summary(current_user: User = Depends(get_current_user)):
    mid = current_user.merchant_id
    result = _impact_results.get(mid)
    if not result:
        # Return zero-state summary so dashboard doesn't break
        return {
            "has_data": False,
            "incremental_revenue_inr": 0,
            "recovery_lift_percentage": 0,
            "baseline_recovery_rate": 0,
            "reviveai_recovery_rate": 0,
            "policy_blocks": 0,
            "total_cases": 0,
        }
    m = result["metrics"]
    return {
        "has_data": True,
        "incremental_revenue_inr": m.get("incremental_revenue_inr", 0),
        "recovery_lift_percentage": m.get("recovery_lift_percentage", 0),
        "baseline_recovery_rate": m.get("baseline_recovery_rate", 0),
        "reviveai_recovery_rate": m.get("reviveai_recovery_rate", 0),
        "policy_blocks": m.get("policy_blocks", 0),
        "total_cases": m.get("total_cases", 0),
    }


@router.get("/cases")
async def get_impact_cases(
    page: int = 1,
    per_page: int = 50,
    filter_type: str = "all",
    current_user: User = Depends(get_current_user),
):
    mid = current_user.merchant_id
    result = _impact_results.get(mid)
    if not result:
        return {"items": [], "total": 0}

    cases = result["cases"]
    filtered = []
    for c in cases:
        if filter_type == "incremental_wins" and c["incremental_amount"] > 0:
            filtered.append(c)
        elif filter_type == "baseline_wins" and c["incremental_amount"] < 0:
            filtered.append(c)
        elif filter_type == "both_recovered" and c["baseline_recovered"] and c["reviveai_recovered"]:
            filtered.append(c)
        elif filter_type == "not_recovered" and not c["baseline_recovered"] and not c["reviveai_recovered"]:
            filtered.append(c)
        elif filter_type == "policy_blocked" and not c["policy_allowed"]:
            filtered.append(c)
        elif filter_type == "all":
            filtered.append(c)

    filtered.sort(key=lambda x: abs(x["incremental_amount"]), reverse=True)
    start = (page - 1) * per_page
    return {"items": filtered[start: start + per_page], "total": len(filtered),
            "page": page, "per_page": per_page}


@router.get("/case/{case_id}")
async def get_impact_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
):
    mid = current_user.merchant_id
    result = _impact_results.get(mid)
    if not result:
        return {"error": "No simulation run"}
    for c in result["cases"]:
        if c["case_id"] == case_id:
            return c
    return {"error": "Case not found"}
