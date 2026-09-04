import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Copy, Check, Zap, Bot, Shield, Play, RefreshCw,
  Send, CheckCircle2, Code2
} from "lucide-react";
import { useAppMode } from "../context/AppModeContext";
import {
  listAgents, submitAgentProposal,
  simulateAgentCollisionLive, simulateAgentBypassLive, API_BASE_URL,
  getRazorpayStatus
} from "../api/client";
import LiveRazorpayLinkModal from "../components/LiveRazorpayLinkModal";

export default function DeveloperHub() {
  const { isRealMode, currentMode } = useAppMode();
  const [activeLang, setActiveLang] = useState<"python" | "node" | "mcp" | "curl">("python");
  const [copiedCode, setCopiedCode] = useState(false);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [modalAmount, setModalAmount] = useState<number>(2499);
  const [modalCustomer, setModalCustomer] = useState<string>("Valued Customer");

  // Provider Status
  const [razorpayStatus, setRazorpayStatus] = useState<any>(null);

  // Live Agent Registry
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Playground state
  const [selectedAgentId, setSelectedAgentId] = useState<string>("sub_agent_default");
  const [actionType, setActionType] = useState<string>("SCHEDULE_MANDATE_RETRY");
  const [amountInr, setAmountInr] = useState<number>(2499);
  const [recoveryProb, setRecoveryProb] = useState<number>(0.88);
  const [customerName, setCustomerName] = useState<string>(isRealMode ? "Customer 1042" : "Enterprise Client");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [playgroundResult, setPlaygroundResult] = useState<any>(null);

  // Live Collision Test state
  const [runningCollision, setRunningCollision] = useState<boolean>(false);
  const [collisionResult, setCollisionResult] = useState<any>(null);

  // Adversarial Bypass Test state
  const [runningBypass, setRunningBypass] = useState<boolean>(false);
  const [bypassResult, setBypassResult] = useState<any>(null);

  const apiKey = razorpayStatus?.credentials?.key_id || "revive_ak_live_8f2a1c4e9b7d3f6a2e5c8b1d";

  const fetchAgents = async () => {
    try {
      setLoadingAgents(true);
      const res = await listAgents();
      // Strict deduplication by agent_name and agent_type so duplicates never render
      const seen = new Set<string>();
      const deduped: any[] = [];
      for (const ag of res || []) {
        const key = `${ag.agent_name}::${ag.agent_type}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(ag);
        }
      }
      setAgents(deduped);
      if (deduped.length > 0 && !selectedAgentId) {
        setSelectedAgentId(deduped[0].agent_id);
      }
    } catch (e) {
      console.error("Failed to load agents:", e);
    } finally {
      setLoadingAgents(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    getRazorpayStatus().then(st => setRazorpayStatus(st)).catch(() => null);
  }, [currentMode, isRealMode]);

  const handlePlaygroundSubmit = async () => {
    setIsSubmitting(true);
    setPlaygroundResult(null);
    try {
      const res = await submitAgentProposal({
        protocol_version: "v1",
        agent_id: selectedAgentId,
        opportunity_id: isRealMode ? "OPP-LIVE-PROPOSAL" : "OPP-SIM-001",
        customer_id: isRealMode ? "CUST-LIVE-01" : "CUST-9821",
        customer_name: customerName,
        proposed_action: {
          type: actionType,
          amount_paise: Math.round(amountInr * 100),
          channel: "RAZORPAY",
        },
        estimated_recovery_probability: recoveryProb,
        estimated_natural_recovery: 0.10,
        estimated_cost_paise: 400,
        reason: `Autonomous Agent Playground proposal submission via Developer Hub (${currentMode})`,
      });
      setPlaygroundResult(res);
      fetchAgents();
    } catch (e: any) {
      setPlaygroundResult({
        status: "ERROR",
        error: e.response?.data?.detail || e.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunCollisionTest = async () => {
    setRunningCollision(true);
    setCollisionResult(null);
    try {
      const res = await simulateAgentCollisionLive();
      setCollisionResult(res);
      fetchAgents();
    } catch (e) {
      console.error("Collision simulation failed:", e);
    } finally {
      setRunningCollision(false);
    }
  };

  const handleRunBypassTest = async () => {
    setRunningBypass(true);
    setBypassResult(null);
    try {
      const res = await simulateAgentBypassLive();
      setBypassResult(res);
    } catch (e) {
      console.error("Bypass test failed:", e);
    } finally {
      setRunningBypass(false);
    }
  };

  const codeSnippets = {
    python: `# Install SDK: pip install reviveos-sdk requests
from reviveos_sdk import ReviveOSAgentClient

client = ReviveOSAgentClient(
    base_url="${API_BASE_URL || 'http://localhost:8000'}",
    agent_id="sub_agent_merch0",
    hmac_secret="revive_sec_9912a7d4...",
    tenant_id="MERCH-001"
)

# 1. Fetch scoped context (non-PII)
context = client.get_opportunity_context("OPP-001")

# 2. Submit proposal for ReviveOS arbitration
decision = client.submit_proposal(
    opportunity_id="OPP-001",
    customer_id="CUST-1042",
    customer_name="Enterprise Client",
    action_type="SCHEDULE_MANDATE_RETRY",
    amount_paise=249900,
    estimated_recovery_probability=0.88,
    estimated_natural_recovery=0.10,
    reason="Active recurring mandate token on file."
)

if decision["status"] == "APPROVED":
    print(f"Action Contract issued: {decision['action_contract']['contract_id']}")
    print(f"Contract TTL: {decision['action_contract']['ttl_remaining_seconds']}s")
else:
    print(f"Action suppressed: {decision['reason_code']}")`,

    node: `// Node.js Agent Integration with HMAC-SHA256 Request Signing
import crypto from 'crypto';
import axios from 'axios';

const AGENT_ID = 'cart_agent_merch0';
const HMAC_SECRET = 'revive_sec_cart_2026';
const BASE_URL = '${API_BASE_URL || 'http://localhost:8000'}';

async function submitRecoveryProposal() {
  const payload = {
    protocol_version: 'v1',
    agent_id: AGENT_ID,
    opportunity_id: 'OPP-001',
    customer_id: 'CUST-1042',
    customer_name: 'Customer 1042',
    proposed_action: { type: 'SEND_PAYMENT_LINK', amount_paise: 499900 },
    estimated_recovery_probability: 0.45,
    reason: 'Checkout abandoned at OTP step'
  };

  const rawBody = JSON.stringify(payload);
  const timestamp = (Date.now() / 1000).toString();
  const requestId = 'req_' + crypto.randomBytes(6).toString('hex');
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

  // Compute canonical HMAC-SHA256 signature
  const canonical = \`\${AGENT_ID}:\${timestamp}:\${requestId}:\${payloadHash}\`;
  const signature = crypto.createHmac('sha256', HMAC_SECRET).update(canonical).digest('hex');

  const { data: decision } = await axios.post(\`\${BASE_URL}/api/agents/proposals\`, rawBody, {
    headers: {
      'Content-Type': 'application/json',
      'X-ReviveOS-Agent-ID': AGENT_ID,
      'X-ReviveOS-Timestamp': timestamp,
      'X-ReviveOS-Request-ID': requestId,
      'X-ReviveOS-Signature': signature,
      'X-ReviveOS-Protocol-Version': 'v1'
    }
  });

  console.log('ReviveOS Decision:', decision.status, decision.plain_language_reason);
}`,

    mcp: `// Model Context Protocol (MCP) Tool Declaration for LLM Agents
// Compatible with LangChain, AutoGen, CrewAI, and Model Context Protocol servers
{
  "name": "reviveos_submit_recovery_proposal",
  "description": "Submit an autonomous recovery proposal to ReviveOS. Returns decision receipt and signed Action Contract if approved.",
  "parameters": {
    "type": "object",
    "properties": {
      "opportunity_id": { "type": "string", "example": "OPP-001" },
      "customer_id": { "type": "string", "example": "CUST-1042" },
      "action_type": {
        "type": "string",
        "enum": ["SCHEDULE_MANDATE_RETRY", "SEND_PAYMENT_LINK", "OFFER_10PCT_DISCOUNT", "SEND_INVOICE_REMINDER", "DELIBERATE_ABSTENTION"]
      },
      "amount_paise": { "type": "integer", "example": 249900 },
      "estimated_recovery_probability": { "type": "number", "minimum": 0.0, "maximum": 1.0, "example": 0.88 },
      "reason": { "type": "string", "example": "Recurring mandate token on file." }
    },
    "required": ["opportunity_id", "customer_id", "action_type", "amount_paise"]
  }
}`,

    curl: `# 1. Submit an authenticated recovery proposal via cURL
curl -X POST ${API_BASE_URL || 'http://localhost:8000'}/api/agents/proposals \\
  -H "Content-Type: application/json" \\
  -H "X-ReviveOS-Agent-ID: sub_agent_merch0" \\
  -H "X-ReviveOS-API-Key: ${apiKey}" \\
  -H "X-ReviveOS-Protocol-Version: v1" \\
  -d '{
    "protocol_version": "v1",
    "opportunity_id": "OPP-001",
    "customer_id": "CUST-1042",
    "customer_name": "Customer 1042",
    "proposed_action": {
      "type": "SCHEDULE_MANDATE_RETRY",
      "amount_paise": 249900,
      "channel": "RAZORPAY_SUBSCRIPTION"
    },
    "estimated_recovery_probability": 0.88,
    "estimated_natural_recovery": 0.10,
    "reason": "Verified mandate token on file."
  }'`
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "80px" }}>
      
      {/* Live Payment Link Modal */}
      <LiveRazorpayLinkModal isOpen={showLiveModal} onClose={() => setShowLiveModal(false)} defaultAmount={modalAmount} customerName={modalCustomer} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
            <span className="badge badge-purple" style={{ fontSize: "0.6875rem", fontWeight: 700 }}>
              AGENT INTEROPERABILITY & GOVERNANCE GATEWAY
            </span>
            <span style={{
              fontSize: "0.6875rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              padding: "2px 8px",
              borderRadius: "4px",
              background: razorpayStatus?.connected || razorpayStatus?.razorpay_configured ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.1)",
              color: razorpayStatus?.connected || razorpayStatus?.razorpay_configured ? "#10B981" : "#94A3B8",
              border: `1px solid ${razorpayStatus?.connected || razorpayStatus?.razorpay_configured ? "rgba(16, 185, 129, 0.3)" : "rgba(148, 163, 184, 0.2)"}`
            }}>
              {razorpayStatus?.connected || razorpayStatus?.razorpay_configured ? "● RAZORPAY LIVE RAILS: CONNECTED" : isRealMode ? "○ RAZORPAY: UNCONFIGURED" : "● RAZORPAY: SYNTHETIC HARNESS"}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
              Protocol v1 • HMAC-SHA256 Signed Proposals • Model Context Protocol (MCP)
            </span>
          </div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", margin: 0 }}>
            Developer Hub: Multi-Agent Protocol & Registry
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", marginTop: "6px", maxWidth: "800px", lineHeight: 1.6 }}>
            ReviveOS is the central <strong>Revenue Recovery Governance Gateway</strong>. Autonomous agents (Subscription, Cart, Invoice, Retention, LangChain/MCP) submit signed proposals for policy checks, attention budget allocation, and Net Incremental Contribution (NIC) arbitration.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => {
              setModalAmount(amountInr || 2499);
              setModalCustomer(customerName || "Valued Customer");
              setShowLiveModal(true);
            }}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #00F0FF 0%, #0099FF 100%)",
              color: "#040711",
              fontFamily: "var(--font-section-heading)",
              fontSize: "12px",
              fontWeight: 800,
              cursor: "pointer",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 16px rgba(0, 240, 255, 0.35)",
            }}
          >
            <Zap size={14} />
            <span>⚡ TEST REAL RAZORPAY LINK</span>
          </button>
        </div>
      </div>

      {/* ── 1. CONNECTED AGENTS REGISTRY TABLE ───────────────────────────── */}
      <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "16px", padding: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={16} color="#818CF8" />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#A5B4FC", letterSpacing: "0.1em" }}>
                REGISTERED AUTONOMOUS RECOVERY AGENTS
              </div>
              <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                Live participating recovery agents governed by ReviveOS Protocol v1
              </div>
            </div>
          </div>

          <button
            onClick={fetchAgents}
            disabled={loadingAgents}
            className="btn btn-secondary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}
          >
            <RefreshCw size={12} className={loadingAgents ? "spin" : ""} />
            Refresh Registry
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1E2230", color: "#64748B", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                <th style={{ padding: "10px" }}>AGENT ID / NAME</th>
                <th style={{ padding: "10px" }}>TYPE</th>
                <th style={{ padding: "10px" }}>INTEGRATION</th>
                <th style={{ padding: "10px" }}>CAPABILITIES</th>
                <th style={{ padding: "10px" }}>STATUS</th>
                <th style={{ padding: "10px" }}>TRUST SCORE</th>
                <th style={{ padding: "10px", textAlign: "right" }}>PROPOSALS</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((ag) => (
                <tr key={ag.agent_id} style={{ borderBottom: "1px solid #141721" }}>
                  <td style={{ padding: "12px 10px" }}>
                    <div style={{ fontWeight: 700, color: "#F8FAFC" }}>{ag.agent_name}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#64748B" }}>{ag.agent_id}</div>
                  </td>
                  <td style={{ padding: "12px 10px", fontFamily: "var(--font-mono)", fontSize: "11px", color: "#94A3B8" }}>
                    {ag.agent_type}
                  </td>
                  <td style={{ padding: "12px 10px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "rgba(56, 189, 248, 0.12)", color: "#38BDF8", fontWeight: 700 }}>
                      {ag.integration_type}
                    </span>
                  </td>
                  <td style={{ padding: "12px 10px" }}>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {ag.capabilities?.map((c: string) => (
                        <span key={c} style={{ fontSize: "9px", fontFamily: "var(--font-mono)", padding: "1px 6px", borderRadius: "3px", background: "#1E2230", color: "#CBD5E1" }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "12px 10px" }}>
                    <span style={{
                      fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "4px", fontFamily: "var(--font-mono)",
                      background: (ag.status === "TRUSTED" || ag.status === "ACTIVE") ? "rgba(16,185,129,0.15)" : ag.status === "PROBATION" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                      color: (ag.status === "TRUSTED" || ag.status === "ACTIVE") ? "#10B981" : ag.status === "PROBATION" ? "#F59E0B" : "#EF4444",
                    }}>
                      {ag.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color: ag.trust_score >= 85 ? "#10B981" : "#F59E0B" }}>
                        {ag.trust_score?.toFixed(1)}/100
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 10px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                    <span style={{ color: "#10B981", fontWeight: 700 }}>{ag.approved_proposals || 0}</span>
                    <span style={{ color: "#64748B" }}> / {ag.total_proposals || 0}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2. LIVE SANDBOXES: 3-AGENT COLLISION & ADVERSARIAL BYPASS ─────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        
        {/* Box A: 3-Agent Real Collision Test */}
        <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "16px", padding: "22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Zap size={16} color="#00F0FF" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#00F0FF", letterSpacing: "0.1em" }}>
                LIVE 3-AGENT COLLISION TEST
              </span>
            </div>
            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#10B981", background: "rgba(16,185,129,0.15)", padding: "2px 8px", borderRadius: "4px" }}>
              HTTP API TEST
            </span>
          </div>

          <p style={{ fontSize: "12px", color: "#94A3B8", margin: 0, lineHeight: 1.5 }}>
            Fires 3 simultaneous real HTTP requests from <strong>Subscription Agent</strong> (₹2,499 mandate), <strong>Cart Recovery Bot</strong> (WhatsApp link), and <strong>Retention Agent</strong> (10% discount) to <code>POST /api/agents/proposals</code>.
          </p>

          <button
            onClick={handleRunCollisionTest}
            disabled={runningCollision}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "12px", padding: "10px" }}
          >
            {runningCollision ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
            {runningCollision ? "Executing 3 Agent Requests..." : "⚡ Run Real 3-Agent Collision Test"}
          </button>

          {collisionResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ background: "#0F1117", border: "1px solid #10B981", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "#10B981" }}>🏆 WINNER: {collisionResult.winning_agent}</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "#94A3B8" }}>Contract: {collisionResult.winning_decision?.action_contract?.contract_id}</span>
              </div>
              <div style={{ color: "#CBD5E1", lineHeight: 1.4 }}>{collisionResult.governance_summary}</div>
              <div style={{ borderTop: "1px solid #1E2230", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ color: "#EF4444", fontWeight: 700 }}>Suppression Receipts Issued:</div>
                {collisionResult.suppressed_agents?.map((s: any) => (
                  <div key={s.agent_id} style={{ fontFamily: "var(--font-mono)", color: "#94A3B8", fontSize: "10px" }}>
                    • <strong>{s.agent_id}</strong>: {s.status} ({s.reason})
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Box B: Adversarial Bypass Test */}
        <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "16px", padding: "22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Shield size={16} color="#EF4444" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#EF4444", letterSpacing: "0.1em" }}>
                ADVERSARIAL BYPASS SANDBOX
              </span>
            </div>
            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#EF4444", background: "rgba(239,68,68,0.15)", padding: "2px 8px", borderRadius: "4px" }}>
              SECURITY FIREWALL
            </span>
          </div>

          <p style={{ fontSize: "12px", color: "#94A3B8", margin: 0, lineHeight: 1.5 }}>
            Demonstrates zero-bypass security: Unregistered rogue agent attempts direct financial execution without a signed Action Contract vs authorized agent following the protocol.
          </p>

          <button
            onClick={handleRunBypassTest}
            disabled={runningBypass}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "12px", padding: "10px", borderColor: "#EF4444", color: "#FCA5A5" }}
          >
            {runningBypass ? <RefreshCw size={14} className="spin" /> : <Shield size={14} color="#EF4444" />}
            {runningBypass ? "Simulating Bypass Attack..." : "🛡️ Test Adversarial Bypass Defense"}
          </button>

          {bypassResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ background: "#0F1117", border: "1px solid #EF4444", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#EF4444", fontWeight: 700 }}>
                <CheckCircle2 size={14} color="#EF4444" />
                BYPASS BLOCKED: {bypassResult.bypass_test?.financial_gateway_verdict}
              </div>
              <div style={{ color: "#CBD5E1", lineHeight: 1.4 }}>
                Reason: {bypassResult.bypass_test?.blocking_reason}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#10B981" }}>
                Authorized Agent: {bypassResult.authorized_governance_test?.decision} (Contract: {bypassResult.authorized_governance_test?.action_contract_id})
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── 3. INTERACTIVE AGENT PROPOSAL PLAYGROUND ────────────────────── */}
      <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "16px", padding: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Code2 size={16} color="#00F0FF" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#00F0FF", letterSpacing: "0.1em" }}>
            INTERACTIVE AGENT PROPOSAL PLAYGROUND
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "11px", color: "#94A3B8", display: "block", marginBottom: "6px" }}>Proposing Agent</label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              style={{ width: "100%", padding: "8px", background: "#0F1117", border: "1px solid #1E2230", color: "#FFF", borderRadius: "8px", fontSize: "12px" }}
            >
              {agents.map((a) => (
                <option key={a.agent_id} value={a.agent_id}>{a.agent_name} ({a.agent_id})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "11px", color: "#94A3B8", display: "block", marginBottom: "6px" }}>Proposed Recovery Action</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              style={{ width: "100%", padding: "8px", background: "#0F1117", border: "1px solid #1E2230", color: "#FFF", borderRadius: "8px", fontSize: "12px" }}
            >
              <option value="SCHEDULE_MANDATE_RETRY">SCHEDULE_MANDATE_RETRY (₹4 cost)</option>
              <option value="SEND_PAYMENT_LINK">SEND_PAYMENT_LINK (WhatsApp/SMS)</option>
              <option value="OFFER_10PCT_DISCOUNT">OFFER_10PCT_DISCOUNT (Destroys margin)</option>
              <option value="SEND_INVOICE_REMINDER">SEND_INVOICE_REMINDER (B2B)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "11px", color: "#94A3B8", display: "block", marginBottom: "6px" }}>Target Customer</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Enterprise Client / Customer 1042"
              style={{ width: "100%", padding: "8px", background: "#0F1117", border: "1px solid #1E2230", color: "#FFF", borderRadius: "8px", fontSize: "12px" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "11px", color: "#94A3B8", display: "block", marginBottom: "6px" }}>Amount (₹ INR)</label>
            <input
              type="number"
              value={amountInr}
              onChange={(e) => setAmountInr(Number(e.target.value))}
              style={{ width: "100%", padding: "8px", background: "#0F1117", border: "1px solid #1E2230", color: "#FFF", borderRadius: "8px", fontSize: "12px" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "11px", color: "#94A3B8", display: "block", marginBottom: "6px" }}>Est. Recovery Prob (0–1)</label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={recoveryProb}
              onChange={(e) => setRecoveryProb(Number(e.target.value))}
              style={{ width: "100%", padding: "8px", background: "#0F1117", border: "1px solid #1E2230", color: "#FFF", borderRadius: "8px", fontSize: "12px" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handlePlaygroundSubmit}
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", padding: "8px 20px" }}
          >
            {isSubmitting ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
            {isSubmitting ? "Evaluating..." : "Submit Real Proposal to Gateway"}
          </button>
        </div>

        {playgroundResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "#08090C",
              border: `1px solid ${playgroundResult.status === "APPROVED" ? "#10B981" : "#EF4444"}`,
              borderRadius: "10px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 800, color: playgroundResult.status === "APPROVED" ? "#10B981" : "#EF4444" }}>
                DECISION: {playgroundResult.status} ({playgroundResult.reason_code || "REASON"})
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#64748B" }}>
                ID: {playgroundResult.decision_id || "N/A"}
              </span>
            </div>

            <div style={{ fontSize: "12px", color: "#CBD5E1" }}>
              {playgroundResult.plain_language_reason || playgroundResult.error}
            </div>

            {playgroundResult.action_contract && (
              <div style={{ background: "#0F1117", border: "1px solid #1E2230", borderRadius: "8px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#00F0FF", fontWeight: 700 }}>
                    SIGNED ACTION CONTRACT ISSUED: {playgroundResult.action_contract.contract_id}
                  </div>
                  <button
                    onClick={() => {
                      setModalAmount(playgroundResult.action_contract.amount_inr || amountInr || 2499);
                      setModalCustomer(customerName || "Valued Customer");
                      setShowLiveModal(true);
                    }}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "6px",
                      background: "rgba(0, 240, 255, 0.15)",
                      border: "1px solid #00F0FF",
                      color: "#00F0FF",
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Zap size={11} />
                    <span>⚡ EXECUTE ON LIVE RAZORPAY RAILS</span>
                  </button>
                </div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                  Amount: <strong>₹{playgroundResult.action_contract.amount_inr}</strong> • Strategy: <strong>{playgroundResult.action_contract.strategy_type}</strong> • TTL: <strong>{playgroundResult.action_contract.ttl_remaining_seconds}s</strong>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#64748B", wordBreak: "break-all" }}>
                  HMAC: {playgroundResult.action_contract.signature}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ── 4. CODE SNIPPETS & MCP SCHEMAS ──────────────────────────────── */}
      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", background: "var(--bg-base)", borderBottom: "1px solid var(--border)", padding: "10px 18px" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { id: "python", label: "Python SDK (ReviveOSAgentClient)" },
              { id: "node", label: "Node.js (HMAC Canonical Signing)" },
              { id: "mcp", label: "🤖 Agent Protocol (MCP JSON Schema)" },
              { id: "curl", label: "cURL HTTP API" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveLang(tab.id as any)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: activeLang === tab.id ? "rgba(0, 240, 255, 0.15)" : "transparent",
                  color: activeLang === tab.id ? "#00F0FF" : "var(--text-tertiary)",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(codeSnippets[activeLang]);
              setCopiedCode(true);
              setTimeout(() => setCopiedCode(false), 2000);
            }}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: "0.6875rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            {copiedCode ? <Check size={12} color="var(--success-text)" /> : <Copy size={12} />}
            {copiedCode ? "Copied" : "Copy Code"}
          </button>
        </div>

        <div style={{ padding: "20px 24px", background: "#08090a", overflowX: "auto" }}>
          <pre style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "#e2e8f0", lineHeight: 1.6 }}>
            {codeSnippets[activeLang]}
          </pre>
        </div>
      </div>
    </div>
  );
}
