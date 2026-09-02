"""
ReviveAI -- 100K Evaluation Dataset Generator

SYNTHETIC / EVALUATION ONLY
No real customer data. Seed: 20260826.

Run: python backend/evaluation/generate_dataset.py
"""

import json
import random
import os

SEED = 20260826
DATASET_SIZE = 100_000
EVAL_SPLIT = 0.30

FAILURE_TYPES = [
    ("gateway_failure",       0.28),
    ("insufficient_funds",    0.22),
    ("authentication_failure",0.15),
    ("checkout_abandonment",  0.12),
    ("subscription_failure",  0.10),
    ("expired_card",          0.06),
    ("timeout",               0.04),
    ("technical_failure",     0.03),
]

PAYMENT_METHODS = ["card", "upi", "netbanking", "wallet", "emi", "nach"]
GATEWAYS        = ["razorpay", "cashfree", "payu", "stripe"]

MAX_RETRIES      = 3
MAX_AMOUNT       = 50_000
MAX_CONSEC_FAILS = 3

RECOVERABLE_TYPES    = {"gateway_failure", "timeout", "technical_failure"}
PARTIAL_RECOVERABLE  = {"authentication_failure", "checkout_abandonment", "subscription_failure"}
NON_RECOVERABLE      = {"insufficient_funds", "expired_card"}


def _pick(rng, weighted):
    items, weights = zip(*weighted)
    return rng.choices(items, weights=weights, k=1)[0]


def generate_record(rng, idx):
    failure_type = _pick(rng, FAILURE_TYPES)
    amount_raw = rng.lognormvariate(7.8, 1.1)
    amount_inr = round(min(max(amount_raw, 100), 500_000), 2)
    retry_count        = rng.choices([0,1,2,3,4], weights=[55,25,12,5,3])[0]
    consecutive_fails  = rng.choices([0,1,2,3],   weights=[60,25,10,5])[0]
    customer_opted_out = rng.random() < 0.04
    is_flagged         = rng.random() < 0.03
    payment_method     = rng.choice(PAYMENT_METHODS)
    gateway            = rng.choice(GATEWAYS)
    days_customer_age  = rng.randint(0, 1095)
    lifetime_orders    = rng.randint(0, 50)
    return {
        "record_id":               f"eval_{idx:07d}",
        "seed":                    SEED,
        "failure_type":            failure_type,
        "amount_inr":              amount_inr,
        "payment_method":          payment_method,
        "gateway":                 gateway,
        "retry_count":             retry_count,
        "consecutive_failures":    consecutive_fails,
        "customer_opted_out":      customer_opted_out,
        "is_flagged_customer":     is_flagged,
        "customer_age_days":       days_customer_age,
        "customer_lifetime_orders":lifetime_orders,
        "split":                   None,
    }


def ground_truth_label(record):
    """
    Independent ground-truth oracle -- rules-based, NOT the prediction logic.

    Returns 1 if the case should be automatically recovered, 0 if blocked.

    Rules:
      R1. Hard policy constraints (opt-out, flagged, retry limit, amount ceiling,
          consecutive failures) always block.
      R2. Non-recoverable failure types block.
      R3. Recoverable failure types allow.
      R4. Partial-recoverable types allow only when payment method and customer
          age meet minimum engagement criteria.
    """
    if record["customer_opted_out"]:                         return 0
    if record["is_flagged_customer"]:                        return 0
    if record["retry_count"] >= MAX_RETRIES:                 return 0
    if record["amount_inr"] > MAX_AMOUNT:                    return 0
    if record["consecutive_failures"] >= MAX_CONSEC_FAILS:   return 0

    ft = record["failure_type"]
    if ft in NON_RECOVERABLE:
        if record["amount_inr"] < 500 and record["customer_age_days"] > 90:
            return 1
        return 0
    if ft in RECOVERABLE_TYPES:
        return 1
    if ft in PARTIAL_RECOVERABLE:
        if record["payment_method"] in {"upi", "card"} and record["customer_age_days"] > 30:
            return 1
        return 0
    return 0


def main():
    rng = random.Random(SEED)
    print(f"Generating {DATASET_SIZE:,} synthetic records with seed {SEED}...")
    records = []
    for i in range(DATASET_SIZE):
        rec = generate_record(rng, i)
        rec["ground_truth"] = ground_truth_label(rec)
        rec["split"] = "eval" if i >= int(DATASET_SIZE * (1 - EVAL_SPLIT)) else "train"
        records.append(rec)

    total_pos = sum(r["ground_truth"] for r in records)
    total_neg = DATASET_SIZE - total_pos
    eval_recs = [r for r in records if r["split"] == "eval"]
    print(f"  Positive (automatable): {total_pos:,} ({100*total_pos/DATASET_SIZE:.1f}%)")
    print(f"  Negative (blocked):     {total_neg:,} ({100*total_neg/DATASET_SIZE:.1f}%)")
    print(f"  Eval split:             {len(eval_recs):,} records")

    out_path = os.path.join(os.path.dirname(__file__), "dataset_100k.jsonl")
    with open(out_path, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec) + "\n")
    print(f"  Saved: {out_path}")
    return records


if __name__ == "__main__":
    main()
