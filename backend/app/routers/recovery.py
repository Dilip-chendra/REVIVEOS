"""ReviveAI — Recovery & Trust-Aware Decision Control Plane Router (merchant-scoped)"""
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from app.auth import get_current_user
from app.models.user import User
from app.state import (
    get_state, add_audit_event, _sync_active_cases_and_metrics,
    set_global_kill_switch, set_incident_mode, get_safety_metrics, record_safety_metric
)
from app.security.idempotency import get_idempotency_result, store_idempotency_result
from app.security.execution_lock import acquire_case_lock
from app.security.abuse_monitor import record_event
from app.services.policy_engine import policy_engine, PolicyContext
from app.services.decision_engine import (
    decision_engine, NormalizedCase, CustomerIntent, AuthorizationState,
    PaymentType, StrategyType
)
from app.services.safety_governor import safety_governor
from app.services.constitution import constitution_engine
from app.services.action_contract import action_contract_manager

router = APIRouter(prefix="/recovery", tags=["Recovery"])


class ActionNote(BaseModel):
    note: str = ""


class KillSwitchRequest(BaseModel):
    enabled: bool


class IncidentModeRequest(BaseModel):
    mode: str  # NORMAL | DEGRADED | PROTECTIVE | EMERGENCY_STOP


class ShadowModeRequest(BaseModel):
    enabled: bool


class StrategyComparisonRequest(BaseModel):
    amount_inr: float
    failure_code: str
    gateway: str = "razorpay"
    customer_name: str = "Merchant Customer"
    customer_ltv_inr: float = 50000.0
    customer_tenure_months: int = 12
    historical_success_rate: float = 0.90
    retry_count: int = 0
    gateway_is_degraded: bool = False
    customer_intent: str = "ACTIVE"
    authorization_state: str = "AUTHORIZED"
    duplicate_purchase_detected: bool = False
    policy_ceiling_inr: float = 50000.0


@router.get("/safety-controls/summary")
async def get_safety_summary(current_user: User = Depends(get_current_user)):
    """Returns global recovery safety metrics, kill switch status, incident mode, and shadow mode."""
    mid = current_user.merchant_id
    metrics = get_safety_metrics(mid)
    state = get_state(mid)
    gov_eval = safety_governor.evaluate_system_governance(
        merchant_id=mid,
        is_kill_switch_active=state.get("global_kill_switch_enabled", False),
        incident_mode=state.get("incident_mode", "NORMAL"),
    )
    return {
        "kill_switch_active": state.get("global_kill_switch_enabled", False),
        "incident_mode": state.get("incident_mode", "NORMAL"),
        "shadow_mode": state.get("shadow_mode", False),
        "governor_posture": gov_eval.posture.value,
        "governor_autonomy_ceiling": gov_eval.max_allowed_autonomy.value,
        "safety_score": gov_eval.safety_score,
        "metrics": metrics,
    }


@router.get("/safety-controls/governor")
async def get_safety_governor_status(current_user: User = Depends(get_current_user)):
    """Returns Safety Governor posture, daily recovery budget, blast radius calculation, and 7 integrity pillars."""
    mid = current_user.merchant_id
    state = get_state(mid)
    cases = state.get("cases", [])
    gov_eval = safety_governor.evaluate_system_governance(
        merchant_id=mid,
        is_kill_switch_active=state.get("global_kill_switch_enabled", False),
        incident_mode=state.get("incident_mode", "NORMAL"),
    )
    blast = safety_governor.compute_blast_radius(mid, [c for c in cases if c.get("status") == "open"])
    return {
        "governor": {
            "max_allowed_autonomy": gov_eval.max_allowed_autonomy.value,
            "posture": gov_eval.posture.value,
            "safety_score": gov_eval.safety_score,
            "reduction_reasons": gov_eval.reduction_reasons,
            "pillars": gov_eval.pillars,
            "daily_budget": gov_eval.daily_budget,
            "evaluated_at": gov_eval.evaluated_at,
        },
        "blast_radius": blast.__dict__,
    }


