"""
ReviveOS — Opportunity Queue & Strategy Simulation API Router
=============================================================
Primary operational surface for revenue recovery intelligence.
"""
from fastapi import APIRouter, Depends, Query
from typing import Any, Dict, List, Optional
from app.auth import get_current_user
from app.models.user import User
from app.state import get_state
from app.services.recovery_attribution import recovery_attribution_engine
from app.services.strategy_simulator import strategy_simulator

router = APIRouter(prefix="/opportunities", tags=["Opportunity Queue"])


@router.get("/queue")
async def get_opportunity_queue(
    current_user: User = Depends(get_current_user),
    urgency: Optional[str] = None,
    decision: Optional[str] = None,
):
    mid = current_user.merchant_id
    state = get_state(mid)
    env = state.get("active_environment", "DEMO")
    if env in ("RAZORPAY_TEST", "RAZORPAY_LIVE", "REAL"):
        target_key = "provider_test_cases" if env in ("RAZORPAY_TEST", "REAL") else "provider_live_cases"
        cases = state.get(target_key, [])
    else:
        cases = state.get("demo_cases", state.get("cases", []))

    scored_items = []
    for c in cases:
        score = recovery_attribution_engine.score_opportunity(c)
        if urgency and score.urgency_level != urgency.upper():
            continue
        if decision and score.recommended_decision != decision.upper():
            continue
        
        item = score.to_dict()
        item["customer_name"] = c.get("customer_name", "Aarav Mehta")
        item["failure_code"] = c.get("failure_code", "UNKNOWN")
        item["case_type"] = c.get("case_type", "payment_failure")
        item["status"] = c.get("status", "open")
        scored_items.append(item)

    # Sort descending by Recovery Opportunity Score (ROS)
    scored_items.sort(key=lambda x: x["ros_score"], reverse=True)

    tot_at_risk = sum(item["amount_inr"] for item in scored_items)
    tot_incremental = sum(item["expected_incremental_recovery_inr"] for item in scored_items)
    tot_nic = sum(item["expected_nic_inr"] for item in scored_items)

    return {
        "total_count": len(scored_items),
        "total_at_risk_inr": tot_at_risk,
        "total_expected_incremental_inr": tot_incremental,
        "total_expected_nic_inr": tot_nic,
        "queue": scored_items,
    }


@router.get("/{opp_id}/simulate-strategies")
async def simulate_case_strategies(
    opp_id: str,
    current_user: User = Depends(get_current_user),
):
    mid = current_user.merchant_id
    state = get_state(mid)
    cases = state.get("cases", [])
    case = next((c for c in cases if c.get("id") == opp_id), None)

    if not case:
        # Generate on-demand mock case
        case = {
            "id": opp_id,
            "merchant_id": mid,
            "amount_inr": 4999.0,
            "failure_code": "INSUFFICIENT_FUNDS",
            "case_type": "subscription_failure",
            "customer_intent": "ACTIVE",
            "customer_success_rate": 0.80,
            "retry_count": 1,
            "consecutive_failures": 1,
        }

    sim_res = strategy_simulator.simulate_opportunity(case)
    return sim_res.to_dict()