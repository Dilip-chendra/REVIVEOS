# -*- coding: utf-8 -*-
"""
ReviveOS — 15-Vector Hardened Agent Governance & Communication Test Suite
Protocol Version: REVIVEOS-PROTOCOL-1.1

Automated Red-Team Tests:
  Test A: Agent Identity Model & Lifecycle Verification
  Test B: Granular Capability Manifest Authorization
  Test C: Canonical Request Signing & Tamper Detection
  Test D: Anti-Replay Protection & Nonce Registry
  Test E: Clock Skew Tolerance Enforcers
  Test F: Proposal State Machine & Idempotency
  Test G: Machine-Readable Decision Receipts & Cryptographic Hashing
  Test H: Case Concurrency Leasing & Lock Isolation
  Test I: Two-Phase Customer Attention Budget Reservation
  Test J: Hardened Action Contracts (Single-Use, Expiry, Revocation)
  Test K: Dynamic Trust Scoring & Autonomous Quarantine
  Test L: Dynamic Key Rotation
  Test M: Financial Gateway TOCTOU State Recheck & Contract Revocation
  Test N: Cryptographic Tamper-Evident Audit Ledger Hash Chaining
  Test O: MCP Governance & Non-Bypass Validation
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time
import uuid
import pytest
import pytest_asyncio

from app.models.agent_identity import (
    AgentStatus,
    AgentTrustTier,
    AgentCapability,
    KeyStatus,
    AgentKeyRecord,
    AgentCapabilityManifest,
    AgentIdentity,
    compute_deterministic_trust_score,
)
from app.security.canonical_signer import (
    canonical_signer,
    CURRENT_PROTOCOL_VERSION,
    ReplayProtectionStore,
)
from app.services.proposal_lifecycle import (
    ProposalRecord,
    ProposalState,
    ReasonCode,
    VALID_STATE_TRANSITIONS,
)
from app.services.decision_receipt import (
    DecisionReceipt,
    decision_receipt_store,
    ACTIVE_POLICY_VERSION,
)
from app.services.case_coordinator import (
    case_coordinator,
    AttentionReservationState,
)
from app.services.action_contract import (
    action_contract_manager,
    ActionContract,
    ContractStatus,
)
from app.services.agent_registry import (
    agent_registry,
    AgentType,
    AgentIntegrationType,
)
from app.services.agent_gateway import (
    agent_gateway,
    RecoveryProposal,
    DecisionStatus,
)
from app.services.financial_gateway import (
    financial_action_gateway,
    FinancialActionRequest,
    GatewayExecutionStatus,
)
from app.services.audit_service import audit_service


# ─────────────────────────────────────────────────────────────────────────────
# Test A: Agent Identity Model & Lifecycle Verification
# ─────────────────────────────────────────────────────────────────────────────
def test_agent_identity_lifecycle():
    manifest = AgentCapabilityManifest(
        agent_id="test_agent_alpha",
        capabilities=[AgentCapability.PROPOSE_MANDATE_RETRY],
        allowed_actions=["MANDATE_RETRY"],
    )
    identity = AgentIdentity(
        agent_id="test_agent_alpha",
        tenant_id="MERCH-001",
        agent_name="Alpha Test Agent",
        agent_type="SUBSCRIPTION_RECOVERY",
        status=AgentStatus.ACTIVE,
        trust_score=85.0,
    )
    assert identity.status == AgentStatus.ACTIVE
    assert identity.trust_tier == AgentTrustTier.TRUSTED

    # Register in registry
    rec, _, _ = agent_registry.register_agent(
        agent_name="Alpha Test Agent",
        agent_type=AgentType.SUBSCRIPTION_RECOVERY,
        tenant_id="MERCH-001",
        integration_type=AgentIntegrationType.SDK,
        capabilities=[AgentCapability.PROPOSE_MANDATE_RETRY],
    )
    test_id = rec.agent_id

    # Test suspension
    agent_registry.suspend_agent(test_id, "Security audit hold")
    agent = agent_registry.get_agent(test_id)
    assert agent is not None
    assert agent.status == AgentStatus.SUSPENDED

    # Test rejection when suspended
    auth_ok, err = agent_registry.validate_action_authorization(test_id, "MANDATE_RETRY", 1000.0)
    assert not auth_ok
    assert "AGENT_SUSPENDED" in err


# ─────────────────────────────────────────────────────────────────────────────
# Test B: Granular Capability Manifest Authorization
# ─────────────────────────────────────────────────────────────────────────────
def test_capability_manifest_authorization():
    manifest = AgentCapabilityManifest(
        agent_id="test_cap_agent",
        capabilities=[AgentCapability.PROPOSE_MANDATE_RETRY],
        allowed_actions=["MANDATE_RETRY", "SCHEDULE_MANDATE_RETRY"],
        allowed_channels=["RAZORPAY"],
        max_amount_inr=10000.0,
    )

    # 1. Allowed action & within amount
    ok, err = manifest.is_action_permitted("MANDATE_RETRY", 5000.0, "RAZORPAY")
    assert ok
    assert err is None

    # 2. Denied action
    ok, err = manifest.is_action_permitted("SEND_PAYMENT_LINK", 5000.0, "RAZORPAY")
    assert not ok
    assert "not authorized" in err

    # 3. Exceeded amount
    ok, err = manifest.is_action_permitted("MANDATE_RETRY", 15000.0, "RAZORPAY")
    assert not ok
    assert "exceeds" in err

    # 4. Unauthorized channel
    ok, err = manifest.is_action_permitted("MANDATE_RETRY", 5000.0, "WHATSAPP")
    assert not ok
    assert "Channel" in err


# ─────────────────────────────────────────────────────────────────────────────
# Test C: Canonical Request Signing & Tamper Detection
# ─────────────────────────────────────────────────────────────────────────────
def test_canonical_request_signing_and_tampering():
    secret = "test_hmac_secret_key_2026"
    method = "POST"
    path = "/api/agents/proposals"
    agent_id = "agent_sec_01"
    key_id = "key_sec_01"
    timestamp = str(time.time())
    request_id = "req_sec_1001"
    proposal_id = "PROP-SEC-1001"
    body = b'{"opportunity_id": "OPP-001", "amount_paise": 249900}'

    # 1. Compute valid signature
    sig = canonical_signer.sign_request(
        secret=secret,
        method=method,
        path=path,
        agent_id=agent_id,
        key_id=key_id,
        timestamp=timestamp,
        request_id=request_id,
        proposal_id=proposal_id,
        body=body,
    )
    assert len(sig) == 64

    # 2. Verify legitimate request
    valid, err = canonical_signer.verify_request(
        secret=secret,
        expected_signature=sig,
        method=method,
        path=path,
        agent_id=agent_id,
        key_id=key_id,
        timestamp_str=timestamp,
        request_id=request_id,
        proposal_id=proposal_id,
        body=body,
    )
    assert valid
    assert err is None

    # 3. Tamper with path -> must fail
    tampered_valid, _ = canonical_signer.verify_request(
        secret=secret,
        expected_signature=sig,
        method=method,
        path="/api/agents/unauthorized_path",
        agent_id=agent_id,
        key_id=key_id,
        timestamp_str=timestamp,
        request_id=f"req_{uuid.uuid4().hex[:6]}",
        proposal_id=proposal_id,
        body=body,
    )
    assert not tampered_valid

    # 4. Tamper with body payload -> must fail
    tampered_body = b'{"opportunity_id": "OPP-001", "amount_paise": 9999900}'
    tampered_valid_2, _ = canonical_signer.verify_request(
        secret=secret,
        expected_signature=sig,
        method=method,
        path=path,
        agent_id=agent_id,
        key_id=key_id,
        timestamp_str=timestamp,
        request_id=f"req_{uuid.uuid4().hex[:6]}",
        proposal_id=proposal_id,
        body=tampered_body,
    )
    assert not tampered_valid_2


# ─────────────────────────────────────────────────────────────────────────────
# Test D: Anti-Replay Protection & Nonce Registry
# ─────────────────────────────────────────────────────────────────────────────
def test_anti_replay_protection():
    store = ReplayProtectionStore(ttl_seconds=60)
    req_id = "req_replay_test_01"
    agent_id = "agent_replay_01"
    ts = time.time()

    # First attempt: succeeds
    ok1, err1 = store.check_and_record(req_id, agent_id, ts)
    assert ok1
    assert err1 is None

    # Second identical attempt: REPLAY_DETECTED
    ok2, err2 = store.check_and_record(req_id, agent_id, ts)
    assert not ok2
    assert "REPLAY_DETECTED" in err2


# ─────────────────────────────────────────────────────────────────────────────
# Test E: Clock Skew Tolerance Enforcers
# ─────────────────────────────────────────────────────────────────────────────
def test_clock_skew_tolerance():
    secret = "test_skew_secret"
    body = b"{}"
    now = time.time()

    # Expired timestamp (400s in past, tolerance 300s)
    stale_ts = str(now - 400.0)
    sig_stale = canonical_signer.sign_request(secret, "POST", "/api/agents/proposals", "agt_skew", "key_skew", stale_ts, "r1", "p1", body)
    valid_stale, err_stale = canonical_signer.verify_request(secret, sig_stale, "POST", "/api/agents/proposals", "agt_skew", "key_skew", stale_ts, "r1", "p1", body)
    assert not valid_stale
    assert "Clock skew" in err_stale

    # Fresh timestamp (60s in past) -> accepted
    fresh_ts = str(now - 60.0)
    sig_fresh = canonical_signer.sign_request(secret, "POST", "/api/agents/proposals", "agt_skew", "key_skew", fresh_ts, "r2", "p2", body)
    valid_fresh, err_fresh = canonical_signer.verify_request(secret, sig_fresh, "POST", "/api/agents/proposals", "agt_skew", "key_skew", fresh_ts, "r2", "p2", body)
    assert valid_fresh


# ─────────────────────────────────────────────────────────────────────────────
# Test F: Proposal State Machine & Idempotency
# ─────────────────────────────────────────────────────────────────────────────
def test_proposal_state_machine():
    record = ProposalRecord(
        proposal_id="PROP-STAT-01",
        agent_id="sub_agent_merch_001",
        tenant_id="MERCH-001",
        case_id="OPP-STAT-01",
        customer_id="CUST-01",
        customer_name="John Doe",
        action_type="SCHEDULE_MANDATE_RETRY",
        amount_inr=2499.0,
        amount_paise=249900,
    )
    assert record.state == ProposalState.CREATED

    # Valid step
    record.transition_to(ProposalState.AUTHENTICATED, "Signature verified")
    assert record.state == ProposalState.AUTHENTICATED

    record.transition_to(ProposalState.AUTHORIZED, "Manifest validated")
    assert record.state == ProposalState.AUTHORIZED

    # Illegal jump should raise ValueError
    with pytest.raises(ValueError):
        record.transition_to(ProposalState.EXECUTED, "Illegal direct jump")


# ─────────────────────────────────────────────────────────────────────────────
# Test G: Machine-Readable Decision Receipts & Cryptographic Hashing
# ─────────────────────────────────────────────────────────────────────────────
def test_decision_receipt_hashing():
    receipt = DecisionReceipt(
        decision_id="DEC-TEST-001",
        proposal_id="PROP-TEST-001",
        agent_id="sub_agent_merch_001",
        tenant_id="MERCH-001",
        case_id="OPP-TEST-001",
        customer_id="CUST-TEST-01",
        decision="APPROVED",
        reason_code=ReasonCode.HIGHEST_NET_INCREMENTAL_CONTRIBUTION,
        plain_language_reason="Approved with positive NIC",
        net_incremental_contribution_inr=3894.22,
        contract_id="CTR-TEST-001",
    )
    assert len(receipt.decision_hash) == 64
    assert receipt.decision_hash == receipt.compute_decision_hash()
    decision_receipt_store.store(receipt)

    stored = decision_receipt_store.get_by_decision_id("DEC-TEST-001")
    assert stored is not None
    assert stored.decision_hash == receipt.decision_hash


# ─────────────────────────────────────────────────────────────────────────────
# Test H: Case Concurrency Leasing & Lock Isolation
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_case_concurrency_leasing():
    tenant_id = "MERCH-LEASE-TEST"
    case_id = "CASE-LOCK-01"

    # Agent A acquires lease
    acquired_a, lease_id_a, err_a = await case_coordinator.acquire_case_lease(tenant_id, case_id, "agent_A")
    assert acquired_a
    assert lease_id_a is not None

    # Agent B attempts to acquire lease simultaneously -> blocked
    acquired_b, lease_id_b, err_b = await case_coordinator.acquire_case_lease(tenant_id, case_id, "agent_B")
    assert not acquired_b
    assert "CONCURRENT_CASE_LOCK" in err_b

    # Agent A releases lease
    await case_coordinator.release_case_lease(tenant_id, case_id, lease_id_a)

    # Agent B can now acquire
    acquired_b2, lease_id_b2, _ = await case_coordinator.acquire_case_lease(tenant_id, case_id, "agent_B")
    assert acquired_b2
    await case_coordinator.release_case_lease(tenant_id, case_id, lease_id_b2)


# ─────────────────────────────────────────────────────────────────────────────
# Test I: Two-Phase Customer Attention Budget Reservation
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_two_phase_customer_attention_reservation():
    tenant = "MERCH-ATTN-TEST"
    cust = f"CUST-ATTN-{uuid.uuid4().hex[:6]}"

    # Phase 1: Reserve slot for Agent 1
    res1, id1, err1 = await case_coordinator.reserve_customer_attention(tenant, cust, "agent_1", "prop_1", daily_cap=1)
    assert res1
    assert id1 is not None

    # Attempt to reserve for Agent 2 -> budget exhausted
    res2, id2, err2 = await case_coordinator.reserve_customer_attention(tenant, cust, "agent_2", "prop_2", daily_cap=1)
    assert not res2
    assert err2 == "CUSTOMER_ATTENTION_BUDGET_EXHAUSTED"

    # If Agent 1 is cancelled/fails -> release reservation
    await case_coordinator.release_attention_reservation(id1)

    # Now Agent 2 can reserve
    res2_retry, id2_retry, _ = await case_coordinator.reserve_customer_attention(tenant, cust, "agent_2", "prop_2", daily_cap=1)
    assert res2_retry


# ─────────────────────────────────────────────────────────────────────────────
# Test J: Hardened Action Contracts (Single-Use, Expiry, Revocation)
# ─────────────────────────────────────────────────────────────────────────────
def test_action_contract_lifecycle():
    # 1. Create contract
    contract = action_contract_manager.create_contract(
        case_id="OPP-CTR-01",
        tenant_id="MERCH-001",
        payment_id="pay_001",
        amount_inr=2499.0,
        strategy_type="SCHEDULE_MANDATE_RETRY",
        authorization_state="AUTHORIZED",
        customer_intent="ACTIVE",
        policy_version=ACTIVE_POLICY_VERSION,
        autonomy_level="LEVEL_3_AUTO_EXECUTE",
        ttl_seconds=300,
    )
    assert contract.status == ContractStatus.ACTIVE

    # 2. Verify legitimate contract
    valid, err = action_contract_manager.verify_contract(contract, expected_tenant_id="MERCH-001", expected_policy_version=ACTIVE_POLICY_VERSION)
    assert valid

    # 3. First execution -> consume contract atomically
    consume_ok, _ = action_contract_manager.consume_contract_atomic(contract.contract_id)
    assert consume_ok

    # 4. Second execution attempt -> must fail (Single-use invariant)
    valid_repeat, err_repeat = action_contract_manager.verify_contract(contract, expected_tenant_id="MERCH-001")
    assert not valid_repeat
    assert "CONTRACT_ALREADY_CONSUMED" in err_repeat

    # 5. Revocation test
    contract2 = action_contract_manager.create_contract(
        case_id="OPP-CTR-02",
        tenant_id="MERCH-001",
        payment_id="pay_002",
        amount_inr=1000.0,
        strategy_type="SEND_PAYMENT_LINK",
        authorization_state="AUTHORIZED",
        customer_intent="ACTIVE",
        policy_version=ACTIVE_POLICY_VERSION,
        autonomy_level="LEVEL_3_AUTO_EXECUTE",
        ttl_seconds=300,
    )
    action_contract_manager.revoke_contract(contract2.contract_id, reason="PAYMENT_STATE_CHANGED")
    valid_revoked, err_revoked = action_contract_manager.verify_contract(contract2, expected_tenant_id="MERCH-001")
    assert not valid_revoked
    assert "CONTRACT_REVOKED" in err_revoked


# ─────────────────────────────────────────────────────────────────────────────
# Test K: Dynamic Trust Scoring & Autonomous Quarantine
# ─────────────────────────────────────────────────────────────────────────────
def test_trust_score_quarantine():
    # 100 proposals, 80 approved, 10 rejected, 10 violations -> degraded
    score = compute_deterministic_trust_score(
        approved_count=80,
        rejected_count=10,
        total_proposals=100,
        consecutive_violations=5,
        base_score=85.0,
    )
    assert score < 80.0


# ─────────────────────────────────────────────────────────────────────────────
# Test L: Dynamic Key Rotation
# ─────────────────────────────────────────────────────────────────────────────
def test_dynamic_key_rotation():
    rec, api_key, old_secret = agent_registry.register_agent(
        agent_name="Key Rotation Test Agent",
        agent_type=AgentType.SUBSCRIPTION_RECOVERY,
        tenant_id="MERCH-001",
        integration_type=AgentIntegrationType.SDK,
        capabilities=[AgentCapability.PROPOSE_MANDATE_RETRY],
    )
    old_key_id = rec.key_id

    # Rotate key
    ok, new_key_id, new_secret = agent_registry.rotate_key(rec.agent_id)
    assert ok
    assert new_key_id != old_key_id
    assert new_secret != old_secret

    # Verify agent reflects new key
    updated = agent_registry.get_agent(rec.agent_id)
    assert updated.key_id == new_key_id
    assert updated.hmac_secret == new_secret


# ─────────────────────────────────────────────────────────────────────────────
# Test M: Financial Gateway TOCTOU State Recheck & Contract Revocation
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_financial_gateway_toctou_revocation():
    # Attempt execution with already recovered status in DB
    contract = action_contract_manager.create_contract(
        case_id="OPP-TOCTOU-99",
        tenant_id="MERCH-001",
        payment_id="pay_toctou_99",
        amount_inr=2499.0,
        strategy_type="SCHEDULE_MANDATE_RETRY",
        authorization_state="AUTHORIZED",
        customer_intent="ACTIVE",
        policy_version=ACTIVE_POLICY_VERSION,
        autonomy_level="LEVEL_3_AUTO_EXECUTE",
    )

    req = FinancialActionRequest(
        merchant_id="MERCH-001",
        case_id="OPP-TOCTOU-99",
        action_type="SCHEDULE_MANDATE_RETRY",
        actor="AGENT:sub_agent_default",
        signed_contract=contract.to_dict(),
        is_autonomous=True,
    )

    from app.state import get_state
    state = get_state("MERCH-001")
    state.setdefault("cases", []).append({
        "id": "OPP-TOCTOU-99",
        "amount_inr": 2499.0,
        "status": "captured",  # Already captured in interim!
    })

    result = await financial_action_gateway.execute_action(req)
    assert result.status == GatewayExecutionStatus.BLOCKED
    assert result.blocking_reason in ("PAYMENT_STATE_CHANGED", "ALREADY_RECOVERED")

    # Verify contract was automatically revoked
    revoked_contract = action_contract_manager.get_contract(contract.contract_id)
    assert revoked_contract.status == ContractStatus.REVOKED


# ─────────────────────────────────────────────────────────────────────────────
# Test N: Cryptographic Tamper-Evident Audit Ledger Hash Chaining
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_audit_ledger_hash_chaining():
    corr_id = f"corr_{uuid.uuid4().hex[:8]}"

    event1 = await audit_service.log_event(
        session=None,
        event_type="PROPOSAL_SUBMITTED",
        actor="AGENT:sub_agent_default",
        correlation_id=corr_id,
        event_data={"step": 1, "action": "MANDATE_RETRY"},
    )

    event2 = await audit_service.log_event(
        session=None,
        event_type="DECISION_APPROVED",
        actor="REVIVEOS_GOVERNOR",
        correlation_id=corr_id,
        event_data={"step": 2, "status": "APPROVED"},
    )

    # Verify cryptographic hash chaining
    hash1 = event1["_audit_chain"]["current_event_hash"]
    prev_hash2 = event2["_audit_chain"]["previous_event_hash"]
    assert hash1 == prev_hash2
    assert len(hash1) == 64


# ─────────────────────────────────────────────────────────────────────────────
# Test O: MCP Governance & Non-Bypass Validation
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_mcp_governance_enforcement():
    # Attempting direct execution without contract must be blocked
    rogue_req = FinancialActionRequest(
        merchant_id="MERCH-001",
        case_id="OPP-MCP-ROGUE",
        action_type="SEND_PAYMENT_LINK",
        actor="UNREGISTERED_MCP_AGENT",
        signed_contract=None,
        is_autonomous=True,
    )
    res = await financial_action_gateway.execute_action(rogue_req)
    assert res.status == GatewayExecutionStatus.BLOCKED
    assert res.blocking_reason == "MISSING_ACTION_CONTRACT"