@router.get("/safety-controls/constitution")
async def get_constitution_status(current_user: User = Depends(get_current_user)):
    """Returns the 12-article Constitution status and live evaluation rules."""
    mid = current_user.merchant_id
    state = get_state(mid)
    res = constitution_engine.evaluate(
        case_id="governance_audit",
        tenant_id=mid,
        amount_inr=0.0,
        authorization_state="AUTHORIZED",
        customer_intent="ACTIVE",
        customer_cancelled=False,
        duplicate_detected=False,
        is_kill_switch_active=state.get("global_kill_switch_enabled", False),
        gateway_is_degraded=False,
        trust_score=95.0,
        policy_allowed=True,
        is_autonomous_action=False,
    )
    return res.to_dict()


@router.post("/safety-controls/kill-switch")
async def toggle_kill_switch(
    req: KillSwitchRequest,
    current_user: User = Depends(get_current_user),
):
    """Engage or disengage the global autonomous recovery kill switch."""
    mid = current_user.merchant_id
    active = set_global_kill_switch(mid, req.enabled)
    return {
        "success": True,
        "kill_switch_active": active,
        "message": f"Global Emergency Recovery Kill Switch is {'ACTIVE (All automation stopped)' if active else 'INACTIVE (Automation permitted)'}.",
    }


@router.post("/safety-controls/incident-mode")
async def update_incident_mode(
    req: IncidentModeRequest,
    current_user: User = Depends(get_current_user),
):
    """Set system incident protection mode."""
    mid = current_user.merchant_id
    mode = set_incident_mode(mid, req.mode)
    return {
        "success": True,
        "incident_mode": mode,
        "message": f"Incident protection mode updated to '{mode}'.",
    }


@router.post("/safety-controls/shadow-mode")
async def toggle_shadow_mode(
    req: ShadowModeRequest,
    current_user: User = Depends(get_current_user),
):
    """Enable or disable shadow mode execution."""
    mid = current_user.merchant_id
    state = get_state(mid)
    state["shadow_mode"] = req.enabled
    return {
        "success": True,
        "shadow_mode": req.enabled,
        "message": f"Shadow Recovery Mode is {'ENABLED (Autonomous actions will be simulated only)' if req.enabled else 'DISABLED'}.",
    }


