import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.auth import get_current_user
from app.models.user import User

mock_user = User(id="user_test", email="test@reviveai.com", name="Test User", merchant_id="merchant_default")
async def override_user(): return mock_user

@pytest.fixture
async def client():
    app.dependency_overrides[get_current_user] = override_user
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as c:
        yield c
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_demo_scenarios_endpoint(client):
    res = await client.get("/api/simulation/demo/scenarios")
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
    assert len(items) >= 7

    # Validate Case 001 (B2B SaaS)
    case1 = next((c for c in items if c.get("id") == "demo-case-001"), None)
    assert case1 is not None
    assert case1["amount_inr"] == 150000.0
    assert case1["failure_code"] == "INSUFFICIENT_FUNDS"
    assert len(case1["strategy_options"]) >= 2
    assert len(case1["policy_checks"]) >= 5

@pytest.mark.asyncio
async def test_failure_taxonomy_endpoint(client):
    res = await client.get("/api/simulation/taxonomy")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    assert "CARD_EXPIRED" in data
    assert "INSUFFICIENT_FUNDS" in data
    assert "GATEWAY_CONNECTION_ERROR" in data

@pytest.mark.asyncio
async def test_gateway_intelligence_endpoint(client):
    res = await client.get("/api/dashboard/gateway-intelligence")
    assert res.status_code == 200
    data = res.json()
    assert "gateways" in data
    assert len(data["gateways"]) >= 4
    assert "routing_engine" in data

@pytest.mark.asyncio
async def test_execute_demo_case_001(client):
    # Reset demo to fresh state
    await client.post("/api/simulation/reset-demo")
    
    # Execute Case 001 (Smart Delay / ₹1,50,000)
    res = await client.post("/api/simulation/case/demo-case-001/execute")
    assert res.status_code == 200
    data = res.json()
    assert data["recovered"] is True
    assert data["amount_recovered_inr"] == 150000.0
    assert data["status"] == "recovered"

@pytest.mark.asyncio
async def test_high_value_policy_gate_blocks_automation(client):
    await client.post("/api/simulation/reset-demo")
    
    # Execute Case 003 (₹8,75,000 > ₹50,000 limit)
    res = await client.post("/api/simulation/case/demo-case-003/execute")
    assert res.status_code == 200
    data = res.json()
    # Should be blocked by policy engine (>50K) and escalated
    assert data.get("blocked") is True or data.get("recovered") is False
