# -*- coding: utf-8 -*-
import pytest
from app.routers.toctou import ToctouRequest, simulate_toctou_race
from app.models.user import User

@pytest.mark.asyncio
async def test_toctou_race_condition_prevents_duplicate():
    mock_user = User(id="test_u", clerk_user_id="clk_1", email="eval@reviveos.ai", merchant_id="m_1")
    req = ToctouRequest(payment_id="pay_RACE_01", amount_inr=5000.0, inject_race_condition=True)
    res = await simulate_toctou_race(req, current_user=mock_user)

    assert res["duplicate_debit_prevented"] is True
    assert res["outcome"] == "DUPLICATE_DEBIT_PREVENTED"
    assert res["data_provenance"] == "SIMULATION"
    assert any(s["state"] == "ACTION_REVOKED" for s in res["steps"])

@pytest.mark.asyncio
async def test_toctou_no_race_proceeds_safely():
    mock_user = User(id="test_u", clerk_user_id="clk_1", email="eval@reviveos.ai", merchant_id="m_1")
    req = ToctouRequest(payment_id="pay_NORACE_02", amount_inr=5000.0, inject_race_condition=False)
    res = await simulate_toctou_race(req, current_user=mock_user)

    assert res["duplicate_debit_prevented"] is False
    assert res["outcome"] == "EXECUTION_PROCEEDS_SAFELY"
    assert any(s["state"] == "CAPTURED" for s in res["steps"])
