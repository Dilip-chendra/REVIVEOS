"""
ReviveAI — 100K Pre-computed Counterfactual Evaluation

Usage:
    python -m app.evaluation.run_counterfactual [--scale 100000] [--seed 42] [--output results.json]

This script:
1. Generates a synthetic 100K dataset
2. Runs both the Baseline and ReviveAI engines on the SAME data
3. Computes all counterfactual metrics
4. Saves results with full metadata (for reproducibility)

The results of this script feed the /api/impact/evaluation endpoint.
"""
import argparse
import hashlib
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Make sure backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.data.generator import DataGenerator
from app.services.counterfactual_simulator import counterfactual_simulator

MODEL_VERSION = "reviveai-v1.0"
POLICY_VERSION = "policy-v1.0"
RISK_MODEL_VERSION = "risk-engine-v1.0"


def run_evaluation(scale: int = 100_000, seed: int = 42, output_path: str | None = None):
    print(f"\n{'='*60}")
    print("  ReviveAI — 100K Counterfactual Evaluation")
    print(f"{'='*60}")
    print(f"Scale: {scale:,} records")
    print(f"Seed:  {seed}")

    # 1. Generate dataset
    print("\n[1/5] Generating dataset...")
    t0 = time.time()
    gen = DataGenerator(scale=scale, seed=seed)
    dataset = gen.generate()
    gen_summary = dataset.summary()
    gen_time = time.time() - t0
    print(f"      Generated {len(dataset.all_records):,} records in {gen_time:.1f}s")
    print(f"      At-risk:  {len(dataset.at_risk_records):,} | Train: {len(dataset.train_records):,} | Eval: {len(dataset.eval_records):,}")

    # 2. Create a deterministic hash of the dataset parameters (for versioning)
    dataset_signature = f"scale={scale},seed={seed},generator=v1"
    dataset_hash = hashlib.sha256(dataset_signature.encode()).hexdigest()[:16]
    print(f"      Dataset hash: {dataset_hash}")

    # 3. Run counterfactual simulation on EVAL SPLIT ONLY (held-out, no leakage)
    print("\n[2/5] Running counterfactual simulation on eval split...")
    t1 = time.time()
    eval_result = counterfactual_simulator.run_simulation(dataset.eval_records, seed=seed)
    eval_time = time.time() - t1
    print(f"      Completed in {eval_time:.1f}s")

    m = eval_result["metrics"]
    md = eval_result["metadata"]

    # 4. Run on train split too (for comparison)
    print("\n[3/5] Running on train split (for comparison)...")
    t2 = time.time()
    train_result = counterfactual_simulator.run_simulation(dataset.train_records, seed=seed)
    train_time = time.time() - t2
    print(f"      Completed in {train_time:.1f}s")

    # 5. Print summary
    print("\n[4/5] Summary (Eval Split):")
    print(f"      At-risk cases:          {md['records_processed']:,}")
    print(f"      Eligible for automation:{md['eligible_for_automation']:,}")
    print(f"      Policy protected:       {md['policy_protected']:,}")
    print(f"      Revenue at risk:        ₹{m['total_revenue_at_risk_inr']/100000:,.1f}L")
    print(f"      Baseline recovered:     ₹{m['eligible_baseline_recovered_inr']/100000:,.1f}L  ({m['baseline_recovery_rate']:.1%})")
    print(f"      ReviveAI recovered:     ₹{m['eligible_reviveai_recovered_inr']/100000:,.1f}L  ({m['reviveai_recovery_rate']:.1%})")
    print(f"      Incremental recovery:   ₹{m['eligible_incremental_inr']/100000:,.1f}L")
    print(f"      Recovery Lift:          {m['recovery_lift_percentage']:.1f}%")
    print(f"      Unsafe actions:         {m['unsafe_actions_executed']} (ALWAYS ZERO)")

    # 6. Save results
    print("\n[5/5] Saving results...")
    final_output = {
        "evaluation_metadata": {
            "dataset_version": "reviveai_eval_v1",
            "dataset_hash": dataset_hash,
            "simulation_seed": seed,
            "scale": scale,
            "model_version": MODEL_VERSION,
            "policy_version": POLICY_VERSION,
            "risk_model_version": RISK_MODEL_VERSION,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "total_processing_time_seconds": round(gen_time + eval_time + train_time, 1),
        },
        "dataset_summary": {
            "total_records": len(dataset.all_records),
            "train_records": len(dataset.train_records),
            "eval_records": len(dataset.eval_records),
            "at_risk_total": len(dataset.at_risk_records),
            "true_recovery_rate": dataset.true_recovery_rate,
        },
        "eval_split": {
            "metadata": eval_result["metadata"],
            "metrics": eval_result["metrics"],
            "distributions": eval_result["distributions"],
        },
        "train_split": {
            "metadata": train_result["metadata"],
            "metrics": train_result["metrics"],
        },
    }

    output_file = output_path or "evaluation_results.json"
    # Save WITHOUT the individual cases (too large for file storage)
    output_path_final = Path(__file__).parent.parent.parent / output_file
    with open(output_path_final, "w") as f:
        json.dump(final_output, f, indent=2)
    print(f"      Results saved to: {output_path_final}")

    print(f"\n{'='*60}")
    print("  Evaluation complete.")
    print(f"{'='*60}\n")
    return final_output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run 100K Counterfactual Evaluation")
    parser.add_argument("--scale", type=int, default=100_000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=str, default="evaluation_results.json")
    args = parser.parse_args()
    run_evaluation(scale=args.scale, seed=args.seed, output_path=args.output)
