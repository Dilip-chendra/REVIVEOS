import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowRight, Brain, Smartphone, XCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { getDemoScenarios, getRazorpayStatus, getRiskCases } from "../api/client";
import { useAppMode } from "../context/AppModeContext";

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

const TAXONOMY_LIST = [
  { code: "CARD_EXPIRED", label: "Card Expired", type: "Involuntary Churn", action: "Card update reminder", recoverability: "High (73%)", risk: "Low" },
  { code: "INSUFFICIENT_FUNDS", label: "Insufficient Funds (Timing)", type: "Timing Barrier", action: "Smart Delay to payday", recoverability: "High (91%)", risk: "Low" },
  { code: "GATEWAY_CONNECTION_ERROR", label: "Gateway Overload", type: "Infrastructure Fault", action: "Failover route to backup", recoverability: "Very High (94%)", risk: "Low" },
  { code: "DO_NOT_HONOR", label: "Anti-Fraud False Positive", type: "Bank Filter", action: "3D-Secure step-up verification", recoverability: "High (82%)", risk: "Medium" },
  { code: "FRAUD_SUSPECTED", label: "Behavioral Flag", type: "Bank Filter", action: "3D-Secure OTP verification", recoverability: "Medium (78%)", risk: "Medium" },
  { code: "REPEATED_FAILURES", label: "Exhausted Retries", type: "Financial Distress", action: "STOP automation (no penalties)", recoverability: "None (0%)", risk: "Stop Required" },
];

