# -*- coding: utf-8 -*-
"""
ReviveOS — Batch Recovery Simulator (500-Case Evaluation Batch)

Generates deterministic cohorts across 5 core failure archetypes:
  1. PAYMENT_FAILURE (150 cases)
  2. CHECKOUT_ABANDONMENT (100 cases)
  3. SUBSCRIPTION_FAILURE (100 cases)
  4. B2B_INVOICE (100 cases)
  5. CUSTOMER_RETENTION (50 cases)
"""
from __future__ import annotations

import random
from typing import Any, Dict, List


class BatchRecoverySimulator:
    def __init__(self):
        self._cached_batches: Dict[int, List[Dict[str, Any]]] = {}

    def generate_batch(self, size: int = 500, seed: int = 42) -> List[Dict[str, Any]]:
        if size in self._cached_batches and seed == 42:
            return self._cached_batches[size]

        rng = random.Random(seed)
        records: List[Dict[str, Any]] = []

        categories = [
            ("PAYMENT_FAILURE", 150, (800.0, 15000.0), (0.10, 0.45), (0.65, 0.90)),
            ("CHECKOUT_ABANDONMENT", 100, (1200.0, 45000.0), (0.15, 0.50), (0.55, 0.82)),
            ("SUBSCRIPTION_FAILURE", 100, (499.0, 8999.0), (0.08, 0.35), (0.70, 0.92)),
            ("B2B_INVOICE", 100, (25000.0, 250000.0), (0.25, 0.65), (0.60, 0.88)),
            ("CUSTOMER_RETENTION", 50, (5000.0, 60000.0), (0.12, 0.40), (0.50, 0.78)),
        ]

        scale = size / 500.0
        id_counter = 1

        channels = ["WHATSAPP", "EMAIL", "SMS", "PAYMENT_LINK", "HUMAN"]
        strategies = ["RETRY", "ROUTE_SWITCH", "REMINDER", "SEQUENCE", "CUSTOMER_PROMPT", "ESCALATE", "STOP"]
        intents = ["HIGH", "MEDIUM", "LOW", "NEUTRAL", "CANCELLED"]

        for cat_name, base_count, amt_range, p_nat_range, p_trt_range in categories:
            count = max(1, int(round(base_count * scale)))
            for _ in range(count):
                amt = round(rng.uniform(amt_range[0], amt_range[1]), 2)
                p_nat = round(rng.uniform(p_nat_range[0], p_nat_range[1]), 3)
                p_trt = round(rng.uniform(p_trt_range[0], p_trt_range[1]), 3)
                tau = round(max(0.0, p_trt - p_nat), 3)

                cost = round(rng.uniform(2.5, 6.0), 2)
                discount = round(rng.choice([0.0, 0.0, 0.0, amt * 0.05, amt * 0.10]), 2)
                incremental_rev = round(tau * amt, 2)
                nic = round(incremental_rev - cost - discount - 1.20, 2)
                ros = round(min(99.0, max(20.0, (tau * 80.0) + (nic / max(100.0, amt) * 20.0))), 1)

                is_opt_out = (rng.random() < 0.04)
                intent = "CANCELLED" if is_opt_out else rng.choices(intents, weights=[40, 30, 15, 10, 5])[0]

                record = {
                    "id": f"OPP-BATCH-{id_counter:04d}",
                    "customer_id": f"CUST-{1000 + id_counter}",
                    "customer_name": f"Enterprise Account {id_counter}",
                    "amount_inr": amt,
                    "recovery_type": cat_name,
                    "case_type": cat_name.lower(),
                    "age_hours": rng.randint(1, 96),
                    "payment_status": "FAILED" if rng.random() > 0.06 else "CAPTURED",
                    "customer_intent": intent,
                    "natural_recovery_probability": p_nat,
                    "intervention_probability": p_trt,
                    "estimated_lift": tau,
                    "risk_score": round(rng.uniform(0.05, 0.65), 2),
                    "ROS": ros,
                    "recommended_strategy": rng.choice(strategies),
                    "communication_channel": rng.choice(channels),
                    "expected_cost": cost,
                    "discount_cost": discount,
                    "expected_NIC": nic,
                    "attention_budget_spent": rng.randint(0, 3),
                    "max_attention_budget": 3,
                    "opt_out": is_opt_out,
                    "status": "ACTIONABLE" if intent != "CANCELLED" else "SUPPRESSED",
                }
                records.append(record)
                id_counter += 1

        if size == 500 and seed == 42:
            self._cached_batches[size] = records

        return records


batch_simulator = BatchRecoverySimulator()
