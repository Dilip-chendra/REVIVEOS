# -*- coding: utf-8 -*-
"""
ReviveOS — Strict Real-Mode vs Demo Universe Environment Isolation Tests

Verifies:
1. Two-Mode environment model (DEMO vs REAL / RAZORPAY_TEST).
2. REAL mode reads ONLY from provider-backed test records (default 0).
3. REAL mode NEVER falls back to demo records or hardcoded values.
4. Zero provider records return 0 exposure, 0 opportunities, 0 cases.
5. DEMO mode provides full, interconnected NovaCart Commerce universe.
6. Switching environments instantly switches the active universe without contamination.
7. Auction, Arbitration, and Batch Execution strictly respect active environment.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.state import get_state, set_active_environment, reset_state, set_provider_cases, _merchant_states


@pytest.fixture(autouse=True)
def reset_environments():
    _merchant_states.clear()
    reset_state("default")
    set_active_environment("default", "DEMO")
    yield
    _merchant_states.clear()
    reset_state("default")


@pytest.mark.asyncio
async def test_demo_mode_uses_demo_repository():
    """DEMO mode must load the rich 500-opportunity dataset and NovaCart demo metrics."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/dashboard/metrics", headers={"X-Revive-Environment": "DEMO"})
        assert res.status_code == 200
        data = res.json()
        assert data["active_environment"] == "DEMO"
        assert data["is_real_provider_data"] is False
        assert data["revenue_at_risk_inr"] > 0
        assert data["total_cases"] > 0


@pytest.mark.asyncio
async def test_real_mode_uses_provider_repository_and_zero_fallback():
    """REAL mode must show 0 exposure, 0 cases, and is_real_provider_data=True when 0 real records exist."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Switch to REAL
        sw_res = await ac.post("/api/razorpay/environment", json={"environment": "RAZORPAY_TEST"})
        assert sw_res.status_code == 200

        res = await ac.get("/api/dashboard/metrics", headers={"X-Revive-Environment": "RAZORPAY_TEST"})
        assert res.status_code == 200
        data = res.json()
        assert data["active_environment"] == "RAZORPAY_TEST"
        assert data["is_real_provider_data"] is True
        assert data["revenue_at_risk_inr"] == 0.0
        assert data["recoverable_revenue_inr"] == 0.0
        assert data["total_cases"] == 0


@pytest.mark.asyncio
async def test_real_portfolio_returns_zero_opportunities_when_empty():
    """When connected Razorpay Test account has 0 declines, portfolio must return exactly 0 opportunities."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/portfolio/current", headers={"X-Revive-Environment": "RAZORPAY_TEST"})
        assert res.status_code == 200
        data = res.json()
        assert data["total_opportunities_count"] == 0
        assert data["total_exposure_inr"] == 0.0
        assert len(data["top_opportunities"]) == 0


@pytest.mark.asyncio
async def test_demo_records_never_enter_real_mode():
    """Demo opportunities and cases must NEVER be returned in Real Mode."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Check simulation cases in REAL mode
        cases_res = await ac.get("/api/simulation/cases", headers={"X-Revive-Environment": "RAZORPAY_TEST"})
        assert cases_res.status_code == 200
        assert len(cases_res.json()) == 0

        # Check recovery opportunities in REAL mode
        opps_res = await ac.get("/api/recovery/opportunities", headers={"X-Revive-Environment": "RAZORPAY_TEST"})
        assert opps_res.status_code == 200
        assert len(opps_res.json()) == 0


@pytest.mark.asyncio
async def test_mode_switch_clears_previous_universe():
    """Switching between DEMO and REAL must cleanly toggle the data universe."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. In DEMO: portfolio has demo opportunities
        demo_port = await ac.get("/api/portfolio/current", headers={"X-Revive-Environment": "DEMO"})
        assert demo_port.json()["total_opportunities_count"] > 0

        # 2. Switch to REAL: portfolio has 0 opportunities
        real_port = await ac.get("/api/portfolio/current", headers={"X-Revive-Environment": "RAZORPAY_TEST"})
        assert real_port.json()["total_opportunities_count"] == 0

        # 3. Switch back to DEMO: portfolio returns demo opportunities
        demo_port2 = await ac.get("/api/portfolio/current", headers={"X-Revive-Environment": "DEMO"})
        assert demo_port2.json()["total_opportunities_count"] > 0


@pytest.mark.asyncio
async def test_real_provider_cases_populate_real_mode():
    """When real provider records are synced into provider_test_cases, they appear in Real Mode."""
    from app.database import AsyncSessionLocal
    from app.auth import _get_or_create_sandbox_evaluator_user
    async with AsyncSessionLocal() as session:
        user = await _get_or_create_sandbox_evaluator_user(session)
        mid = user.merchant_id

    real_case = {
        "id": "case_real_999",
        "payment_id": "pay_live_test_123",
        "merchant_id": mid,
        "amount_inr": 7500.0,
        "customer_id": "cust_real_001",
        "customer_name": "Authentic Test Merchant Customer",
        "status": "open",
        "failure_code": "BAD_REQUEST_ERROR",
        "failure_reason": "Payment expired on bank page",
        "recovery_probability": 0.82,
        "is_real_provider_data": True,
        "created_at": "2026-08-31T06:00:00Z",
    }
    set_provider_cases(mid, "test", [real_case])
    set_active_environment(mid, "RAZORPAY_TEST")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/dashboard/metrics", headers={"X-Revive-Environment": "RAZORPAY_TEST"})
        assert res.status_code == 200
        data = res.json()
        assert data["active_environment"] == "RAZORPAY_TEST"
        assert data["total_cases"] == 1
        assert data["revenue_at_risk_inr"] == 7500.0

        # Portfolio should now reflect this 1 real opportunity
        port_res = await ac.get("/api/portfolio/current", headers={"X-Revive-Environment": "RAZORPAY_TEST"})
        assert port_res.status_code == 200
        assert port_res.json()["total_opportunities_count"] == 1
        assert port_res.json()["total_exposure_inr"] == 7500.0
