# -*- coding: utf-8 -*-
"""
ReviveAI -- Policy Simulator & Decision Calibration Engine
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from app.services.capital_allocator import capital_allocator, Opportunity


@dataclass
class PolicySimulationResult:
    recovery_budget_inr: float
    contact_limit: int
    reserve_budget_pct: float
    max_automated_amount_inr: float
    
    total_opportunities_evaluated: int
    selected_opportunities_count: int
    abstained_count: int
    blocked_count: int
    human_review_count: int
    
    expected_gross_recovery_inr: float
    expected_incremental_recovery_inr: float
    total_intervention_cost_inr: float
    net_economic_contribution_inr: float
    capacity_utilization_pct: float
    
    roi_multiple: float
    policy_recommendation: str  # APPROVE | REVISE | REJECT
    reasoning: str


class PolicySimulator:
    def simulate_policy(
        self,
        recovery_budget_inr: float = 500.0,
        contact_limit: int = 50,
        reserve_budget_pct: float = 0.20,
        max_automated_amount_inr: float = 50000.0,
    ) -> PolicySimulationResult:
        alloc_res = capital_allocator.allocate(
            recovery_budget_inr=recovery_budget_inr,
            contact_limit=contact_limit,
            reserve_budget_pct=reserve_budget_pct,
        )

        opportunities = capital_allocator.get_opportunities()
        
        usable_budget = recovery_budget_inr * (1.0 - reserve_budget_pct)
        selected_ids = set(alloc_res.buckets.get("PURSUE", []))
        abstained_ids = set(alloc_res.buckets.get("INTENTIONALLY_ABSTAIN", []))
        blocked_ids = set(alloc_res.buckets.get("BLOCKED", []))
        human_ids = set(alloc_res.buckets.get("HUMAN_REVIEW", []))

        selected_opps = [o for o in opportunities if o.id in selected_ids]
        
        gross_recovery = sum(o.p_intervention * o.amount_inr for o in selected_opps)
        inc_recovery = alloc_res.expected_incremental_recovery_inr
        cost_spent = alloc_res.allocated_budget_inr
        net_contrib = round(inc_recovery - cost_spent, 2)
        
        utilization = round((cost_spent / max(1.0, usable_budget)) * 100, 1)
        roi_mult = alloc_res.incremental_recovery_yield_ratio

        if net_contrib > 10000 and utilization <= 95.0:
            rec = "APPROVE"
            reason = f"Policy produces strong net contribution (INR {net_contrib:,.0f}) with healthy capital utilization ({utilization}%)."
        elif utilization > 95.0:
            rec = "REVISE"
            reason = "Capacity constraint is nearly saturated; consider expanding contact cap or increasing daily recovery budget."
        else:
            rec = "REVISE"
            reason = "Policy yields modest incremental recovery; calibrate risk thresholds and recovery windows."

        return PolicySimulationResult(
            recovery_budget_inr=recovery_budget_inr,
            contact_limit=contact_limit,
            reserve_budget_pct=reserve_budget_pct,
            max_automated_amount_inr=max_automated_amount_inr,
            total_opportunities_evaluated=len(opportunities),
            selected_opportunities_count=len(selected_ids),
            abstained_count=len(abstained_ids),
            blocked_count=len(blocked_ids),
            human_review_count=len(human_ids),
            expected_gross_recovery_inr=round(gross_recovery, 2),
            expected_incremental_recovery_inr=inc_recovery,
            total_intervention_cost_inr=cost_spent,
            net_economic_contribution_inr=net_contrib,
            capacity_utilization_pct=utilization,
            roi_multiple=roi_mult,
            policy_recommendation=rec,
            reasoning=reason,
        )


policy_simulator = PolicySimulator()
