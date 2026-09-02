# ReviveOS — Agent Interoperability & Governance Protocol (v1)

> **"Agents Propose. ReviveOS Arbitrates. The Financial Gateway Authorizes. Razorpay Executes."**

ReviveOS serves as the **central revenue recovery governance layer** above autonomous AI recovery agents (Subscription Agents, Cart Recovery Bots, Invoice Collectors, Retention Agents, LangChain/CrewAI/AutoGen swarms, and MCP tools).

This document is the official, machine-readable integration specification for developers building or integrating AI recovery agents with ReviveOS.

---

## 🏛️ 1. Core Architectural Principle

Participating AI agents **do not receive direct financial execution authority** and **do not receive raw payment gateway secrets**.

Instead, an agent becomes governed by ReviveOS when it proposes actions through the **ReviveOS Agent Gateway**:

```text
External / Internal AI Recovery Agent
               │
               │ 1. Submits Authenticated Proposal (HMAC-SHA256)
               ▼
     ReviveOS Agent Gateway
               │
               │ 2. Authenticates & checks rate limits (300s window)
               │ 3. Fetches opportunity & customer attention budget (1/24h)
               │ 4. Scores Net Incremental Contribution (NIC = τ × V - Cost - Margin)
               │ 5. Enforces Policy Ceilings & 12-Article Constitution
               │ 6. Global Multi-Agent Arbitration
               ▼
       Decision Returned
        /             \
       /               \
  REJECTED           APPROVED
  (Reason code)        │
                       │ 7. Issues Signed Action Contract (HMAC-SHA256, 300s TTL)
                       ▼
            Financial Action Gateway
                       │
                       │ 8. Validates Contract, TOCTOU, & Idempotency
                       ▼
               Razorpay Rails
```

---

## 🔑 2. Agent Authentication & Request Signing

All HTTP requests to the Agent Gateway must be authenticated using either:
1. **Canonical HMAC-SHA256 Request Signing** (Recommended for production)
2. **API Key Authentication** (Supported for development and MCP integration)

### Canonical Request Signature Format

```text
Canonical String = "{agent_id}:{timestamp}:{request_id}:{sha256(raw_json_body)}"
Signature = HMAC_SHA256(hmac_secret, Canonical String).hexdigest()
```

### Required Request Headers

| Header | Description | Example |
|---|---|---|
| `X-ReviveOS-Agent-ID` | Unique registered agent identifier | `sub_agent_merch0` |
| `X-ReviveOS-Timestamp` | Current Unix epoch timestamp in seconds | `1770000000.12` |
| `X-ReviveOS-Request-ID` | Unique request UUID for replay prevention | `req_9f2d18a4c81b` |
| `X-ReviveOS-Protocol-Version` | Protocol version (must be `v1`) | `v1` |
| `X-ReviveOS-Signature` | Hexadecimal HMAC-SHA256 signature | `a3b8...9f12` |
| `X-ReviveOS-API-Key` | Alternative API key (if signature omitted) | `revive_ak_...` |

> [!IMPORTANT]
> **Replay Attack Defense**: Requests with a timestamp older than **300 seconds** or re-using an existing `X-ReviveOS-Request-ID` are rejected with `401 REPLAY_ATTACK_DETECTED`.

---

## 📡 3. REST API Specification

### Endpoint 1: Agent Registration
`POST /api/agents/register`

#### Request Body
```json
{
  "agent_name": "AI Subscription Mandate Agent",
  "agent_type": "SUBSCRIPTION_RECOVERY",
  "integration_type": "SDK",
  "capabilities": ["MANDATE_RETRY", "WAIT_OBSERVE"],
  "version": "1.0.0",
  "description": "Autonomous mandate retry agent for recurring subscriptions",
  "callback_url": "https://agent.example.com/webhooks/reviveos"
}
```

#### Response (201 Created)
```json
{
  "status": "REGISTERED",
  "agent": {
    "agent_id": "agt_subs_8f2a",
    "agent_name": "AI Subscription Mandate Agent",
    "agent_type": "SUBSCRIPTION_RECOVERY",
    "status": "REGISTERED",
    "trust_score": 75.0,
    "capabilities": ["MANDATE_RETRY", "WAIT_OBSERVE"]
  },
  "credentials": {
    "api_key": "revive_ak_8f2a1c4e9b7d...",
    "hmac_secret": "revive_sec_9912a7d4...",
    "signature_algorithm": "HMAC-SHA256",
    "protocol_version": "v1"
  }
}
```

---

### Endpoint 2: Submit Recovery Proposal
`POST /api/agents/proposals`

