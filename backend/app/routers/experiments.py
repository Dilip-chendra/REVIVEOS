"""ReviveAI 2.0 — Experiments & Backtesting Router"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.models.user import User
from app.services.experiment_engine import experiment_engine

router = APIRouter(prefix="/experiments", tags=["Experiments & Backtesting"])


class RunABTestRequest(BaseModel):
    cohort_size: int = Field(500, ge=50, le=5000)
    seed: int = 42


@router.post("/ab-test")
async def run_ab_experiment(
    req: RunABTestRequest,
    current_user: User = Depends(get_current_user),
):
    """Executes a controlled A/B experiment: Control (Blind Retry) vs Treatment (ReviveAI)."""
    return experiment_engine.run_ab_experiment(cohort_size=req.cohort_size, seed=req.seed)


@router.get("/calibration")
async def get_calibration_curve(current_user: User = Depends(get_current_user)):
    """Returns the decision calibration curve proving probabilistic accuracy."""
    return experiment_engine.get_decision_calibration()


@router.get("/matrix")
async def get_performance_matrix(current_user: User = Depends(get_current_user)):
    """Returns historical strategy performance matrix."""
    return experiment_engine.get_strategy_performance_matrix()