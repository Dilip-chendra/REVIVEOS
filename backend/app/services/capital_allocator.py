# -*- coding: utf-8 -*-
"""
ReviveAI -- Recovery Capital Allocator & Opportunity Portfolio Engine
"""
from __future__ import annotations

import math
import random
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from app.models.opportunity import (
    OpportunityState,
    IntentLevel,
    RecoveryWindowType,
    CustomerFatigueLevel,
    DataProvenance,
)
from app.services.opportunity_service import opportunity_service


class OpportunityBucket(str, Enum):
    PURSUE = "PURSUE"
    WAIT = "WAIT"
    ASK_CUSTOMER = "ASK_CUSTOMER"
    HUMAN_REVIEW = "HUMAN_REVIEW"
    INTENTIONALLY_ABSTAIN = "INTENTIONALLY_ABSTAIN"
    BLOCKED = "BLOCKED"
    HISTORICAL = "HISTORICAL"


@dataclass
class Opportunity:
    id: str
    case_id: str
    amount_inr: float
    customer_id: str
    customer_name: str
    customer_tenure_months: int
    customer_prior_successes: int
    gateway: str
    case_type: str
    failure_code: str
    failure_reason: str
    p_natural: float
    p_intervention: float
    tau: float = 0.0
    expected_incremental_value_inr: float = 0.0
    intervention_cost_inr: float = 4.0
    friction_penalty_inr: float = 2.0
    risk_score: float = 0.1
    yield_score: float = 0.0
    bucket: OpportunityBucket = OpportunityBucket.PURSUE
    state: str = OpportunityState.ACTIONABLE.value
    is_eligible: bool = True
    abstention_reason: Optional[str] = None
    blocking_reason: Optional[str] = None
    is_holdout: bool = False
    selected_action: str = "smart_retry"
    opportunity_cost_explanation: Optional[str] = None
    historical_context_ids: List[str] = field(default_factory=list)
    why_selected: List[str] = field(default_factory=list)
    why_not_selected: List[str] = field(default_factory=list)
    executed: bool = False
    outcome: Optional[str] = None
    amount_recovered_inr: float = 0.0

    def calculate_metrics(self):
        self.tau = round(max(0.0, self.p_intervention - self.p_natural), 3)
        self.expected_incremental_value_inr = round(self.tau * self.amount_inr, 2)
        denom = max(0.5, self.intervention_cost_inr + self.friction_penalty_inr + (self.risk_score * 15.0))
        risk_factor = max(0.05, 1.0 - self.risk_score)
        self.yield_score = round((self.expected_incremental_value_inr * risk_factor) / denom, 2)


@dataclass
class AllocationFrontierPoint:
    budget_inr: float
    expected_incremental_recovery_inr: float
    selected_count: int
    abstained_count: int
    roi_multiple: float


@dataclass
class PortfolioAllocationResult:
    total_opportunities_count: int
    total_exposure_inr: float
    eligible_opportunities_count: int
    eligible_exposure_inr: float
    historical_expired_count: int
    historical_exposure_inr: float
    
    allocated_budget_inr: float
    remaining_budget_inr: float
    reserved_budget_inr: float
    recovery_budget_limit_inr: float
    
    allocated_contacts: int
    remaining_contacts: int
    contact_limit: int
    
    expected_incremental_recovery_inr: float
    capital_saved_by_abstention_inr: float
    customer_friction_avoided_count: int
    incremental_recovery_yield_ratio: float
    
    held_out_count: int
    held_out_exposure_inr: float
    
    buckets: Dict[str, List[Any]]
    top_opportunities: List[Dict[str, Any]]
    abstention_ledger: List[Dict[str, Any]]
    historical_ledger: List[Dict[str, Any]]
    frontier_curve: List[Dict[str, Any]]


