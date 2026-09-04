from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.auth import get_current_user, get_effective_mode
from app.models.user import User
from app.services.experiment_engine import experiment_engine

router = APIRouter(prefix="/experiments", tags=["Experiments & Backtesting"])


class RunABTestRequest(BaseModel):
    cohort_size: int = Field(500, ge=50, le=5000)
    seed: int = 42


@router.post("/ab-test")
async def run_ab_experiment(
    req: RunABTestRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Executes a controlled A/B experiment: Control (Blind Retry) vs Treatment (ReviveAI)."""
    mode = get_effective_mode(request, current_user)
    is_real = mode == "real"
    res = experiment_engine.run_ab_experiment(cohort_size=req.cohort_size, seed=req.seed)
    res["is_real_mode"] = is_real
    res["data_universe"] = "REAL_SANDBOX" if is_real else "BENCHMARK_SYNTHETIC"
    return res


@router.get("/calibration")
async def get_calibration_curve(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Returns the decision calibration curve proving probabilistic accuracy."""
    mode = get_effective_mode(request, current_user)
    is_real = mode == "real"
    res = experiment_engine.get_decision_calibration()
    if isinstance(res, dict):
        res["is_real_mode"] = is_real
    return res


@router.get("/matrix")
async def get_performance_matrix(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Returns historical strategy performance matrix."""
    return experiment_engine.get_strategy_performance_matrix()