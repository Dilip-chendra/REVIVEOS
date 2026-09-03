# -*- coding: utf-8 -*-
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_demo_and_real_mode_boundary():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Demo Mode Request
        demo_resp = await client.get(
            "/api/portfolio/current",
            headers={
                "Authorization": "Bearer demo_evaluation_token",
                "X-Revive-Mode": "DEMO",
                "X-Revive-Environment": "DEMO",
            }
        )
        assert demo_resp.status_code == 200
        demo_data = demo_resp.json()
        assert demo_data.get("total_opportunities_count", 0) > 0
        assert len(demo_data.get("top_opportunities", [])) > 0

        # 2. Real Mode Request
        real_resp = await client.get(
            "/api/portfolio/current",
            headers={
                "Authorization": "Bearer demo_evaluation_token",
                "X-Revive-Mode": "REAL",
                "X-Revive-Environment": "RAZORPAY_TEST",
            }
        )
        assert real_resp.status_code == 200
        real_data = real_resp.json()
        assert real_data.get("is_real_provider_data") is True
        assert real_data.get("total_opportunities_count") == 0
        assert len(real_data.get("top_opportunities")) == 0


@pytest.mark.asyncio
async def test_unauthenticated_real_mode_never_falls_back_to_demo():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(
            "/api/portfolio/current",
            headers={
                "X-Revive-Mode": "REAL",
            }
        )
        assert resp.status_code == 401
