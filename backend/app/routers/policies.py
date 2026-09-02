"""ReviveAI 2.0 — Policy Studio & Governance Router"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

from app.auth import get_current_user
from app.models.user import User
from app.state import get_state, add_audit_event
from app.services.policy_studio import policy_studio

router = APIRouter(prefix="/policies", tags=["Policy Studio"])


class CreatePolicyVersionRequest(BaseModel):
    name: str = "Custom Governance Policy"
    description: str = "Updated policy rules with merchant-defined risk boundaries."
    max_automated_amount_inr: float = Field(50000.0, ge=1.0)
    max_retries_per_case: int = Field(3, ge=1, le=10)
    retry_cooldown_minutes: int = Field(120, ge=1)
    high_risk_threshold: float = Field(0.70, ge=0.0, le=1.0)
    allowed_gateways: List[str] = ["razorpay", "payu", "cashfree", "stripe"]
    require_human_above_amount: float = Field(50000.0, ge=1.0)
    customer_communication_opt_out_enforced: bool = True
    daily_automation_budget_inr: float = Field(1000000.0, ge=1000.0)


class SimulatePolicyRequest(BaseModel):
    max_automated_amount_inr: float = 50000.0
    max_retries_per_case: int = 3
    high_risk_threshold: float = 0.70
    allowed_gateways: List[str] = ["razorpay", "payu", "cashfree", "stripe"]


class CompilePolicyRequest(BaseModel):
    natural_language_instruction: str = "Only retry if the amount is under ₹25,000 and recovery probability is above 60%."
    run_simulation: bool = True


class PolicyWhatIfRequest(BaseModel):
    change_description: str = "Reduce daily budget from ₹10,000 to ₹5,000"
    new_max_automated_amount_inr: Optional[float] = None
    new_daily_automation_budget_inr: Optional[float] = 5000.0
    new_high_risk_threshold: Optional[float] = None
    new_max_retries_per_case: Optional[int] = None


@router.get("")
async def list_policies(current_user: User = Depends(get_current_user)):
    """Returns all versioned policy records for the merchant."""
    mid = current_user.merchant_id
    return policy_studio.get_policies(mid)


@router.get("/active")
async def get_active_policy(current_user: User = Depends(get_current_user)):
    """Returns the currently active policy rules."""
    mid = current_user.merchant_id
    policy = policy_studio.get_active_policy(mid)
    return policy.to_dict()


@router.post("")
async def create_policy_version(
    req: CreatePolicyVersionRequest,
    current_user: User = Depends(get_current_user),
):
    """Creates and activates a new policy version (e.g. v2, v3)."""
    mid = current_user.merchant_id
    new_policy = policy_studio.create_policy_version(
        merchant_id=mid,
        name=req.name,
        description=req.description,
        created_by=f"merchant_admin_{current_user.id[:6]}",
        rules=req.dict(),
    )
    
    add_audit_event(
        merchant_id=mid,
        event_type="POLICY_VERSION_ACTIVATED",
        actor="merchant_admin",
        correlation_id=new_policy["policy_id"],
        event_data={
            "version": new_policy["version"],
            "ceiling": req.max_automated_amount_inr,
            "max_retries": req.max_retries_per_case,
        }
    )
    
    return new_policy


@router.post("/simulate")
async def simulate_policy_rules(
    req: SimulatePolicyRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Simulates the impact of proposed policy rules against active cases.
    Shows newly blocked cases, shifted revenue, and risk reduction.
    """
    mid = current_user.merchant_id
    state = get_state(mid)
    cases = state.get("cases", [])
    
    return policy_studio.simulate_policy_change(
        merchant_id=mid,
        new_rules=req.dict(),
        cases=cases,
    )