class RecoveryCapitalAllocator:
    def __init__(self):
        self._cached_frontier: Optional[List[AllocationFrontierPoint]] = None

    def get_opportunities(self, merchant_id: str = "default") -> List[Opportunity]:
        from app.state import get_state
        state = get_state(merchant_id)
        env = state.get("active_environment", "DEMO")
        
        if env in ("RAZORPAY_TEST", "RAZORPAY_LIVE"):
            raw_cases = state.get("cases", [])
            res_list = []
            for raw in raw_cases:
                opp = Opportunity(
                    id=raw.get("id", f"OPP-{raw.get('payment_id', 'PROV')}"),
                    case_id=raw.get("id", "PROV"),
                    amount_inr=raw.get("amount_inr", 0.0),
                    customer_id=raw.get("customer_id", "CUST-PROV"),
                    customer_name=raw.get("customer_name") or raw.get("customer_context", {}).get("name", "Real Customer"),
                    customer_tenure_months=raw.get("customer_tenure_months", 1),
                    customer_prior_successes=raw.get("customer_prior_successes", 1),
                    gateway=raw.get("gateway", "razorpay"),
                    case_type=raw.get("case_type", "payment_failure"),
                    failure_code=raw.get("failure_code", "GENERIC_DECLINE"),
                    failure_reason=raw.get("failure_reason", "Processor decline"),
                    p_natural=raw.get("p_natural", 0.15),
                    p_intervention=raw.get("recovery_probability", 0.75),
                    intervention_cost_inr=raw.get("intervention_cost_inr", 4.0),
                    friction_penalty_inr=raw.get("friction_penalty", 2.0),
                    risk_score=raw.get("risk_score", 0.1),
                    state=OpportunityState.ACTIONABLE.value if raw.get("status") != "blocked" else OpportunityState.BLOCKED.value,
                    is_eligible=raw.get("status") != "blocked",
                    abstention_reason=raw.get("abstention_reason"),
                    blocking_reason=raw.get("blocking_reason"),
                    historical_context_ids=raw.get("historical_context_event_ids", []),
                )
                opp.calculate_metrics()
                res_list.append(opp)
            return res_list

        raw_opps = opportunity_service.get_all_opportunities()
        # Return exactly baseline 500 opportunities in DEMO mode
        baseline_opps = [o for o in raw_opps if not o["id"].startswith("OPP-NEW")][:500]
        res_list = []
        for raw in baseline_opps:
            opp = Opportunity(
                id=raw["id"],
                case_id=raw.get("originating_event_id", raw["id"]),
                amount_inr=raw["amount_inr"],
                customer_id=raw["customer_id"],
                customer_name=raw["customer_name"],
                customer_tenure_months=raw.get("customer_tenure_months", 6),
                customer_prior_successes=raw.get("customer_prior_successes", 5),
                gateway=raw.get("gateway", "razorpay"),
                case_type=raw.get("case_type", "payment_failure"),
                failure_code=raw.get("failure_code", "GENERIC_DECLINE"),
                failure_reason=raw.get("failure_reason", "Processor decline"),
                p_natural=raw.get("p_natural", 0.15),
                p_intervention=raw.get("p_intervention", 0.75),
                intervention_cost_inr=raw.get("intervention_cost_inr", 4.0),
                friction_penalty_inr=raw.get("friction_penalty", 2.0),
                risk_score=raw.get("risk_score", 0.1),
                state=raw.get("state", OpportunityState.ACTIONABLE.value),
                is_eligible=raw.get("is_eligible", True),
                abstention_reason=raw.get("abstention_reason"),
                blocking_reason=raw.get("blocking_reason"),
                historical_context_ids=raw.get("historical_context_event_ids", []),
            )
            if opp.p_natural >= 0.75 or opp.tau < 0.03 or raw.get("state") == OpportunityState.ABSTAINED.value:
                opp.bucket = OpportunityBucket.INTENTIONALLY_ABSTAIN
                opp.abstention_reason = opp.abstention_reason or f"Natural Settlement Probability ({int(opp.p_natural * 100)}%) is high."
            opp.calculate_metrics()
            res_list.append(opp)
        return res_list

    def optimize_portfolio(
        self,
        recovery_budget_inr: float = 500.0,
        contact_limit: int = 50,
        reserve_budget_pct: float = 0.0,
        risk_budget_inr: Optional[float] = None,
        risk_tolerance: str = "BALANCED",
        merchant_id: str = "default",
    ) -> PortfolioAllocationResult:
        return self.allocate(
            recovery_budget_inr=recovery_budget_inr,
            contact_limit=contact_limit,
            reserve_budget_pct=reserve_budget_pct,
            risk_tolerance=risk_tolerance,
            merchant_id=merchant_id,
        )

    def allocate(
        self,
        recovery_budget_inr: float = 500.0,
        contact_limit: int = 50,
        reserve_budget_pct: float = 0.20,
        risk_tolerance: str = "BALANCED",
        merchant_id: str = "default",
    ) -> PortfolioAllocationResult:
        from app.state import get_state
        state = get_state(merchant_id)
        env = state.get("active_environment", "DEMO")
        
        if env in ("RAZORPAY_TEST", "RAZORPAY_LIVE"):
            raw_cases = state.get("cases", [])
            raw_opps = []
            for raw in raw_cases:
                raw_opps.append({
                    "id": raw.get("id", f"OPP-{raw.get('payment_id', 'PROV')}"),
                    "amount_inr": raw.get("amount_inr", 0.0),
                    "customer_id": raw.get("customer_id", "CUST-PROV"),
                    "customer_name": raw.get("customer_name") or raw.get("customer_context", {}).get("name", "Real Customer"),
                    "state": OpportunityState.ACTIONABLE.value if raw.get("status") != "blocked" else OpportunityState.BLOCKED.value,
                    "is_eligible": raw.get("status") != "blocked",
                    "p_natural": raw.get("p_natural", 0.15),
                    "p_intervention": raw.get("recovery_probability", 0.75),
                    "intervention_cost_inr": 4.0,
                    "friction_penalty": 2.0,
                    "risk_score": raw.get("risk_score", 0.1),
                    "failure_code": raw.get("failure_code", "GENERIC_DECLINE"),
                    "failure_reason": raw.get("failure_reason", "Processor decline"),
                })
        else:
            raw_opps = opportunity_service.get_all_opportunities()
        
        total_count = len(raw_opps)
        total_exposure = sum(o["amount_inr"] for o in raw_opps)
        
        usable_budget = recovery_budget_inr * (1.0 - reserve_budget_pct)
        reserved_budget = recovery_budget_inr * reserve_budget_pct

        eligible_items: List[Opportunity] = []
        historical_items: List[Dict[str, Any]] = []
        blocked_items: List[Dict[str, Any]] = []
        naturally_resolved_items: List[Dict[str, Any]] = []
        
        for raw in raw_opps:
            st = raw.get("state")
            if st in (OpportunityState.HISTORICAL.value, OpportunityState.EXPIRED.value):
                historical_items.append(raw)
            elif st in (OpportunityState.BLOCKED.value, OpportunityState.CANCELLED.value):
                blocked_items.append(raw)
            elif st == OpportunityState.NATURALLY_RECOVERED.value:
                naturally_resolved_items.append(raw)
            else:
                opp = Opportunity(
                    id=raw["id"],
                    case_id=raw.get("originating_event_id", raw["id"]),
                    amount_inr=raw["amount_inr"],
                    customer_id=raw["customer_id"],
                    customer_name=raw["customer_name"],
                    customer_tenure_months=raw.get("customer_tenure_months", 6),
                    customer_prior_successes=raw.get("customer_prior_successes", 5),
                    gateway=raw.get("gateway", "razorpay"),
                    case_type=raw.get("case_type", "payment_failure"),
                    failure_code=raw.get("failure_code", "GENERIC_DECLINE"),
                    failure_reason=raw.get("failure_reason", "Processor decline"),
                    p_natural=raw.get("p_natural", 0.15),
                    p_intervention=raw.get("p_intervention", 0.75),
                    intervention_cost_inr=raw.get("intervention_cost_inr", 4.0),
                    friction_penalty_inr=raw.get("friction_penalty", 2.0),
                    risk_score=raw.get("risk_score", 0.1),
                    state=st,
                    is_eligible=raw.get("is_eligible", True),
                    abstention_reason=raw.get("abstention_reason"),
                    blocking_reason=raw.get("blocking_reason"),
                    historical_context_ids=raw.get("historical_context_event_ids", []),
                )
                opp.calculate_metrics()
                eligible_items.append(opp)

        eligible_count = len(eligible_items)
        eligible_exposure = sum(o.amount_inr for o in eligible_items)
        hist_count = len(historical_items)
        hist_exposure = sum(o["amount_inr"] for o in historical_items)

        # 1. 5% Holdout (Protect explicit spotlight demonstration cases from holdout)
        demo_ids = {"OPP-001", "OPP-002", "OPP-003", "OPP-HIST-001"}
        holdout_cohort: List[Opportunity] = []
        treatment_pool: List[Opportunity] = []

        for opp in eligible_items:
            h = abs(hash(f"holdout_{opp.id}")) % 100
            if (h < 5) and (opp.id not in demo_ids):
                opp.is_holdout = True
                holdout_cohort.append(opp)
            else:
                opp.is_holdout = False
                treatment_pool.append(opp)

        # 2. Intentional Abstention & Safety Classification
        abstention_ledger: List[Opportunity] = []
        human_review_queue: List[Opportunity] = []
        wait_queue: List[Opportunity] = []
        ask_customer_queue: List[Opportunity] = []
        active_candidates: List[Opportunity] = []

        for opp in treatment_pool:
            if opp.p_natural >= 0.75 or opp.tau < 0.03:
                opp.bucket = OpportunityBucket.INTENTIONALLY_ABSTAIN
                opp.abstention_reason = (
                    f"Natural Settlement Probability ({int(opp.p_natural * 100)}%) is high -- "
                    f"intervening adds only {int(opp.tau * 100)}pp marginal uplift, wasting fees & annoying customer."
                )
                abstention_ledger.append(opp)
            elif opp.amount_inr > 50000.0 or opp.risk_score >= 0.50:
                opp.bucket = OpportunityBucket.HUMAN_REVIEW
                opp.why_selected.append("Financial risk ceiling (> INR 50k or risk score >= 0.5) requires human authorization.")
                human_review_queue.append(opp)
            elif opp.state == OpportunityState.WAITING.value:
                opp.bucket = OpportunityBucket.WAIT
                opp.why_selected.append("Held in waiting state until provider latency normalizes.")
                wait_queue.append(opp)
            elif opp.state == OpportunityState.CUSTOMER_ACTION_REQUIRED.value:
                opp.bucket = OpportunityBucket.ASK_CUSTOMER
                opp.why_selected.append("Requires customer-confirmed payment link (no silent recurring mandate).")
                ask_customer_queue.append(opp)
            else:
                active_candidates.append(opp)

        # 3. Knapsack Allocation
        active_candidates.sort(key=lambda x: x.yield_score, reverse=True)

        pursue_list: List[Opportunity] = []
        spent_budget = 0.0
        spent_contacts = 0
        cutoff_yield = 0.0

        for opp in active_candidates:
            cost = opp.intervention_cost_inr
            contacts_needed = 1 if cost > 0 else 0

            if (spent_budget + cost <= usable_budget) and (spent_contacts + contacts_needed <= contact_limit):
                opp.bucket = OpportunityBucket.PURSUE
                opp.why_selected.append(
                    f"Yield Score {opp.yield_score} exceeds allocation threshold. "
                    f"Expected Incremental Uplift: +{int(opp.tau * 100)}pp (INR {opp.expected_incremental_value_inr:,.0f})."
                )
                spent_budget += cost
                spent_contacts += contacts_needed
                pursue_list.append(opp)
                cutoff_yield = opp.yield_score
            else:
                opp.bucket = OpportunityBucket.WAIT
                opp.why_not_selected.append(
                    f"Exceeded active recovery capital budget (INR {usable_budget:,.0f}) or contact cap ({contact_limit})."
                )
                wait_queue.append(opp)

        for opp in pursue_list:
            opp.opportunity_cost_explanation = (
                f"Selected over lower-yield candidates because its incremental yield per rupee "
                f"({opp.yield_score}) was superior to the marginal cut-off ({cutoff_yield})."
            )

        expected_incremental_total = sum(o.expected_incremental_value_inr for o in pursue_list)
        capital_saved_abstentions = sum(o.intervention_cost_inr for o in abstention_ledger) + (len(abstention_ledger) * 5.0)
        friction_avoided_count = len(abstention_ledger)
        yield_ratio = round(expected_incremental_total / max(1.0, spent_budget), 1)

        def opp_to_dict(o: Opportunity) -> Dict[str, Any]:
            return {
                "id": o.id,
                "customer_name": o.customer_name,
                "customer_id": o.customer_id,
                "customer_tenure_months": o.customer_tenure_months,
                "amount_inr": o.amount_inr,
                "failure_code": o.failure_code,
                "failure_reason": o.failure_reason,
                "p_natural": o.p_natural,
                "p_intervention": o.p_intervention,
                "tau": o.tau,
                "expected_incremental_value_inr": o.expected_incremental_value_inr,
                "intervention_cost_inr": o.intervention_cost_inr,
                "friction_penalty": o.friction_penalty_inr,
                "risk_score": o.risk_score,
                "yield_score": o.yield_score,
                "bucket": o.bucket.value,
                "state": o.state,
                "is_eligible": o.is_eligible,
                "abstention_reason": o.abstention_reason,
                "blocking_reason": o.blocking_reason,
                "is_holdout": o.is_holdout,
                "opportunity_cost_explanation": o.opportunity_cost_explanation,
                "historical_context_ids": o.historical_context_ids,
                "why_selected": o.why_selected,
                "why_not_selected": o.why_not_selected,
            }

        buckets_dict = {
            OpportunityBucket.PURSUE.value: [o.id for o in pursue_list],
            OpportunityBucket.WAIT.value: [o.id for o in wait_queue],
            OpportunityBucket.ASK_CUSTOMER.value: [o.id for o in ask_customer_queue],
            OpportunityBucket.HUMAN_REVIEW.value: [o.id for o in human_review_queue],
            OpportunityBucket.INTENTIONALLY_ABSTAIN.value: [o.id for o in abstention_ledger],
            OpportunityBucket.BLOCKED.value: [o.get("id") if isinstance(o, dict) else o.id for o in blocked_items],
            OpportunityBucket.HISTORICAL.value: [o.get("id") if isinstance(o, dict) else o.id for o in historical_items],
        }

        all_ordered = (
            [opp_to_dict(o) for o in pursue_list] +
            [opp_to_dict(o) for o in ask_customer_queue] +
            [opp_to_dict(o) for o in human_review_queue] +
            [opp_to_dict(o) for o in abstention_ledger] +
            [opp_to_dict(o) for o in wait_queue]
        )

        frontier_points = self._compute_frontier_curve(active_candidates + abstention_ledger, contact_limit)

        return PortfolioAllocationResult(
            total_opportunities_count=total_count,
            total_exposure_inr=total_exposure,
            eligible_opportunities_count=eligible_count,
            eligible_exposure_inr=eligible_exposure,
            historical_expired_count=hist_count,
            historical_exposure_inr=hist_exposure,
            allocated_budget_inr=round(spent_budget, 2),
            remaining_budget_inr=round(max(0.0, recovery_budget_inr - spent_budget), 2),
            reserved_budget_inr=round(reserved_budget, 2),
            recovery_budget_limit_inr=recovery_budget_inr,
            allocated_contacts=spent_contacts,
            remaining_contacts=max(0, contact_limit - spent_contacts),
            contact_limit=contact_limit,
            expected_incremental_recovery_inr=round(expected_incremental_total, 2),
            capital_saved_by_abstention_inr=round(capital_saved_abstentions, 2),
            customer_friction_avoided_count=friction_avoided_count,
            incremental_recovery_yield_ratio=yield_ratio,
            held_out_count=len(holdout_cohort),
            held_out_exposure_inr=round(sum(o.amount_inr for o in holdout_cohort), 2),
            buckets=buckets_dict,
            top_opportunities=all_ordered[:100],
            abstention_ledger=[opp_to_dict(o) for o in abstention_ledger],
            historical_ledger=historical_items[:50],
            frontier_curve=frontier_points,
        )

    def _compute_frontier_curve(self, candidates: List[Opportunity], contact_limit: int) -> List[Dict[str, Any]]:
        test_budgets = [50, 150, 300, 500, 750, 1000, 1500, 2000, 2500]
        pts = []

        valid_pool = [c for c in candidates if c.tau > 0.05 and c.p_natural < 0.75]
        valid_pool.sort(key=lambda x: x.yield_score, reverse=True)

        for b in test_budgets:
            spent = 0.0
            contacts = 0
            exp_total = 0.0
            sel_count = 0

            for opp in valid_pool:
                if (spent + opp.intervention_cost_inr <= b) and (contacts + 1 <= contact_limit):
                    spent += opp.intervention_cost_inr
                    contacts += 1
                    exp_total += opp.expected_incremental_value_inr
                    sel_count += 1

            pts.append({
                "budget_inr": b,
                "expected_incremental_recovery_inr": round(exp_total, 0),
                "selected_count": sel_count,
                "roi_multiple": round(exp_total / max(1.0, spent), 1) if spent > 0 else 0.0,
            })

        return pts


recovery_capital_allocator = RecoveryCapitalAllocator()
capital_allocator = recovery_capital_allocator
