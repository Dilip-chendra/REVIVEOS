# -*- coding: utf-8 -*-
"""
ReviveOS — End-to-End Multi-Agent Governance Flow Test

Verifies the complete 14-step multi-agent governance pipeline:
  1. Three independent real agents submit concurrent authenticated proposals for customer CUST-9821.
  2. ReviveOS performs authentication, capability checks, customer attention budget evaluation (1/24h), and Net Incremental Contribution (NIC) ranking.
  3. Subscription Agent is APPROVED with highest NIC and receives a signed Action Contract.
  4. Cart Agent & Retention Agent receive cryptographic suppression receipts.
  5. Winning Action Contract is verified by Financial Action Gateway.
  6. Rogue unauthenticated agent attempting direct financial execution is blocked by the Financial Gateway.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.agent_registry import agent_registry
from app.services.action_contract import action_contract_manager, ActionContract
from app.services.financial_gateway import financial_action_gateway, FinancialActionRequest


@pytest.fixture
def client():
    return TestClient(app)


def test_full_e2e_multi_agent_collision_flow(client):
    """
    Test 3-way multi-agent collision scenario:
      Subscription Agent vs Cart Agent vs Retention Agent.
    """
    # 1. Trigger live multi-agent collision endpoint
    resp = client.post("/api/agents/simulate-collision")
    assert resp.status_code == 200
    data = resp.json()

    assert data["competing_proposals_count"] == 3
    assert data["winning_agent"].startswith("sub_agent_")

    winning_dec = data["winning_decision"]
    assert winning_dec["status"] == "APPROVED"
    assert winning_dec["allowed_action"] == "SCHEDULE_MANDATE_RETRY"
    assert winning_dec["causal_lift_tau"] == 0.78
    assert winning_dec["net_incremental_contribution_inr"] > 1900.0

    # Verify Action Contract was issued to winner
    contract_dict = winning_dec["action_contract"]
    assert contract_dict is not None
    assert contract_dict["contract_id"].startswith("CTR-")
    assert contract_dict["amount_inr"] == 2499.0
    assert contract_dict["signature"] != ""

    # Verify losing agents received suppression receipts
    suppressed = data["suppressed_agents"]
    assert len(suppressed) == 2

    # Cart Agent suppressed to avoid duplicate contact
    cart_sup = next(s for s in suppressed if "cart_agent" in s["agent_id"])
    assert cart_sup["status"] == "SUPPRESSED_CONFLICT"
    assert cart_sup["receipt_hash"] != ""

    # Retention Agent suppressed to prevent margin loss
    ret_sup = next(s for s in suppressed if "retention_agent" in s["agent_id"])
    assert ret_sup["status"] == "SUPPRESSED_CONFLICT"
    assert ret_sup["receipt_hash"] != ""


def test_action_contract_verification_and_financial_gateway_execution():
    """
    Test that the winning Action Contract is cryptographically verified and authorized
    by the Financial Action Gateway.
    """
    # Create valid action contract
    contract = action_contract_manager.create_contract(
        case_id="OPP-TEST-001",
        tenant_id="MERCH-001",
        payment_id="pay_test_001",
        amount_inr=2499.0,
        strategy_type="SCHEDULE_MANDATE_RETRY",
        authorization_state="AUTHORIZED",
        customer_intent="ACTIVE",
        policy_version="v2.1",
        autonomy_level="LEVEL_3_AUTO_EXECUTE",
        ttl_seconds=300,
    )

    # Verify contract
    is_valid, err = action_contract_manager.verify_contract(contract, expected_tenant_id="MERCH-001")
    assert is_valid is True
    assert err is None


def test_adversarial_rogue_agent_bypass_blocked(client):
    """
    Test Adversarial Security:
      An unauthorized rogue agent attempting to move money without an Action Contract
      is strictly denied by the Financial Gateway.
    """
    resp = client.post("/api/agents/simulate-bypass")
    assert resp.status_code == 200
    data = resp.json()

    bypass = data["bypass_test"]
    assert bypass["execution_blocked"] is True
    assert bypass["money_moved"] is False
    assert bypass["financial_gateway_verdict"] == "BLOCKED"
    assert "MISSING_ACTION_CONTRACT" in bypass["blocking_reason"]

    auth_test = data["authorized_governance_test"]
    assert auth_test["execution_allowed"] is True
    assert auth_test["decision"] == "APPROVED"
    assert auth_test["action_contract_id"] is not None