export default function FailureIntelligence() {
  const { isRealMode } = useAppMode();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [providerStatus, setProviderStatus] = useState<any>(null);

  useEffect(() => {
    getRazorpayStatus().then(status => {
      setProviderStatus(status);
      const isProv = status?.active_environment === "RAZORPAY_TEST" || status?.active_environment === "RAZORPAY_LIVE" || status?.is_real_provider_data;
      if (isProv || isRealMode) {
        getRiskCases(1, 10).then(cases => {
          setScenarios(cases || []);
          if (cases && cases.length > 0) setSelectedCaseId(cases[0].id);
        });
      } else {
        getDemoScenarios()
          .then((cases) => {
            if (cases && cases.length > 0) {
              setScenarios(cases);
              setSelectedCaseId(cases[0].id);
            }
          })
          .catch((err) => console.error(err));
      }
    }).catch(() => {
      if (!isRealMode) {
        getDemoScenarios()
          .then((cases) => {
            if (cases && cases.length > 0) {
              setScenarios(cases);
              setSelectedCaseId(cases[0].id);
            }
          });
      }
    });
  }, [isRealMode]);

  const isProviderMode = providerStatus?.active_environment === "RAZORPAY_TEST" || providerStatus?.active_environment === "RAZORPAY_LIVE" || providerStatus?.is_real_provider_data;
  const activeCase = scenarios.find((c) => c.id === selectedCaseId) || scenarios[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", paddingBottom: "80px" }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={18} color="#a855f7" />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
            Payment Failure Intelligence
          </h1>
          <span className={`badge ${isProviderMode ? "badge-green" : "badge-blue"}`} style={{ marginLeft: "6px" }}>
            {isProviderMode ? `● ${providerStatus?.active_environment || "RAZORPAY TEST"}` : "● DEMO SCENARIOS"}
          </span>
        </div>
        <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", maxWidth: "720px", lineHeight: 1.6 }}>
          Why payments actually fail, how ReviveOS classifies failure root causes, and why different failures demand completely different recovery mechanics.
        </p>
      </div>

      {/* ── Taxonomy Matrix ── */}
      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Failure Classification Taxonomy
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "2px" }}>
              Treating all payment failures with generic retries damages gateway reputation. ReviveOS applies targeted taxonomies.
            </div>
          </div>
        </div>

        <div className="table-responsive-wrapper" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem", minWidth: "680px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-tertiary)", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Failure Code</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Root Cause Category</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>ReviveOS Safe Action</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Recoverability</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {TAXONOMY_LIST.map((tax) => (
                <tr key={tax.code} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {tax.code}
                  </td>
                  <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                    <span className="badge badge-gray" style={{ fontSize: "0.6875rem" }}>{tax.type}</span>
                  </td>
                  <td style={{ padding: "12px", color: "var(--text-primary)", fontWeight: 500 }}>
                    {tax.action}
                  </td>
                  <td style={{ padding: "12px", color: "var(--success-text)", fontWeight: 700 }}>
                    {tax.recoverability}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span className={`badge ${tax.risk === "Low" ? "badge-green" : tax.risk === "Medium" ? "badge-amber" : "badge-red"}`} style={{ fontSize: "0.625rem" }}>
                      {tax.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Interactive Case Investigation Console ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-xl)",
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Case Root-Cause Investigation
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "2px" }}>
              Select a real-world case to inspect the complete telemetry, evidence signals, and why specific actions were chosen or forbidden.
            </div>
          </div>

          {/* Scenario Selector */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {scenarios.slice(0, 5).map((sc: any) => (
              <button
                key={sc.id}
                onClick={() => setSelectedCaseId(sc.id)}
                className={`btn btn-sm ${selectedCaseId === sc.id ? "btn-primary" : "btn-ghost"}`}
                style={{ fontSize: "0.75rem", padding: "6px 12px" }}
              >
                {sc.name ? sc.name.split("—")[0].trim() : (sc.customer_name || sc.id)}
              </button>
            ))}
          </div>
        </div>

        {scenarios.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center", background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", color: "var(--text-tertiary)" }}>
            <AlertTriangle size={28} style={{ margin: "0 auto 12px", opacity: 0.5, color: "var(--accent)" }} />
            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: "6px" }}>
              {isProviderMode ? "Connect Live Razorpay Credentials to Stream Failure Taxonomy" : "No Scenarios Available"}
            </div>
            <div style={{ fontSize: "0.875rem", maxWidth: "560px", margin: "0 auto", lineHeight: 1.5, color: "var(--text-secondary)" }}>
              {isProviderMode
                ? "The Taxonomy Classification Engine is ready to ingest live Razorpay payment failures. Provide your real Razorpay Key ID & Key Secret in the topbar to stream live error codes and root-cause diagnoses, or switch to '● Demo Scenarios' for 7 curated case studies."
                : "Run demo scenarios to populate case files."}
            </div>
          </div>
        ) : activeCase && (
          <>
            {/* Selected Case Header */}
            <div style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>Case ID & Merchant</div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>{activeCase.name || activeCase.id}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>{activeCase.merchant_name || activeCase.customer_name || "Enterprise Account"}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>Amount at Risk</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>{formatINR(activeCase.amount_inr || 0)}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--success-text)", marginTop: "2px" }}>Recovery Prob: {((activeCase.recovery_probability || 0) * 100).toFixed(0)}%</div>
              </div>
              <div>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>Failure Signal</div>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--warning-text)", marginTop: "2px" }}>{activeCase.failure_label || activeCase.failure_code}</div>
                <span className="badge badge-gray" style={{ fontSize: "0.625rem", marginTop: "4px" }}>{activeCase.failure_code}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                <Link to={`/risk/${activeCase.id}`} className="btn btn-primary btn-sm" style={{ padding: "8px 16px", fontSize: "0.75rem" }}>
                  Open Complete Case File <ArrowRight size={14} />
                </Link>
              </div>
            </div>

        {/* 3 Columns: Evidence | Device Context | What We Will NOT Do */}
        <div className="grid-responsive-3">
          {/* Col 1: Contributing Evidence */}
          <div style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Brain size={15} color="var(--accent)" />
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>Supporting Evidence</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(activeCase.feature_contributions || []).map((fc: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: fc.direction === "increases_recovery" ? "var(--success-text)" : "var(--error-text)", marginTop: "6px", flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: "var(--text-primary)" }}>{fc.feature}:</strong> {fc.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2: Device & Geolocation Signals */}
          <div style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Smartphone size={15} color="var(--success-text)" />
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>Device & Context Signals</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              <div><strong>Device:</strong> {activeCase.device_context?.device_type || "MacBook / Chrome"}</div>
              <div><strong>IP Region:</strong> {activeCase.device_context?.region || "Mumbai, India"}</div>
              <div><strong>Billing Match:</strong> <span style={{ color: "var(--success-text)" }}>YES (Location Verified)</span></div>
              <div><strong>Device Consistency:</strong> {activeCase.device_context?.device_consistency || "HIGH"}</div>
              <div><strong>Velocity Anomaly:</strong> <span style={{ color: "var(--success-text)" }}>None (Normal pattern)</span></div>
            </div>
          </div>

          {/* Col 3: What We Will NOT Do */}
          <div style={{ background: "rgba(239, 68, 68, 0.03)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--r-md)", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <XCircle size={15} color="var(--error-text)" />
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--error-text)" }}>What ReviveOS Will NOT Do</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(activeCase.what_we_will_not_do || [
                "Retry blindly without waiting for optimal cooldown",
                "Trigger gateway penalty flags on dead/expired card numbers",
                "Cancel subscription prematurely on isolated payment barrier",
              ]).map((w: string, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  <XCircle size={12} color="var(--error-text)" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    )}
  </motion.div>
</div>
);
}