@router.get("/brain/{case_id}")
async def get_recovery_brain_decision(
    case_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Unified Recovery Brain Endpoint:
    Returns the complete decision orchestration, 10-node decision graph,
    5-tier trust score, data quality checklist, and 'Why Not?' explainability matrix.
    """
    mid = current_user.merchant_id
    cases = get_state(mid).get("cases", [])
    raw = next((c for c in cases if c["id"] == case_id), None)
    if not raw:
        from app.services.opportunity_service import opportunity_service
        opp = opportunity_service.get_opportunity(case_id)
        if opp:
            raw = {
                "id": opp["id"],
                "merchant_id": mid,
                "amount_inr": opp["amount_inr"],
                "customer_id": opp["customer_id"],
                "customer_name": opp["customer_name"],
                "gateway": opp.get("gateway", "razorpay"),
                "status": "open" if opp["is_eligible"] else "blocked",
                "failure_code": opp.get("failure_code", "GATEWAY_TIMEOUT"),
                "failure_reason": opp.get("failure_reason", "Processor decline"),
                "recommended_strategy": "smart_retry",
                "recovery_probability": opp.get("p_intervention", 0.75),
                "expected_recovery_value_inr": opp.get("expected_incremental_value_inr", 0.0),
                "risk_score": opp.get("risk_score", 0.1),
                "customer_lifetime_value_inr": 50000.0,
                "customer_context": {"tenure_months": opp.get("customer_tenure_months", 12)},
                "customer_success_rate": 0.90,
                "retry_count": 0,
                "customer_intent": "ACTIVE",
                "authorization_state": "AUTHORIZED" if opp.get("is_pre_authorized") else "ONE_TIME_CHECKOUT",
                "duplicate_purchase_detected": False,
                "customer_cancelled": False,
            }
        else:
            raise HTTPException(status_code=404, detail="Case not found")

    state = get_state(mid)
    is_shadow = state.get("shadow_mode", False)

    # Convert to NormalizedCase
    norm_case = NormalizedCase(
        case_id=raw["id"],
        amount_inr=float(raw.get("amount_inr", 0)),
        failure_code=raw.get("failure_code", "GATEWAY_ERROR"),
        gateway=raw.get("gateway", "razorpay"),
        customer_id=raw.get("customer_id", f"cust_{raw['id']}"),
        customer_name=raw.get("customer_name") or raw.get("merchant_name", "Valued Customer"),
        customer_ltv_inr=float(raw.get("customer_lifetime_value_inr") or 50000.0),
        customer_tenure_months=int(raw.get("customer_context", {}).get("tenure_months") or 12),
        historical_success_rate=float(raw.get("customer_success_rate") or 0.90),
        retry_count=int(raw.get("retry_count") or 0),
        tenant_id=mid,
        is_weekend=bool(raw.get("is_weekend", False)),
        gateway_is_degraded=bool(raw.get("gateway_is_degraded", False)),
        gateway_error_rate=float(raw.get("gateway_failure_rate_1h") or 0.04),
        customer_opted_out=bool(raw.get("customer_opted_out", False)),
        is_vip=bool(raw.get("is_vip", False)),
        customer_intent=CustomerIntent(raw.get("customer_intent", "ACTIVE")),
        authorization_state=AuthorizationState(raw.get("authorization_state", "AUTHORIZED")),
        payment_type=PaymentType.ONE_TIME_CHECKOUT,
        duplicate_purchase_detected=bool(raw.get("duplicate_purchase_detected", False)),
        duplicate_order_id=raw.get("duplicate_order_id"),
        customer_cancelled=bool(raw.get("customer_cancelled", False)),
        data_quality_pct=float(raw.get("data_quality_pct", 95.0)),
        is_shadow_mode=is_shadow,
    )

    ceiling = 500000.0 if raw.get("scenario_type") in ("b2b_saas", "b2b") or raw.get("id") == "demo-case-001" else 50000.0
    decision_res = decision_engine.evaluate_decision(norm_case, policy_ceiling_inr=ceiling)

    return {
        "case_id": decision_res.case_id,
        "decision_id": decision_res.decision_id,
        "timestamp": decision_res.timestamp,
        "priority_score": decision_res.priority_score,
        "priority_tier": decision_res.priority_tier,
        "priority_explanation": decision_res.priority_explanation,
        "root_cause_diagnosis": decision_res.root_cause_diagnosis,
        "model_routing": decision_res.model_routing,
        "selected_strategy": decision_res.selected_strategy.__dict__,
        "candidate_strategies": [s.__dict__ for s in decision_res.candidate_strategies],
        "action_verdict": decision_res.action_verdict.value,
        "autonomy_level": decision_res.autonomy_level.value,
        "trust_score": decision_res.trust_score,
        "trust_tier": decision_res.trust_tier.value,
        "trust_breakdown": decision_res.trust_breakdown,
        "data_quality_score": decision_res.data_quality_score,
        "data_quality_checklist": decision_res.data_quality_checklist,
        "state_freshness_status": decision_res.state_freshness_status,
        "why_selected": decision_res.why_selected,
        "rejected_alternatives": decision_res.rejected_alternatives,
        "decision_graph": decision_res.decision_graph,
        "duplicate_risk_summary": decision_res.duplicate_risk_summary,
        "customer_protection_summary": decision_res.customer_protection_summary,
        "counterfactual_do_nothing_diff_inr": decision_res.counterfactual_do_nothing_diff_inr,
        "baseline_expected_value_inr": decision_res.baseline_expected_value_inr,
        "incremental_economic_lift_inr": decision_res.incremental_economic_lift_inr,
        "policy_gate_verdict": decision_res.policy_gate_verdict,
        "is_autonomous_executable": decision_res.is_autonomous_executable,
        "decision_receipt_hash": decision_res.decision_receipt_hash,
        "constitution_evaluation": decision_res.constitution_evaluation,
        "signed_action_contract": decision_res.signed_action_contract,
        "safety_governor_posture": decision_res.safety_governor_posture,
        "intent_decay": decision_res.intent_decay,
        "causal_attribution": decision_res.causal_attribution,
        "recovery_window_expires_at": decision_res.recovery_window_expires_at,
    }


@router.post("/strategy-lab/compare")
async def compare_strategies(req: StrategyComparisonRequest):
    """
    Strategy Lab: Compares all recovery strategies on custom failure parameters,
    calculating Net EV, friction levels, and policy bounds.
    """
    norm_case = NormalizedCase(
        case_id=f"lab_{uuid.uuid4().hex[:6]}",
        amount_inr=req.amount_inr,
        failure_code=req.failure_code,
        gateway=req.gateway,
        customer_id="lab_customer",
        customer_name=req.customer_name,
        customer_ltv_inr=req.customer_ltv_inr,
        customer_tenure_months=req.customer_tenure_months,
        historical_success_rate=req.historical_success_rate,
        retry_count=req.retry_count,
        gateway_is_degraded=req.gateway_is_degraded,
        customer_intent=CustomerIntent(req.customer_intent),
        authorization_state=AuthorizationState(req.authorization_state),
        duplicate_purchase_detected=req.duplicate_purchase_detected,
    )

    decision_res = decision_engine.evaluate_decision(norm_case, policy_ceiling_inr=req.policy_ceiling_inr)

    return {
        "selected_strategy": decision_res.selected_strategy.__dict__,
        "candidates": [s.__dict__ for s in decision_res.candidate_strategies],
        "trust_score": decision_res.trust_score,
        "trust_tier": decision_res.trust_tier.value,
        "action_verdict": decision_res.action_verdict.value,
        "autonomy_level": decision_res.autonomy_level.value,
        "why_selected": decision_res.why_selected,
        "rejected_alternatives": decision_res.rejected_alternatives,
        "decision_graph": decision_res.decision_graph,
        "constitution_evaluation": decision_res.constitution_evaluation,
        "safety_governor_posture": decision_res.safety_governor_posture,
    }


@router.get("/opportunities")
async def get_opportunities(current_user: User = Depends(get_current_user)):
    cases = get_state(current_user.merchant_id).get("cases", [])
    open_cases = [c for c in cases if c.get("status") == "open"]
    open_cases.sort(key=lambda x: x.get("expected_recovery_value_inr", 0), reverse=True)
    return open_cases[:20]


@router.get("/human-queue")
async def get_human_queue(current_user: User = Depends(get_current_user)):
    cases = get_state(current_user.merchant_id).get("cases", [])
    queue = [
        c for c in cases
        if c.get("is_human_required")
        or c.get("recommended_strategy") in ("escalate", "stop")
        or c.get("status") in ("escalated",)
        or (c.get("recovery_result") and c["recovery_result"].get("blocked"))
        or c.get("amount_inr", 0) > 50000
    ]
    queue.sort(key=lambda x: x.get("amount_inr", 0), reverse=True)
    return queue


@router.get("/{case_id}")
async def get_case(case_id: str, current_user: User = Depends(get_current_user)):
    cases = get_state(current_user.merchant_id).get("cases", [])
    case = next((c for c in cases if c["id"] == case_id), None)
    if not case:
        from app.services.opportunity_service import opportunity_service
        opp = opportunity_service.get_opportunity(case_id)
        if opp:
            case = {
                "id": opp["id"],
                "merchant_id": mid if 'mid' in locals() else current_user.merchant_id,
                "amount_inr": opp["amount_inr"],
                "customer_id": opp["customer_id"],
                "customer_name": opp["customer_name"],
                "gateway": opp.get("gateway", "razorpay"),
                "status": "open" if opp["is_eligible"] else "blocked",
                "failure_code": opp.get("failure_code", "GATEWAY_TIMEOUT"),
                "failure_reason": opp.get("failure_reason", "Processor decline"),
                "recommended_strategy": "smart_retry",
                "recovery_probability": opp.get("p_intervention", 0.75),
                "expected_recovery_value_inr": opp.get("expected_incremental_value_inr", 0.0),
                "risk_score": opp.get("risk_score", 0.1),
                "confidence": 0.92,
                "is_human_required": opp.get("amount_inr", 0) > 50000,
                "ai_diagnosis": f"Opportunity State: {opp['state']}. Incremental Lift: +{int(opp.get('tau', 0)*100)}pp.",
                "ai_recommended_action": opp.get("selected_action", "smart_retry"),
                "created_at": opp["created_at"].isoformat() if hasattr(opp["created_at"], "isoformat") else str(opp["created_at"]),
                "customer_intent": opp.get("intent_level", "HIGH_CURRENT_INTENT"),
                "authorization_state": "AUTHORIZED" if opp.get("is_pre_authorized") else "ONE_TIME_CHECKOUT",
                "yield_score": opp.get("yield_score", 0.0),
                "tau": opp.get("tau", 0.0),
                "p_natural": opp.get("p_natural", 0.1),
                "p_intervention": opp.get("p_intervention", 0.8),
                "abstention_reason": opp.get("abstention_reason"),
            }
        else:
            raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.post("/{case_id}/customer-cancel")
async def customer_cancel_recovery(
    case_id: str,
    current_user: User = Depends(get_current_user),
):
    mid = current_user.merchant_id
    cases = get_state(mid).get("cases", [])
    case = next((c for c in cases if c["id"] == case_id), None)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case["status"] = "cancelled"
    case["customer_cancelled"] = True
    case["customer_intent"] = "CANCELLED"
    case["is_human_required"] = False
    case["recovery_result"] = {
        "recovered": False,
        "amount_recovered_inr": 0,
        "action": "customer_cancelled",
        "blocked": True,
        "message": "Customer explicitly cancelled this recovery attempt. Automation permanently halted.",
    }
    record_safety_metric(mid, "customer_cancellations_honored")
    _sync_active_cases_and_metrics(mid)

    add_audit_event(
        mid, "CUSTOMER_CANCELLED_RECOVERY", "CUSTOMER",
        case.get("correlation_id", case_id),
        {"case_id": case_id, "amount_inr": case.get("amount_inr", 0)},
        case["id"], case.get("amount_inr")
    )
    return {
        "success": True,
        "status": "cancelled",
        "message": "Customer cancellation confirmed and recorded in audit ledger.",
    }


from app.services.financial_gateway import financial_action_gateway, FinancialActionRequest, GatewayExecutionStatus


@router.post("/{case_id}/execute")
async def execute_recovery_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
):
    mid = current_user.merchant_id
    cases = get_state(mid).get("cases", [])
    case = next((c for c in cases if c["id"] == case_id), None)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    req = FinancialActionRequest(
        merchant_id=mid,
        case_id=case_id,
        action_type=case.get("recommended_strategy", "retry"),
        actor="RECOVERY_ENGINE",
        is_autonomous=True,
    )
    result = await financial_action_gateway.execute_action(req)
    return {
        "recovered": result.recovered,
        "amount_recovered_inr": result.amount_recovered_inr,
        "blocked": result.status in (GatewayExecutionStatus.BLOCKED, GatewayExecutionStatus.CANCELLED),
        "reason": result.blocking_reason,
        "case": case,
    }


@router.post("/{case_id}/approve")
async def approve_action(
    case_id: str,
    note: ActionNote,
    current_user: User = Depends(get_current_user),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    mid = current_user.merchant_id
    
    if idempotency_key:
        cached = await get_idempotency_result(idempotency_key, mid)
        if cached:
            return JSONResponse(cached, headers={"X-Idempotency-Replay": "true"})

    async with acquire_case_lock(case_id):
        cases = get_state(mid).get("cases", [])
        case = next((c for c in cases if c["id"] == case_id), None)
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        req = FinancialActionRequest(
            merchant_id=mid,
            case_id=case_id,
            action_type="human_approved",
            actor="USER",
            idempotency_key=idempotency_key,
            note=note.note,
            is_autonomous=False,
        )
        await financial_action_gateway.execute_action(req)

        if idempotency_key:
            await store_idempotency_result(idempotency_key, mid, case)

        return case


@router.post("/{case_id}/reject")
async def reject_action(
    case_id: str,
    note: ActionNote,
    current_user: User = Depends(get_current_user),
):
    mid = current_user.merchant_id
    cases = get_state(mid).get("cases", [])
    case = next((c for c in cases if c["id"] == case_id), None)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case["status"] = "closed"
    case["is_human_required"] = False
    case["recovery_result"] = {
        "recovered": False,
        "amount_recovered_inr": 0,
        "action": "human_rejected",
        "blocked": False,
        "message": f"Recovery rejected by operations team. {note.note or 'Case closed.'}",
    }
    _sync_active_cases_and_metrics(mid)

    add_audit_event(mid, "HUMAN_REJECTED", "user", case.get("correlation_id", case_id),
                    {"note": note.note}, case["id"], case.get("amount_inr"))
    return case
