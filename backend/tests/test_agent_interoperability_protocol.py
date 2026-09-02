# -*- coding: utf-8 -*-
"""
ReviveOS — Unit & Protocol Tests for Agent Interoperability Gateway
Protocol Version: v1
"""
import hashlib
import hmac
import json
import time
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.agent_registry import (
    agent_registry,
    AgentType,
    AgentIntegrationType,
    AgentCapability,
    AgentStatus,
    PROTOCOL_VERSION,
)
from app.services.agent_gateway import (
    agent_gateway,
    RecoveryProposal,
    DecisionStatus,
)


@pytest.fixture
def client():
    return TestClient(app)


def test_agent_registration():
    """Test registering a new recovery agent with valid capabilities and credentials."""
    rec, api_key, hmac_secret = agent_registry.register_agent(
        agent_name="Test Checkout Agent",
        agent_type=AgentType.ABANDONED_CART,
        tenant_id="MERCH-TEST-001",
        integration_type=AgentIntegrationType.SDK,
        capabilities=[AgentCapability.PAYMENT_LINK, AgentCapability.WAIT_OBSERVE],
        version="1.0.0",
    )

    assert rec.agent_id.startswith("agt_aban_")
    assert rec.status == AgentStatus.REGISTERED
    assert rec.trust_score == 75.0
    assert api_key.startswith("revive_ak_")
    assert hmac_secret.startswith("revive_sec_")

    # Fetch from registry
    fetched = agent_registry.get_agent(rec.agent_id)
    assert fetched is not None
    assert fetched.agent_name == "Test Checkout Agent"


def test_canonical_hmac_signature_verification():
    """Test canonical HMAC-SHA256 signature generation and verification."""
    rec, _, hmac_secret = agent_registry.register_agent(
        agent_name="Signature Test Agent",
        agent_type=AgentType.SUBSCRIPTION_RECOVERY,
        tenant_id="MERCH-TEST-001",
        integration_type=AgentIntegrationType.REST,
        capabilities=[AgentCapability.MANDATE_RETRY],
    )

    payload = {"test_key": "test_value", "amount_paise": 249900}
    payload_bytes = json.dumps(payload).encode("utf-8")
    timestamp_str = str(time.time())
    request_id = f"req_{uuid.uuid4().hex[:8]}"

    # Compute valid signature
    valid_sig = agent_registry.compute_canonical_signature(
        hmac_secret=hmac_secret,
        agent_id=rec.agent_id,
        timestamp_str=timestamp_str,
        request_id=request_id,
        payload_bytes=payload_bytes,
    )

    # Verify authentication succeeds
    ok, err, agent = agent_registry.verify_authentication(
        agent_id=rec.agent_id,
        timestamp_str=timestamp_str,
        request_id=request_id,
        signature=valid_sig,
        payload_bytes=payload_bytes,
    )
    assert ok is True
    assert err is None
    assert agent.agent_id == rec.agent_id

    # Verify bad signature fails
    ok_bad, err_bad, _ = agent_registry.verify_authentication(
        agent_id=rec.agent_id,
        timestamp_str=timestamp_str,
        request_id=request_id + "_tampered",
        signature="invalid_signature_hex_000000000000000000000000000000000000",
        payload_bytes=payload_bytes,
    )
    assert ok_bad is False
    assert "INVALID_SIGNATURE" in err_bad


def test_replay_attack_protection():
    """Test that submitting the same request_id twice is rejected as a replay attack."""
    rec, _, hmac_secret = agent_registry.register_agent(
        agent_name="Replay Test Agent",
        agent_type=AgentType.SUBSCRIPTION_RECOVERY,
        tenant_id="MERCH-TEST-001",
        integration_type=AgentIntegrationType.REST,
        capabilities=[AgentCapability.MANDATE_RETRY],
    )

    payload_bytes = b'{"amount": 1000}'
    timestamp_str = str(time.time())
    request_id = f"req_replay_{uuid.uuid4().hex[:8]}"

    sig = agent_registry.compute_canonical_signature(
        hmac_secret=hmac_secret,
        agent_id=rec.agent_id,
        timestamp_str=timestamp_str,
        request_id=request_id,
        payload_bytes=payload_bytes,
    )

    # First request: PASS
    ok1, _, _ = agent_registry.verify_authentication(
        agent_id=rec.agent_id,
        timestamp_str=timestamp_str,
        request_id=request_id,
        signature=sig,
        payload_bytes=payload_bytes,
    )
    assert ok1 is True

    # Replayed request with same request_id: FAIL
    ok2, err2, _ = agent_registry.verify_authentication(
        agent_id=rec.agent_id,
        timestamp_str=timestamp_str,
        request_id=request_id,
        signature=sig,
        payload_bytes=payload_bytes,
    )
    assert ok2 is False
    assert "REPLAY_ATTACK_DETECTED" in err2


