from app.data.generator import DataGenerator
from app.services.counterfactual_simulator import counterfactual_simulator
import time

start = time.time()
gen = DataGenerator(scale=10000, seed=42)
dataset = gen.generate()
print(f"Generated {len(dataset.all_records)} records ({len(dataset.at_risk_records)} at risk)")

result = counterfactual_simulator.run_simulation(dataset.all_records, seed=42)
total_time = time.time() - start

m = result["metrics"]
md = result["metadata"]
at_risk = md["records_processed"]

print(f"\n=== COUNTERFACTUAL RESULTS (10K) ===")
print(f"Total time (including data gen): {total_time:.2f}s")
print(f"Simulation time: {md['processing_time_seconds']}s")
print(f"At-risk cases: {at_risk}")
print(f"\nRevenue at risk:      INR {m['total_revenue_at_risk_inr']:>15,.0f}")
print(f"Baseline recovered:   INR {m['baseline_revenue_recovered_inr']:>15,.0f}  ({m['baseline_recovery_rate']:.1%})")
print(f"ReviveAI recovered:   INR {m['reviveai_revenue_recovered_inr']:>15,.0f}  ({m['reviveai_recovery_rate']:.1%})")
print(f"Incremental:          INR {m['incremental_revenue_inr']:>15,.0f}")
print(f"Recovery Lift:        {m['recovery_lift_percentage']:.1f}%")
print(f"Policy blocks:        {m['policy_blocks']}")

print("\nIncremental by failure type:")
for k, v in sorted(result["distributions"]["incremental_by_type"].items(), key=lambda x: -x[1]):
    print(f"  {k:<30}: INR {v:>12,.0f}")

print("\nIncremental by intervention:")
for k, v in sorted(result["distributions"]["incremental_by_intervention"].items(), key=lambda x: -x[1]):
    print(f"  {k:<25}: INR {v:>12,.0f}")
