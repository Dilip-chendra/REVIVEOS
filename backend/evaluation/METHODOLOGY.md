# ReviveAI — 100K Evaluation Methodology

## Purpose
This document describes how the 100,000-record benchmark for the ReviveAI policy engine was generated, evaluated, and verified. It is written to allow any engineer to independently reproduce the results.

---

## 1. Dataset Generation

**Script:** `backend/evaluation/generate_dataset.py`
**Seed:** `20260826` (fixed)
**Size:** 100,000 records
**Output:** `backend/evaluation/dataset_100k.jsonl` (one JSON object per line)

### Feature Distributions

| Feature | Distribution |
|---|---|
| failure_type | Weighted categorical (gateway_failure 28%, insufficient_funds 22%, authentication_failure 15%, checkout_abandonment 12%, subscription_failure 10%, expired_card 6%, timeout 4%, technical_failure 3%) |
| amount_inr | Log-normal(mu=7.8, sigma=1.1), clipped to [100, 500000] — median ~₹2,440 |
| retry_count | Weighted: 0→55%, 1→25%, 2→12%, 3→5%, 4→3% |
| consecutive_failures | Weighted: 0→60%, 1→25%, 2→10%, 3→5% |
| customer_opted_out | Bernoulli(0.04) |
| is_flagged_customer | Bernoulli(0.03) |
| payment_method | Uniform: card, upi, netbanking, wallet, emi, nach |
| gateway | Uniform: razorpay, cashfree, payu, stripe |
| customer_age_days | Uniform[0, 1095] |
| customer_lifetime_orders | Uniform[0, 50] |

### Train / Eval Split

- Training set: first 70,000 records (split = "train")
- Held-out evaluation set: last 30,000 records (split = "eval")

---

## 2. Ground-Truth Labels

**Rule set in:** `generate_dataset.py` → function `ground_truth_label(record)`

The ground-truth oracle is intentionally written as a **rule-based function independent of the prediction engine**. It does not call the PolicyEngine class.

### Rules (in order)

| Rule | Condition | Label |
|---|---|---|
| R1a | customer_opted_out == True | 0 (block) |
| R1b | is_flagged_customer == True | 0 (block) |
| R1c | retry_count >= 3 | 0 (block) |
| R1d | amount_inr > 50,000 | 0 (block) |
| R1e | consecutive_failures >= 3 | 0 (block) |
| R2 | failure_type in {insufficient_funds, expired_card} AND NOT (amount < 500 AND customer_age > 90 days) | 0 (block) |
| R3 | failure_type in {gateway_failure, timeout, technical_failure} | 1 (allow) |
| R4 | failure_type in {authentication_failure, checkout_abandonment, subscription_failure} AND payment_method in {upi, card} AND customer_age_days > 30 | 1 (allow) |
| Default | (any unmatched type) | 0 (block) |

---

## 3. Prediction Logic

**Script:** `backend/evaluation/evaluate_100k.py`

For each eval record, a `PolicyContext` object is constructed using the record's features, and `PolicyEngine.evaluate()` is called — the **same class** used by the production simulation router.

- If `result.allowed == True`: prediction = 1
- If `result.allowed == False`: prediction = 0

---

## 4. Metric Calculation

Confusion matrix computed over the 30,000 held-out eval records only.

```
Precision = TP / (TP + FP)
Recall    = TP / (TP + FN)
F1        = 2 * Precision * Recall / (Precision + Recall)
Accuracy  = (TP + TN) / N
```

Results verified by `verify_100k.py` which recalculates all derived metrics from raw TP/TN/FP/FN counts.

---

## 5. Actual Results (Seed 20260826)

| Metric | Value |
|---|---|
| Eval records | 30,000 |
| TP | 9,989 |
| TN | 8,314 |
| FP | 9,670 |
| FN | 2,027 |
| Precision | 0.5081 (50.8%) |
| Recall | 0.8313 (83.1%) |
| F1 | 0.6307 (63.1%) |
| Accuracy | 0.6101 (61.0%) |

---

## 6. Limitations (Honest Assessment)

### Structural correlation
Both the ground-truth oracle (R1–R4 rules) and the prediction engine (PolicyEngine checks) are derived from the same synthetic feature set. The policy engine directly implements the same hard constraints as R1a–R1d. This means:
- The R1 rules (opt-out, flagged, retry limit, amount ceiling) will produce near-perfect agreement between oracle and engine for those specific cases.
- The disagreements (FP=9,670) come primarily from the grey-area cases: non-recoverable failure types where the oracle blocks but the policy engine still allows (because the policy engine is more permissive at the failure-type level — it only checks hard structural rules, not failure type category).

### High FP rate interpretation
The 9,670 false positives represent cases where the policy engine says "allowed" but the oracle says "should block". This is a design characteristic: the policy engine does not filter by failure type. It trusts the AI layer (risk engine) to recommend against unrecoverable failure types. So the "false positives" would be correctly handled in the real system by the AI recommending a "stop" strategy — but that layer is not evaluated here.

### No real-world data
All 100,000 records are synthetic. The distributions are modelled on publicly available information about Razorpay payment failure patterns but are not validated against actual transaction data.

### Not a traditional ML benchmark
This is not evaluating a trained model. The "model" is a deterministic rule engine. The metrics measure how well the policy engine's accept/reject decisions align with the independent oracle's accept/reject labels — which is a measure of internal consistency, not predictive accuracy.

---

## 7. Reproducibility

To fully reproduce:

```bash
cd backend
python evaluation/generate_dataset.py
python evaluation/evaluate_100k.py
python evaluation/verify_100k.py
```

All three steps should produce identical results with seed 20260826.
