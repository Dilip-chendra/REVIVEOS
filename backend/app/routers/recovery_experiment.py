# -*- coding: utf-8 -*-
"""
ReviveOS — Recovery Experiment & Innovation Router
"""
from fastapi import APIRouter, Depends, Query, HTTPException, Header, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.auth import get_current_user, get_effective_mode
from app.state import get_state
from app.models.user import User
from app.services.recovery_experiment import recovery_experiment_engine
from app.services.batch_recovery_simulator import batch_simulator
from app.services.channel_optimizer import channel_optimizer
from app.services.recovery_copilot import recovery_copilot
from app.services.promise_to_pay import promise_to_pay_manager
from app.services.recovery_forecast import recovery_forecast_service

router = APIRouter(tags=["Recovery Experiments & Innovation"])


class RunExperimentRequest(BaseModel):
    batch_size: int = 500
    seed: int = 42


class CopilotRequest(BaseModel):
    customer_name: str
    amount_inr: float
    case_type: str = "payment_failure"
    days_overdue: int = 0
    tone: str = "PROFESSIONAL"
    channel: str = "WHATSAPP"
    is_opted_out: bool = False


class CreatePromiseRequest(BaseModel):
    case_id: str
    customer_name: str
    amount_inr: float
    promise_date: str
    confidence: float = 0.85
    notes: str = ""


@router.get("/recovery-experiments")
async def list_experiments(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    mode = get_effective_mode(request, current_user)
    is_real = mode == "real"
    res = recovery_experiment_engine.list_experiments()
    if is_real:
        # In real mode: return only experiments recorded for real data, or empty list
        real_exps = [e for e in res if getattr(e, "data_universe", "") in ("REAL", "RAZORPAY_TEST", "RAZORPAY_LIVE")]
        return [e.to_dict() if hasattr(e, "to_dict") else e for e in real_exps]
    if not res:
        # Generate default benchmark experiment on first request in DEMO mode
        default_exp = recovery_experiment_engine.run_experiment(batch_size=500, seed=42, is_demo=True)
        return [default_exp.to_dict()]
    return res


@router.post("/recovery-experiments/run")
async def run_recovery_experiment(
    req: RunExperimentRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    x_revive_mode: Optional[str] = Header(None, alias="X-Revive-Mode"),
):
    mode = get_effective_mode(request, current_user)
    is_demo = (mode != "real")
    result = recovery_experiment_engine.run_experiment(
        batch_size=req.batch_size,
        seed=req.seed,
        is_demo=is_demo,
    )
    return result.to_dict()


@router.get("/recovery-experiments/{experiment_id}")
async def get_experiment_detail(experiment_id: str, current_user: User = Depends(get_current_user)):
    exp = recovery_experiment_engine.get_experiment(experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp.to_dict()


@router.get("/recovery-batch/{size}")
async def get_batch_opportunities(size: int = 500, seed: int = 42, current_user: User = Depends(get_current_user)):
    return batch_simulator.generate_batch(size=size, seed=seed)


@router.get("/recovery-forecast")
async def get_recovery_forecast(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    mode = get_effective_mode(request, current_user)
    is_real = mode == "real"
    if is_real:
        mid = current_user.merchant_id
        state = get_state(mid)
        env = state.get("active_environment", "RAZORPAY_TEST")
        target_key = "provider_live_cases" if env == "RAZORPAY_LIVE" else "provider_test_cases"
        cases = state.get(target_key, [])
        if not cases:
            return {
                "today_inr": 0.0,
                "h24_inr": 0.0,
                "h72_inr": 0.0,
                "d7_inr": 0.0,
                "d30_inr": 0.0,
                "breakdown": {
                    "natural_recovery_inr": 0.0,
                    "intervention_opportunity_inr": 0.0,
                    "human_escalation_inr": 0.0,
                    "potential_loss_inr": 0.0,
                },
                "data_universe": "RAZORPAY_TEST",
            }
        total_amt = sum(c.get("amount_inr", 0) for c in cases)
        return {
            "today_inr": round(total_amt * 0.75, 2),
            "h24_inr": round(total_amt * 0.60, 2),
            "h72_inr": round(total_amt * 0.40, 2),
            "d7_inr": round(total_amt * 0.20, 2),
            "d30_inr": round(total_amt * 0.05, 2),
            "breakdown": {
                "natural_recovery_inr": round(total_amt * 0.25, 2),
                "intervention_opportunity_inr": round(total_amt * 0.50, 2),
                "human_escalation_inr": round(total_amt * 0.15, 2),
                "potential_loss_inr": round(total_amt * 0.10, 2),
            },
            "data_universe": "RAZORPAY_TEST",
        }

    # Standard 30-day forecast breakdown for DEMO
    return {
        "today_inr": 1840000.0,
        "h24_inr": 1590000.0,
        "h72_inr": 1120000.0,
        "d7_inr": 680000.0,
        "d30_inr": 240000.0,
        "breakdown": {
            "natural_recovery_inr": 580000.0,
            "intervention_opportunity_inr": 890000.0,
            "human_escalation_inr": 220000.0,
            "potential_loss_inr": 150000.0,
        },
        "data_universe": "SIMULATED FORECAST",
    }


@router.get("/channel-optimization/{case_id}")
async def get_channel_optimization(
    case_id: str,
    amount_inr: float = 12000.0,
    tenure: int = 6,
    prior_contacts: int = 0,
    opt_out: bool = False,
    current_user: User = Depends(get_current_user),
):
    return channel_optimizer.optimize_channel(
        case_id=case_id,
        amount_inr=amount_inr,
        customer_tenure_months=tenure,
        prior_contacts_24h=prior_contacts,
        customer_opt_out=opt_out,
    )


@router.post("/recovery-copilot/generate")
async def generate_copilot_message(req: CopilotRequest, current_user: User = Depends(get_current_user)):
    return recovery_copilot.generate_message(
        customer_name=req.customer_name,
        amount_inr=req.amount_inr,
        case_type=req.case_type,
        days_overdue=req.days_overdue,
        tone=req.tone,
        channel=req.channel,
        is_opted_out=req.is_opted_out,
    )


@router.get("/promise-to-pay")
async def list_promises(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    mode = get_effective_mode(request, current_user)
    is_real = mode == "real"
    return promise_to_pay_manager.list_promises(is_real_mode=is_real)


@router.post("/promise-to-pay")
async def create_promise(
    req: CreatePromiseRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    mode = get_effective_mode(request, current_user)
    is_real = mode == "real"
    return promise_to_pay_manager.create_promise(
        case_id=req.case_id,
        customer_name=req.customer_name,
        amount_inr=req.amount_inr,
        promise_date=req.promise_date,
        confidence=req.confidence,
        notes=req.notes,
        is_real_mode=is_real,
    )


@router.post("/promise-to-pay/{promise_id}/fulfill")
async def fulfill_promise(promise_id: str, current_user: User = Depends(get_current_user)):
    res = promise_to_pay_manager.fulfill_promise(promise_id)
    if not res:
        raise HTTPException(status_code=404, detail="Promise not found")
    return res


@router.post("/promise-to-pay/{promise_id}/miss")
async def miss_promise(promise_id: str, current_user: User = Depends(get_current_user)):
    res = promise_to_pay_manager.miss_promise(promise_id)
    if not res:
        raise HTTPException(status_code=404, detail="Promise not found")
    return res
