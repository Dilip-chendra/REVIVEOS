import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.auth import get_current_user
from app.models.user import User


@pytest.fixture
def override_auth():
    test_user = User(
        id="usr_test_evaluator_01",
        clerk_user_id="clerk_test_01",
        email="evaluator@razorpay.com",
        name="Razorpay Judge Evaluator",
        merchant_id="default",
    )
    app.dependency_overrides[get_current_user] = lambda: test_user
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_live_razorpay_payment_link_flow(override_auth):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create genuine test mode payment link
        res = await client.post(
            "/api/razorpay/payment-link/create",
            json={
                "amount_inr": 499.0,
                "description": "ReviveOS Test Recovery Link",
                "customer_name": "Aarav Mehta",
                "customer_email": "aarav.mehta@example.com",
                "notes": {"arbitration_verdict": "WINNER_AUTHORIZED"},
            },
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["success"] is True
        link_info = data["data"]
        assert link_info["amount_inr"] == 499.0
        assert link_info["amount_paise"] == 49900
        assert link_info["short_url"].startswith("https://rzp.io/")
        link_id = link_info["id"]

        # Fetch status of the link
        fetch_res = await client.get(f"/api/razorpay/payment-link/{link_id}")
        assert fetch_res.status_code == 200, fetch_res.text
        fetch_data = fetch_res.json()
        assert fetch_data["success"] is True
        assert fetch_data["data"]["id"] == link_id
