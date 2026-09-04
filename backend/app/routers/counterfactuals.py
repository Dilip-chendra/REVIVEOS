from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional

from app.auth import get_current_user, get_effective_mode
from app.models.user import User
from app.state import get_state
from app.services.counterfactual_lab import counterfactual_lab
from app.services.policy_studio import policy_studio

router = APIRouter(prefix="/counterfactuals", tags=["Counterfactual Lab"])


class EvaluateCaseRequest(BaseModel):
    amount_inr: float = Field(150000.0, ge=1)
    failure_code: str = "INSUFFICIENT_FUNDS"
    failure_category: str = "temporary_failure"
    customer_tenure_months: int = Field(12, ge=0)
    historical_success_rate: float = Field(0.88, ge=0.0, le=1.0)
    retry_count: int = Field(0, ge=0)
    gateway: str = "razorpay"
    gateway_is_degraded: bool = False
    gateway_error_rate: float = Field(0.04, ge=0.0, le=1.0)
    is_weekend: bool = False
    customer_opted_out: bool = False
    policy_ceiling_inr: float = 500000.0
    case_id: str = "custom_case"


@router.post("/evaluate")
async def evaluate_counterfactuals(
    req: EvaluateCaseRequest,
    current_user: User = Depends(get_current_user),
):
    report = counterfactual_lab.evaluate_case(
        amount_inr=req.amount_inr,
        failure_code=req.failure_code,
        failure_category=req.failure_category,
        customer_tenure_months=req.customer_tenure_months,
        historical_success_rate=req.historical_success_rate,
        retry_count=req.retry_count,
        gateway=req.gateway,
        gateway_is_degraded=req.gateway_is_degraded,
        gateway_error_rate=req.gateway_error_rate,
        is_weekend=req.is_weekend,
        customer_opted_out=req.customer_opted_out,
        policy_ceiling_inr=req.policy_ceiling_inr,
        case_id=req.case_id,
    )
    
    return {
        "case_id": report.case_id,
        "input_parameters": {
            "amount_inr": report.amount_inr,
            "failure_code": report.failure_code,
            "failure_category": report.failure_category,
            "customer_tenure_months": report.customer_tenure_months,
            "historical_success_rate": report.historical_success_rate,
            "retry_count": report.retry_count,
            "gateway": report.gateway,
            "gateway_is_degraded": report.gateway_is_degraded,
        },
        "strategies": [
            {
                "strategy_id": s.strategy_id,
                "name": s.name,
                "description": s.description,
                "recovery_probability": s.recovery_probability,
                "expected_time_str": s.expected_time_str,
                "additional_attempts": s.additional_attempts,
                "customer_friction": s.customer_friction,
                "policy_risk": s.policy_risk,
                "expected_value_inr": s.expected_value_inr,
                "expected_gateway_cost_inr": s.expected_gateway_cost_inr,
                "net_expected_value_inr": s.net_expected_value_inr,
                "requires_human": s.requires_human,
                "status": s.status,
                "score": s.score,
                "why_wins_or_loses": s.why_wins_or_loses,
            }
            for s in report.strategies
        ],
        "recommended_strategy_id": report.recommended_strategy_id,
        "what_if_analysis": report.what_if_analysis,
        "reviveai_advantage": report.reviveai_advantage,
    }


@router.get("/case/{case_id}")
async def evaluate_existing_case(
    case_id: str,
    request: Request,
    policy_ceiling_inr: float = 500000.0,
    current_user: User = Depends(get_current_user),
):
    mode = get_effective_mode(request, current_user)
    is_real = mode == "real"
    state = get_state(current_user.merchant_id)
    if is_real:
        env = state.get("active_environment", "RAZORPAY_TEST")
        target_key = "provider_live_cases" if env == "RAZORPAY_LIVE" else "provider_test_cases"
        cases = state.get(target_key, [])
    else:
        cases = state.get("demo_cases", state.get("cases", []))
    case = next((c for c in cases if c["id"] == case_id), None)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    report = counterfactual_lab.evaluate_case(
        amount_inr=float(case.get("amount_inr", 150000)),
        failure_code=str(case.get("failure_code", "INSUFFICIENT_FUNDS")),
        failure_category=str(case.get("failure_category", "temporary_failure")),
        customer_tenure_months=int(case.get("customer_tenure_months", 14)),
        historical_success_rate=float(case.get("customer_success_rate", 0.92)),
        retry_count=int(case.get("retry_count", 0)),
        gateway=str(case.get("gateway", "razorpay")),
        gateway_is_degraded=bool(case.get("gateway_is_degraded", False)),
        gateway_error_rate=float(case.get("gateway_error_rate", 0.04)),
        is_weekend=bool(case.get("is_weekend", False)),
        customer_opted_out=bool(case.get("customer_opted_out", False)),
        policy_ceiling_inr=policy_ceiling_inr,
        case_id=case_id,
    )
    
    return {
        "case_id": case_id,
        "case": case,
        "strategies": [
            {
                "strategy_id": s.strategy_id,
                "name": s.name,
                "description": s.description,
                "recovery_probability": s.recovery_probability,
                "expected_time_str": s.expected_time_str,
                "additional_attempts": s.additional_attempts,
                "customer_friction": s.customer_friction,
                "policy_risk": s.policy_risk,
                "expected_value_inr": s.expected_value_inr,
                "expected_gateway_cost_inr": s.expected_gateway_cost_inr,
                "net_expected_value_inr": s.net_expected_value_inr,
                "requires_human": s.requires_human,
                "status": s.status,
                "why_wins_or_loses": s.why_wins_or_loses,
            }
            for s in report.strategies
        ],
        "recommended_strategy_id": report.recommended_strategy_id,
        "what_if_analysis": report.what_if_analysis,
        "reviveai_advantage": report.reviveai_advantage,
    }