#### Request Body
```json
{
  "protocol_version": "v1",
  "opportunity_id": "OPP-001",
  "customer_id": "CUST-9821",
  "customer_name": "Aarav Mehta",
  "proposed_action": {
    "type": "SCHEDULE_MANDATE_RETRY",
    "amount_paise": 249900,
    "channel": "RAZORPAY_SUBSCRIPTION"
  },
  "estimated_recovery_probability": 0.88,
  "estimated_natural_recovery": 0.10,
  "estimated_cost_paise": 400,
  "estimated_discount_paise": 0,
  "estimated_friction": 1.0,
  "confidence": 0.91,
  "reason": "Active recurring mandate token on file. Zero-friction S2S debit.",
  "idempotency_key": "IDEM-SUB-9821-2026",
  "callback_url": "https://agent.example.com/webhooks/reviveos",
  "auto_execute": false
}
```

#### Response: Approved Decision
```json
{
  "decision_id": "DEC-99A1F4",
  "proposal_id": "PROP-8812B4",
  "agent_id": "sub_agent_merch0",
  "status": "APPROVED",
  "allowed_action": "SCHEDULE_MANDATE_RETRY",
  "net_incremental_contribution_inr": 1944.22,
  "expected_incremental_value_inr": 1949.22,
  "causal_lift_tau": 0.78,
  "reason_code": "HIGHEST_NET_INCREMENTAL_CONTRIBUTION",
  "plain_language_reason": "Approved action 'SCHEDULE_MANDATE_RETRY' for Aarav Mehta. Yields positive net incremental profit (+₹1,944.22) with valid mandate.",
  "winning_agent_id": "sub_agent_merch0",
  "execution_authority": "FINANCIAL_GATEWAY_ONLY",
  "action_contract": {
    "contract_id": "CTR-8812A4F9",
    "case_id": "OPP-001",
    "amount_minor_paisa": 249900,
    "amount_inr": 2499.0,
    "currency": "INR",
    "strategy_type": "SCHEDULE_MANDATE_RETRY",
    "ttl_remaining_seconds": 300,
    "signature": "hmac_sha256_contract_signature..."
  },
  "decision_receipt_hash": "8f2a1c4e9b7d3f6a2e5c8b1d4f7a...",
  "decided_at": "2026-09-01T12:04:21Z"
}
```

#### Response: Suppressed Conflict (Losing Agent)
```json
{
  "decision_id": "DEC-99A1F5",
  "proposal_id": "PROP-8812B5",
  "agent_id": "cart_agent_merch0",
  "status": "SUPPRESSED_CONFLICT",
  "allowed_action": null,
  "net_incremental_contribution_inr": 1493.20,
  "reason_code": "CUSTOMER_ATTENTION_BUDGET_EXHAUSTED",
  "plain_language_reason": "Customer CUST-9821 reached daily attention cap (1/24h). Suppressed in favor of higher-yielding mandate retry.",
  "winning_agent_id": "sub_agent_merch0",
  "action_contract": null,
  "decision_receipt_hash": "7a1e0b3c5d8f..."
}
```

---

## 🛠️ 4. Model Context Protocol (MCP) Integration

ReviveOS exposes standardized MCP tools for AI models:

```json
{
  "tools": [
    {
      "name": "reviveos_submit_recovery_proposal",
      "description": "Submit a recovery proposal for arbitration. Returns decision and signed Action Contract if approved.",
      "input_schema": {
        "type": "object",
        "properties": {
          "opportunity_id": {"type": "string"},
          "customer_id": {"type": "string"},
          "action_type": {"type": "string"},
          "amount_paise": {"type": "integer"},
          "estimated_recovery_probability": {"type": "number"},
          "reason": {"type": "string"}
        },
        "required": ["opportunity_id", "customer_id", "action_type", "amount_paise"]
      }
    }
  ]
}
```

---

## 💻 5. Python SDK Example

```python
from reviveos_sdk.client import ReviveOSAgentClient

client = ReviveOSAgentClient(
    base_url="http://127.0.0.1:8000",
    agent_id="sub_agent_merch0",
    hmac_secret="revive_sec_9912a7d4...",
    tenant_id="MERCH-001"
)

# 1. Fetch scoped context
context = client.get_opportunity_context("OPP-001")

# 2. Submit proposal
decision = client.submit_proposal(
    opportunity_id="OPP-001",
    customer_id="CUST-9821",
    action_type="SCHEDULE_MANDATE_RETRY",
    amount_paise=249900,
    estimated_recovery_probability=0.88,
    estimated_natural_recovery=0.10,
    reason="Mandate token verified"
)

if decision["status"] == "APPROVED":
    print(f"Action Contract issued: {decision['action_contract']['contract_id']}")
else:
    print(f"Action suppressed: {decision['reason_code']}")
```

---

## 🛡️ 6. Security Boundaries & Invariants

1. **Zero Raw Credentials for Agents**: AI agents never receive Razorpay API secrets or write access.
2. **Deterministic Governance**: Winning actions are selected strictly by Net Incremental Contribution (NIC) and safety policies.
3. **No Direct Gateway Bypass**: If an unauthorized agent attempts direct financial execution without a signed Action Contract, the Financial Gateway denies execution immediately with `BLOCKED: MISSING_ACTION_CONTRACT`.
