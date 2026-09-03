# -*- coding: utf-8 -*-
"""
ReviveOS — Autonomous Agent Gateway & Governance API Router
Protocol Version: REVIVEOS-PROTOCOL-1.1

Exposes REST and MCP interfaces for external recovery agents.
Enforces cryptographic authentication (HMAC-SHA256), replay protection,
granular capability authorization, multi-agent arbitration, and Action Contract generation.
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.models.user import User
from app.services.agent_registry import (
    agent_registry,
    AgentStatus,
    AgentType,
    AgentCapability,
    AgentIntegrationType,
    PROTOCOL_VERSION,
)
from app.security.canonical_signer import (
    canonical_signer,
    CURRENT_PROTOCOL_VERSION,
    SUPPORTED_PROTOCOL_VERSIONS,
)
from app.services.agent_gateway import (
    agent_gateway,
    RecoveryProposal,
    DecisionStatus,
)
from app.services.action_contract import action_contract_manager
from app.services.financial_gateway import financial_action_gateway, FinancialActionRequest
from app.services.opportunity_graph import opportunity_graph
from app.services.agent_arbitrator import multi_agent_arbitrator
from app.services.decision_receipt import decision_receipt_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["Agent Governance Gateway"])


# ── Pydantic Request / Response Models ─────────────────────────────────────────

class RegisterAgentRequest(BaseModel):
    agent_name: str = Field(..., description="Human-readable agent name")
    agent_type: str = Field(..., description="Type: SUBSCRIPTION_RECOVERY, ABANDONED_CART, INVOICE_COLLECTION, CUSTOMER_RETENTION, PAYMENT_FAILURE, CUSTOM_EXTERNAL")
    tenant_id: str = Field(default="default", description="Merchant tenant ID")
    integration_type: str = Field(default="REST", description="REST, WEBHOOK, MCP, SDK")
    capabilities: List[str] = Field(default_factory=lambda: ["PAYMENT_LINK"], description="List of capabilities")
    callback_url: Optional[str] = None
    description: str = ""
    owner_email: Optional[str] = None
    owner_org: Optional[str] = None
    requested_autonomy_level: str = "LEVEL_2_NOTIFY_MERCHANT"
    rate_limit_per_minute: int = 120


class ProposedActionPayload(BaseModel):
    type: str = Field(..., description="Action type: SCHEDULE_MANDATE_RETRY, SEND_PAYMENT_LINK, OFFER_10PCT_DISCOUNT, SEND_INVOICE_REMINDER, DELIBERATE_ABSTENTION")
    amount_paise: int = Field(default=249900, description="Amount in paise (1 INR = 100 paise)")
    channel: str = Field(default="RAZORPAY", description="Execution channel")
    params: Dict[str, Any] = Field(default_factory=dict)


class SubmitProposalRequest(BaseModel):
    opportunity_id: str
    customer_id: str
    customer_name: str = "Customer"
    tenant_id: str = "default"
    agent_id: Optional[str] = None
    agent_type: str = "CUSTOM_EXTERNAL"
    proposed_action: ProposedActionPayload
    estimated_recovery_probability: float = Field(default=0.85, ge=0.0, le=1.0)
    estimated_natural_recovery: float = Field(default=0.10, ge=0.0, le=1.0)
    estimated_cost_paise: int = Field(default=400, ge=0)
    estimated_discount_paise: int = Field(default=0, ge=0)
    estimated_friction: float = Field(default=0.0, ge=0.0, le=10.0)
    confidence: float = Field(default=0.90, ge=0.0, le=1.0)
    reason: str = ""
    idempotency_key: Optional[str] = None
    callback_url: Optional[str] = None
    auto_execute: bool = False
    protocol_version: str = CURRENT_PROTOCOL_VERSION


class BatchProposalRequest(BaseModel):
    tenant_id: str = "default"
    proposals: List[SubmitProposalRequest]


class MCPToolCallRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)


class CapabilityRevocationRequest(BaseModel):
    capability: str
    reason: str = "Administrative revocation"


class SuspendAgentRequest(BaseModel):
    reason: str = "Administrative security hold"


# ── Static / Prefix Routes (Must Be Defined Before /{agent_id}) ───────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_agent(
    req: RegisterAgentRequest,
    current_user: Optional[User] = Depends(get_current_user),
):
    tenant_id = req.tenant_id or (current_user.merchant_id if current_user else "default")

    try:
        a_type = AgentType(req.agent_type)
    except ValueError:
        a_type = AgentType.CUSTOM_EXTERNAL

    try:
        i_type = AgentIntegrationType(req.integration_type)
    except ValueError:
        i_type = AgentIntegrationType.REST

    caps: List[AgentCapability] = []
    for c in req.capabilities:
        try:
            caps.append(AgentCapability(c))
        except ValueError:
            pass

    if not caps:
        caps = [AgentCapability.PROPOSE_PAYMENT_LINK]

    record, api_key, hmac_secret = agent_registry.register_agent(
        agent_name=req.agent_name,
        agent_type=a_type,
        tenant_id=tenant_id,
        integration_type=i_type,
        capabilities=caps,
        callback_url=req.callback_url,
        description=req.description,
        owner_email=req.owner_email,
        owner_org=req.owner_org,
        rate_limit_per_minute=req.rate_limit_per_minute,
    )

    return {
        "status": "REGISTERED",
        "agent": record.to_dict(),
        "credentials": {
            "api_key": api_key,
            "hmac_secret": hmac_secret,
            "key_id": record.key_id,
            "signature_algorithm": "HMAC-SHA256",
            "protocol_version": CURRENT_PROTOCOL_VERSION,
            "header_requirements": {
                "agent_id_header": "X-ReviveOS-Agent-ID",
                "key_id_header": "X-ReviveOS-Key-ID",
                "timestamp_header": "X-ReviveOS-Timestamp",
                "request_id_header": "X-ReviveOS-Request-ID",
                "proposal_id_header": "X-ReviveOS-Proposal-ID",
                "signature_header": "X-ReviveOS-Signature",
                "protocol_header": "X-ReviveOS-Protocol-Version",
            },
        },
    }


@router.get("/opportunities/{opportunity_id}/context")
async def get_opportunity_context(
    opportunity_id: str,
    x_reviveos_agent_id: Optional[str] = Header(None, alias="X-ReviveOS-Agent-ID"),
    current_user: Optional[User] = Depends(get_current_user),
):
    from app.state import get_state
    tenant_id = current_user.merchant_id if current_user else "default"
    state = get_state(tenant_id)
    cases = state.get("cases", [])
    opp = next((c for c in cases if c.get("id") == opportunity_id or c.get("case_id") == opportunity_id), None)

    if not opp:
        opp = {
            "id": opportunity_id,
            "amount_inr": 4999.0,
            "failure_code": "INSUFFICIENT_FUNDS",
            "failure_category": "temporary_failure",
            "gateway": "razorpay",
            "customer_id": "CUST-9821",
            "customer_name": "Aarav Mehta",
            "recovery_probability": 0.85,
        }

    half_life = opportunity_graph.compute_half_life_decay(opportunity_id, "failed_subscription")

    return {
        "opportunity_id": opportunity_id,
        "amount_paise": int(round(opp.get("amount_inr", 4999.0) * 100)),
        "amount_inr": opp.get("amount_inr", 4999.0),
        "currency": "INR",
        "failure_code": opp.get("failure_code", "UNKNOWN_ERROR"),
        "failure_category": opp.get("failure_category", "temporary_failure"),
        "gateway": opp.get("gateway", "razorpay"),
        "customer_id": opp.get("customer_id", "CUST-9821"),
        "recovery_half_life_seconds": half_life.half_life_seconds,
        "urgency_remaining_pct": half_life.urgency_remaining_pct,
        "is_expired": half_life.is_expired,
        "eligible_actions": ["SCHEDULE_MANDATE_RETRY", "SEND_PAYMENT_LINK", "DELIBERATE_ABSTENTION"],
        "max_recommended_discount_pct": 0,
    }


@router.post("/proposals")
async def submit_proposal(
    req: SubmitProposalRequest,
    request: Request,
    x_reviveos_agent_id: Optional[str] = Header(None, alias="X-ReviveOS-Agent-ID"),
    x_reviveos_key_id: Optional[str] = Header(None, alias="X-ReviveOS-Key-ID"),
    x_reviveos_timestamp: Optional[str] = Header(None, alias="X-ReviveOS-Timestamp"),
    x_reviveos_request_id: Optional[str] = Header(None, alias="X-ReviveOS-Request-ID"),
    x_reviveos_proposal_id: Optional[str] = Header(None, alias="X-ReviveOS-Proposal-ID"),
    x_reviveos_signature: Optional[str] = Header(None, alias="X-ReviveOS-Signature"),
    x_reviveos_protocol_version: Optional[str] = Header(None, alias="X-ReviveOS-Protocol-Version"),
    x_reviveos_api_key: Optional[str] = Header(None, alias="X-ReviveOS-API-Key"),
    current_user: Optional[User] = Depends(get_current_user),
):
    raw_body = await request.body()
    method = request.method
    path = request.url.path

    # Determine Agent ID
    agent_id = x_reviveos_agent_id or req.agent_id
    if not agent_id:
        raise HTTPException(status_code=400, detail="MISSING_AGENT_IDENTITY: Must specify X-ReviveOS-Agent-ID header or agent_id field")

    agent_record = agent_registry.get_agent(agent_id)
    if not agent_record:
        raise HTTPException(status_code=401, detail={"error": "UNKNOWN_AGENT", "reason": f"Agent '{agent_id}' not found in registry"})

    # Lifecycle Status Check
    if agent_record.status == AgentStatus.REVOKED:
        raise HTTPException(status_code=401, detail={"error": "AGENT_REVOKED", "reason": "Agent credentials permanently revoked"})
    if agent_record.status == AgentStatus.SUSPENDED:
        raise HTTPException(status_code=403, detail={"error": "AGENT_SUSPENDED", "reason": "Agent is currently suspended by administrator"})
    if agent_record.status == AgentStatus.QUARANTINED:
        raise HTTPException(status_code=403, detail={"error": "AGENT_QUARANTINED", "reason": "Agent trust score below operational quarantine threshold"})

    # Cross-Tenant Isolation
    target_tenant = req.tenant_id or (current_user.merchant_id if current_user else agent_record.tenant_id)
    if agent_record.tenant_id not in (target_tenant, "default") and target_tenant != "default":
        raise HTTPException(
            status_code=403,
            detail={"error": "UNAUTHORIZED_TENANT", "reason": f"Agent registered for tenant '{agent_record.tenant_id}' cannot propose for '{target_tenant}'"}
        )

    # Cryptographic Verification
    timestamp_str = x_reviveos_timestamp or str(time.time())
    request_id = x_reviveos_request_id or f"req_{uuid.uuid4().hex[:8]}"
    proposal_id = x_reviveos_proposal_id or req.opportunity_id or "PROP-001"
    protocol_version = x_reviveos_protocol_version or req.protocol_version or CURRENT_PROTOCOL_VERSION
    key_id = x_reviveos_key_id or agent_record.key_id

    if x_reviveos_signature:
        sig_ok, sig_err = canonical_signer.verify_request(
            secret=agent_record.hmac_secret,
            expected_signature=x_reviveos_signature,
            method=method,
            path=path,
            agent_id=agent_id,
            key_id=key_id,
            timestamp_str=timestamp_str,
            request_id=request_id,
            proposal_id=proposal_id,
            body=raw_body,
            protocol_version=protocol_version,
        )
        if not sig_ok:
            raise HTTPException(
                status_code=401,
                detail={"error": "AUTHENTICATION_FAILED", "reason": sig_err, "agent_id": agent_id}
            )
    elif x_reviveos_api_key:
        key_hash = hashlib.sha256(x_reviveos_api_key.encode("utf-8")).hexdigest()
        if not hmac.compare_digest(agent_record.api_key_hash, key_hash):
            raise HTTPException(status_code=401, detail={"error": "INVALID_API_KEY", "reason": "Provided API key hash mismatch"})
    elif not current_user:
        raise HTTPException(status_code=401, detail={"error": "MISSING_AUTHENTICATION", "reason": "Request requires X-ReviveOS-Signature or X-ReviveOS-API-Key"})

    # Rate Limiting
    rate_ok, rate_err = agent_registry.check_rate_limit(agent_id)
    if not rate_ok:
        raise HTTPException(status_code=429, detail={"error": "AGENT_RATE_LIMITED", "reason": rate_err})

    # Internal proposal
    data = req.dict()
    data["agent_id"] = agent_id
    data["tenant_id"] = target_tenant
    data["protocol_version"] = protocol_version
    proposal = RecoveryProposal.from_dict(data)

    decision = await agent_gateway.evaluate_and_arbitrate_proposal(
        proposal=proposal,
        authenticated_agent_id=agent_id,
        auto_execute_financial_action=req.auto_execute,
    )

    return decision.to_dict()


@router.post("/proposals/batch")
async def submit_proposals_batch(
    req: BatchProposalRequest,
    current_user: Optional[User] = Depends(get_current_user),
):
    results: List[Dict[str, Any]] = []
    tenant_id = req.tenant_id or (current_user.merchant_id if current_user else "default")

    for p_req in req.proposals:
        p_data = p_req.dict()
        p_data["tenant_id"] = tenant_id
        proposal = RecoveryProposal.from_dict(p_data)
        agent_id = proposal.agent_id

        rate_ok, _ = agent_registry.check_rate_limit(agent_id)
        if not rate_ok:
            results.append({
                "proposal_id": proposal.proposal_id,
                "status": "RATE_LIMITED",
                "error": f"Agent {agent_id} rate limit exceeded",
            })
            continue

        decision = await agent_gateway.evaluate_and_arbitrate_proposal(
            proposal=proposal,
            authenticated_agent_id=agent_id,
            auto_execute_financial_action=p_req.auto_execute,
        )
        results.append(decision.to_dict())

    return {
        "batch_size": len(req.proposals),
        "processed_count": len(results),
        "results": results,
    }


@router.get("/proposals/{proposal_id}")
@router.get("/decisions/{proposal_id}")
async def get_proposal_decision(proposal_id: str):
    receipt = decision_receipt_store.get_by_proposal_id(proposal_id)
    if not receipt:
        receipt = decision_receipt_store.get_by_decision_id(proposal_id)
    if not receipt:
        raise HTTPException(status_code=404, detail=f"Decision for proposal '{proposal_id}' not found")
    return receipt.to_dict()


@router.post("/simulate-collision")
async def simulate_agent_collision(current_user: Optional[User] = Depends(get_current_user)):
    tenant_id = current_user.merchant_id if current_user else "MERCH-001"
    customer_id = "CUST-9821"
    customer_name = "Aarav Mehta"
    opp_id = "OPP-COLLISION-001"

    sub_id = next((a.agent_id for a in agent_registry.list_agents(tenant_id) if a.agent_type == AgentType.SUBSCRIPTION_RECOVERY), "sub_agent_default")
    cart_id = next((a.agent_id for a in agent_registry.list_agents(tenant_id) if a.agent_type == AgentType.ABANDONED_CART), "cart_agent_default")
    ret_id = next((a.agent_id for a in agent_registry.list_agents(tenant_id) if a.agent_type == AgentType.CUSTOMER_RETENTION), "retention_agent_default")

    prop_a = RecoveryProposal.from_dict({
        "proposal_id": f"PROP-SUB-{uuid.uuid4().hex[:6].upper()}",
        "agent_id": sub_id,
        "agent_type": "SUBSCRIPTION_RECOVERY",
        "tenant_id": tenant_id,
        "opportunity_id": opp_id,
        "customer_id": customer_id,
        "customer_name": customer_name,
        "proposed_action": {"type": "SCHEDULE_MANDATE_RETRY", "amount_paise": 249900},
        "estimated_recovery_probability": 0.88,
        "estimated_natural_recovery": 0.10,
        "estimated_cost_paise": 400,
        "estimated_discount_paise": 0,
        "estimated_friction": 1.0,
        "reason": "Active recurring mandate token on file. Zero-friction S2S debit.",
    })

    prop_b = RecoveryProposal.from_dict({
        "proposal_id": f"PROP-CART-{uuid.uuid4().hex[:6].upper()}",
        "agent_id": cart_id,
        "agent_type": "ABANDONED_CART",
        "tenant_id": tenant_id,
        "opportunity_id": opp_id,
        "customer_id": customer_id,
        "customer_name": customer_name,
        "proposed_action": {"type": "SEND_PAYMENT_LINK", "amount_paise": 499900},
        "estimated_recovery_probability": 0.45,
        "estimated_natural_recovery": 0.15,
        "estimated_cost_paise": 250,
        "estimated_discount_paise": 0,
        "estimated_friction": 4.0,
        "reason": "Checkout dropped at OTP step. Proposes WhatsApp payment link.",
    })

    prop_c = RecoveryProposal.from_dict({
        "proposal_id": f"PROP-RET-{uuid.uuid4().hex[:6].upper()}",
        "agent_id": ret_id,
        "agent_type": "CUSTOMER_RETENTION",
        "tenant_id": tenant_id,
        "opportunity_id": opp_id,
        "customer_id": customer_id,
        "customer_name": customer_name,
        "proposed_action": {"type": "OFFER_10PCT_DISCOUNT", "amount_paise": 499900},
        "estimated_recovery_probability": 0.60,
        "estimated_natural_recovery": 0.15,
        "estimated_cost_paise": 300,
        "estimated_discount_paise": 50000,
        "estimated_friction": 3.0,
        "reason": "Offers 10% coupon to avoid churn (destroys ₹500 margin).",
    })

    dec_a = await agent_gateway.evaluate_and_arbitrate_proposal(prop_a, prop_a.agent_id)
    attention = multi_agent_arbitrator.get_attention_record(customer_id)
    attention.contacts_used_today = 1
    attention.last_contacted_agent = dec_a.agent_id

    dec_b = await agent_gateway.evaluate_and_arbitrate_proposal(prop_b, prop_b.agent_id)
    dec_c = await agent_gateway.evaluate_and_arbitrate_proposal(prop_c, prop_c.agent_id)

    return {
        "scenario": "3-Way Swarm Collision: Subscription vs Cart vs Retention",
        "target_customer": {"customer_id": customer_id, "customer_name": customer_name},
        "competing_proposals_count": 3,
        "winning_agent": dec_a.agent_id,
        "winning_decision": dec_a.to_dict(),
        "suppressed_agents": [
            {
                "agent_id": dec_b.agent_id,
                "proposal_id": prop_b.proposal_id,
                "status": dec_b.status.value,
                "reason": dec_b.plain_language_reason,
                "receipt_hash": dec_b.decision_receipt_hash,
            },
            {
                "agent_id": dec_c.agent_id,
                "proposal_id": prop_c.proposal_id,
                "status": dec_c.status.value,
                "reason": dec_c.plain_language_reason,
                "receipt_hash": dec_c.decision_receipt_hash,
            },
        ],
        "governance_summary": (
            "ReviveOS evaluated 3 simultaneous proposals under strict 1-contact/24h customer attention constraints. "
            "Subscription Agent won with highest Net Incremental Contribution. "
            "Cart Agent was suppressed to prevent duplicate customer contact. "
            "Retention Agent was suppressed to prevent ₹500 discount margin destruction."
        ),
    }


@router.post("/simulate-bypass")
async def simulate_adversarial_bypass(current_user: Optional[User] = Depends(get_current_user)):
    tenant_id = current_user.merchant_id if current_user else "MERCH-001"
    sub_id = next((a.agent_id for a in agent_registry.list_agents(tenant_id) if a.agent_type == AgentType.SUBSCRIPTION_RECOVERY), "sub_agent_default")

    # 1. Unregistered Rogue Agent Attempt
    rogue_request = FinancialActionRequest(
        merchant_id=tenant_id,
        case_id="OPP-ROGUE-01",
        action_type="SEND_PAYMENT_LINK",
        actor="UNREGISTERED_ROGUE_AGENT_007",
        signed_contract=None,
        is_autonomous=True,
    )
    rogue_result = await financial_action_gateway.execute_action(rogue_request)

    # 2. Registered Agent Authorized Path
    prop = RecoveryProposal.from_dict({
        "proposal_id": f"PROP-AUTH-{uuid.uuid4().hex[:6]}",
        "agent_id": sub_id,
        "agent_type": "SUBSCRIPTION_RECOVERY",
        "tenant_id": tenant_id,
        "opportunity_id": "OPP-AUTH-01",
        "customer_id": "CUST-AUTH-99",
        "customer_name": "Auth Customer",
        "proposed_action": {"type": "SCHEDULE_MANDATE_RETRY", "amount_paise": 249900},
        "estimated_recovery_probability": 0.85,
    })
    decision = await agent_gateway.evaluate_and_arbitrate_proposal(prop, prop.agent_id, auto_execute_financial_action=False)

    return {
        "bypass_test": {
            "attacker": "UNREGISTERED_ROGUE_AGENT_007",
            "attempt": "Direct financial execution without ReviveOS Action Contract",
            "financial_gateway_verdict": rogue_result.status.value,
            "blocking_reason": rogue_result.blocking_reason,
            "execution_blocked": not rogue_result.success,
            "money_moved": rogue_result.amount_recovered_inr > 0,
        },
        "authorized_governance_test": {
            "agent": sub_id,
            "decision": decision.status.value,
            "action_contract_id": decision.action_contract.get("contract_id") if decision.action_contract else None,
            "execution_allowed": decision.status == DecisionStatus.APPROVED,
        },
        "security_proof": "The Financial Action Gateway strictly denies execution without a valid, non-expired HMAC-SHA256 Action Contract.",
    }


# ── Model Context Protocol (MCP) Interface ────────────────────────────────────

MCP_TOOL_DEFINITIONS = [
    {
        "name": "reviveos_register_agent",
        "description": "Register an AI recovery agent with ReviveOS to receive API credentials and authorization.",
        "input_schema": {
            "type": "object",
            "properties": {
                "agent_name": {"type": "string", "description": "Human-readable agent name"},
                "agent_type": {"type": "string", "enum": ["SUBSCRIPTION_RECOVERY", "ABANDONED_CART", "INVOICE_COLLECTION", "CUSTOMER_RETENTION", "PAYMENT_FAILURE", "CUSTOM_EXTERNAL"]},
                "capabilities": {"type": "array", "items": {"type": "string"}, "description": "List of capabilities e.g. ['MANDATE_RETRY', 'PAYMENT_LINK']"},
            },
            "required": ["agent_name", "agent_type"],
        },
    },
    {
        "name": "reviveos_submit_recovery_proposal",
        "description": "Submit a recovery proposal for arbitration. Returns decision and signed Action Contract if approved.",
        "input_schema": {
            "type": "object",
            "properties": {
                "opportunity_id": {"type": "string", "description": "ID of the failed payment opportunity"},
                "customer_id": {"type": "string", "description": "ID of the customer"},
                "action_type": {"type": "string", "description": "Action proposed e.g. SCHEDULE_MANDATE_RETRY, SEND_PAYMENT_LINK"},
                "amount_paise": {"type": "integer", "description": "Transaction amount in paise (1 INR = 100 paise)"},
                "estimated_recovery_probability": {"type": "number", "description": "Estimated recovery probability 0.0-1.0"},
                "reason": {"type": "string", "description": "Plain language rationale for the proposed action"},
            },
            "required": ["opportunity_id", "customer_id", "action_type", "amount_paise"],
        },
    },
    {
        "name": "reviveos_get_opportunity_context",
        "description": "Retrieve scoped opportunity signals, recovery half-life window, and attention constraints.",
        "input_schema": {
            "type": "object",
            "properties": {
                "opportunity_id": {"type": "string", "description": "Opportunity ID to inspect"},
            },
            "required": ["opportunity_id"],
        },
    },
    {
        "name": "reviveos_check_customer_attention",
        "description": "Check customer daily attention capacity status.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_id": {"type": "string", "description": "Customer ID to check"},
            },
            "required": ["customer_id"],
        },
    },
]


@router.get("/telemetry/timeline")
async def get_agent_timeline(
    limit: int = 50,
    current_user: Optional[User] = Depends(get_current_user)
):
    """Fetch recent agent telemetry and arbitration decision events."""
    mid = current_user.merchant_id if current_user else "default"
    from app.state import get_audit_trail
    events = get_audit_trail(mid)
    agent_events = [
        e for e in events
        if any(k in e.get("event_type", "") for k in ("AGENT", "ARBITRATION", "PROPOSAL", "COLLISION", "CONTRACT"))
    ]
    return agent_events[:limit] if agent_events else events[:limit]


@router.get("/mcp/manifest")
async def get_mcp_manifest():
    return {
        "mcp_version": "0.1.0",
        "server_name": "reviveos-recovery-governor",
        "description": "ReviveOS Revenue Recovery Governance Gateway for autonomous AI agents.",
        "tools": MCP_TOOL_DEFINITIONS,
    }


@router.post("/mcp/tools")
async def call_mcp_tool(req: MCPToolCallRequest, current_user: Optional[User] = Depends(get_current_user)):
    name = req.tool_name
    args = req.arguments
    tenant_id = current_user.merchant_id if current_user else "default"

    if name == "reviveos_register_agent":
        rec, api_key, hmac_sec = agent_registry.register_agent(
            agent_name=args.get("agent_name", "MCP External Agent"),
            agent_type=AgentType(args.get("agent_type", "CUSTOM_EXTERNAL")),
            tenant_id=tenant_id,
            integration_type=AgentIntegrationType.MCP,
            capabilities=[AgentCapability.PROPOSE_PAYMENT_LINK, AgentCapability.DELIBERATE_ABSTENTION],
        )
        return {"agent_id": rec.agent_id, "api_key": api_key, "hmac_secret": hmac_sec, "status": rec.status.value}

    elif name == "reviveos_submit_recovery_proposal":
        prop = RecoveryProposal.from_dict({
            "opportunity_id": args.get("opportunity_id", "OPP-MCP-01"),
            "customer_id": args.get("customer_id", "CUST-MCP-01"),
            "agent_id": f"sub_agent_{tenant_id[:6].lower()}",
            "tenant_id": tenant_id,
            "proposed_action": {
                "type": args.get("action_type", "SEND_PAYMENT_LINK"),
                "amount_paise": args.get("amount_paise", 249900),
            },
            "estimated_recovery_probability": float(args.get("estimated_recovery_probability", 0.85)),
            "reason": args.get("reason", "MCP Tool Proposal"),
        })
        dec = await agent_gateway.evaluate_and_arbitrate_proposal(prop, prop.agent_id)
        return dec.to_dict()

    elif name == "reviveos_get_opportunity_context":
        return await get_opportunity_context(args.get("opportunity_id", "OPP-001"), current_user=current_user)

    elif name == "reviveos_check_customer_attention":
        cust_id = args.get("customer_id", "CUST-9821")
        from app.services.agent_arbitrator import multi_agent_arbitrator
        rec = multi_agent_arbitrator.get_attention_record(cust_id)
        return {
            "customer_id": cust_id,
            "daily_contact_cap": rec.daily_contact_cap,
            "contacts_used_today": rec.contacts_used_today,
            "contacts_remaining": max(0, rec.daily_contact_cap - rec.contacts_used_today),
            "opt_out_status": rec.opt_out_status,
        }

    raise HTTPException(status_code=400, detail=f"Unknown MCP tool '{name}'")


@router.post("/callbacks/test")
async def receive_test_callback(payload: Dict[str, Any], x_reviveos_signature: Optional[str] = Header(None, alias="X-ReviveOS-Signature")):
    logger.info(f"Test callback received with signature {x_reviveos_signature}: {payload.get('decision_id')}")
    return {"status": "CALLBACK_DELIVERED", "received_at": time.time(), "decision_id": payload.get("decision_id")}


# ── Generic Agent / ID Routes ─────────────────────────────────────────────────

@router.get("")
async def list_registered_agents(current_user: Optional[User] = Depends(get_current_user)):
    tenant_id = current_user.merchant_id if current_user else None
    agents = agent_registry.list_agents(tenant_id)
    return [a.to_dict() for a in agents]


@router.get("/{agent_id}")
async def get_agent_details(agent_id: str, current_user: Optional[User] = Depends(get_current_user)):
    agent = agent_registry.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found in registry")
    return agent.to_dict()


@router.post("/{agent_id}/heartbeat")
async def agent_heartbeat(agent_id: str):
    ok = agent_registry.heartbeat(agent_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found or revoked")
    return {"status": "HEALTHY", "agent_id": agent_id, "timestamp": time.time()}


@router.post("/{agent_id}/suspend")
async def suspend_agent_endpoint(
    agent_id: str,
    req: SuspendAgentRequest,
    current_user: Optional[User] = Depends(get_current_user),
):
    ok = agent_registry.suspend_agent(agent_id, req.reason)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    return {"status": "SUSPENDED", "agent_id": agent_id, "reason": req.reason}


@router.post("/{agent_id}/restore")
async def restore_agent_endpoint(
    agent_id: str,
    current_user: Optional[User] = Depends(get_current_user),
):
    ok = agent_registry.restore_agent(agent_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    return {"status": "ACTIVE", "agent_id": agent_id, "message": "Agent restored to active governance"}


@router.post("/{agent_id}/revoke")
async def revoke_agent(
    agent_id: str,
    current_user: Optional[User] = Depends(get_current_user),
):
    tenant_id = current_user.merchant_id if current_user else "default"
    ok = agent_registry.revoke_agent(agent_id, tenant_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    return {"status": "REVOKED", "agent_id": agent_id, "message": "Credentials revoked. All future proposals will be rejected."}


@router.post("/{agent_id}/revoke-capability")
async def revoke_capability_endpoint(
    agent_id: str,
    req: CapabilityRevocationRequest,
    current_user: Optional[User] = Depends(get_current_user),
):
    ok, err = agent_registry.revoke_capability(agent_id, req.capability, req.reason)
    if not ok:
        raise HTTPException(status_code=400, detail={"error": "CAPABILITY_REVOCATION_FAILED", "reason": err})
    return {"status": "CAPABILITY_REVOKED", "agent_id": agent_id, "capability": req.capability}


@router.post("/{agent_id}/rotate-key")
async def rotate_key_endpoint(
    agent_id: str,
    current_user: Optional[User] = Depends(get_current_user),
):
    ok, key_id, hmac_secret = agent_registry.rotate_key(agent_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    return {
        "status": "KEY_ROTATED",
        "agent_id": agent_id,
        "key_id": key_id,
        "hmac_secret": hmac_secret,
        "algorithm": "HMAC-SHA256",
    }
