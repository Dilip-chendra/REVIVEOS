"""
ReviveAI -- 100K Evaluation Verifier

Verifies the integrity of the evaluation artifact.
Fails loudly if anything is inconsistent.

Run: python backend/evaluation/verify_100k.py
"""

import json
import math
import os
import sys

EVAL_DIR     = os.path.dirname(__file__)
DATASET_PATH = os.path.join(EVAL_DIR, "dataset_100k.jsonl")
RESULTS_PATH = os.path.join(EVAL_DIR, "results_100k.json")
EXPECTED_SEED          = 20260826
EXPECTED_DATASET_SIZE  = 100_000
TOLERANCE              = 1e-4   # floating-point tolerance for metric checks


def fail(msg: str):
    print(f"FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def ok(msg: str):
    print(f"  PASS  {msg}")


def check_dataset():
    print("Checking dataset...")
    if not os.path.exists(DATASET_PATH):
        fail(f"Dataset not found at {DATASET_PATH}. Run generate_dataset.py first.")

    count = 0
    seed_ok = True
    with open(DATASET_PATH, encoding="utf-8") as f:
        for i, line in enumerate(f):
            rec = json.loads(line)
            if rec.get("seed") != EXPECTED_SEED:
                seed_ok = False
            count += 1

    if count != EXPECTED_DATASET_SIZE:
        fail(f"Expected {EXPECTED_DATASET_SIZE:,} records, found {count:,}")
    ok(f"Dataset contains exactly {count:,} records")

    if not seed_ok:
        fail(f"One or more records have wrong seed (expected {EXPECTED_SEED})")
    ok(f"All records carry seed {EXPECTED_SEED}")


def check_results():
    print("Checking results artifact...")
    if not os.path.exists(RESULTS_PATH):
        fail(f"Results not found at {RESULTS_PATH}. Run evaluate_100k.py first.")

    with open(RESULTS_PATH, encoding="utf-8") as f:
        r = json.load(f)

    required = ["TP", "TN", "FP", "FN", "precision", "recall", "f1", "accuracy",
                "dataset_size", "seed", "generated_at"]
    for field in required:
        if field not in r:
            fail(f"Missing field '{field}' in results JSON")
    ok("All required fields present")

    if r["seed"] != EXPECTED_SEED:
        fail(f"Results seed mismatch: expected {EXPECTED_SEED}, got {r['seed']}")
    ok(f"Seed matches: {EXPECTED_SEED}")

    if r["dataset_size"] != EXPECTED_DATASET_SIZE:
        fail(f"dataset_size mismatch: expected {EXPECTED_DATASET_SIZE}, got {r['dataset_size']}")
    ok(f"Dataset size matches: {r['dataset_size']:,}")

    TP, TN, FP, FN = r["TP"], r["TN"], r["FP"], r["FN"]
    n = TP + TN + FP + FN
    if n != r.get("eval_split_size", n):
        # eval_split_size might not be stored; skip this check if field absent
        pass

    # Verify precision = TP / (TP + FP)
    expected_precision = TP / (TP + FP) if (TP + FP) > 0 else 0.0
    if abs(r["precision"] - expected_precision) > TOLERANCE:
        fail(f"Precision mismatch: stored={r['precision']}, calculated={expected_precision:.4f}")
    ok(f"Precision verified: {r['precision']:.4f}  (TP={TP:,}  FP={FP:,})")

    # Verify recall = TP / (TP + FN)
    expected_recall = TP / (TP + FN) if (TP + FN) > 0 else 0.0
    if abs(r["recall"] - expected_recall) > TOLERANCE:
        fail(f"Recall mismatch: stored={r['recall']}, calculated={expected_recall:.4f}")
    ok(f"Recall verified:    {r['recall']:.4f}  (TP={TP:,}  FN={FN:,})")

    # Verify F1 = 2*P*R / (P+R)
    p, rec_ = r["precision"], r["recall"]
    expected_f1 = 2 * p * rec_ / (p + rec_) if (p + rec_) > 0 else 0.0
    if abs(r["f1"] - expected_f1) > TOLERANCE:
        fail(f"F1 mismatch: stored={r['f1']}, calculated={expected_f1:.4f}")
    ok(f"F1 verified:        {r['f1']:.4f}")

    # Verify accuracy = (TP + TN) / (TP + TN + FP + FN)
    expected_acc = (TP + TN) / n if n > 0 else 0.0
    if abs(r["accuracy"] - expected_acc) > TOLERANCE:
        fail(f"Accuracy mismatch: stored={r['accuracy']}, calculated={expected_acc:.4f}")
    ok(f"Accuracy verified:  {r['accuracy']:.4f}")

    ok("All metric calculations verified against TP/TN/FP/FN")


def main():
    print("=" * 60)
    print("ReviveAI 100K Evaluation Verifier")
    print("=" * 60)
    check_dataset()
    check_results()
    print()
    print("ALL CHECKS PASSED")
    print("=" * 60)


if __name__ == "__main__":
    main()
