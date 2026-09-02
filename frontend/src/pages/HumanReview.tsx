import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getHumanQueue, approveCase, rejectCase, customerCancelRecovery, getRazorpayStatus } from "../api/client";
import { CheckCircle2, XCircle, RefreshCw, Clock, ChevronRight, UserX } from "lucide-react";
import { Link } from "react-router-dom";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

const STRATEGY_EXPLAIN: Record<string, string> = {
  escalate: "High-value transaction — requires human authorization",
  stop:     "Policy engine enforced stopping rule — needs manual override",
  retry:    "AI recommends retry but human review required for safety",
  route_switch: "Gateway switch flagged for manual validation",
};

export default function HumanReview() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, "approved" | "rejected" | "cancelled" | "error">>({});
  const [outcomes, setOutcomes] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [providerStatus, setProviderStatus] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, pStatus] = await Promise.all([
        getHumanQueue(),
        getRazorpayStatus().catch(() => null)
      ]);
      setCases(data);
      setProviderStatus(pStatus);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isProviderMode = providerStatus?.active_environment === "RAZORPAY_TEST" || providerStatus?.active_environment === "RAZORPAY_LIVE" || providerStatus?.is_real_provider_data;

  const handleApprove = async (c: any) => {
    setActing(c.id);
    try {
      const res = await approveCase(c.id, notes[c.id] || "");
      setResults(prev => ({ ...prev, [c.id]: "approved" }));
      setOutcomes(prev => ({ ...prev, [c.id]: res }));
      setCases(prev => prev.map(x => x.id === c.id ? { ...x, status: res.status, recovery_result: res.recovery_result } : x));
    } catch (e) {
      setResults(prev => ({ ...prev, [c.id]: "error" }));
    } finally { setActing(null); }
  };

  const handleReject = async (c: any) => {
    setActing(c.id);
    try {
      const res = await rejectCase(c.id, notes[c.id] || "");
      setResults(prev => ({ ...prev, [c.id]: "rejected" }));
      setOutcomes(prev => ({ ...prev, [c.id]: res }));
      setCases(prev => prev.map(x => x.id === c.id ? { ...x, status: "closed" } : x));
    } catch (e) {
      setResults(prev => ({ ...prev, [c.id]: "error" }));
    } finally { setActing(null); }
  };

  const handleCustomerCancel = async (c: any) => {
    setActing(c.id);
    try {
      await customerCancelRecovery(c.id);
      setResults(prev => ({ ...prev, [c.id]: "cancelled" }));
      setOutcomes(prev => ({
        ...prev,
        [c.id]: {
          status: "cancelled",
          recovery_result: {
            recovered: false,
            blocked: true,
            message: "Customer explicitly cancelled this recovery attempt. Automation permanently halted.",
          }
        }
      }));
      setCases(prev => prev.map(x => x.id === c.id ? { ...x, status: "cancelled", customer_cancelled: true, customer_intent: "CANCELLED" } : x));
    } catch (e) {
      setResults(prev => ({ ...prev, [c.id]: "error" }));
    } finally { setActing(null); }
  };

  const totalAtRisk = cases.reduce((s, c) => s + (c.amount_inr || 0), 0);
  const pending = cases.filter(c => !results[c.id]);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", opacity: 0.5 }}>
      <div className="skeleton" style={{ height: "44px", width: "240px" }} />
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: "200px", borderRadius: "var(--r-lg)" }} />)}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "64px", maxWidth: "960px", margin: "0 auto" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>Needs Attention & Multi-Party Review</div>
            <span className={`badge ${isProviderMode ? "badge-green" : "badge-blue"}`}>
              {isProviderMode ? `● ${providerStatus?.active_environment || "RAZORPAY TEST"}` : "● DEMO SCENARIOS"}
            </span>
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Transactions exceeding ₹50,000, unverified customer consent, or policy violations held for human sign-off.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", padding: "10px 18px", borderRadius: "var(--r-md)", textAlign: "right" }}>
            <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pending Review</div>
            <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>{fmt(totalAtRisk)} · {pending.length} cases</div>
          </div>
          <button onClick={load} className="btn btn-secondary btn-icon">
            <RefreshCw size={14} />
          </button>
        </div>
      </motion.div>

      {cases.length === 0 ? (
        <div style={{ padding: "80px 24px", textAlign: "center", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", color: "var(--text-tertiary)" }}>
          <CheckCircle2 size={32} style={{ margin: "0 auto 12px", opacity: 0.5, color: isProviderMode ? "#10B981" : "var(--accent)" }} />
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: "6px" }}>
            {isProviderMode ? "No High-Value Escalations in Active Live Stream" : "Queue is empty"}
          </div>
          <div style={{ fontSize: "0.875rem", maxWidth: "560px", margin: "0 auto", lineHeight: 1.5, color: "var(--text-secondary)" }}>
            {isProviderMode
              ? "Transactions exceeding the ₹50,000 policy ceiling or flagged by risk rules will automatically route here for multi-party review."
              : "All demo cases have been reviewed. Reset demo scenarios in the topbar to reload."}
          </div>
        </div>
      ) : (
        cases.map((c, i) => {
          const actionResult = results[c.id];
          const outcome = outcomes[c.id];
          const isActing = acting === c.id;
          const alreadyActed = !!actionResult;

          return (
            <motion.div key={c.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: "var(--bg-elevated)", border: `1px solid ${alreadyActed ? (actionResult === "approved" && outcome?.recovery_result?.recovered ? "var(--success-border)" : actionResult === "cancelled" ? "var(--danger-border)" : "var(--border)") : "var(--border)"}`, borderRadius: "var(--r-lg)", overflow: "hidden" }}>

              {/* Top stripe */}
              <div style={{ height: "3px", background: alreadyActed ? (actionResult === "approved" && outcome?.recovery_result?.recovered ? "#10b981" : actionResult === "cancelled" ? "#ef4444" : "var(--border)") : "#f59e0b" }} />

              <div style={{ padding: "clamp(16px, 3vw, 28px)" }}>

                {/* Case Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                      {!alreadyActed && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b", animation: "pulse 2s infinite" }} />}
                      <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--text-tertiary)" }}>#{c.id.slice(0, 10)}</span>
                      <span className={`badge ${alreadyActed ? (actionResult === "cancelled" ? "badge-red" : actionResult === "rejected" ? "badge-neutral" : outcome?.recovery_result?.recovered ? "badge-green" : "badge-red") : "badge-amber"}`}>
                        {alreadyActed ? (actionResult === "cancelled" ? "Customer Cancelled" : actionResult === "rejected" ? "Rejected" : outcome?.recovery_result?.recovered ? "Recovered" : "Action Taken") : "Awaiting Review"}
                      </span>
                      {c.authorization_state && (
                        <span className="badge badge-neutral" style={{ fontSize: "0.6875rem" }}>
                          AUTH: {c.authorization_state}
                        </span>
                      )}
                      {c.customer_intent && (
                        <span className={`badge ${c.customer_intent === "CANCELLED" ? "badge-red" : c.customer_intent === "UNKNOWN" ? "badge-amber" : "badge-blue"}`} style={{ fontSize: "0.6875rem" }}>
                          INTENT: {c.customer_intent}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Clock size={14} color="var(--text-tertiary)" />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                        {c.failure_category?.replace(/_/g, " ")} · {c.payment_method} · {c.gateway}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1 }}>{fmt(c.amount_inr)}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "2px" }}>amount at risk</div>
                  </div>
                </div>

                {/* Outcome Banner */}
                <AnimatePresence>
                  {alreadyActed && outcome && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0 }}
                      style={{ marginBottom: "20px", padding: "16px 20px", borderRadius: "var(--r-md)", background: outcome.recovery_result?.recovered ? "rgba(16,185,129,0.08)" : actionResult === "cancelled" ? "rgba(239,68,68,0.08)" : "var(--bg-overlay)", border: `1px solid ${outcome.recovery_result?.recovered ? "var(--success-border)" : actionResult === "cancelled" ? "var(--danger-border)" : "var(--border)"}`, display: "flex", alignItems: "center", gap: "12px" }}>
                      {outcome.recovery_result?.recovered ? <CheckCircle2 size={18} color="#10b981" /> : actionResult === "cancelled" ? <UserX size={18} color="#ef4444" /> : <XCircle size={18} color="var(--text-tertiary)" />}
                      <div>
                        <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {outcome.recovery_result?.recovered
                            ? `✓ Recovery Successful — ${fmt(outcome.recovery_result?.amount_recovered_inr || c.amount_inr)} Captured`
                            : actionResult === "cancelled"
                            ? "Customer Cancelled — Automation Permanently Stopped"
                            : "Case closed by operator"}
                        </div>
                        <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                          {outcome.recovery_result?.message}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Case Details Grid */}
                <div className="grid-responsive-3" style={{ marginBottom: "20px" }}>

                  <div style={{ background: "var(--bg-overlay)", padding: "14px 16px", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Why Escalated</div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--text-primary)", lineHeight: 1.4 }}>
                      {c.amount_inr > 50000 
                        ? `Amount (₹${c.amount_inr?.toLocaleString("en-IN")}) exceeds ₹50,000 automated policy ceiling.`
                        : STRATEGY_EXPLAIN[c.recommended_strategy] || c.diagnosis_summary || "Requires human review"}
                    </div>
                  </div>

                  <div style={{ background: "var(--bg-overlay)", padding: "14px 16px", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Customer Consent & Intent</div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--text-primary)", lineHeight: 1.4 }}>
                      Auth: <strong>{c.authorization_state || "AUTHORIZED"}</strong> · Intent: <strong>{c.customer_intent || "ACTIVE"}</strong>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                      {c.amount_inr > 50000 ? "Valid auth, but human approval required by fiduciary policy." : "Consent verified."}
                    </div>
                  </div>

                  <div style={{ background: "var(--bg-overlay)", padding: "14px 16px", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Recovery Potential</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: c.recovery_probability > 0.5 ? "#10b981" : "#f59e0b" }}>
                      {((c.recovery_probability || 0) * 100).toFixed(0)}%
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                      ≈ {fmt(c.expected_recovery_value_inr || c.amount_inr * c.recovery_probability)}
                    </div>
                  </div>
                </div>

                {/* Action Row */}
                {!alreadyActed ? (
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      type="text"
                      placeholder="Add review note (optional)..."
                      value={notes[c.id] || ""}
                      onChange={e => setNotes(prev => ({ ...prev, [c.id]: e.target.value }))}
                      style={{ flex: "1 1 200px", background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "10px 14px", color: "var(--text-primary)", fontSize: "0.875rem", outline: "none" }}
                    />
                    <button onClick={() => handleCustomerCancel(c)} disabled={isActing} className="btn btn-secondary btn-sm"
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", color: "var(--danger-text, #ef4444)" }} title="Customer clicked Cancel on recovery link">
                      <UserX size={14} /> Customer Cancel
                    </button>
                    <button onClick={() => handleReject(c)} disabled={isActing} className="btn btn-secondary btn-sm"
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}>
                      <XCircle size={15} /> Reject
                    </button>
                    <button onClick={() => handleApprove(c)} disabled={isActing} className="btn btn-primary btn-sm"
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 18px" }}>
                      {isActing ? <><RefreshCw size={13} className="spin" /> Processing...</> : <><CheckCircle2 size={15} /> Approve Recovery</>}
                    </button>
                    <Link to={`/case/${c.id}`} className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Full Case <ChevronRight size={12} />
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Link to={`/case/${c.id}`} className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      View Full Case <ChevronRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
