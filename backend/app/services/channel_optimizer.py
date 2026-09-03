# -*- coding: utf-8 -*-
"""
ReviveOS — Communication Channel Optimizer

Evaluates 5 customer outreach channels based on:
  - Conversion Probability
  - Marginal Cost
  - Customer Fatigue & Friction Penalty
  - Net Economic Impact on NIC
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, List


@dataclass
class ChannelOption:
    channel: str
    response_probability: float
    conversion_probability: float
    cost_inr: float
    friction_penalty_inr: float
    expected_incremental_nic_inr: float
    is_recommended: bool
    rationale: str


class ChannelOptimizer:
    def optimize_channel(
        self,
        case_id: str,
        amount_inr: float,
        customer_tenure_months: int = 6,
        prior_contacts_24h: int = 0,
        customer_opt_out: bool = False,
    ) -> Dict[str, Any]:
        if customer_opt_out:
            return {
                "case_id": case_id,
                "recommended_channel": "NONE",
                "is_suppressed": True,
                "reason": "Customer opted out of automated communications.",
                "channels": [],
            }

        # Fatigue modifier
        fatigue_mult = max(0.2, 1.0 - (prior_contacts_24h * 0.35))

        channels_data = [
            ("WHATSAPP", 0.72 * fatigue_mult, 0.65 * fatigue_mult, 0.85, 2.0, "High engagement in Indian market; optimal for cart & payment recoveries."),
            ("EMAIL", 0.41 * fatigue_mult, 0.35 * fatigue_mult, 0.15, 0.5, "Standard formal record; best for B2B invoices and high-value receipts."),
            ("SMS", 0.28 * fatigue_mult, 0.22 * fatigue_mult, 0.25, 1.0, "Concise OTP/decline alerts; lower conversion than WhatsApp."),
            ("PAYMENT_LINK", 0.58 * fatigue_mult, 0.52 * fatigue_mult, 0.40, 1.2, "Instant checkout link; frictionless single-click UPI authorization."),
            ("HUMAN", 0.54, 0.48, 45.0, 5.0, "White-glove outreach; strictly reserved for high-value enterprise invoices (>INR 50,000)."),
        ]

        scored_channels: List[ChannelOption] = []
        for name, p_resp, p_conv, cost, frict, rationale in channels_data:
            expected_gross = amount_inr * p_conv
            net_nic = round(expected_gross - cost - frict, 2)
            scored_channels.append(ChannelOption(
                channel=name,
                response_probability=round(p_resp, 2),
                conversion_probability=round(p_conv, 2),
                cost_inr=cost,
                friction_penalty_inr=frict,
                expected_incremental_nic_inr=net_nic,
                is_recommended=False,
                rationale=rationale,
            ))

        # Select highest net economic return
        best = max(scored_channels, key=lambda c: c.expected_incremental_nic_inr)
        best.is_recommended = True

        return {
            "case_id": case_id,
            "recommended_channel": best.channel,
            "is_suppressed": False,
            "channels": [asdict(c) for c in scored_channels],
        }


channel_optimizer = ChannelOptimizer()
