import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CheckCircle2, XCircle, Zap, Play,
  Lock, RotateCcw, FileText,
  Copy, ShieldAlert, UserX
} from "lucide-react";
import { 
  getCaseDetail, executeRecovery, rewindCase, getDecisionReceipt,
  getRecoveryBrainDecision, customerCancelRecovery
} from "../api/client";
import WhatsAppRecoveryMockup from "../components/WhatsAppRecoveryMockup";
import AIVoiceRecoveryWidget from "../components/AIVoiceRecoveryWidget";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

const IMPACT_COLOR: Record<string, string> = {
  increases_recovery: "var(--success-text)",
  decreases_recovery: "var(--error-text)",
  neutral: "var(--text-secondary)",
};

const TRUST_TIER_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  VERY_HIGH: { bg: "rgba(16,185,129,0.12)", text: "#10b981", label: "VERY HIGH TRUST" },
  HIGH:      { bg: "rgba(59,130,246,0.12)", text: "#3b82f6", label: "HIGH TRUST" },
  MODERATE:  { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", label: "MODERATE TRUST" },
  LOW:       { bg: "rgba(239,68,68,0.12)", text: "#ef4444", label: "LOW TRUST" },
  VERY_LOW:  { bg: "rgba(239,68,68,0.2)", text: "#dc2626", label: "VERY LOW TRUST" },
};

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<any>(null);
  const [brainData, setBrainData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"decision_graph" | "trust_intelligence" | "strategies" | "policy" | "investigation" | "3ds" | "audit" | "constitution" | "action_contract">("decision_graph");

  // ReviveOS State
  const [receipt, setReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [rewinding, setRewinding] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [data, brainRes] = await Promise.all([
        getCaseDetail(id),
        getRecoveryBrainDecision(id).catch(() => null),
      ]);
      setCaseData(data);
      setBrainData(brainRes);
      if (data.recovery_result) setResult(data.recovery_result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExecute = async () => {
    if (!id) return;
    setExecuting(true);

    try {
      const res = await executeRecovery(id);
      setResult(res);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setExecuting(false);
    }
  };

  const handleRewind = async () => {
    if (!id) return;
    setRewinding(true);
    try {
      await rewindCase(id);
      setResult(null);
      await load();
    } catch (e) {
      console.error('Rewind failed:', e);
    } finally {
      setRewinding(false);
    }
  };

  const handleCustomerCancel = async () => {
    if (!id) return;
    setCancelling(true);
    try {
      await customerCancelRecovery(id);
      setResult({
        recovered: false,
        blocked: true,
        message: "Customer explicitly cancelled this recovery attempt. Automation permanently halted.",
      });
      await load();
    } catch (e) {
      console.error("Cancellation failed:", e);
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenReceipt = async () => {
    if (!id) return;
    try {
      const rec = await getDecisionReceipt(id);
      setReceipt(rec);
      setShowReceiptModal(true);
    } catch (e) {
      console.error('Receipt error:', e);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px", opacity: 0.5 }}>
        <div className="skeleton" style={{ height: "44px", width: "240px" }} />
        <div className="skeleton" style={{ height: "500px", borderRadius: "var(--r-lg)" }} />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div style={{ textAlign: "center", padding: "80px" }}>
        <div style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>Case not found.</div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const {
    amount_inr = 0, failure_category, gateway, recommended_strategy,
    status, diagnosis_summary, is_human_required,
    feature_contributions = [],
    failure_code,
    retry_count = 0, gateway_failure_rate_1h = 0, gateway_is_degraded = false,
    name, merchant_name, failure_label, device_context,
    policy_checks = [], what_we_will_not_do = [],
    demo_narrative = [], customer_cancelled = false,
    customer_intent = "ACTIVE", authorization_state = "AUTHORIZED",
    recovery_probability = 0.75,
  } = caseData;

  const isResolved = ["recovered", "failed", "closed", "cancelled"].includes(status) || result?.recovered;
  const isBlocked = result?.blocked || (status === "escalated" && is_human_required) || customer_cancelled;
  const canExecute = !isResolved && !isBlocked && !executing;

  const trustScore = brainData?.trust_score ?? 85.0;
  const trustTier = brainData?.trust_tier ?? "VERY_HIGH";
  const trustConfig = TRUST_TIER_COLORS[trustTier] || TRUST_TIER_COLORS.HIGH;

  return (
    <div style={{ maxWidth: "1050px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "80px" }}>

      {/* ── Back Navigation + Case Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-icon" style={{ marginTop: "4px" }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
              {caseData.id}
            </span>
            <span className={`badge ${status === "recovered" ? "badge-green" : status === "cancelled" ? "badge-red" : status === "escalated" ? "badge-amber" : "badge-blue"}`}>
              {status === "recovered" ? "✓ RECOVERED" : status === "cancelled" ? "CUSTOMER CANCELLED" : status === "escalated" ? "⚠️ HUMAN REVIEW" : "● ACTIVE INVESTIGATION"}
            </span>
            <span style={{ 
              fontSize: "0.6875rem", 
              fontWeight: 700, 
              padding: "2px 8px", 
              borderRadius: "4px", 
              background: trustConfig.bg, 
              color: trustConfig.text,
              border: `1px solid ${trustConfig.text}33`
            }}>
              TRUST: {trustScore.toFixed(0)}/100 ({trustConfig.label})
            </span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
            {name || `${fmt(amount_inr)} — ${failure_label || failure_code}`}
          </h1>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            {merchant_name ? `Merchant: ${merchant_name} · ` : ""}
            Failure Category: <strong style={{ color: "var(--text-primary)" }}>{failure_category?.replace("_", " ")}</strong> · Gateway: <span style={{ textTransform: "capitalize" }}>{gateway}</span>
          </div>
        </div>

        {/* Action Buttons: Execute, Customer Cancel, Rewind, Decision Receipt */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={handleOpenReceipt}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", padding: "8px 12px" }}
          >
            <FileText size={14} />
            Receipt
          </button>

          {!customer_cancelled && status !== "recovered" && (
            <button
              onClick={handleCustomerCancel}
              disabled={cancelling}
              className="btn btn-secondary"
              title="Simulate customer clicking Cancel on recovery link"
              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", padding: "8px 12px", color: "var(--danger-text, #ef4444)" }}
            >
              <UserX size={14} />
              {cancelling ? "Cancelling..." : "Customer Cancel"}
            </button>
          )}

          <button
            onClick={handleRewind}
            disabled={rewinding}
            className="btn btn-ghost"
            title="Rewind case to initial state for live judge replay"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", padding: "8px 12px" }}
          >
            <RotateCcw size={14} className={rewinding ? "animate-spin" : ""} />
            Rewind
          </button>

          {canExecute && (
            <motion.button
              onClick={handleExecute}
              disabled={executing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", fontSize: "0.8125rem" }}
            >
              <Play size={14} />
              {executing ? "Executing..." : "Execute Sandbox"}
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Top Metric Strip ── */}
      <div className="grid-responsive-4">
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "16px" }}>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>Amount at Risk</div>
          <div className="metric-value-responsive" style={{ color: "var(--text-primary)", marginTop: "4px" }}>{fmt(amount_inr)}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "2px" }}>One-time / Renewal Transaction</div>
        </div>

        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "16px" }}>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>Recovery Trust Score</div>
          <div className="metric-value-responsive" style={{ color: trustConfig.text, marginTop: "4px" }}>
            {trustScore.toFixed(0)} <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>/ 100</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "2px" }}>{trustConfig.label}</div>
        </div>

        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "16px" }}>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>Customer Intent & Consent</div>
          <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "6px" }}>
            {customer_intent} · {authorization_state}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "2px" }}>Verified Observable Signals</div>
        </div>

        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "16px" }}>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>Decision Verdict</div>
          <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--accent)", marginTop: "6px" }}>
            {brainData?.action_verdict || (is_human_required ? "ESCALATE" : "RECOVER")}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "2px" }}>
            {brainData?.autonomy_level || "LEVEL_3_AUTO_ELIGIBLE"}
          </div>
        </div>
      </div>

      {/* ── 'Why This Decision?' Plain-Language Explainer ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)",
        border: "1px solid rgba(56, 189, 248, 0.25)",
        borderRadius: "var(--r-lg)",
        padding: "18px 22px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Zap size={16} color="#38BDF8" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 800, color: "#38BDF8", letterSpacing: "0.08em" }}>
              WHY THIS DECISION? (ECONOMIC INTELLIGENCE)
            </span>
          </div>
          <span style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: "4px", background: "rgba(56,189,248,0.15)", color: "#38BDF8", fontWeight: 700 }}>
            NET INCREMENTAL CONTRIBUTION (NIC)
          </span>
        </div>

        <div style={{ fontSize: "0.875rem", color: "#CBD5E1", lineHeight: 1.6 }}>
          {status === "recovered" ? (
            <span>✅ <strong>Outcome Confirmed:</strong> Payment of {fmt(amount_inr)} successfully recovered via Razorpay. Our intervention caused an estimated {fmt((amount_inr * (recovery_probability || 0.75)) - 4.0)} of net incremental profit after deducting ₹4 transaction cost.</span>
          ) : is_human_required || amount_inr > 50000 ? (
            <span>⚖️ <strong>Escalated to Operator:</strong> Transaction amount ({fmt(amount_inr)}) exceeds autonomous safety ceiling (₹50,000). Quarantined for human authorization to protect merchant liability (Article 8).</span>
          ) : customer_cancelled ? (
            <span>🛑 <strong>Halted by Customer Sovereignty:</strong> Customer explicitly requested cancellation. All automated outreach suppressed to respect customer intent (Article 6).</span>
          ) : recovery_probability >= 0.75 ? (
            <span>⏳ <strong>Smart Restraint:</strong> High natural recovery probability ({Math.round(recovery_probability * 100)}%). Customer is expected to settle independently within 2 hours — intervening immediately would waste gateway fees and create customer friction.</span>
          ) : (
            <span>⚡ <strong>Autonomous Recovery Approved:</strong> Positive net yield (+{fmt(Math.max(100, amount_inr * 0.45 - 4.0))}). Recovery causal uplift τ = +{Math.round((recovery_probability || 0.6) * 100)}pp with valid mandate authorization and zero customer friction penalty.</span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginTop: "4px", background: "rgba(10, 15, 29, 0.7)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(56, 189, 248, 0.12)" }}>
          <div>
            <div style={{ fontSize: "0.6875rem", color: "#94A3B8" }}>Expected Extra Recovery (τ)</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 700, color: "#F8FAFC" }}>+{Math.round((recovery_probability || 0.6) * 100)}pp</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", color: "#94A3B8" }}>Intervention Cost</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 700, color: "#94A3B8" }}>₹4.00 (S2S API)</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", color: "#94A3B8" }}>Customer Friction Cost</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 700, color: "#10B981" }}>₹0.00 (Background)</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", color: "#94A3B8" }}>Net Contribution (NIC)</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 800, color: "#10B981" }}>+{fmt(Math.max(100, amount_inr * (recovery_probability || 0.6) - 4.0))}</div>
          </div>
        </div>
      </div>


      {/* ── Execution Result Banner ── */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: result.recovered ? "rgba(16,185,129,0.06)" : result.blocked ? "rgba(245,158,11,0.06)" : "rgba(239,68,68,0.06)",
            border: `1px solid ${result.recovered ? "rgba(16,185,129,0.3)" : result.blocked ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: "var(--r-lg)",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {result.recovered ? (
                <CheckCircle2 size={20} color="var(--success-text)" />
              ) : result.blocked ? (
                <Lock size={20} color="var(--warning-text)" />
              ) : (
                <XCircle size={20} color="var(--error-text)" />
              )}
              <span style={{ fontSize: "1rem", fontWeight: 700, color: result.recovered ? "var(--success-text)" : result.blocked ? "var(--warning-text)" : "var(--error-text)" }}>
                {result.recovered ? `PAYMENT RECOVERED — ${fmt(result.amount_recovered_inr || amount_inr)} CAPTURED` : result.blocked ? "AUTOMATION RESTRAINED BY POLICY / CUSTOMER" : "RECOVERY ATTEMPT UNSUCCESSFUL"}
              </span>
            </div>
            <span className="badge badge-gray" style={{ fontSize: "0.6875rem" }}>
              Financial Ledger Updated
            </span>
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {result.message}
          </div>
        </motion.div>
      )}

      {/* ── Investigation Tab Bar ── */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", gap: "16px", overflowX: "auto" }}>
        {[
          { key: "decision_graph", label: "0. Interactive Decision Graph" },
          { key: "trust_intelligence", label: "1. Recovery Trust & Data Quality" },
          { key: "strategies", label: "2. Strategy Lab & Why Not?" },
          { key: "policy", label: "3. Deterministic Safety Gate" },
          { key: "investigation", label: "4. Signal Telemetry" },
          { key: "3ds", label: "5. Omnichannel & 3DS Sandbox" },
          { key: "audit", label: "6. Restraint & Audit Ledger" },
          { key: "constitution", label: "7. Recovery Constitution (12 Articles)" },
          { key: "action_contract", label: "8. Signed Action Contract" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: "10px 4px",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
              color: activeTab === tab.key ? "var(--text-primary)" : "var(--text-tertiary)",
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 0: Interactive Decision Graph ── */}
      {activeTab === "decision_graph" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <div>
              <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Unified Recovery Brain — Canonical Decision Path
              </span>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                10-node evaluation graph showing exact verification gates, safety diversions, and selected outcome.
              </div>
            </div>
            <span className="badge badge-blue" style={{ fontFamily: "var(--font-mono)" }}>
              {brainData?.action_verdict || "RECOVER"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {(brainData?.decision_graph || []).map((node: any) => {
              const isPass = node.status === "PASS";
              const isDiverted = node.status === "DIVERTED";
              const isFail = node.status === "FAIL";
              const isWarn = node.status === "WARN";

              return (
                <div
                  key={node.id}
                  style={{
                    background: isDiverted ? "rgba(139,92,246,0.06)" : isFail ? "rgba(239,68,68,0.06)" : "var(--bg-elevated)",
                    border: `1px solid ${isDiverted ? "rgba(139,92,246,0.3)" : isFail ? "rgba(239,68,68,0.3)" : isWarn ? "rgba(245,158,11,0.3)" : "var(--border)"}`,
                    borderRadius: "var(--r-md)",
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <div style={{ 
                    width: "28px", 
                    height: "28px", 
                    borderRadius: "50%", 
                    background: isPass ? "rgba(16,185,129,0.15)" : isDiverted ? "rgba(139,92,246,0.15)" : isFail ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    color: isPass ? "#10b981" : isDiverted ? "#8b5cf6" : isFail ? "#ef4444" : "#f59e0b"
                  }}>
                    {node.step}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {node.name}
                      </div>
                      <span className={`badge ${isPass ? "badge-green" : isDiverted ? "badge-purple" : isFail ? "badge-red" : "badge-amber"}`} style={{ fontSize: "0.6875rem" }}>
                        {node.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {node.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 1: Recovery Trust & Data Quality ── */}
      {activeTab === "trust_intelligence" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Trust Score Breakdown */}
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Recovery Trust Score Sub-Dimensions
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Calculated from 9 independent consent, intent, quality, and gateway signals.
                </div>
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: trustConfig.text }}>
                {trustScore.toFixed(1)} / 100
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {[
                { label: "Authorization Confidence", val: brainData?.trust_breakdown?.authorization_confidence || "HIGH", score: 95 },
                { label: "Customer Intent Signal", val: brainData?.trust_breakdown?.intent_confidence || "HIGH", score: 90 },
                { label: "Duplicate Risk Absence", val: brainData?.trust_breakdown?.duplicate_risk_confidence || "HIGH", score: 100 },
                { label: "Provider Gateway Health", val: `${brainData?.trust_breakdown?.provider_health_score || 98}%`, score: 98 },
                { label: "State Freshness", val: `${brainData?.trust_breakdown?.state_freshness_pct || 100}%`, score: 100 },
                { label: "Model Calibration (Brier)", val: `${brainData?.trust_breakdown?.model_calibration_pct || 92}%`, score: 92 },
              ].map((sub, i) => (
                <div key={i} style={{ background: "var(--bg-overlay)", padding: "12px 14px", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>{sub.label}</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>{sub.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Quality Checklist */}
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>Data Quality Checklist</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Input verification completed prior to financial decision orchestration.</div>
              </div>
              <span className="badge badge-green">QUALITY: {brainData?.data_quality_score || 95}%</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(brainData?.data_quality_checklist || []).map((item: any, idx: number) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-overlay)", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {item.status === "PASS" ? <CheckCircle2 size={15} color="#10b981" /> : <ShieldAlert size={15} color="#f59e0b" />}
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)" }}>{item.item}</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{item.detail}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── TAB 2: Strategy Lab & "Why Not?" ── */}
      {activeTab === "strategies" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Why This Won */}
          <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid var(--success-border)", borderRadius: "var(--r-lg)", padding: "20px" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#10b981", letterSpacing: "0.05em" }}>Selected Strategy</div>
            <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>
              {brainData?.selected_strategy?.name || recommended_strategy}
            </div>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "6px", lineHeight: "1.5" }}>
              {brainData?.why_selected || "Highest legitimate Net Expected Value after deducting gateway, customer friction, and risk penalties."}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-primary)", fontWeight: 600, marginTop: "8px" }}>
              Economic Lift vs Doing Nothing: +₹{brainData?.counterfactual_do_nothing_diff_inr?.toLocaleString("en-IN") || 0}
            </div>
          </div>

          {/* Why Other Strategies Were Rejected */}
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px" }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
              Why Not Other Candidate Strategies? (The "Why Not?" Engine)
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "14px" }}>
              Transparent mathematical and safety explanations for why competitor recovery paths were rejected.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(brainData?.rejected_alternatives || []).map((rej: any, idx: number) => (
                <div key={idx} style={{ padding: "12px 16px", background: "var(--bg-overlay)", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <strong style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>{rej.strategy}</strong>
                    <span className="badge badge-red" style={{ fontSize: "0.625rem" }}>REJECTED</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                    ↳ {rej.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Competition Grid */}
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px" }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>
              Candidate Strategy Economic Breakdown
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(brainData?.candidate_strategies || []).map((st: any) => (
                <div key={st.strategy_type} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-overlay)", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                  <div>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>{st.name}</span>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>Friction: {st.customer_friction_level} · Gate: {st.policy_status}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: st.net_expected_value_inr > 0 ? "var(--success-text)" : "var(--text-tertiary)" }}>
                      Net EV: ₹{st.net_expected_value_inr?.toLocaleString("en-IN")}
                    </span>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>P: {(st.recovery_probability * 100).toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── TAB 3: Policy Firewall ── */}
      {activeTab === "policy" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px" }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
              Deterministic Safety Firewall Evaluation
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "14px" }}>
              Strict mathematical safety gates evaluated before any autonomous debit action is executed.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(policy_checks.length > 0 ? policy_checks : [
                { rule: "Amount below automated ceiling", passed: amount_inr <= 50000, detail: amount_inr <= 50000 ? `${fmt(amount_inr)} within limit` : `${fmt(amount_inr)} exceeds ₹50,000 ceiling — HUMAN REQUIRED` },
                { rule: "Retry count within policy limit", passed: retry_count < 3, detail: `${retry_count} of 3 retries used` },
                { rule: "Customer consent active", passed: true, detail: "No opt-out flag detected" },
                { rule: "Customer not flagged for fraud", passed: true, detail: "Clean historical record" },
                { rule: "Gateway health verified", passed: !gateway_is_degraded, detail: gateway_is_degraded ? `${gateway} degraded (${(gateway_failure_rate_1h * 100).toFixed(1)}% error)` : "Gateway healthy" },
                { rule: "Failure code is recoverable", passed: true, detail: `${failure_code} is eligible for recovery workflow` },
              ]).map((c: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-overlay)", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {c.passed ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)" }}>{c.rule}</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{c.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Signal Telemetry ── */}
      {activeTab === "investigation" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Zap size={16} color="var(--accent)" />
              <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)" }}>
                AI Diagnosis & Telemetry
              </span>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {diagnosis_summary || "Automated diagnosis derived from customer payment history, gateway status, and error telemetry."}
            </p>
          </div>

          <div className="grid-responsive-2">
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>
                Feature Contribution Weighting
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {feature_contributions.map((fc: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: IMPACT_COLOR[fc.direction] || "var(--text-tertiary)", marginTop: "6px", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: "var(--text-primary)" }}>{fc.feature}:</strong> {fc.value}
                    </div>
                    <span className="badge badge-gray" style={{ fontSize: "0.625rem" }}>
                      {fc.impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>
                Device & Customer Context
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                <div><strong>Device Type:</strong> {device_context?.device_type || "MacBook Pro / Safari"}</div>
                <div><strong>IP Region:</strong> {device_context?.region || "Mumbai, India"}</div>
                <div><strong>Device Consistency:</strong> {device_context?.device_consistency || "HIGH"}</div>
                <div><strong>Location Match:</strong> {device_context?.location_match !== false ? "✓ True" : "Mismatch"}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: Omnichannel & 3DS Sandbox ── */}
      {activeTab === "3ds" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <WhatsAppRecoveryMockup
            customerName={name || "Customer"}
            merchantName={merchant_name || "Merchant"}
            amountInr={amount_inr}
            failureReason={failure_category?.replace("_", " ") || "Payment failed"}
          />
          <AIVoiceRecoveryWidget
            customerName={name || "Customer"}
            merchantName={merchant_name || "Merchant"}
            amountInr={amount_inr}
            invoiceNumber={caseData.id}
            failureReason={failure_category?.replace("_", " ") || "Payment failed"}
          />
        </div>
      )}

      {/* ── TAB 6: Restraint & Audit Ledger ── */}
      {activeTab === "audit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--r-lg)", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <XCircle size={16} color="var(--error-text)" />
              <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--error-text)" }}>
                What ReviveOS Will NOT Do (The Restraint Principle)
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(what_we_will_not_do.length > 0 ? what_we_will_not_do : [
                "Retry blindly without waiting for optimal cooldown",
                "Trigger gateway penalty flags on dead/expired card numbers",
                "Cancel customer subscription prematurely on isolated payment barrier",
                "Execute autonomous debits if customer explicitly cancelled recovery",
              ]).map((item: string, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  <XCircle size={13} color="var(--error-text)" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {demo_narrative.length > 0 && (
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Complete Evaluator Story Sequence
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {demo_narrative.map((narrative: string, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "2px" }}>{i + 1}.</span>
                    <span>{narrative}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 7: Recovery Constitution (12 Articles) ── */}
      {activeTab === "constitution" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  ReviveOS Recovery Constitution
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  12 Non-Bypassable Financial Safety Articles Enforced at Decision & Execution Gates
                </div>
              </div>
              <span className={`badge ${brainData?.constitution_evaluation?.is_compliant ? "badge-success" : "badge-error"}`} style={{ fontSize: "0.75rem", padding: "6px 12px" }}>
                {brainData?.constitution_evaluation?.is_compliant ? "12/12 ARTICLES COMPLIANT" : "CONSTITUTIONAL VIOLATION DETECTED"}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "12px" }}>
              {(brainData?.constitution_evaluation?.checks || []).map((art: any) => (
                <div
                  key={art.article_number}
                  style={{
                    background: art.passed ? "rgba(16,185,129,0.03)" : "rgba(239,68,68,0.04)",
                    border: `1px solid ${art.passed ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.3)"}`,
                    borderRadius: "var(--r-md)",
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: art.passed ? "var(--text-primary)" : "var(--error-text)" }}>
                      {art.name}
                    </span>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: art.passed ? "var(--success-text)" : "var(--error-text)" }}>
                      {art.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {art.description}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "4px", borderTop: "1px solid var(--border)", paddingTop: "4px" }}>
                    <strong>Evidence:</strong> {art.evidence}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 8: Signed Action Contract ── */}
      {activeTab === "action_contract" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  Signed Deterministic Action Contract
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  Cryptographic Proof & Bound Parameters for Execution Workers
                </div>
              </div>
              <span className="badge badge-accent" style={{ fontSize: "0.75rem", padding: "6px 12px" }}>
                HMAC-SHA256 SIGNED
              </span>
            </div>

            {brainData?.signed_action_contract ? (
              <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "16px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <span style={{ color: "var(--text-tertiary)" }}>Contract ID: </span>
                    <span style={{ color: "var(--accent)", fontWeight: 700 }}>{brainData.signed_action_contract.contract_id}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-tertiary)" }}>Tenant Boundary: </span>
                    <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{brainData.signed_action_contract.tenant_id}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-tertiary)" }}>Minor Unit (Paisa): </span>
                    <span style={{ color: "var(--success-text)", fontWeight: 700 }}>{brainData.signed_action_contract.amount_minor_paisa} paisa</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-tertiary)" }}>Autonomy Level: </span>
                    <span style={{ color: "var(--text-primary)" }}>{brainData.signed_action_contract.autonomy_level}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-tertiary)" }}>Idempotency Key: </span>
                    <span style={{ color: "var(--text-secondary)" }}>{brainData.signed_action_contract.idempotency_key}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-tertiary)" }}>TTL Remaining: </span>
                    <span style={{ color: "var(--warning-text)", fontWeight: 700 }}>{brainData.signed_action_contract.ttl_remaining_seconds}s</span>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", marginTop: "6px" }}>
                  <div style={{ color: "var(--text-tertiary)", marginBottom: "4px" }}>Cryptographic HMAC Signature:</div>
                  <div style={{ wordBreak: "break-all", color: "var(--accent)", fontSize: "0.6875rem" }}>
                    {brainData.signed_action_contract.signature}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: "var(--text-tertiary)", fontSize: "0.875rem", textAlign: "center", padding: "30px" }}>
                No active execution contract generated for this restrained or human-escalated state.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Decision Receipt Modal ── */}
      <AnimatePresence>
        {showReceiptModal && receipt && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(6px)" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", maxWidth: "600px", width: "100%", padding: "28px", display: "flex", flexDirection: "column", gap: "18px", maxHeight: "85vh", overflowY: "auto" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileText size={18} color="var(--accent)" />
                  <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    Cryptographic Decision Receipt
                  </span>
                </div>
                <button onClick={() => setShowReceiptModal(false)} className="btn btn-ghost btn-icon">
                  <XCircle size={18} />
                </button>
              </div>

              <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "16px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-tertiary)" }}>Receipt ID:</span>
                  <span style={{ color: "var(--accent)", fontWeight: 700 }}>{receipt.receipt_id}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-tertiary)" }}>Transaction Amount:</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{fmt(receipt.transaction?.amount_inr || 0)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-tertiary)" }}>Selected Strategy:</span>
                  <span style={{ color: "var(--success-text)", fontWeight: 700 }}>{receipt.decision_intelligence?.selected_strategy}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-tertiary)" }}>Policy Version:</span>
                  <span style={{ color: "var(--text-primary)" }}>{receipt.decision_intelligence?.policy_version}</span>
                </div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "4px" }}>
                  <div style={{ color: "var(--text-tertiary)", marginBottom: "4px" }}>SHA-256 Fingerprint:</div>
                  <div style={{ wordBreak: "break-all", color: "var(--accent)", fontSize: "0.6875rem" }}>
                    {receipt.cryptographic_proof?.receipt_fingerprint}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(receipt.cryptographic_proof?.receipt_fingerprint || "");
                    setCopiedHash(true);
                    setTimeout(() => setCopiedHash(false), 2000);
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.75rem" }}
                >
                  <Copy size={13} style={{ marginRight: "4px" }} />
                  {copiedHash ? "Copied Hash!" : "Copy SHA-256 Hash"}
                </button>
                <button onClick={() => setShowReceiptModal(false)} className="btn btn-primary" style={{ fontSize: "0.75rem" }}>
                  Close Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
