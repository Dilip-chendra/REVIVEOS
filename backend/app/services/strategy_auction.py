r"""
ReviveAI -- Recovery Strategy Auction & Margin-Aware Decision Engine

Side-by-side evaluation of competing recovery strategies:
1. SMART_RETRY (Pre-authorized mandate / S2S charge)
2. PAYMENT_LINK (Customer-facing interactive payment link)
3. CUSTOMER_PROMPT (In-app soft recovery prompt)
4. WAIT_5MIN (Short-delay provider recovery)
5. WAIT_30MIN (Clearing cycle delay)
6. DO_NOTHING (Intentional Abstention)

Evaluates:
- Expected Incremental Value (\tau_i * V_i)
- Direct Intervention Cost (C_i)
- Customer Friction Penalty (\Phi_i)
- Net Economic Contribution = (\tau_i * V_i) - C_i - \Phi_i
- Minimum Evidence to Act threshold (Downgrades autonomy when data is insufficient)
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
import math


class StrategyOption(str, Enum):
    SMART_RETRY = "SMART_RETRY"
    PAYMENT_LINK = "PAYMENT_LINK"
    CUSTOMER_PROMPT = "CUSTOMER_PROMPT"
    WAIT_5MIN = "WAIT_5MIN"
    WAIT_30MIN = "WAIT_30MIN"
    DO_NOTHING = "DO_NOTHING"


class EvidenceSufficiencyLevel(str, Enum):
    HIGH = "HIGH"              # Complete provider status, verified intent, fresh cache (< 60s)
    MODERATE = "MODERATE"      # Good historical comparables, valid intent
    LOW = "LOW"                # Ambiguous intent or stale state (> 60s)
    INSUFFICIENT = "INSUFFICIENT" # Missing critical parameters -> Autonomy downgraded to ASK/WAIT


@dataclass
class StrategyBid:
    strategy: StrategyOption
    label: str
    p_success: float
    p_natural: float
    tau: float
    expected_gross_recovery_inr: float
    intervention_cost_inr: float
    customer_friction_penalty_inr: float
    risk_score: float
    net_economic_contribution_inr: float
    yield_efficiency_ratio: float
    is_authorized: bool
    requires_customer_action: bool
    requires_human_approval: bool
    evidence_sufficiency: EvidenceSufficiencyLevel
    why_recommended: str
    rejection_reason: Optional[str] = None


@dataclass
class StrategyAuctionResult:
    opportunity_id: str
    amount_inr: float
    winning_strategy: StrategyOption
    winning_bid: StrategyBid
    all_bids: List[StrategyBid]
    temporal_counterfactuals: Dict[str, float]  # ACT_NOW vs WAIT_5M vs WAIT_30M vs DO_NOTHING
    minimum_evidence_met: bool
    autonomy_action: str  # RECOVER | WAIT | ASK_CUSTOMER | HUMAN_REVIEW | DO_NOTHING
    decision_summary: str


class StrategyAuctionEngine:
    def evaluate_auction(
        self,
        opportunity_id: str,
        amount_inr: float,
        failure_code: str,
        is_pre_authorized: bool = False,
        customer_fatigue_count: int = 0,
        provider_failure_rate: float = 0.02,
        data_age_seconds: float = 10.0,
    ) -> StrategyAuctionResult:
        # 1. Evaluate Evidence Sufficiency
        if data_age_seconds > 300:
            evidence_level = EvidenceSufficiencyLevel.INSUFFICIENT
            evidence_met = False
        elif data_age_seconds > 60 or provider_failure_rate >= 0.25:
            evidence_level = EvidenceSufficiencyLevel.LOW
            evidence_met = False
        elif customer_fatigue_count >= 3:
            evidence_level = EvidenceSufficiencyLevel.MODERATE
            evidence_met = True
        else:
            evidence_level = EvidenceSufficiencyLevel.HIGH
            evidence_met = True

        # Base Natural Settlement Probability
        if failure_code in ("GATEWAY_TIMEOUT", "BANK_OFFLINE_TIMEOUT"):
            base_p_nat = 0.85
        elif failure_code in ("INSUFFICIENT_FUNDS", "CARD_EXPIRED"):
            base_p_nat = 0.08
        else:
            base_p_nat = 0.15

        friction_multiplier = 1.0 + (customer_fatigue_count * 0.75)

        # 2. Build Bids for All Competing Strategies
        bids: List[StrategyBid] = []

        # Option A: SMART_RETRY
        p_retry = 0.88 if is_pre_authorized else 0.0
        tau_retry = max(0.0, p_retry - base_p_nat)
        gross_retry = round(tau_retry * amount_inr, 2)
        cost_retry = 4.0
        fric_retry = round(1.0 * friction_multiplier, 2)
        net_retry = round(gross_retry - cost_retry - fric_retry, 2) if is_pre_authorized else -10.0
        bids.append(StrategyBid(
            strategy=StrategyOption.SMART_RETRY,
            label="Smart Background Retry (S2S)",
            p_success=p_retry,
            p_natural=base_p_nat,
            tau=tau_retry,
            expected_gross_recovery_inr=gross_retry,
            intervention_cost_inr=cost_retry,
            customer_friction_penalty_inr=fric_retry,
            risk_score=0.05 if is_pre_authorized else 0.99,
            net_economic_contribution_inr=net_retry,
            yield_efficiency_ratio=round(net_retry / max(1.0, cost_retry + fric_retry), 2) if is_pre_authorized else 0.0,
            is_authorized=is_pre_authorized,
            requires_customer_action=False,
            requires_human_approval=amount_inr > 50000.0,
            evidence_sufficiency=evidence_level,
            why_recommended="Zero customer friction; high success on active recurring mandate." if is_pre_authorized else "",
            rejection_reason=None if is_pre_authorized else "Requires active recurring mandate token (Article 1 Consent Invariant).",
        ))

        # Option B: PAYMENT_LINK
        p_link = 0.78
        tau_link = max(0.0, p_link - base_p_nat)
        gross_link = round(tau_link * amount_inr, 2)
        cost_link = 1.50
        fric_link = round(3.0 * friction_multiplier, 2)
        net_link = round(gross_link - cost_link - fric_link, 2)
        bids.append(StrategyBid(
            strategy=StrategyOption.PAYMENT_LINK,
            label="Customer Payment Link (WhatsApp/SMS)",
            p_success=p_link,
            p_natural=base_p_nat,
            tau=tau_link,
            expected_gross_recovery_inr=gross_link,
            intervention_cost_inr=cost_link,
            customer_friction_penalty_inr=fric_link,
            risk_score=0.08,
            net_economic_contribution_inr=net_link,
            yield_efficiency_ratio=round(net_link / max(1.0, cost_link + fric_link), 2),
            is_authorized=True,
            requires_customer_action=True,
            requires_human_approval=amount_inr > 50000.0,
            evidence_sufficiency=evidence_level,
            why_recommended="Customer-controlled continuation link; avoids unauthorized debit risk.",
            rejection_reason=None if net_link > 0 else "Negative net economic contribution after communication fees and friction.",
        ))

        # Option C: CUSTOMER_PROMPT
        p_prompt = 0.65
        tau_prompt = max(0.0, p_prompt - base_p_nat)
        gross_prompt = round(tau_prompt * amount_inr, 2)
        cost_prompt = 0.50
        fric_prompt = round(5.0 * friction_multiplier, 2)
        net_prompt = round(gross_prompt - cost_prompt - fric_prompt, 2)
        bids.append(StrategyBid(
            strategy=StrategyOption.CUSTOMER_PROMPT,
            label="In-App Interactive Modal Prompt",
            p_success=p_prompt,
            p_natural=base_p_nat,
            tau=tau_prompt,
            expected_gross_recovery_inr=gross_prompt,
            intervention_cost_inr=cost_prompt,
            customer_friction_penalty_inr=fric_prompt,
            risk_score=0.10,
            net_economic_contribution_inr=net_prompt,
            yield_efficiency_ratio=round(net_prompt / max(1.0, cost_prompt + fric_prompt), 2),
            is_authorized=True,
            requires_customer_action=True,
            requires_human_approval=False,
            evidence_sufficiency=evidence_level,
            why_recommended="Immediate in-session engagement while checkout tab is open.",
            rejection_reason=None,
        ))

        # Option D: WAIT_5MIN
        p_wait5 = round(min(0.95, base_p_nat + 0.05), 2)
        tau_wait5 = 0.05
        gross_wait5 = round(tau_wait5 * amount_inr, 2)
        bids.append(StrategyBid(
            strategy=StrategyOption.WAIT_5MIN,
            label="Hold for Short-Delay Gateway Stabilization (5m)",
            p_success=p_wait5,
            p_natural=base_p_nat,
            tau=tau_wait5,
            expected_gross_recovery_inr=gross_wait5,
            intervention_cost_inr=0.0,
            customer_friction_penalty_inr=0.0,
            risk_score=0.01,
            net_economic_contribution_inr=gross_wait5,
            yield_efficiency_ratio=gross_wait5,
            is_authorized=True,
            requires_customer_action=False,
            requires_human_approval=False,
            evidence_sufficiency=evidence_level,
            why_recommended="Allows transient bank timeout to normalize before expending recovery capacity.",
            rejection_reason=None if provider_failure_rate >= 0.20 else "Provider health is nominal; delay unnecessary.",
        ))

        # Option E: DO_NOTHING (Intentional Abstention)
        bids.append(StrategyBid(
            strategy=StrategyOption.DO_NOTHING,
            label="Intentional Restraint (Do Nothing)",
            p_success=base_p_nat,
            p_natural=base_p_nat,
            tau=0.0,
            expected_gross_recovery_inr=0.0,
            intervention_cost_inr=0.0,
            customer_friction_penalty_inr=0.0,
            risk_score=0.0,
            net_economic_contribution_inr=0.0,
            yield_efficiency_ratio=0.0,
            is_authorized=True,
            requires_customer_action=False,
            requires_human_approval=False,
            evidence_sufficiency=evidence_level,
            why_recommended=f"Natural settlement probability is high ({int(base_p_nat * 100)}%); saves merchant fees and friction.",
            rejection_reason=None if base_p_nat >= 0.75 else "Natural settlement is low; active intervention is needed.",
        ))

        # 3. Determine Winning Strategy
        # Safety & Evidence Rule:
        if not evidence_met:
            winner_strat = StrategyOption.WAIT_5MIN
            autonomy = "WAIT"
            summary = "Evidence sufficiency is below minimum threshold; autonomy reduced to protective wait."
        elif base_p_nat >= 0.75:
            winner_strat = StrategyOption.DO_NOTHING
            autonomy = "DO_NOTHING"
            summary = f"Natural settlement is {int(base_p_nat * 100)}%; intentional abstention saves merchant fees and avoids customer friction."
        elif is_pre_authorized:
            winner_strat = StrategyOption.SMART_RETRY
            autonomy = "RECOVER"
            summary = f"Pre-authorized mandate token verified. Net economic contribution: INR {net_retry:,.0f}."
        elif net_link > net_prompt and net_link > 0:
            winner_strat = StrategyOption.PAYMENT_LINK
            autonomy = "ASK_CUSTOMER"
            summary = f"Customer-facing payment link selected. Expected net contribution: INR {net_link:,.0f}."
        else:
            winner_strat = StrategyOption.CUSTOMER_PROMPT
            autonomy = "ASK_CUSTOMER"
            summary = f"In-app prompt selected. Expected net contribution: INR {net_prompt:,.0f}."

        winning_bid = next(b for b in bids if b.strategy == winner_strat)

        # 4. Temporal Counterfactuals
        temporal_cf = {
            "ACT_NOW": round(max(0.0, (0.80 - base_p_nat) * amount_inr), 2),
            "WAIT_5MIN": round(max(0.0, (0.75 - base_p_nat) * amount_inr), 2),
            "WAIT_30MIN": round(max(0.0, (0.50 - base_p_nat) * amount_inr), 2),
            "ASK_CUSTOMER": round(max(0.0, (0.78 - base_p_nat) * amount_inr), 2),
            "DO_NOTHING": 0.0,
        }

        return StrategyAuctionResult(
            opportunity_id=opportunity_id,
            amount_inr=amount_inr,
            winning_strategy=winner_strat,
            winning_bid=winning_bid,
            all_bids=bids,
            temporal_counterfactuals=temporal_cf,
            minimum_evidence_met=evidence_met,
            autonomy_action=autonomy,
            decision_summary=summary,
        )


strategy_auction_engine = StrategyAuctionEngine()
