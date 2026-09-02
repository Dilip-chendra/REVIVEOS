# -*- coding: utf-8 -*-
"""
ReviveAI -- Counterfactual Attribution, Holdout Control & Decision Regret Engine
"""
from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from app.services.capital_allocator import (
    capital_allocator, Opportunity, OpportunityBucket
)


@dataclass
class SettlementAttributionResult:
    total_cases_settled: int
    gross_recovered_inr: float
    natural_recovered_inr: float
    incremental_recovered_inr: float
    capital_spent_inr: float
    capital_saved_abstention_inr: float
    incremental_yield_multiple: float
    value_per_contact_inr: float
    treatment_total: int
    treatment_recovered: int
    treatment_recovery_rate: float
    holdout_total: int
    holdout_recovered: int
    holdout_recovery_rate: float
    observed_causal_uplift_pp: float
    abstention_total: int
    abstention_natural_recovered: int
    abstention_success_rate: float
    good_decisions_count: int
    good_decisions_pct: float
    over_interventions_count: int
    over_interventions_pct: float
    missed_opportunities_count: int
    missed_opportunities_pct: float
    regret_summary: List[Dict[str, Any]]


class AttributionRegretEngine:
    def __init__(self):
        self._last_settlement_result: Optional[SettlementAttributionResult] = None

    def simulate_settlement_sync(
        self,
        recovery_budget_inr: float = 500.0,
        contact_limit: int = 50,
    ) -> SettlementAttributionResult:
        alloc_res = capital_allocator.optimize_portfolio(
            recovery_budget_inr=recovery_budget_inr,
            contact_limit=contact_limit,
        )

        opportunities = capital_allocator.get_opportunities()
        rng = random.Random(1337)

        pursue_ids = set(alloc_res.buckets.get(OpportunityBucket.PURSUE.value, []))
        abstain_ids = set(alloc_res.buckets.get(OpportunityBucket.INTENTIONALLY_ABSTAIN.value, []))

        for o in opportunities:
            h = abs(hash(f"holdout_{o.id}")) % 100
            o.is_holdout = (h < 5)
            if o.id in pursue_ids:
                o.bucket = OpportunityBucket.PURSUE
            elif o.id in abstain_ids:
                o.bucket = OpportunityBucket.INTENTIONALLY_ABSTAIN

        treatment_cases = [o for o in opportunities if o.bucket == OpportunityBucket.PURSUE and not o.is_holdout]
        holdout_cases = [o for o in opportunities if o.is_holdout]
        abstention_cases = [o for o in opportunities if o.bucket == OpportunityBucket.INTENTIONALLY_ABSTAIN and not o.is_holdout]

        # 1. Simulate Treatment Cohort
        treatment_recovered_count = 0
        treatment_recovered_amt = 0.0
        for o in treatment_cases:
            success = rng.random() < o.p_intervention
            o.executed = True
            if success:
                treatment_recovered_count += 1
                treatment_recovered_amt += o.amount_inr
                o.outcome = "RECOVERED_INCREMENTAL"
                o.amount_recovered_inr = o.amount_inr
            else:
                o.outcome = "UNRECOVERED"
                o.amount_recovered_inr = 0.0

        # 2. Simulate Holdout Control Cohort
        holdout_recovered_count = 0
        holdout_recovered_amt = 0.0
        for o in holdout_cases:
            success = rng.random() < o.p_natural
            if success:
                holdout_recovered_count += 1
                holdout_recovered_amt += o.amount_inr

        # 3. Simulate Intentional Abstention Cohort
        abstention_recovered_count = 0
        abstention_recovered_amt = 0.0
        for o in abstention_cases:
            # High natural settlement cohort
            success = rng.random() < max(0.35, o.p_natural)
            if success:
                abstention_recovered_count += 1
                abstention_recovered_amt += o.amount_inr

        # Calculate Rates
        treatment_n = max(1, len(treatment_cases))
        holdout_n = max(1, len(holdout_cases))
        abstention_n = max(1, len(abstention_cases))

        treatment_rate = round((treatment_recovered_count / treatment_n) * 100, 1)
        holdout_rate = round((holdout_recovered_count / holdout_n) * 100, 1)
        abstention_rate = round((abstention_recovered_count / abstention_n) * 100, 1)
        observed_lift_pp = round(max(0.0, treatment_rate - holdout_rate), 1)

        # Regret Matrix Categorization
        good_recovery_count = 0
        good_recovery_amt = 0.0
        over_intervention_count = 0
        over_intervention_amt = 0.0

        for o in treatment_cases:
            if o.executed and o.outcome == "RECOVERED_INCREMENTAL":
                if rng.random() < (o.tau / max(0.01, o.p_intervention)):
                    good_recovery_count += 1
                    good_recovery_amt += o.amount_inr
                else:
                    over_intervention_count += 1
                    over_intervention_amt += o.amount_inr

        good_abstention_count = abstention_recovered_count
        good_abstention_amt = abstention_recovered_amt
        missed_opp_count = max(0, len(opportunities) - (treatment_recovered_count + abstention_recovered_count))
        missed_opp_amt = sum(o.amount_inr for o in opportunities if not o.executed and o.amount_recovered_inr == 0)

        total_settled = len(opportunities)
        good_decisions_total = good_recovery_count + good_abstention_count
        good_decisions_pct = round((good_decisions_total / max(1, total_settled)) * 100, 1)

        spent_capital = alloc_res.allocated_budget_inr
        saved_capital = (len(abstention_cases) * 4.0) + (good_abstention_count * 25.0)

        res = SettlementAttributionResult(
            total_cases_settled=total_settled,
            gross_recovered_inr=treatment_recovered_amt + abstention_recovered_amt,
            natural_recovered_inr=abstention_recovered_amt,
            incremental_recovered_inr=treatment_recovered_amt,
            capital_spent_inr=spent_capital,
            capital_saved_abstention_inr=saved_capital,
            incremental_yield_multiple=round(treatment_recovered_amt / max(1.0, spent_capital), 1),
            value_per_contact_inr=round(treatment_recovered_amt / max(1, len(treatment_cases)), 1),
            treatment_total=len(treatment_cases),
            treatment_recovered=treatment_recovered_count,
            treatment_recovery_rate=treatment_rate,
            holdout_total=len(holdout_cases),
            holdout_recovered=holdout_recovered_count,
            holdout_recovery_rate=holdout_rate,
            observed_causal_uplift_pp=observed_lift_pp,
            abstention_total=len(abstention_cases),
            abstention_natural_recovered=abstention_recovered_count,
            abstention_success_rate=abstention_rate,
            good_decisions_count=good_decisions_total,
            good_decisions_pct=good_decisions_pct,
            over_interventions_count=over_intervention_count,
            over_interventions_pct=round((over_intervention_count / max(1, total_settled)) * 100, 1),
            missed_opportunities_count=missed_opp_count,
            missed_opportunities_pct=round((missed_opp_count / max(1, total_settled)) * 100, 1),
            regret_summary=[
                {
                    "category": "GOOD_RECOVERY",
                    "label": "Accurate Interventions",
                    "count": good_recovery_count,
                    "amount_inr": good_recovery_amt,
                    "description": "High-yield interventions that successfully recovered revenue where natural settlement was low.",
                    "color": "#10B981",
                },
                {
                    "category": "GOOD_ABSTENTION",
                    "label": "Intentional Restraint (Saved Capital)",
                    "count": good_abstention_count,
                    "amount_inr": good_abstention_amt,
                    "description": f"Deliberately un-contacted payments that settled naturally. INR {saved_capital:,.0f} merchant fees saved.",
                    "color": "#3B82F6",
                },
                {
                    "category": "OVER_INTERVENTION",
                    "label": "Over-Interventions (Friction Incurred)",
                    "count": over_intervention_count,
                    "amount_inr": over_intervention_amt,
                    "description": "Interventions where the customer likely would have settled naturally without outreach.",
                    "color": "#F59E0B",
                },
                {
                    "category": "MISSED_OPPORTUNITY",
                    "label": "Missed Opportunities",
                    "count": missed_opp_count,
                    "amount_inr": missed_opp_amt,
                    "description": "Abstained due to budget constraints or low initial probability, remaining unrecovered.",
                    "color": "#EF4444",
                },
            ],
        )

        self._last_settlement_result = res
        return res

    def get_latest_settlement_result(self) -> SettlementAttributionResult:
        if self._last_settlement_result is None:
            return self.simulate_settlement_sync()
        return self._last_settlement_result


attribution_regret_engine = AttributionRegretEngine()
