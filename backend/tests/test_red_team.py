import asyncio
import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.auth import get_current_user
from app.models.user import User

mock_user_a = User(id="user_A", email="a@test.com", name="Test A", merchant_id="merchant_A")
mock_user_b = User(id="user_B", email="b@test.com", name="Test B", merchant_id="merchant_B")

async def override_a(): return mock_user_a
async def override_b(): return mock_user_b

from httpx import AsyncClient, ASGITransport

@pytest.fixture
async def client_a():
    app.dependency_overrides[get_current_user] = override_a
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        yield client
    app.dependency_overrides.clear()

@pytest.fixture
async def client_b():
    app.dependency_overrides[get_current_user] = override_b
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        yield client
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_business_logic_amount_ceiling_bypass(client_a):
    from app.state import get_state
    state = get_state("merchant_A")
    state["cases"] = [{"id": "case_1", "amount_inr": 75000.0, "status": "open", "case_type": "payment_failure", "customer_id": "c1", "correlation_id": "corr1"}]
    
    resp = await client_a.post("/api/simulation/case/case_1/execute")
    assert resp.status_code == 200
    assert resp.json()["blocked"] is True

@pytest.mark.asyncio
async def test_tenant_isolation(client_a, client_b):
    from app.state import get_state
    get_state("merchant_A")["cases"] = [{"id": "case_A_1", "amount_inr": 1000.0, "correlation_id": "corrA"}]
    
    resp = await client_b.get("/api/recovery/case_A_1")
    assert resp.status_code == 404

@pytest.mark.asyncio
async def test_duplicate_money_action_idempotency(client_a):
    from app.state import get_state
    get_state("merchant_A")["cases"] = [{"id": "case_2", "amount_inr": 1000.0, "status": "open", "case_type": "payment_failure", "customer_id": "c1", "correlation_id": "corr2"}]
    
    headers = {"Idempotency-Key": "red-team-idem"}
    req1 = client_a.post("/api/simulation/case/case_2/execute", headers=headers)
    req2 = client_a.post("/api/simulation/case/case_2/execute", headers=headers)
    
    r1, r2 = await asyncio.gather(req1, req2)
    assert r1.status_code in (200, 409)
    assert r2.status_code in (200, 409)
    if r1.status_code == 200 and r2.status_code == 200:
        assert r1.headers.get("x-idempotency-replay") == "true" or r2.headers.get("x-idempotency-replay") == "true"

@pytest.mark.asyncio
async def test_audit_tampering_detection(client_a):
    from app.state import add_audit_event, get_state
    add_audit_event("merchant_A", "T1", "system", "c1", {"data": 1})
    resp1 = await client_a.post("/api/audit/verify")
    assert resp1.json()["valid"] is True
    
    get_state("merchant_A")["audit_events"][0]["event_data"] = {"data": "TAMPER"}
    resp2 = await client_a.post("/api/audit/verify")
    assert resp2.json()["valid"] is False

@pytest.mark.asyncio
async def test_input_attack_negative_scale(client_a):
    r1 = await client_a.post("/api/simulation/run", json={"scale": -50, "seed": 42})
    assert r1.status_code == 422
    r2 = await client_a.post("/api/simulation/run", json={"scale": 999999, "seed": 42})
    assert r2.status_code == 422
