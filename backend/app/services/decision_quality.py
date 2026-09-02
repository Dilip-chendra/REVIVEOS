# -*- coding: utf-8 -*-
"""
ReviveOS — Decision Quality Loop

Classifies every decision into one of 5 quality outcomes after the actual
result is known. This closes the feedback loop: we know what we decided,
and we now know what actually happened.

Quality categories:
  GOOD_ACTION       — We intervened. Customer paid. We caused it (τ > 0.1).
  GOOD_ABSTENTION   — We did nothing. Customer paid naturally. Proved p_natural was high.
  WASTED_ACTION     — We intervened. Customer didn't pay. τ was near zero.
  MISSED_OPPORTUNITY— We abstained. Customer didn't pay. We should have intervened.
  HARMFUL_ACTION    — We intervened. Customer cancelled/complained. We made it worse.

AI CONSTRAINT: This service CLASSIFIES outcomes only. It does not make new
execution decisions. All execution authority remains with financial_action_gateway.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional


class DecisionQualityCategory(str, Enum):
    GOOD_ACTION = "GOOD_ACTION"
    GOOD_ABSTENTION = "GOOD_ABSTENTION"
    WASTED_ACTION = "WASTED_ACTION"
    MISSED_OPPORTUNITY = "MISSED_OPPORTUNITY"
    HARMFUL_ACTION = "HARMFUL_ACTION"
    PENDING = "PENDING"


@dataclass
class DecisionQualityResult:
    opportunity_id: str
    decision_made: str          # "INTERVENED" | "ABSTAINED" | "BLOCKED"
    outcome_observed: str       # "PAID" | "NOT_PAID" | "CANCELLED" | "COMPLAINED"
    tau_at_decision: float      # causal uplift at time of decision
    p_natural_at_decision: float
    amount_inr: float
    intervention_cost_inr: float
    quality_category: DecisionQualityCategory
    quality_score: float        # 0.0 (worst) - 1.0 (best)
    plain_language: str         # human-readable explanation
    classified_at: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "opportunity_id": self.opportunity_id,
            "decision_made": self.decision_made,
            "outcome_observed": self.outcome_observed,
            "tau_at_decision": round(self.tau_at_decision, 3),
            "p_natural_at_decision": round(self.p_natural_at_decision, 3),
            "amount_inr": self.amount_inr,
            "intervention_cost_inr": self.intervention_cost_inr,
            "quality_category": self.quality_category.value,
            "quality_score": round(self.quality_score, 2),
            "plain_language": self.plain_language,
            "classified_at": self.classified_at,
        }


@dataclass
class DecisionQualitySummary:
    merchant_id: str
    total_decisions: int
    good_actions: int
    good_abstentions: int
    wasted_actions: int
    missed_opportunities: int
    harmful_actions: int
    pending: int

    good_actions_pct: float
    good_abstentions_pct: float
    wasted_actions_pct: float
    missed_opportunities_pct: float
    harmful_actions_pct: float

    # Economic impact of quality
    value_created_by_good_actions_inr: float
    value_wasted_by_bad_actions_inr: float
    value_missed_by_abstentions_inr: float
    net_decision_quality_value_inr: float

    overall_quality_score: float   # 0-100
    plain_language_verdict: str
    recent_decisions: List[Dict[str, Any]]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "merchant_id": self.merchant_id,
            "total_decisions": self.total_decisions,
            "breakdown": {
                "good_actions": self.good_actions,
                "good_abstentions": self.good_abstentions,
                "wasted_actions": self.wasted_actions,
                "missed_opportunities": self.missed_opportunities,
                "harmful_actions": self.harmful_actions,
                "pending": self.pending,
            },
            "percentages": {
                "good_actions_pct": round(self.good_actions_pct, 1),
                "good_abstentions_pct": round(self.good_abstentions_pct, 1),
                "wasted_actions_pct": round(self.wasted_actions_pct, 1),
                "missed_opportunities_pct": round(self.missed_opportunities_pct, 1),
                "harmful_actions_pct": round(self.harmful_actions_pct, 1),
            },
            "economic_impact": {
                "value_created_by_good_actions_inr": round(self.value_created_by_good_actions_inr, 2),
                "value_wasted_by_bad_actions_inr": round(self.value_wasted_by_bad_actions_inr, 2),
                "value_missed_by_abstentions_inr": round(self.value_missed_by_abstentions_inr, 2),
                "net_decision_quality_value_inr": round(self.net_decision_quality_value_inr, 2),
            },
            "overall_quality_score": round(self.overall_quality_score, 1),
            "plain_language_verdict": self.plain_language_verdict,
            "recent_decisions": self.recent_decisions[:10],
        }


class DecisionQualityEngine:
    """
    Records and classifies decision quality outcomes.
    Operates as a per-merchant in-memory ledger.
    """

    def __init__(self):
        # merchant_id -> list[DecisionQualityResult]
        self._records: Dict[str, List[DecisionQualityResult]] = {}
        self._seed_demo_records()

    def _seed_demo_records(self) -> None:
        """Seed realistic demo decision quality records for MERCH-001."""
        demo_records = [
            self._classify(
                opp_id="OPP-001", decision="INTERVENED", outcome="PAID",
                tau=0.72, p_natural=0.12, amount=2499.0, cost=4.0,
            ),
            self._classify(
                opp_id="OPP-002", decision="ABSTAINED", outcome="PAID",
                tau=0.05, p_natural=0.88, amount=15000.0, cost=0.0,
            ),
            self._classify(
                opp_id="OPP-003", decision="INTERVENED", outcome="NOT_PAID",
                tau=0.08, p_natural=0.10, amount=5000.0, cost=4.0,
            ),
            self._classify(
                opp_id="OPP-004", decision="ABSTAINED", outcome="NOT_PAID",
                tau=0.55, p_natural=0.15, amount=8000.0, cost=0.0,
            ),
            self._classify(
                opp_id="OPP-005", decision="INTERVENED", outcome="CANCELLED",
                tau=0.30, p_natural=0.20, amount=12000.0, cost=4.0,
            ),
            self._classify(
                opp_id="OPP-006", decision="INTERVENED", outcome="PAID",
                tau=0.65, p_natural=0.15, amount=3999.0, cost=4.0,
            ),
            self._classify(
                opp_id="OPP-007", decision="ABSTAINED", outcome="PAID",
                tau=0.03, p_natural=0.92, amount=25000.0, cost=0.0,
            ),
        ]
        self._records["MERCH-001"] = demo_records
        self._records["default"] = list(demo_records)

    def classify_decision(
        self,
        merchant_id: str,
        opp_id: str,
        decision_made: str,
        outcome_observed: str,
        tau_at_decision: float,
        p_natural_at_decision: float,
        amount_inr: float,
        intervention_cost_inr: float = 4.0,
    ) -> DecisionQualityResult:
        result = self._classify(
            opp_id=opp_id,
            decision=decision_made,
            outcome=outcome_observed,
            tau=tau_at_decision,
            p_natural=p_natural_at_decision,
            amount=amount_inr,
            cost=intervention_cost_inr,
        )
        self._records.setdefault(merchant_id, []).append(result)
        return result

    def _classify(
        self,
        opp_id: str,
        decision: str,
        outcome: str,
        tau: float,
        p_natural: float,
        amount: float,
        cost: float,
    ) -> DecisionQualityResult:
        """Core classification logic — fully deterministic."""
        intervened = decision == "INTERVENED"
        paid = outcome == "PAID"
        cancelled_or_complained = outcome in ("CANCELLED", "COMPLAINED")

        # Classify
        if intervened and paid and tau >= 0.10:
            category = DecisionQualityCategory.GOOD_ACTION
            score = min(1.0, 0.6 + tau * 0.4)
            value_delta = tau * amount - cost
            plain = (
                f"✅ Good Action — We intervened (τ={tau:.0%}), customer paid. "
                f"Our action generated an extra ₹{value_delta:,.0f} of incremental recovery."
            )
        elif intervened and paid and tau < 0.10:
            # Paid but we probably didn't cause it — counted as mild waste
            category = DecisionQualityCategory.WASTED_ACTION
            score = 0.4
            plain = (
                f"⚠️ Lucky Outcome — We intervened but τ={tau:.0%} was near zero. "
                f"Customer would likely have paid anyway. We spent ₹{cost:.0f} unnecessarily."
            )
        elif (not intervened) and paid and p_natural >= 0.70:
            category = DecisionQualityCategory.GOOD_ABSTENTION
            score = min(1.0, 0.55 + p_natural * 0.45)
            plain = (
                f"✅ Smart Restraint — We did nothing (p_natural={p_natural:.0%}), "
                f"customer paid on their own. Saved ₹{cost:.0f} in unnecessary intervention cost."
            )
        elif intervened and cancelled_or_complained:
            category = DecisionQualityCategory.HARMFUL_ACTION
            score = 0.0
            plain = (
                f"❌ Harmful Action — We intervened but the customer cancelled/complained. "
                f"Our action damaged the relationship. Cost: ₹{cost:.0f} + relationship damage."
            )
        elif intervened and not paid and tau < 0.10:
            category = DecisionQualityCategory.WASTED_ACTION
            score = max(0.0, 0.3 - tau)
            plain = (
                f"⚠️ Wasted Action — We intervened (τ={tau:.0%}) but customer didn't pay. "
                f"Low causal uplift meant we spent ₹{cost:.0f} with near-zero chance of success."
            )
        elif (not intervened) and not paid and tau >= 0.30:
            category = DecisionQualityCategory.MISSED_OPPORTUNITY
            score = max(0.0, 0.3 - tau * 0.5)
            missed_value = tau * amount
            plain = (
                f"❌ Missed Opportunity — We abstained but τ={tau:.0%} was significant. "
                f"Estimated missed recovery: ₹{missed_value:,.0f}."
            )
        else:
            # Edge cases
            category = DecisionQualityCategory.GOOD_ABSTENTION if not intervened else DecisionQualityCategory.WASTED_ACTION
            score = 0.5
            plain = "Neutral outcome — decision and result are consistent with expected probability."

        return DecisionQualityResult(
            opportunity_id=opp_id,
            decision_made=decision,
            outcome_observed=outcome,
            tau_at_decision=tau,
            p_natural_at_decision=p_natural,
            amount_inr=amount,
            intervention_cost_inr=cost,
            quality_category=category,
            quality_score=score,
            plain_language=plain,
            classified_at=datetime.now(timezone.utc).isoformat(),
        )

    def get_quality_summary(self, merchant_id: str) -> DecisionQualitySummary:
        records = self._records.get(merchant_id, [])
        if not records and merchant_id != "MERCH-001":
            records = self._records.get("default", [])

        total = len(records)

        def count_cat(cat: DecisionQualityCategory) -> int:
            return sum(1 for r in records if r.quality_category == cat)

        def pct(n: int) -> float:
            return round((n / total * 100) if total > 0 else 0.0, 1)

        good_a = count_cat(DecisionQualityCategory.GOOD_ACTION)
        good_ab = count_cat(DecisionQualityCategory.GOOD_ABSTENTION)
        wasted = count_cat(DecisionQualityCategory.WASTED_ACTION)
        missed = count_cat(DecisionQualityCategory.MISSED_OPPORTUNITY)
        harmful = count_cat(DecisionQualityCategory.HARMFUL_ACTION)
        pending = count_cat(DecisionQualityCategory.PENDING)

        val_created = sum(
            r.tau_at_decision * r.amount_inr - r.intervention_cost_inr
            for r in records if r.quality_category == DecisionQualityCategory.GOOD_ACTION
        )
        val_wasted = sum(
            r.intervention_cost_inr
            for r in records if r.quality_category in (
                DecisionQualityCategory.WASTED_ACTION, DecisionQualityCategory.HARMFUL_ACTION
            )
        )
        val_missed = sum(
            r.tau_at_decision * r.amount_inr
            for r in records if r.quality_category == DecisionQualityCategory.MISSED_OPPORTUNITY
        )

        net_value = val_created - val_wasted - val_missed
        avg_score = sum(r.quality_score for r in records) / total if total > 0 else 0.0
        overall = round(avg_score * 100, 1)

        if overall >= 75:
            verdict = f"Excellent decision quality ({overall:.0f}/100) — the system is making consistently good calls."
        elif overall >= 55:
            verdict = f"Good decision quality ({overall:.0f}/100) — a few wasted actions can be reduced by tightening τ thresholds."
        elif overall >= 35:
            verdict = f"Moderate decision quality ({overall:.0f}/100) — review wasted actions and missed opportunities for policy improvement."
        else:
            verdict = f"Decision quality needs improvement ({overall:.0f}/100) — consider raising the minimum τ threshold before intervening."

        return DecisionQualitySummary(
            merchant_id=merchant_id,
            total_decisions=total,
            good_actions=good_a,
            good_abstentions=good_ab,
            wasted_actions=wasted,
            missed_opportunities=missed,
            harmful_actions=harmful,
            pending=pending,
            good_actions_pct=pct(good_a),
            good_abstentions_pct=pct(good_ab),
            wasted_actions_pct=pct(wasted),
            missed_opportunities_pct=pct(missed),
            harmful_actions_pct=pct(harmful),
            value_created_by_good_actions_inr=round(val_created, 2),
            value_wasted_by_bad_actions_inr=round(val_wasted, 2),
            value_missed_by_abstentions_inr=round(val_missed, 2),
            net_decision_quality_value_inr=round(net_value, 2),
            overall_quality_score=overall,
            plain_language_verdict=verdict,
            recent_decisions=[r.to_dict() for r in reversed(records[-15:])],
        )


# Global singleton
decision_quality_engine = DecisionQualityEngine()
