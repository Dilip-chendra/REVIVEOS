# -*- coding: utf-8 -*-
import pytest
from app.routers.benchmark import BenchmarkRequest, run_recovery_benchmark
from app.models.user import User

@pytest.mark.asyncio
async def test_benchmark_deterministic():
    mock_user = User(id="test_u", clerk_user_id="clk_1", email="eval@reviveos.ai", merchant_id="m_1")
    req1 = BenchmarkRequest(opportunities=500, seed=42)
    req2 = BenchmarkRequest(opportunities=500, seed=42)
    res1 = await run_recovery_benchmark(req1, current_user=mock_user)
    res2 = await run_recovery_benchmark(req2, current_user=mock_user)

    assert res1["run_id"] == res2["run_id"]
    assert res1["results"]["REVIVEOS"]["gross_inr"] == res2["results"]["REVIVEOS"]["gross_inr"]
    assert res1["data_provenance"] == "BENCHMARK_SIMULATION"

@pytest.mark.asyncio
async def test_reviveos_nic_superiority():
    mock_user = User(id="test_u", clerk_user_id="clk_1", email="eval@reviveos.ai", merchant_id="m_1")
    req = BenchmarkRequest(opportunities=1000, seed=123)
    res = await run_recovery_benchmark(req, current_user=mock_user)

    reviveos_nic = res["results"]["REVIVEOS"]["nic_inr"]
    no_gov_nic = res["results"]["MULTI_AGENT_NO_GOVERNANCE"]["nic_inr"]
    assert reviveos_nic > no_gov_nic
    assert res["winner"] == "REVIVEOS"
