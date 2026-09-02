import asyncio
import httpx
import time
import json
import uuid
import sys

BASE_URL = "http://localhost:8000/api"

# We will use the development bypass mechanism
# Any token will be ignored if CLERK_SECRET_KEY is a placeholder
HEADERS_A = {"Authorization": "Bearer fake_token_A"}
HEADERS_B = {"Authorization": "Bearer fake_token_B"}

def p(msg):
    print(str(msg).encode('ascii', 'replace').decode('ascii'), flush=True)

async def verify_demo():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=60.0) as client:
        p("\n--- 1. CLEAN START & HEALTH CHECK ---")
        health = await client.get("/health")
        p(f"Health status: {health.status_code}")
        health_data = health.json()
        p(json.dumps(health_data, indent=2))
        assert health.status_code == 200
        
        p("\n--- 2. DEMO RESET (Merchant A) ---")
        reset = await client.post("/simulation/demo/reset", headers=HEADERS_A)
        p(f"Reset status: {reset.status_code}")
        cases_data = reset.json()
        cases = cases_data.get("cases", [])
        p(f"Loaded {len(cases)} demo cases")
        
        # In dev bypass mode, all users map to the dev user.
        # We can't easily test multi-tenant without real Clerk keys,
        # but the backend code maps via merchant_id correctly.
        case_a_id = cases[0]['id']
        
        p("\n--- 4. SCENARIO VERIFICATION ---")
        # Find the cases based on amount
        case_high_value = next(c for c in cases if c['amount_inr'] >= 50000)
        case_retry = next(c for c in cases if c['amount_inr'] < 50000)
        
        p(f"Testing High Value Case (Safety Block): {case_high_value['id']} - INR {case_high_value['amount_inr']}")
        exec_hv = await client.post(f"/simulation/case/{case_high_value['id']}/execute", headers=HEADERS_A)
        exec_hv_data = exec_hv.json()
        p(f"Result: Blocked={exec_hv_data.get('blocked')}, Message={exec_hv_data.get('message')}")
        
        p(f"Testing Standard Case (Recovery Success): {case_retry['id']} - INR {case_retry['amount_inr']}")
        exec_std = await client.post(f"/simulation/case/{case_retry['id']}/execute", headers=HEADERS_A)
        exec_std_data = exec_std.json()
        p(f"Result: {exec_std_data}")
        
        p("\n--- 5. HUMAN ESCALATION ---")
        approve = await client.post(f"/recovery/{case_high_value['id']}/approve", json={"note": "Approved"}, headers=HEADERS_A)
        approve_data = approve.json()
        p(f"Approval Result: Status={approve_data.get('status')}")
        
        p("\n--- 6. 10K SIMULATION ---")
        start = time.time()
        sim = await client.post("/simulation/run", json={"scale": 10000, "use_razorpay": False}, headers=HEADERS_A)
        end = time.time()
        sim_data = sim.json()
        p(f"10K Run Time: {end - start:.2f} seconds")
        p(f"10K Raw Response keys: {list(sim_data.keys())}")
        if 'error' in sim_data:
            p(f"Error: {sim_data['error']}")
        p(f"10K Metrics:")
        for k, v in sim_data.items():
            if isinstance(v, (int, float)):
                p(f"  {k}: {v:,.2f}")
        
        p("\n--- 7. IMPACT CALCULATION ---")
        impact_run = await client.post("/impact/run", headers=HEADERS_A)
        impact_data = impact_run.json()
        if 'detail' in impact_data:
            p(f"Impact Error: {impact_data['detail']}")
        p(f"Impact Keys: {list(impact_data.keys())}")
        p(f"Impact Metrics:")
        metrics = impact_data.get("metrics", {})
        for k, v in metrics.items():
            if isinstance(v, (int, float)):
                p(f"  {k}: {v:,.2f}")
                
        # Counterfactual integrity check
        eligible_reviveai = metrics.get('eligible_reviveai_recovered_inr', 0)
        eligible_baseline = metrics.get('eligible_baseline_recovered_inr', 0)
        p(f"Checking math: Eligible ReviveAI({eligible_reviveai}) - Eligible Baseline({eligible_baseline}) = {eligible_reviveai - eligible_baseline}")
        p(f"Reported Incremental: {metrics.get('incremental_revenue_inr')}")
        
        p("\n--- 8. AUDIT TRAIL ---")
        audit = await client.get("/audit/events", headers=HEADERS_A)
        audit_events = audit.json()
        p(f"Total Audit Events: {len(audit_events)}")
        if len(audit_events) > 0:
            p(f"Sample Event: {audit_events[-1].get('event_type')} - Actor: {audit_events[-1].get('actor')}")
            
        p("\n--- 9. 100K EVALUATION ---")
        start = time.time()
        eval_run = await client.get("/evaluation/metrics", headers=HEADERS_A)
        end = time.time()
        eval_data = eval_run.json()
        p(f"100K Eval Run Time: {end - start:.2f} seconds")
        p(f"100K Recovered: {eval_data.get('recovered_revenue', 0):,.2f}")
        p(f"100K Precision: {eval_data.get('precision', 0):.4f}")
        
if __name__ == "__main__":
    asyncio.run(verify_demo())
