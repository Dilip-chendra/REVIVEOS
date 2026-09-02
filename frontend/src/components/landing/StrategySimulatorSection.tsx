import React, { useState } from "react";
import { motion } from "framer-motion";

const CASES = [
  {
    id: "A",
    label: "SaaS Subscription Failure",
    amount: "₹4,999",
    type: "MANDATE_FAILURE",
    naturalP: 21,
    intent: "ACTIVE",
    strategies: [
      { name: "MANDATE_RETRY", pNat: 21, pInt: 63, lift: 42, nic: 3480, friction: "None", risk: "Low", verdict: "WINNER" },
      { name: "PAYMENT_LINK", pNat: 21, pInt: 58, lift: 37, nic: 2920, friction: "Medium", risk: "Low", verdict: "VIABLE" },
      { name: "CUSTOMER_PROMPT", pNat: 21, pInt: 45, lift: 24, nic: 1800, friction: "Medium", risk: "Low", verdict: "VIABLE" },
      { name: "HUMAN_ESCALATION", pNat: 21, pInt: 52, lift: 31, nic: 1200, friction: "High", risk: "Medium", verdict: "VIABLE" },
      { name: "WAIT", pNat: 21, pInt: 21, lift: 0, nic: 0, friction: "None", risk: "None", verdict: "SUPPRESSED" },
      { name: "DISCOUNT", pNat: 21, pInt: 65, lift: 44, nic: -450, friction: "Medium", risk: "Medium", verdict: "SUPPRESSED" },
      { name: "DO_NOT_INTERVENE", pNat: 21, pInt: 0, lift: -21, nic: -1050, friction: "None", risk: "None", verdict: "BLOCKED" },
    ],
    winner: "MANDATE_RETRY",
    rationale: "Highest risk-adjusted NIC (+₹3,480). Silent S2S execution preserves full margin with zero customer friction. DISCOUNT suppressed despite higher gross lift due to negative NIC after margin cost.",
  },
  {
    id: "B",
    label: "Transient Network Error",
    amount: "₹1,200",
    type: "GATEWAY_TIMEOUT",
    naturalP: 88,
    intent: "ACTIVE",
    strategies: [
      { name: "WAIT", pNat: 88, pInt: 90, lift: 2, nic: 0, friction: "None", risk: "None", verdict: "WINNER" },
      { name: "MANDATE_RETRY", pNat: 88, pInt: 92, lift: 4, nic: -2, friction: "None", risk: "Low", verdict: "SUPPRESSED" },
      { name: "PAYMENT_LINK", pNat: 88, pInt: 91, lift: 3, nic: -8, friction: "Medium", risk: "Low", verdict: "SUPPRESSED" },
      { name: "DISCOUNT", pNat: 88, pInt: 93, lift: 5, nic: -158, friction: "Medium", risk: "Medium", verdict: "SUPPRESSED" },
      { name: "CUSTOMER_PROMPT", pNat: 88, pInt: 90, lift: 2, nic: -3, friction: "Medium", risk: "Low", verdict: "SUPPRESSED" },
      { name: "HUMAN_ESCALATION", pNat: 88, pInt: 89, lift: 1, nic: -22, friction: "High", risk: "Low", verdict: "SUPPRESSED" },
      { name: "DO_NOT_INTERVENE", pNat: 88, pInt: 0, lift: -88, nic: -1056, friction: "None", risk: "None", verdict: "BLOCKED" },
    ],
    winner: "WAIT",
    rationale: "Natural recovery probability is 88%. No intervention creates meaningful incremental value above cost. Deliberate WAIT preserves ₹0 discount cost, ₹0 API cost, and zero customer attention burn.",
  },
  {
    id: "C",
    label: "Enterprise Invoice Overdue",
    amount: "₹85,000",
    type: "INVOICE_OVERDUE",
    naturalP: 42,
    intent: "AMBIGUOUS",
    strategies: [
      { name: "HUMAN_ESCALATION", pNat: 42, pInt: 71, lift: 29, nic: 18900, friction: "High", risk: "Low", verdict: "WINNER" },
      { name: "PAYMENT_LINK", pNat: 42, pInt: 58, lift: 16, nic: 13580, friction: "Medium", risk: "Low", verdict: "VIABLE" },
      { name: "CUSTOMER_PROMPT", pNat: 42, pInt: 55, lift: 13, nic: 10990, friction: "Medium", risk: "Low", verdict: "VIABLE" },
      { name: "MANDATE_RETRY", pNat: 42, pInt: 43, lift: 1, nic: 796, friction: "None", risk: "Medium", verdict: "SUPPRESSED" },
      { name: "WAIT", pNat: 42, pInt: 42, lift: 0, nic: 0, friction: "None", risk: "None", verdict: "SUPPRESSED" },
      { name: "DISCOUNT", pNat: 42, pInt: 72, lift: 30, nic: -2300, friction: "Medium", risk: "Medium", verdict: "SUPPRESSED" },
      { name: "DO_NOT_INTERVENE", pNat: 42, pInt: 0, lift: -42, nic: -35700, friction: "None", risk: "None", verdict: "BLOCKED" },
    ],
    winner: "HUMAN_ESCALATION",
    rationale: "High-value B2B invoice requires relationship-based follow-up. AMBIGUOUS customer intent and the ₹85K amount require human judgment. Mandate retry unsuitable for invoice type. DISCOUNT suppressed due to negative NIC after ₹12,750 margin cost.",
  },
];