@router.post("/compile")
async def compile_policy_from_natural_language(
    req: CompilePolicyRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Policy Compiler: convert natural language instructions into structured policy rules.
    AI-ASSISTED classification, but deterministic validation and deployment.
    AI classifies intent only — final policy rules are deterministic.
    """
    mid = current_user.merchant_id
    state = get_state(mid)
    cases = state.get("cases", [])
    text = req.natural_language_instruction.lower()

    # Deterministic rule extraction from common patterns
    parsed_rules: Dict[str, Any] = {}
    validation_errors: List[str] = []

    import re
    # Amount ceiling
    m = re.search(r"(?:under|below|less than|up to)\s*[₹rs]?\s*([\d,]+)", text)
    if m:
        amt = float(m.group(1).replace(",", ""))
        parsed_rules["max_automated_amount_inr"] = amt
    # Probability threshold
    m2 = re.search(r"(?:above|over|more than|greater than|at least)\s*([\d.]+)\s*%", text)
    if m2:
        threshold = float(m2.group(1)) / 100.0
        parsed_rules["high_risk_threshold"] = round(1.0 - threshold, 2)
    # Retry limit
    m3 = re.search(r"(?:max|maximum|up to|only)\s*([\d]+)\s*retr(?:y|ies)", text)
    if m3:
        parsed_rules["max_retries_per_case"] = int(m3.group(1))
    # Gateway restrictions
    if "only razorpay" in text or "razorpay only" in text:
        parsed_rules["allowed_gateways"] = ["razorpay"]
    # Budget
    m4 = re.search(r"budget.*?[₹rs]?\s*([\d,]+)", text)
    if m4:
        budget = float(m4.group(1).replace(",", ""))
        parsed_rules["daily_automation_budget_inr"] = budget

    if not parsed_rules:
        validation_errors.append(
            "Could not extract specific policy rules from the instruction. "
            "Try: 'Only retry if amount is under ₹25,000 and probability above 60%'."
        )

    # Validate parsed rules
    if "max_automated_amount_inr" in parsed_rules and parsed_rules["max_automated_amount_inr"] < 100:
        validation_errors.append("Amount ceiling below ₹100 would block all automated recovery.")
    if "high_risk_threshold" in parsed_rules and parsed_rules["high_risk_threshold"] < 0.1:
        validation_errors.append("Risk threshold would allow very high-risk transactions through automation.")

    # Simulate economic impact if requested
    simulation_summary: Dict[str, Any] = {}
    if req.run_simulation and parsed_rules and not validation_errors:
        ceiling = parsed_rules.get("max_automated_amount_inr", 50000.0)
        risk_t = parsed_rules.get("high_risk_threshold", 0.70)
        affected = [c for c in cases if c.get("amount_inr", 0) > ceiling or c.get("risk_score", 0.1) > risk_t]
        simulation_summary = {
            "opportunities_blocked": len(affected),
            "revenue_impact_inr": round(sum(c.get("amount_inr", 0) * 0.3 for c in affected), 2),
            "risk_reduction_opportunities": len([c for c in affected if c.get("risk_score", 0.1) > risk_t]),
            "_note": "[SIMULATION — based on current opportunity pool]",
        }

    add_audit_event(
        merchant_id=mid,
        event_type="POLICY_COMPILE_REQUESTED",
        actor=f"merchant_{current_user.id[:6]}",
        correlation_id=f"compile_{mid[:8]}",
        event_data={"text": req.natural_language_instruction[:100], "parsed_rules": parsed_rules},
    )

    return {
        "original_instruction": req.natural_language_instruction,
        "parsed_rules": parsed_rules,
        "validation_errors": validation_errors,
        "is_deployable": len(validation_errors) == 0 and len(parsed_rules) > 0,
        "simulation_result": simulation_summary,
        "deployment_warning": (
            "Parsed rules require human review before deployment. "
            "Use POST /policies to create a versioned policy from these rules."
        ) if parsed_rules else None,
        "_ai_note": "Pattern classification is deterministic regex-based. Final rule values are exact — not LLM-generated.",
    }


@router.post("/what-if")
async def policy_what_if_analysis(
    req: PolicyWhatIfRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Policy What-If Analysis: 'What if I reduce budget from ₹10,000 to ₹5,000?'
    Shows exactly how many opportunities would be affected and the revenue impact.
    """
    mid = current_user.merchant_id
    state = get_state(mid)
    cases = state.get("cases", [])
    current_policy = policy_studio.get_active_policy(mid)

    new_rules: Dict[str, Any] = {}
    if req.new_max_automated_amount_inr is not None:
        new_rules["max_automated_amount_inr"] = req.new_max_automated_amount_inr
    if req.new_daily_automation_budget_inr is not None:
        new_rules["daily_automation_budget_inr"] = req.new_daily_automation_budget_inr
    if req.new_high_risk_threshold is not None:
        new_rules["high_risk_threshold"] = req.new_high_risk_threshold
    if req.new_max_retries_per_case is not None:
        new_rules["max_retries_per_case"] = req.new_max_retries_per_case

    # Compute delta
    old_ceiling = current_policy.max_automated_amount_inr
    new_ceiling = new_rules.get("max_automated_amount_inr", old_ceiling)
    old_budget = current_policy.daily_automation_budget_inr
    new_budget = new_rules.get("daily_automation_budget_inr", old_budget)
    old_risk = current_policy.high_risk_threshold
    new_risk = new_rules.get("high_risk_threshold", old_risk)

    newly_blocked = [
        c for c in cases
        if (
            (new_ceiling < old_ceiling and c.get("amount_inr", 0) > new_ceiling and c.get("amount_inr", 0) <= old_ceiling)
            or (new_risk < old_risk and c.get("risk_score", 0.1) > new_risk and c.get("risk_score", 0.1) <= old_risk)
        )
    ]
    newly_unblocked = [
        c for c in cases
        if (
            (new_ceiling > old_ceiling and c.get("amount_inr", 0) > old_ceiling and c.get("amount_inr", 0) <= new_ceiling)
        )
    ]

    newly_blocked_value = sum(c.get("amount_inr", 0) * 0.3 for c in newly_blocked)
    newly_unblocked_value = sum(c.get("amount_inr", 0) * 0.3 for c in newly_unblocked)

    return {
        "change_description": req.change_description,
        "current_policy": {
            "max_automated_amount_inr": old_ceiling,
            "daily_automation_budget_inr": old_budget,
            "high_risk_threshold": old_risk,
        },
        "proposed_policy": new_rules,
        "impact": {
            "newly_blocked_opportunities": len(newly_blocked),
            "newly_blocked_revenue_impact_inr": round(newly_blocked_value, 2),
            "newly_unblocked_opportunities": len(newly_unblocked),
            "newly_unblocked_revenue_opportunity_inr": round(newly_unblocked_value, 2),
            "net_revenue_delta_inr": round(newly_unblocked_value - newly_blocked_value, 2),
            "budget_change_inr": round(new_budget - old_budget, 2),
        },
        "recommendation": (
            "This change reduces automation ceiling — some opportunities will require human review. "
            f"Expected impact: {len(newly_blocked)} opportunities blocked, ₹{newly_blocked_value:,.0f} shifted to human queue."
        ) if newly_blocked else "This change expands automation ceiling — more opportunities become eligible for automation.",
        "_note": "[SIMULATION — based on current opportunity pool]",
    }