def test_timestamp_freshness_window():
    """Test that expired timestamps (> 300s) are rejected."""
    rec, _, hmac_secret = agent_registry.register_agent(
        agent_name="Expiry Test Agent",
        agent_type=AgentType.SUBSCRIPTION_RECOVERY,
        tenant_id="MERCH-TEST-001",
        integration_type=AgentIntegrationType.REST,
        capabilities=[AgentCapability.MANDATE_RETRY],
    )

    payload_bytes = b'{"test": 1}'
    expired_timestamp = str(time.time() - 400)  # 400s old (exceeds 300s window)
    request_id = f"req_exp_{uuid.uuid4().hex[:8]}"

    sig = agent_registry.compute_canonical_signature(
        hmac_secret=hmac_secret,
        agent_id=rec.agent_id,
        timestamp_str=expired_timestamp,
        request_id=request_id,
        payload_bytes=payload_bytes,
    )

    ok, err, _ = agent_registry.verify_authentication(
        agent_id=rec.agent_id,
        timestamp_str=expired_timestamp,
        request_id=request_id,
        signature=sig,
        payload_bytes=payload_bytes,
    )
    assert ok is False
    assert "REQUEST_EXPIRED" in err


def test_capability_mismatch_rejection():
    """Test that an agent without MANDATE_RETRY capability is blocked when proposing a mandate retry."""
    # Register an agent with only PAYMENT_LINK capability
    rec, _, _ = agent_registry.register_agent(
        agent_name="Cart Only Agent",
        agent_type=AgentType.ABANDONED_CART,
        tenant_id="MERCH-TEST-001",
        integration_type=AgentIntegrationType.REST,
        capabilities=[AgentCapability.PAYMENT_LINK],
    )

    # Validates capability directly
    ok, err = agent_registry.validate_capability(rec.agent_id, "SCHEDULE_MANDATE_RETRY")
    assert ok is False
    assert "UNAUTHORIZED_CAPABILITY" in err


@pytest.mark.asyncio
async def test_opt_out_customer_sovereignty_enforcement():
    """Test Article 6 Customer Sovereignty: Customer with opt-out is strictly protected from agent contact."""
    proposal = RecoveryProposal.from_dict({
        "proposal_id": f"PROP-OPT-{uuid.uuid4().hex[:6]}",
        "agent_id": "cart_agent_merch0",
        "tenant_id": "MERCH-001",
        "opportunity_id": "OPP-OPT-01",
        "customer_id": "CUST-OPTOUT-99",  # Explicitly opted-out customer
        "customer_name": "Priya Sharma",
        "proposed_action": {"type": "SEND_PAYMENT_LINK", "amount_paise": 499900},
        "estimated_recovery_probability": 0.85,
    })

    decision = await agent_gateway.evaluate_and_arbitrate_proposal(proposal, "cart_agent_merch0")
    assert decision.status == DecisionStatus.SUPPRESSED_CONFLICT
    assert decision.reason_code == "CUSTOMER_SOVEREIGNTY_OPT_OUT"
    assert decision.action_contract is None



@pytest.mark.asyncio
async def test_idempotent_proposal_deduplication():
    """Test that repeated submissions with same idempotency key return the cached decision."""
    idem_key = f"IDEM-TEST-{uuid.uuid4().hex[:8]}"
    prop_data = {
        "proposal_id": f"PROP-IDEM-{uuid.uuid4().hex[:6]}",
        "agent_id": "sub_agent_merch0",
        "tenant_id": "MERCH-001",
        "opportunity_id": "OPP-IDEM-01",
        "customer_id": "CUST-IDEM-1",
        "customer_name": "Idem Customer",
        "proposed_action": {"type": "SCHEDULE_MANDATE_RETRY", "amount_paise": 249900},
        "estimated_recovery_probability": 0.88,
        "idempotency_key": idem_key,
    }

    prop1 = RecoveryProposal.from_dict(prop_data)
    dec1 = await agent_gateway.evaluate_and_arbitrate_proposal(prop1, "sub_agent_merch0")

    prop2 = RecoveryProposal.from_dict(prop_data)
    dec2 = await agent_gateway.evaluate_and_arbitrate_proposal(prop2, "sub_agent_merch0")

    assert dec1.decision_id == dec2.decision_id
    assert dec1.action_contract == dec2.action_contract


def test_rest_api_proposals_endpoint(client):
    """Test submitting proposal through HTTP REST API endpoint."""
    resp = client.post(
        "/api/agents/proposals",
        json={
            "protocol_version": "v1",
            "agent_id": "sub_agent_merch0",
            "opportunity_id": "OPP-REST-01",
            "customer_id": "CUST-REST-1",
            "customer_name": "REST Customer",
            "proposed_action": {
                "type": "SCHEDULE_MANDATE_RETRY",
                "amount_paise": 249900,
            },
            "estimated_recovery_probability": 0.88,
            "estimated_natural_recovery": 0.10,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("APPROVED", "WAIT", "SUPPRESSED_CONFLICT")
    assert "decision_id" in data
    assert data["protocol_version"] == "v1"


def test_mcp_tools_manifest_and_execution(client):
    """Test Model Context Protocol (MCP) tool discovery and execution."""
    manifest_resp = client.get("/api/agents/mcp/manifest")
    assert manifest_resp.status_code == 200
    manifest = manifest_resp.json()
    assert manifest["server_name"] == "reviveos-recovery-governor"
    assert len(manifest["tools"]) >= 4

    # Execute MCP tool
    tool_resp = client.post(
        "/api/agents/mcp/tools",
        json={
            "tool_name": "reviveos_check_customer_attention",
            "arguments": {"customer_id": "CUST-9821"},
        },
    )
    assert tool_resp.status_code == 200
    tool_data = tool_resp.json()
    assert "daily_contact_cap" in tool_data
    assert "contacts_remaining" in tool_data
