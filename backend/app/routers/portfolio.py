# -*- coding: utf-8 -*-
"""ReviveAI -- Recovery Capital Allocator & Opportunity Portfolio Router"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.auth import get_current_user
from app.models.user import User
from app.services.capital_allocator import recovery_capital_allocator
from app.services.attribution_regret_engine import attribution_regret_engine
from app.services.opportunity_service import opportunity_service
from app.services.strategy_auction import strategy_auction_engine
from app.services.decision_replay import decision_replay_engine
from app.services.policy_simulator import policy_simulator
from app.services.agent_arbitrator import multi_agent_arbitrator
from app.services.financial_gateway import financial_action_gateway, FinancialActionRequest
from app.services.action_contract import action_contract_manager
from app.services.recovery_conversion_service import recovery_conversion_service
from app.services.recovery_auction_engine import recovery_auction_engine
from app.services.decision_quality import decision_quality_engine
from app.services.opportunity_graph import opportunity_graph

router = APIRouter(prefix="/portfolio", tags=["Recovery Portfolio"])


class OptimizeRequest(BaseModel):
    recovery_budget_inr: float = 500.0
    contact_limit: int = 50
    reserve_budget_pct: float = 0.20
    risk_tolerance: str = "BALANCED"


class SettlementSyncRequest(BaseModel):
    recovery_budget_inr: float = 500.0
    contact_limit: int = 50


class ExecuteBatchRequest(BaseModel):
    opportunity_ids: Optional[List[str]] = None
    max_execute_count: int = 50


class NewCheckoutTriggerRequest(BaseModel):
    customer_id: str = "CUST-OLD-999"
    customer_name: str = "Rohan Deshmukh"
    amount_inr: float = 40000.0
    order_id: str = "ORD-IPHONE-TODAY-002"


class CancelOpportunityRequest(BaseModel):
    opportunity_id: str


class StrategyAuctionRequest(BaseModel):
    opportunity_id: str = "OPP-002"
    amount_inr: float = 2500.0
    failure_code: str = "EXPIRED_CARD"
    is_pre_authorized: bool = True
    customer_fatigue_count: int = 0
    provider_failure_rate: float = 0.02
    data_age_seconds: float = 10.0


class PolicySimulateRequest(BaseModel):
    recovery_budget_inr: float = 500.0
    contact_limit: int = 50
    reserve_budget_pct: float = 0.20
    max_automated_amount_inr: float = 50000.0


class RunAuctionRequest(BaseModel):
    recovery_budget_inr: float = 500.0
    contact_limit: int = 50
    reserve_budget_pct: float = 0.20


class ArbitrateAgentsRequest(BaseModel):
    customer_id: str = "CUST-9821"
    customer_name: str = "Aarav Mehta"


class GenerateLinkRequest(BaseModel):
    opportunity_id: str = "OPP-001"


class ReconcilePaymentRequest(BaseModel):
    opportunity_id: str = "OPP-001"
    provider_payment_id: Optional[str] = None


@router.get("/current")
async def get_current_portfolio(current_user: User = Depends(get_current_user)):
    res = recovery_capital_allocator.allocate(merchant_id=current_user.merchant_id)
    return res


@router.post("/optimize")
async def optimize_portfolio_allocation(req: OptimizeRequest, current_user: User = Depends(get_current_user)):
    res = recovery_capital_allocator.allocate(
        recovery_budget_inr=req.recovery_budget_inr,
        contact_limit=req.contact_limit,
        reserve_budget_pct=req.reserve_budget_pct,
        risk_tolerance=req.risk_tolerance,
        merchant_id=current_user.merchant_id,
    )
    return res


@router.post("/settle")
async def simulate_settlement(req: SettlementSyncRequest):
    res = attribution_regret_engine.simulate_settlement_sync(
        recovery_budget_inr=req.recovery_budget_inr,
        contact_limit=req.contact_limit,
    )
    return res


@router.get("/regret")
async def get_regret_matrix():
    return attribution_regret_engine.get_latest_settlement_result()


@router.post("/trigger-new-checkout")
async def trigger_new_checkout_from_history(req: NewCheckoutTriggerRequest):
    res = opportunity_service.trigger_new_checkout_from_historical_customer(
        customer_id=req.customer_id,
        customer_name=req.customer_name,
        new_amount_inr=req.amount_inr,
        new_order_id=req.order_id,
    )
    return res


@router.post("/cancel-opportunity")
async def cancel_opportunity_sovereignty(req: CancelOpportunityRequest):
    res = opportunity_service.cancel_opportunity_by_customer(req.opportunity_id)
    return res


@router.post("/strategy-auction")
async def evaluate_strategy_auction(req: StrategyAuctionRequest):
    res = strategy_auction_engine.evaluate_auction(
        opportunity_id=req.opportunity_id,
        amount_inr=req.amount_inr,
        failure_code=req.failure_code,
        is_pre_authorized=req.is_pre_authorized,
        customer_fatigue_count=req.customer_fatigue_count,
        provider_failure_rate=req.provider_failure_rate,
        data_age_seconds=req.data_age_seconds,
    )
    return res


@router.get("/replay/{opportunity_id}")
async def get_decision_replay(opportunity_id: str, amount_inr: float = 4999.0, scenario: str = "standard_recovery"):
    res = decision_replay_engine.reconstruct_decision_timeline(
        opportunity_id=opportunity_id,
        amount_inr=amount_inr,
        scenario_type=scenario,
    )
    return res


@router.post("/simulate-policy")
async def simulate_policy_impact(req: PolicySimulateRequest):
    res = policy_simulator.simulate_policy(
        recovery_budget_inr=req.recovery_budget_inr,
        contact_limit=req.contact_limit,
        reserve_budget_pct=req.reserve_budget_pct,
        max_automated_amount_inr=req.max_automated_amount_inr,
    )
    return res


@router.post("/arbitrate-agents")
async def arbitrate_competing_agents(req: ArbitrateAgentsRequest):
    res = multi_agent_arbitrator.arbitrate(
        customer_id=req.customer_id,
        customer_name=req.customer_name,
    )
    return res


@router.get("/attention-ledger")
async def get_customer_attention_ledger():
    return {
        "records": multi_agent_arbitrator.get_all_attention_records(),
        "total_managed_customers": len(multi_agent_arbitrator._attention_ledger),
        "policy_active": "Max 1 contact per 24h per customer",
    }


@router.post("/generate-recovery-link")
async def generate_customer_recovery_link(req: GenerateLinkRequest):
    try:
        res = recovery_conversion_service.generate_customer_recovery_link(req.opportunity_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reconcile-payment")
async def reconcile_confirmed_payment(req: ReconcilePaymentRequest):
    try:
        res = recovery_conversion_service.simulate_customer_payment_completion(
            opportunity_id=req.opportunity_id,
            provider_payment_id=req.provider_payment_id,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/recovery-ledger")
async def get_forensic_recovery_ledger():
    return {
        "outcomes": recovery_conversion_service.get_all_outcomes(),
        "total_records": len(recovery_conversion_service._outcomes_ledger),
        "precision": "INTEGER_MINOR_PAISA",
    }


@router.get("/conversion-funnel")
async def get_recovery_conversion_funnel():
    return recovery_conversion_service.get_conversion_funnel()


@router.get("/auction/proposals")
async def get_all_auction_proposals():
    return {
        "proposals": recovery_auction_engine.get_all_proposals(),
        "total_proposals": len(recovery_auction_engine._proposals_pool),
    }


@router.post("/auction/run")
async def run_recovery_auction(req: RunAuctionRequest):
    return recovery_auction_engine.run_auction(
        recovery_budget_inr=req.recovery_budget_inr,
        contact_limit=req.contact_limit,
        reserve_budget_pct=req.reserve_budget_pct,
    )


@router.get("/auction/counterfactual/{customer_id}")
async def get_counterfactual_opportunity_cost(customer_id: str):
    try:
        return recovery_auction_engine.get_counterfactual_breakdown(customer_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/execute-batch")
async def execute_allocated_batch(req: ExecuteBatchRequest):
    alloc_res = recovery_capital_allocator.allocate()
    pursue_ids = [o["id"] if isinstance(o, dict) else o for o in alloc_res.buckets.get("PURSUE", [])]
    
    if req.opportunity_ids:
        target_ids = [i for i in req.opportunity_ids if i in pursue_ids]
    else:
        target_ids = pursue_ids[:req.max_execute_count]

    executed_contracts = []
    blocked_contracts = []

    for opp_id in target_ids:
        opp = opportunity_service.get_opportunity(opp_id)
        if not opp:
            continue
        
        # Build signed action contract
        contract = action_contract_manager.create_contract(
            case_id=opp["id"],
            tenant_id="MERCH-001",
            payment_id=f"pay_{opp['id'].lower()}",
            amount_inr=opp["amount_inr"],
            strategy_type=opp.get("selected_action", "retry"),
            authorization_state="AUTHORIZED" if opp.get("is_pre_authorized") else "ONE_TIME_CHECKOUT",
            customer_intent=opp.get("intent_level", "HIGH_CURRENT_INTENT"),
            policy_version="v2.1",
            autonomy_level="AUTONOMOUS",
            ttl_seconds=180,
        )

        # Dispatch through non-bypassable Financial Action Gateway
        req_obj = FinancialActionRequest(
            merchant_id="MERCH-001",
            case_id=opp["id"],
            action_type=opp.get("selected_action", "retry"),
            actor="RECOVERY_CAPITAL_ALLOCATOR",
            signed_contract=contract.to_dict(),
        )

        gw_res = await financial_action_gateway.execute_action(req_obj)
        if gw_res.success:
            executed_contracts.append({
                "opportunity_id": opp_id,
                "contract_id": contract.contract_id,
                "status": "EXECUTED",
                "amount_inr": opp["amount_inr"],
                "signature": contract.signature[:16],
                "receipt_hash": gw_res.decision_receipt_hash[:16] if gw_res.decision_receipt_hash else "SHA256-OK",
            })
        else:
            blocked_contracts.append({
                "opportunity_id": opp_id,
                "reason": gw_res.blocking_reason or gw_res.message,
            })

    return {
        "status": "BATCH_DISPATCH_COMPLETE",
        "total_attempted": len(target_ids),
        "executed_count": len(executed_contracts),
        "blocked_count": len(blocked_contracts),
        "executed_contracts": executed_contracts,
        "blocked_contracts": blocked_contracts,
    }


# ── Economic Brain Endpoints ───────────────────────────────────────────────────

class RecordOutcomeRequest(BaseModel):
    opportunity_id: str
    decision_made: str = "INTERVENED"      # INTERVENED | ABSTAINED | BLOCKED
    outcome_observed: str = "PAID"         # PAID | NOT_PAID | CANCELLED | COMPLAINED
    tau_at_decision: float = 0.30
    p_natural_at_decision: float = 0.15
    amount_inr: float = 5000.0
    intervention_cost_inr: float = 4.0


@router.get("/decision-quality")
async def get_decision_quality(current_user: User = Depends(get_current_user)):
    """
    Decision Quality Loop: how good are our decisions on average?
    Classifies each past decision as GOOD_ACTION, GOOD_ABSTENTION, WASTED_ACTION,
    MISSED_OPPORTUNITY, or HARMFUL_ACTION with economic impact.
    """
    mid = current_user.merchant_id
    summary = decision_quality_engine.get_quality_summary(mid)
    return summary.to_dict()


@router.post("/record-outcome")
async def record_decision_outcome(
    req: RecordOutcomeRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Record the actual outcome for an opportunity and classify the decision quality.
    This closes the feedback loop: we decided X, the outcome was Y, was that a good decision?
    """
    mid = current_user.merchant_id
    result = decision_quality_engine.classify_decision(
        merchant_id=mid,
        opp_id=req.opportunity_id,
        decision_made=req.decision_made,
        outcome_observed=req.outcome_observed,
        tau_at_decision=req.tau_at_decision,
        p_natural_at_decision=req.p_natural_at_decision,
        amount_inr=req.amount_inr,
        intervention_cost_inr=req.intervention_cost_inr,
    )
    return result.to_dict()


