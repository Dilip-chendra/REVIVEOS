# -*- coding: utf-8 -*-
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.recovery_experiment import recovery_experiment_engine
from app.services.batch_recovery_simulator import batch_simulator
from app.services.channel_optimizer import channel_optimizer
from app.services.recovery_copilot import recovery_copilot
from app.services.promise_to_pay import promise_to_pay_manager


def test_batch_generator_deterministic_500():
    batch1 = batch_simulator.generate_batch(size=500, seed=42)
    batch2 = batch_simulator.generate_batch(size=500, seed=42)
    assert len(batch1) == 500
    assert len(batch2) == 500
    assert batch1[0]["id"] == batch2[0]["id"]
    assert batch1[0]["amount_inr"] == batch2[0]["amount_inr"]


def test_recovery_experiment_engine_formulas():
    res = recovery_experiment_engine.run_experiment(batch_size=500, seed=42, is_demo=True)
    d = res.to_dict()

    # Core Financial Invariants
    assert d["revenue_at_risk_inr"] > 0
    assert d["natural_recovery_inr"] > 0
    assert d["reviveos_recovery_inr"] >= d["natural_recovery_inr"]
    assert d["incremental_recovery_inr"] >= 0
    assert d["total_recovery_cost_inr"] > 0
    # NIC = IncrementalRecovery - TotalCosts
    expected_nic = round(d["incremental_recovery_inr"] - d["total_recovery_cost_inr"], 2)
    assert abs(d["net_incremental_contribution_inr"] - expected_nic) <= 0.05
    assert d["roi_multiple"] > 0
    assert d["suppressed_cases_count"] > 0
    assert "detected" in d["stage_transitions"]


def test_channel_optimizer():
    opt = channel_optimizer.optimize_channel(
        case_id="TEST-001",
        amount_inr=15000.0,
        customer_tenure_months=12,
        prior_contacts_24h=0,
    )
    assert opt["recommended_channel"] in ["WHATSAPP", "EMAIL", "SMS", "PAYMENT_LINK", "HUMAN"]
    assert len(opt["channels"]) == 5
    assert not opt["is_suppressed"]


def test_channel_optimizer_customer_opt_out():
    opt = channel_optimizer.optimize_channel(
        case_id="TEST-002",
        amount_inr=15000.0,
        customer_opt_out=True,
    )
    assert opt["is_suppressed"] is True
    assert opt["recommended_channel"] == "NONE"


def test_recovery_copilot_generation():
    msg = recovery_copilot.generate_message(
        customer_name="Acme Corp",
        amount_inr=84000.0,
        case_type="subscription_failure",
        tone="PROFESSIONAL",
    )
    assert msg["allowed"] is True
    assert "84,000" in msg["message"]
    assert msg["compliance_checked"] is True


def test_recovery_copilot_opt_out():
    msg = recovery_copilot.generate_message(
        customer_name="Cancelled User",
        amount_inr=1000.0,
        case_type="cart",
        is_opted_out=True,
    )
    assert msg["allowed"] is False
    assert "Customer sovereignty" in msg["error"]


def test_promise_to_pay_workflow():
    p = promise_to_pay_manager.create_promise(
        case_id="OPP-999",
        customer_name="Test Enterprise",
        amount_inr=45000.0,
        promise_date="2026-09-15",
    )
    assert p["status"] == "PROMISED"

    fulfilled = promise_to_pay_manager.fulfill_promise(p["id"])
    assert fulfilled["status"] == "FULFILLED"


@pytest.mark.asyncio
async def test_recovery_experiment_api_routes():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Run experiment endpoint
        resp = await client.post(
            "/api/recovery-experiments/run",
            json={"batch_size": 500, "seed": 42},
            headers={"Authorization": "Bearer demo_evaluation_token", "X-Revive-Mode": "DEMO"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["batch_size"] == 500
        assert data["net_incremental_contribution_inr"] > 0

        # Forecast endpoint
        fc_resp = await client.get(
            "/api/recovery-forecast",
            headers={"Authorization": "Bearer demo_evaluation_token"}
        )
        assert fc_resp.status_code == 200
        fc_data = fc_resp.json()
        assert fc_data["today_inr"] > 0

        # Channel optimization endpoint
        ch_resp = await client.get(
            "/api/channel-optimization/OPP-001",
            params={"amount_inr": 12000.0},
            headers={"Authorization": "Bearer demo_evaluation_token"}
        )
        assert ch_resp.status_code == 200
        assert "recommended_channel" in ch_resp.json()
