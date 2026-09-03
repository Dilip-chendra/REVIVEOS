# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.auth import get_current_user
from app.models.user import User
from app.state import get_state
from app.services.intervention_scheduler import intervention_scheduler

router = APIRouter(prefix="/automation", tags=["Autonomy & Cadence Engine"])


class UpdateAutonomyConfigRequest(BaseModel):
    autonomy_mode: Optional[str] = None
    min_contact_interval_hours: Optional[int] = None
    max_attempts_per_case: Optional[int] = None
    allowed_hours_start: Optional[int] = None
    allowed_hours_end: Optional[int] = None
    human_approval_ceiling_inr: Optional[float] = None


class TimingEvaluateRequest(BaseModel):
    case_id: str
    amount_inr: float
    p_natural_recovery: float
    customer_intent: str = "ACTIVE"
    prior_attempts: int = 0
    customer_current_hour: Optional[int] = None


@router.get("/status")
async def get_automation_status(current_user: User = Depends(get_current_user)):
    state = get_state(current_user.merchant_id)
    is_real = state.get("active_environment") in ("RAZORPAY_TEST", "RAZORPAY_LIVE", "REAL")
    return intervention_scheduler.get_automation_stats(
        merchant_id=current_user.merchant_id,
        is_real_mode=is_real,
    )


@router.post("/config")
async def update_automation_config(
    req: UpdateAutonomyConfigRequest,
    current_user: User = Depends(get_current_user),
):
    res = intervention_scheduler.update_config(
        merchant_id=current_user.merchant_id,
        new_config=req.model_dump(exclude_unset=True),
    )
    return res


@router.get("/scheduled")
async def list_scheduled_jobs(current_user: User = Depends(get_current_user)):
    state = get_state(current_user.merchant_id)
    is_real = state.get("active_environment") in ("RAZORPAY_TEST", "RAZORPAY_LIVE", "REAL")
    return intervention_scheduler.list_jobs(
        merchant_id=current_user.merchant_id,
        is_real_mode=is_real,
    )


@router.post("/evaluate-timing")
async def evaluate_timing_window(
    req: TimingEvaluateRequest,
    current_user: User = Depends(get_current_user),
):
    return intervention_scheduler.evaluate_timing(
        case_id=req.case_id,
        amount_inr=req.amount_inr,
        p_natural_recovery=req.p_natural_recovery,
        customer_intent=req.customer_intent,
        prior_attempts=req.prior_attempts,
        merchant_id=current_user.merchant_id,
        customer_current_hour=req.customer_current_hour,
    )


@router.post("/scheduled/{action_id}/execute")
async def execute_scheduled_action(
    action_id: str,
    force_execute: bool = Query(True),
    current_user: User = Depends(get_current_user),
):
    return intervention_scheduler.execute_scheduled_action_with_live_recheck(
        action_id=action_id,
        merchant_id=current_user.merchant_id,
        force_execute=force_execute,
    )


@router.post("/scheduled/{action_id}/cancel")
async def cancel_scheduled_action(
    action_id: str,
    reason: str = Query("Operator cancellation"),
    current_user: User = Depends(get_current_user),
):
    ok = intervention_scheduler.cancel_action(
        action_id=action_id,
        reason=reason,
        merchant_id=current_user.merchant_id,
    )
    return {"success": ok, "action_id": action_id, "status": "CANCELLED"}
