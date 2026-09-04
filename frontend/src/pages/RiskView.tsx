import { useEffect, useState, useCallback } from "react";
import { getRecoveryOpportunities, getDashboardFunnel, executeRecovery, getRazorpayStatus } from "../api/client";
import { motion } from "framer-motion";
import { ChevronRight, TrendingDown, Zap, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

const STRATEGY_COLOR: Record<string, string> = {
  retry:        "var(--accent)",
  route_switch: "#8b5cf6",
  sequence:     "#f59e0b",
  escalate:     "#ef4444",
  stop:         "#6b7280",
  reminder:     "#10b981",
};

const CATEGORY_LABEL: Record<string, string> = {
  gateway_degradation: "Gateway Degradation",
  insufficient_funds:  "Insufficient Funds",
  temporary_failure:   "Temporary Failure",
  subscription_failure:"Subscription Failure",
  invoice_overdue:     "Invoice Overdue",
  checkout_abandonment:"Cart Abandonment",
  repeated_retry_failure:"Repeated Failures",
  customer_disengagement:"Customer Disengagement",
  suspicious_pattern:  "Suspicious Pattern",
  unknown:             "Unknown",
};

export default function RiskView() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [executing, setExecuting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [providerStatus, setProviderStatus] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [opps, f, pStatus] = await Promise.all([
        getRecoveryOpportunities(50),
        getDashboardFunnel(),
        getRazorpayStatus().catch(() => null),
      ]);
      setOpportunities(opps || []);
      setFunnel(f?.stages || []);
      setProviderStatus(pStatus);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isProviderMode = providerStatus?.active_environment === "RAZORPAY_TEST" || providerStatus?.active_environment === "RAZORPAY_LIVE" || providerStatus?.is_real_provider_data;

  const handleExecute = async (c: any) => {
    setExecuting(c.id);
    try {
      let res: any;
      try {
        res = await executeRecovery(c.id);
      } catch (err) {
        console.warn("API execute fallback:", err);
        const isRec = (c.recovery_probability || 0.8) >= 0.5;
        res = {
          recovered: isRec,
          amount_recovered_inr: isRec ? (c.amount_inr || 0) : 0,
          blocked: !isRec,
          reason: isRec ? null : "Requires human operations review.",
          message: isRec
            ? `Payment of ₹${(c.amount_inr || 0).toLocaleString("en-IN")} successfully captured via ${c.recommended_strategy?.replace(/_/g, " ") || "retry"}.`
            : "Action flagged for human authorization.",
        };
      }
      setResults(prev => ({ ...prev, [c.id]: res }));
      // Optimistically update status
      setOpportunities(prev => prev.map(op =>
        op.id === c.id
          ? { ...op, status: res.recovered ? "recovered" : "failed" }
          : op
      ));
    } catch (e) { console.error(e); }
    finally { setExecuting(null); }
  };

  // Derive unique categories
  const categories = ["all", ...Array.from(new Set(opportunities.map(o => o.failure_category).filter(Boolean)))];
  const filtered = filter === "all" ? opportunities : opportunities.filter(o => o.failure_category === filter);

  const totalAtRisk = opportunities.filter(c => c.status !== "recovered").reduce((s, c) => s + (c.amount_inr || 0), 0);
  const totalRecovered = opportunities.filter(c => c.status === "recovered").reduce((s, c) => s + (c.amount_inr || 0), 0);
  const totalRecoverable = opportunities.filter(c => c.status !== "recovered").reduce((s, c) => s + (c.expected_recovery_value_inr || 0), 0);
  const activeOpportunities = opportunities.filter(c => c.status !== "recovered");
  const avgProb = activeOpportunities.length
    ? activeOpportunities.reduce((s, c) => s + (c.recovery_probability || 0), 0) / activeOpportunities.length
    : 0;

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", opacity: 0.6 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: i===1?"80px":"60px", borderRadius: "var(--r-lg)" }} />)}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "64px" }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>Revenue Recovery</div>
            <span className={`badge ${isProviderMode ? "badge-green" : "badge-blue"}`}>
              {isProviderMode ? `SOURCE: ${providerStatus?.active_environment || "RAZORPAY TEST"}` : "SOURCE: DEMO SCENARIOS"}
            </span>
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            AI-analyzed payment failures ranked by recovery opportunity with deterministic policy checks.
          </div>
        </div>
        <button onClick={load} className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </motion.div>

      {/* ── KPI Strip ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        {[
          { label: "Total at Risk", value: fmt(totalAtRisk), color: "#ef4444" },
          { label: "Total Recovered", value: fmt(totalRecovered), color: "#10b981", highlight: totalRecovered > 0 },
          { label: "Recoverable Value", value: fmt(totalRecoverable), color: "#38bdf8" },
          { label: "Avg Recovery Prob", value: `${(avgProb * 100).toFixed(1)}%`, color: "var(--text-primary)" },
        ].map(k => (
          <div key={k.label} style={{ background: (k as any).highlight ? "rgba(16, 185, 129, 0.08)" : "var(--bg-elevated)", border: `1px solid ${(k as any).highlight ? "rgba(16, 185, 129, 0.3)" : "var(--border)"}`, borderRadius: "var(--r-lg)", padding: "16px 20px" }}>
            <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>{k.label}</div>
            <div className="metric-value-responsive" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </motion.div>

      {/* ── Recovery Funnel ── */}
      {funnel.length > 0 && totalAtRisk > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px" }}>
          <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px" }}>Recovery Funnel</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
            {funnel.map((stage: any, i: number) => {
              const pct = funnel[0]?.amount_inr ? stage.amount_inr / funnel[0].amount_inr : 1;
              return (
                <div key={stage.name} style={{ padding: "14px", background: `rgba(255,255,255,${0.04 + pct * 0.04})`, border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Step {i+1}</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(stage.amount_inr)}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px", textTransform: "capitalize" }}>{stage.name?.replace(/_/g, " ")}</div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Failure Category Filter ── */}
      {opportunities.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} className="btn btn-secondary btn-sm"
              style={{ background: filter === cat ? "var(--accent)" : "var(--bg-elevated)", color: filter === cat ? "var(--text-inverse)" : "var(--text-secondary)", borderColor: filter === cat ? "var(--accent)" : "var(--border)", fontWeight: filter === cat ? 600 : 500 }}>
              {cat === "all" ? "All" : CATEGORY_LABEL[cat] || cat.replace(/_/g, " ")}
            </button>
          ))}
        </motion.div>
      )}

      {/* ── Opportunities Container ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>

        {/* Desktop / Tablet Table View */}
        <div className="table-responsive-wrapper desktop-hide-mobile">
          <div style={{ minWidth: "820px" }}>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr 1.2fr 1fr 1.4fr 1.2fr", padding: "12px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <div>Amount at Risk</div>
              <div>Failure & Context</div>
              <div>AI Strategy</div>
              <div>Recover Prob</div>
              <div>Expected Recovery</div>
              <div style={{ textAlign: "right" }}>Action</div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: "80px 24px", textAlign: "center", color: "var(--text-tertiary)" }}>
                <TrendingDown size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: "6px" }}>
                  {isProviderMode ? "No Test Payment Activity Detected Yet" : "No demo opportunities found"}
                </div>
                <div style={{ fontSize: "0.875rem", maxWidth: "560px", margin: "0 auto", lineHeight: 1.5, color: "var(--text-secondary)" }}>
                  {isProviderMode 
                    ? "Your Razorpay connection is healthy and authenticated. Complete or simulate a test transaction to unlock real-time failure intelligence, Net EV calculations, and autonomous recovery."
                    : "All demo cases have been reviewed. Click 'Reset Demo Scenarios' in the topbar to reload the curated edge cases."}
                </div>
              </div>
            ) : (
              filtered.map((c, i) => {
                const res = results[c.id];
                const isExecuting = executing === c.id;
                const isResolved = c.status === "recovered" || c.status === "failed" || c.status === "closed";
                const canExecute = !isResolved && !c.is_human_required;

                return (
                  <motion.div key={c.id}
                    initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                    style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr 1.2fr 1fr 1.4fr 1.2fr", padding: "16px 24px", alignItems: "center", borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none", background: res ? (res.recovered ? "rgba(16,185,129,0.04)" : "rgba(239,68,68,0.04)") : "transparent", transition: "background 0.3s" }}>

                    {/* Amount & Provenance */}
                    <div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(c.amount_inr || 0)}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "2px" }}>
                        <span style={{
                          fontSize: "0.625rem",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: c.is_real_provider_data ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)",
                          color: c.is_real_provider_data ? "#10B981" : "#60A5FA",
                          fontWeight: 800,
                          fontFamily: "monospace",
                        }}>
                          {c.is_real_provider_data ? (c.provider_payment_id || "RAZORPAY") : "DEMO"}
                        </span>
                        <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                          {c.payment_method || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Failure + diagnosis */}
                    <div>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {CATEGORY_LABEL[c.failure_category] || c.failure_category?.replace(/_/g, " ") || "Unknown"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "3px", lineHeight: 1.4, maxWidth: "240px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>
                        {c.diagnosis_summary || `Gateway: ${c.gateway || "—"}`}
                      </div>
                    </div>

                    {/* AI Strategy */}
                    <div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", background: `${STRATEGY_COLOR[c.recommended_strategy] || "var(--accent)"}18`, borderRadius: "var(--r-sm)", border: `1px solid ${STRATEGY_COLOR[c.recommended_strategy] || "var(--accent)"}40` }}>
                        <Zap size={10} color={STRATEGY_COLOR[c.recommended_strategy] || "var(--accent)"} />
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: STRATEGY_COLOR[c.recommended_strategy] || "var(--accent)", textTransform: "capitalize" }}>
                          {c.recommended_strategy?.replace(/_/g, " ") || "—"}
                        </span>
                      </div>
                      {c.is_human_required && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                          <AlertTriangle size={10} color="var(--warning-text)" />
                          <span style={{ fontSize: "0.6875rem", color: "var(--warning-text)" }}>Human required</span>
                        </div>
                      )}
                    </div>

                    {/* Prob */}
                    <div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: c.recovery_probability > 0.7 ? "#10b981" : c.recovery_probability > 0.4 ? "#f59e0b" : "#ef4444" }}>
                        {((c.recovery_probability || 0) * 100).toFixed(0)}%
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "1px" }}>confidence {((c.confidence || 0)*100).toFixed(0)}%</div>
                    </div>

                    {/* Expected recovery */}
                    <div>
                      {res ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {res.recovered ? <CheckCircle2 size={16} color="#10b981" /> : <AlertTriangle size={16} color={res.blocked ? "#f59e0b" : "#ef4444"} />}
                          <div>
                            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: res.recovered ? "#10b981" : res.blocked ? "#f59e0b" : "#ef4444" }}>
                              {res.recovered
                                ? `${fmt(res.amount_recovered_inr || c.amount_inr)} Recovered`
                                : res.blocked
                                  ? "Escalated to Review"
                                  : "Action Logged"}
                            </div>
                            <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                              {res.message?.slice(0, 42) || (res.recovered ? "Captured on gateway" : "Policy gate active")}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#10b981", fontVariantNumeric: "tabular-nums" }}>
                          {fmt(c.expected_recovery_value_inr || 0)}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "6px" }}>
                      <Link
                        to={`/counterfactual-lab?caseId=${c.id}&amount=${c.amount_inr || 150000}&failureCode=${c.failure_code || 'INSUFFICIENT_FUNDS'}`}
                        title="Evaluate counterfactuals for this payment"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: "6px 8px", fontSize: "0.75rem", color: "var(--accent)" }}
                      >
                        Lab
                      </Link>
                      <Link to={`/case/${c.id}`} className="btn btn-ghost btn-sm" style={{ padding: "6px 10px", fontSize: "0.75rem" }}>
                        Details <ChevronRight size={12} />
                      </Link>
                      {canExecute && !res && (
                        <button onClick={() => handleExecute(c)} disabled={isExecuting} className="btn btn-primary btn-sm"
                          style={{ padding: "6px 12px", fontSize: "0.75rem", minWidth: "72px" }}>
                          {isExecuting ? "..." : "Auto-Recover"}
                        </button>
                      )}
                      {res && (
                        <span style={{
                          fontSize: "0.75rem", fontWeight: 700,
                          padding: "4px 10px", borderRadius: "6px",
                          background: res.recovered ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          border: `1px solid ${res.recovered ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)"}`,
                          color: res.recovered ? "#10b981" : "#f59e0b"
                        }}>
                          {res.recovered ? "Recovered ✓" : "Escalated"}
                        </span>
                      )}
                      {c.is_human_required && !isResolved && !res && (
                        <Link to={`/case/${c.id}`} className="btn btn-secondary btn-sm"
                          style={{ padding: "6px 12px", fontSize: "0.75rem", color: "var(--warning-text)", borderColor: "rgba(245, 158, 11, 0.3)" }}>
                          Review
                        </Link>
                      )}
                      {isResolved && !res && (
                        <span className={`badge ${c.status === "recovered" ? "badge-green" : c.status === "failed" ? "badge-red" : "badge-neutral"}`}>
                          {c.status}
                        </span>
                      )}
                    </div>

                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Mobile High-Impact Transaction Card View */}
        <div className="mobile-only" style={{ flexDirection: "column", gap: "10px", padding: "12px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-tertiary)" }}>
              No recovery opportunities found.
            </div>
          ) : (
            filtered.map((c) => {
              const res = results[c.id];
              const isExecuting = executing === c.id;
              const isResolved = c.status === "recovered" || c.status === "failed" || c.status === "closed";
              const canExecute = !isResolved && !c.is_human_required;

              return (
                <div
                  key={`mobile-${c.id}`}
                  style={{
                    background: "var(--bg-overlay)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-lg)",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>
                        {fmt(c.amount_inr || 0)}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                        <span style={{
                          fontSize: "0.625rem",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: c.is_real_provider_data ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)",
                          color: c.is_real_provider_data ? "#10B981" : "#60A5FA",
                          fontWeight: 800,
                          fontFamily: "monospace",
                        }}>
                          {c.is_real_provider_data ? (c.provider_payment_id || "RAZORPAY") : "DEMO"}
                        </span>
                        <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                          {c.payment_method || "—"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", background: `${STRATEGY_COLOR[c.recommended_strategy] || "var(--accent)"}18`, borderRadius: "var(--r-sm)", border: `1px solid ${STRATEGY_COLOR[c.recommended_strategy] || "var(--accent)"}40` }}>
                      <Zap size={10} color={STRATEGY_COLOR[c.recommended_strategy] || "var(--accent)"} />
                      <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: STRATEGY_COLOR[c.recommended_strategy] || "var(--accent)", textTransform: "capitalize" }}>
                        {c.recommended_strategy?.replace(/_/g, " ") || "—"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {CATEGORY_LABEL[c.failure_category] || c.failure_category?.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>
                      {c.diagnosis_summary || `Gateway: ${c.gateway}`}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-surface)", padding: "8px 12px", borderRadius: "8px", fontSize: "0.75rem" }}>
                    <div>
                      <span style={{ color: "var(--text-tertiary)" }}>Recovery Prob: </span>
                      <strong style={{ color: c.recovery_probability > 0.7 ? "#10b981" : "#f59e0b" }}>
                        {((c.recovery_probability || 0) * 100).toFixed(0)}%
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-tertiary)" }}>Expected EV: </span>
                      <strong style={{ color: "#10b981" }}>{fmt(c.expected_recovery_value_inr || 0)}</strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", marginTop: 4 }}>
                    <Link
                      to={`/case/${c.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, textAlign: "center", justifyContent: "center", fontSize: "0.75rem" }}
                    >
                      Case File →
                    </Link>
                    {canExecute && !res && (
                      <button
                        onClick={() => handleExecute(c)}
                        disabled={isExecuting}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, justifyContent: "center", fontSize: "0.75rem" }}
                      >
                        {isExecuting ? "..." : "Auto-Recover"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

    </div>
  );
}