const VERDICT_COLOR: Record<string, string> = {
  WINNER: "#00FF66",
  VIABLE: "#00F0FF",
  SUPPRESSED: "#F59E0B",
  BLOCKED: "#FF3B30",
};

export const StrategySimulatorSection: React.FC = () => {
  const [activeCase, setActiveCase] = useState(0);
  const caseData = CASES[activeCase];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", width: "100%" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "0.8125rem", color: "#00FF66", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: "12px" }}>
          7-STRATEGY MULTI-ACTION EVALUATOR
        </div>
        <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.2vw, 2.7rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", margin: "0 0 12px 0" }}>
          Before Acting, ReviveOS Asks: "What is the Best Move?"
        </h2>
        <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "640px", margin: "0 auto", lineHeight: 1.6 }}>
          7 strategies evaluated side-by-side for every at-risk event. The winner is determined by risk-adjusted Net Incremental Contribution — not gross recovery rate.
        </p>
      </div>

      {/* Case Selector */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {CASES.map((c, i) => (
          <button
            key={i}
            onClick={() => setActiveCase(i)}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              background: activeCase === i ? "rgba(0,240,255,0.1)" : "#0A0C10",
              border: `1px solid ${activeCase === i ? "#00F0FF" : "#1E2230"}`,
              color: activeCase === i ? "#00F0FF" : "#64748B",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              transition: "all 0.2s",
            }}
          >
            Case {c.id}: {c.label} ({c.amount})
          </button>
        ))}
      </div>

      <motion.div
        key={activeCase}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ background: "#0F1117", border: "1px solid #1E2230", borderRadius: "16px", overflow: "hidden" }}
      >
        {/* Case header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1E2230", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#64748B", display: "block" }}>CASE {caseData.id} — {caseData.type}</span>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFF" }}>{caseData.label} · {caseData.amount}</span>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "9px", color: "#64748B", fontFamily: "var(--font-mono)" }}>P(NATURAL)</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#F59E0B" }}>{caseData.naturalP}%</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "9px", color: "#64748B", fontFamily: "var(--font-mono)" }}>INTENT</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#A78BFA" }}>{caseData.intent}</div>
            </div>
          </div>
        </div>

        {/* Strategy table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1E2230" }}>
                {["Strategy", "P(Natural)", "P(Intervention)", "Lift (τ)", "Expected NIC", "Friction", "Verdict"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748B", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "10px", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {caseData.strategies.map((s, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid rgba(30,34,48,0.6)",
                    background: s.verdict === "WINNER" ? "rgba(0,255,102,0.06)" : s.verdict === "BLOCKED" ? "rgba(255,59,48,0.04)" : "transparent",
                  }}
                >
                  <td style={{ padding: "12px 14px", fontWeight: 700, color: s.verdict === "WINNER" ? "#00FF66" : "#CBD5E1", whiteSpace: "nowrap" }}>
                    {s.verdict === "WINNER" && <span style={{ marginRight: "6px" }}>🏆</span>}
                    {s.name}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#8E9BB0", fontFamily: "var(--font-mono)" }}>{s.pNat}%</td>
                  <td style={{ padding: "12px 14px", color: "#CBD5E1", fontFamily: "var(--font-mono)" }}>{s.pInt}%</td>
                  <td style={{ padding: "12px 14px", color: s.lift > 0 ? "#60A5FA" : "#FF3B30", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    {s.lift > 0 ? "+" : ""}{s.lift}%
                  </td>
                  <td style={{ padding: "12px 14px", fontWeight: 700, color: s.nic > 0 ? "#34D399" : s.nic < 0 ? "#F87171" : "#94A3B8", fontFamily: "var(--font-mono)" }}>
                    {s.nic > 0 ? "+" : ""}₹{s.nic.toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#8E9BB0" }}>{s.friction}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "4px", background: VERDICT_COLOR[s.verdict] + "20", color: VERDICT_COLOR[s.verdict], fontFamily: "var(--font-mono)" }}>
                      {s.verdict}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rationale */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #1E2230", background: "rgba(0,255,102,0.04)" }}>
          <div style={{ fontSize: "10px", color: "#00FF66", fontFamily: "var(--font-mono)", fontWeight: 800, marginBottom: "6px" }}>
            WHY REVIVEOS CHOSE: {caseData.winner}
          </div>
          <p style={{ fontSize: "12px", color: "#8E9BB0", margin: 0, lineHeight: 1.6 }}>{caseData.rationale}</p>
        </div>
      </motion.div>

      <div style={{ textAlign: "center", fontSize: "12px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
        All values are estimated projections. Label: SIMULATION / DEMO ENVIRONMENT
      </div>
    </div>
  );
};