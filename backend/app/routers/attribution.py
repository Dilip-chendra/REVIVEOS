"""
ReviveOS — Incremental Attribution & Batch Evaluation Router
============================================================
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from app.auth import get_current_user
from app.models.user import User
from app.services.batch_evaluator import batch_recovery_evaluator
from app.services.recovery_attribution import recovery_attribution_engine

router = APIRouter(prefix="/attribution", tags=["Attribution & Benchmark"])


class BatchEvaluationRequest(BaseModel):
    scale: int = 100
    seed: int = 42
    split: str = "HELD_OUT"  # "HELD_OUT", "VALIDATION", "FULL"


@router.post("/batch-run")
async def run_batch_evaluation_api(
    req: BatchEvaluationRequest,
    current_user: User = Depends(get_current_user),
):
    report = batch_recovery_evaluator.run_batch_evaluation(
        scale=req.scale, seed=req.seed, split=req.split
    )
    return report.to_dict()


@router.get("/summary")
async def get_attribution_summary(
    current_user: User = Depends(get_current_user),
):
    # Run default 100 benchmark summary
    report = batch_recovery_evaluator.run_batch_evaluation(scale=100, seed=42, split="HELD_OUT")
    reviveos_metrics = next(
        m for m in report.strategies_comparison if "ReviveOS" in m.strategy_label
    )
    return {
        "dataset_type": report.dataset_type,
        "sample_size": report.dataset_scale,
        "total_at_risk_inr": reviveos_metrics.total_at_risk_inr,
        "gross_recovered_inr": reviveos_metrics.gross_recovered_inr,
        "estimated_natural_recovery_inr": reviveos_metrics.estimated_natural_recovery_inr,
        "incremental_recovered_inr": reviveos_metrics.incremental_recovered_inr,
        "net_incremental_contribution_inr": reviveos_metrics.net_incremental_contribution_inr,
        "contacts_avoided": reviveos_metrics.contacts_avoided_count,
        "double_debits_prevented": 0,
        "strategies": [m.to_dict() for m in report.strategies_comparison],
    }