"""
ReviveAI 2.0 — Comprehensive Test Suite
Tests:
1. Counterfactual Lab & What-If Incremental Lift
2. Policy Studio Versioning & Rule Simulation
3. Action Graph, Case Rewind & Decision Receipts
4. A/B Testing, Strategy Backtest & Calibration Curves
5. Gateway Incident Commander & Live Traffic Generator
6. Chaos Lab Drills & Dynamic Resilience Score
7. Judge Mode Scenario Execution & AI Outage Toggle
"""
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer dev_local_user"}


@pytest.mark.asyncio
async def test_counterfactual_case_evaluation(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Reset state first
        await client.post("/api/simulation/demo/reset", headers=auth_headers)
        
        # Test Case 001 Counterfactual
        res = await client.get("/api/counterfactuals/case/demo-case-001", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["case_id"] == "demo-case-001"
        assert len(data["strategies"]) == 6
        assert data["recommended_strategy_id"] == "smart_delay"
        assert "what_if_analysis" in data
        assert "reviveai_advantage" in data
        assert data["reviveai_advantage"]["incremental_recovery_inr"] > 0


@pytest.mark.asyncio
async def test_counterfactual_custom_evaluation(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        req = {
            "amount_inr": 150000.0,
            "failure_code": "INSUFFICIENT_FUNDS",
            "customer_tenure_months": 14,
            "historical_success_rate": 0.92,
            "is_weekend": True,
            "policy_ceiling_inr": 500000.0,
        }
        res = await client.post("/api/counterfactuals/evaluate", json=req, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["recommended_strategy_id"] == "smart_delay"
        assert data["reviveai_advantage"]["incremental_recovery_inr"] > 0


@pytest.mark.asyncio
async def test_policy_studio_versioning_and_simulation(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Get active policy
        active_res = await client.get("/api/policies/active", headers=auth_headers)
        assert active_res.status_code == 200
        active_policy = active_res.json()
        assert active_policy["version"] >= 1

        # 2. Simulate lowering ceiling to ₹25,000
        sim_res = await client.post("/api/policies/simulate", json={"max_automated_amount_inr": 25000.0, "max_retries_per_case": 3, "high_risk_threshold": 0.70, "allowed_gateways": ["razorpay", "payu", "cashfree", "stripe"]}, headers=auth_headers)
        assert sim_res.status_code == 200
        sim_data = sim_res.json()
        assert "impact_summary" in sim_data
        assert sim_data["impact_summary"]["newly_blocked_count"] >= 1


@pytest.mark.asyncio
async def test_action_graph_and_case_rewind(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Action Graph
        res = await client.get("/api/orchestrator/case/demo-case-001/action-graph", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data["steps"]) == 7
        assert data["steps"][0]["step_id"] == "validate_payment_state"

        # 2. Rewind
        rewind_res = await client.post("/api/orchestrator/case/demo-case-001/rewind", headers=auth_headers)
        assert rewind_res.status_code == 200
        rewind_data = rewind_res.json()
        assert rewind_data["status"] == "open"

        # 3. Decision Receipt
        receipt_res = await client.get("/api/orchestrator/case/demo-case-001/receipt", headers=auth_headers)
        assert receipt_res.status_code == 200
        receipt_data = receipt_res.json()
        assert "receipt_id" in receipt_data
        assert "cryptographic_proof" in receipt_data


@pytest.mark.asyncio
async def test_experiments_and_calibration(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. A/B Test
        ab_res = await client.post("/api/experiments/ab-test", json={"cohort_size": 200, "seed": 42}, headers=auth_headers)
        assert ab_res.status_code == 200
        ab_data = ab_res.json()
        assert "economic_lift" in ab_data
        assert ab_data["treatment_group"]["recovery_rate_percentage"] > ab_data["control_group"]["recovery_rate_percentage"]

        # 2. Calibration
        calib_res = await client.get("/api/experiments/calibration", headers=auth_headers)
        assert calib_res.status_code == 200
        calib_data = calib_res.json()
        assert len(calib_data["calibration_buckets"]) >= 4

        # 3. Performance Matrix
        matrix_res = await client.get("/api/experiments/matrix", headers=auth_headers)
        assert matrix_res.status_code == 200
        matrix_data = matrix_res.json()
        assert len(matrix_data) >= 4


@pytest.mark.asyncio
async def test_incident_commander_and_traffic_simulator(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Incidents
        inc_res = await client.get("/api/incidents", headers=auth_headers)
        assert inc_res.status_code == 200
        inc_data = inc_res.json()
        assert len(inc_data) >= 1
        assert inc_data[0]["gateway"] == "payu"

        # 2. Canary Trigger
        canary_res = await client.post("/api/incidents/canary", json={"canary_percentage": 20}, headers=auth_headers)
        assert canary_res.status_code == 200
        assert canary_res.json()["canary_percentage"] == 20

        # 3. Traffic Simulator
        traffic_res = await client.post("/api/incidents/traffic/simulate", json={"requests_count": 50, "payu_error_rate": 0.35, "razorpay_error_rate": 0.03, "cashfree_error_rate": 0.04}, headers=auth_headers)
        assert traffic_res.status_code == 200
        traffic_data = traffic_res.json()
        assert traffic_data["traffic_generator"]["total_requests_processed"] == 50


@pytest.mark.asyncio
async def test_chaos_lab_and_resilience_report(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List Drills
        drills_res = await client.get("/api/chaos/drills", headers=auth_headers)
        assert drills_res.status_code == 200
        drills_data = drills_res.json()
        assert len(drills_data["drills"]) == 8

        # 2. Run Prompt Injection Drill
        pi_res = await client.post("/api/chaos/run-drill/prompt_injection", headers=auth_headers)
        assert pi_res.status_code == 200
        assert pi_res.json()["defense_successful"] is True

        # 3. Run Webhook HMAC Drill
        hmac_res = await client.post("/api/chaos/run-drill/fake_webhook_hmac", headers=auth_headers)
        assert hmac_res.status_code == 200
        assert hmac_res.json()["defense_successful"] is True

        # 4. Resilience Report
        rep_res = await client.get("/api/chaos/resilience-report", headers=auth_headers)
        assert rep_res.status_code == 200
        assert "resilience_score" in rep_res.json()


@pytest.mark.asyncio
async def test_judge_mode_scenario_and_ai_toggle(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Presets
        presets_res = await client.get("/api/judge/presets", headers=auth_headers)
        assert presets_res.status_code == 200
        assert len(presets_res.json()) >= 5

        # 2. Custom Scenario Execution
        req = {
            "amount_inr": 72000.0,
            "customer_tenure_months": 18,
            "historical_success_rate": 0.96,
            "failure_code": "INSUFFICIENT_FUNDS",
            "gateway": "payu",
            "gateway_error_rate": 0.30,
            "retry_count": 1,
            "is_weekend": True,
            "policy_ceiling_inr": 50000.0,
        }
        scenario_res = await client.post("/api/judge/scenario", json=req, headers=auth_headers)
        assert scenario_res.status_code == 200
        s_data = scenario_res.json()
        assert s_data["policy_gate"]["decision"] == "BLOCKED — ESCALATE TO HUMAN"

        # 3. Toggle AI
        toggle_res = await client.post("/api/judge/toggle-ai?online=false")
        assert toggle_res.status_code == 200
        assert toggle_res.json()["ai_service_online"] is False

        # Re-toggle online
        await client.post("/api/judge/toggle-ai?online=true")


@pytest.mark.asyncio
async def test_revenue_leakage_and_provenance(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Leakage Map
        leak_res = await client.get("/api/dashboard/leakage-map", headers=auth_headers)
        assert leak_res.status_code == 200
        leak_data = leak_res.json()
        assert len(leak_data["leakage_categories"]) == 5

        # 2. Opportunity Queue
        opp_res = await client.get("/api/dashboard/opportunity-queue", headers=auth_headers)
        assert opp_res.status_code == 200
        opp_data = opp_res.json()
        assert len(opp_data) >= 7

        # 3. Provenance
        prov_res = await client.get("/api/dashboard/provenance", headers=auth_headers)
        assert prov_res.status_code == 200
        prov_data = prov_res.json()
        assert prov_data["reconciled"] is True
        assert prov_data["ledger_drift_inr"] == 0.0