@router.get("/agent-competition/{customer_id}")
async def get_agent_competition_record(
    customer_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Cross-Agent Customer Attention Governance view:
    WHO wanted to act on this customer, WHAT they wanted to do,
    WHY they lost, WHO won — with full economic rationale.
    """
    attention = multi_agent_arbitrator.get_attention_record(customer_id)
    all_records = multi_agent_arbitrator.get_all_attention_records()
    customer_record = next((r for r in all_records if r["customer_id"] == customer_id), None)

    return {
        "customer_id": customer_id,
        "attention_record": customer_record,
        "governance_policy": "One Customer, One Recovery Decision per 24h",
        "conflicts_resolved_today": attention.active_conflicts_resolved,
        "contacts_remaining_today": max(0, attention.daily_contact_cap - attention.contacts_used_today),
        "opt_out_status": attention.opt_out_status,
        "last_contacted_agent": attention.last_contacted_agent,
        "governance_explanation": (
            f"Customer {customer_id} has a {attention.daily_contact_cap} contact/day cap. "
            f"{attention.contacts_used_today} used today. "
            f"All agent proposals are ranked by Net Incremental Contribution (NIC) — "
            f"the highest-NIC agent wins; all others are suppressed to prevent "
            f"margin destruction and customer fatigue."
        ),
    }


@router.get("/opportunity-plans/{opportunity_id}")
async def get_recovery_plans_for_opportunity(
    opportunity_id: str,
    amount_inr: float = 5000.0,
    failure_code: str = "CARD_EXPIRED",
    is_pre_authorized: bool = False,
    provider_failure_rate: float = 0.02,
    current_user: User = Depends(get_current_user),
):
    """
    Recovery Plan Auction: evaluates all 9 recovery plan types for a specific opportunity.
    Returns ranked plans with NIC scores so the merchant can see why a specific plan was chosen.
    """
    result = strategy_auction_engine.evaluate_auction(
        opportunity_id=opportunity_id,
        amount_inr=amount_inr,
        failure_code=failure_code,
        is_pre_authorized=is_pre_authorized,
        provider_failure_rate=provider_failure_rate,
        data_age_seconds=30.0,
    )

    # Serialize bids to dicts
    bids_serialized = []
    for bid in result.all_bids:
        bids_serialized.append({
            "plan_type": bid.strategy.value,
            "label": bid.label,
            "p_success": bid.p_success,
            "p_natural": bid.p_natural,
            "tau": bid.tau,
            "expected_extra_recovery_inr": bid.expected_gross_recovery_inr,
            "total_cost_inr": bid.intervention_cost_inr + bid.customer_friction_penalty_inr,
            "net_revenue_contribution_inr": bid.net_economic_contribution_inr,
            "yield_efficiency_ratio": bid.yield_efficiency_ratio,
            "is_authorized": bid.is_authorized,
            "requires_customer_action": bid.requires_customer_action,
            "plain_language_why": bid.why_recommended or bid.rejection_reason or "No specific rationale.",
            "evidence_level": bid.evidence_sufficiency.value,
            "is_winner": bid.strategy == result.winning_strategy,
        })

    bids_serialized.sort(key=lambda x: x["net_revenue_contribution_inr"], reverse=True)

    return {
        "opportunity_id": opportunity_id,
        "amount_inr": amount_inr,
        "winning_plan": result.winning_strategy.value,
        "winning_plan_label": result.winning_bid.label,
        "winning_net_contribution_inr": result.winning_bid.net_economic_contribution_inr,
        "autonomy_action": result.autonomy_action,
        "decision_summary": result.decision_summary,
        "minimum_evidence_met": result.minimum_evidence_met,
        "all_plans_ranked": bids_serialized,
        "temporal_value_of_waiting": result.temporal_counterfactuals,
        "_note": "NIC = Net Incremental Contribution = (τ × Amount) − Cost − Friction",
    }


@router.get("/half-life/{opportunity_id}")
async def get_half_life_decay(
    opportunity_id: str,
    opportunity_type: str = "abandoned_cart",
    created_at: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """
    Opportunity Half-Life Decay: how much urgency remains for this opportunity?
    Urgency decays over time — abandoned carts (30 min half-life) decay faster
    than overdue invoices (7 day half-life).
    """
    result = opportunity_graph.compute_half_life_decay(
        opp_id=opportunity_id,
        opportunity_type=opportunity_type,
        created_at=created_at,
    )
    return result.to_dict()

