import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DECISIONS = [
  { label: "WAIT", count: 17, color: "#F59E0B", desc: "Natural Recovery ≥82%: margin fully preserved, zero cost", emoji: "⏸" },
  { label: "MANDATE_RETRY", count: 34, color: "#00F0FF", desc: "S2S e-Mandate scheduled in bank lull window", emoji: "🔄" },
  { label: "PAYMENT_LINK", count: 22, color: "#A78BFA", desc: "1-Tap WhatsApp/SMS payment link dispatched", emoji: "🔗" },
  { label: "CUSTOMER_PROMPT", count: 8, color: "#60A5FA", desc: "In-app modal prompt triggered", emoji: "💬" },
  { label: "HUMAN_ESCALATION", count: 9, color: "#F97316", desc: "Routed to Ops review queue (high value / low confidence)", emoji: "👤" },
  { label: "DO_NOT_INTERVENE", count: 10, color: "#64748B", desc: "Negative NIC, opted-out customer, or policy block", emoji: "🚫" },
];

const METRICS = [
  { label: "Gross Recovery", value: "₹89,400", sub: "Total recovered across 100 cases", color: "#60A5FA" },
  { label: "Natural Recovery Est.", value: "₹21,200", sub: "ESTIMATED without ReviveOS", color: "#F59E0B", tag: "ESTIMATED" },
  { label: "Incremental Recovery", value: "₹68,200", sub: "Our causal contribution", color: "#00F0FF" },
  { label: "Net Incremental (NIC)", value: "₹61,840", sub: "After all intervention costs", color: "#00FF66" },
];

const PROTECTION_METRICS = [
  { label: "Unnecessary Interventions Blocked", value: "17", desc: "WAIT decisions on high natural recovery cases" },
  { label: "Customer Contacts Avoided", value: "34", desc: "Competing agent proposals suppressed" },
  { label: "Double-Debits Prevented", value: "3", desc: "In test scenarios via TOCTOU gateway" },
  { label: "Margin Preserved from Discounts", value: "₹2,720", desc: "By choosing WAIT or MANDATE over DISCOUNT" },
];

export const BatchDemoSection: React.FC = () => {
  const [ran, setRan] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "36px", width: "100%" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "0.8125rem", color: "#A78BFA", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: "12px" }}>
          BATCH RECOVERY DEMONSTRATION
        </div>
        <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.2vw, 2.7rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", margin: "0 0 12px 0" }}>
          100 Cases. One Governed Run. Verifiable Economics.
        </h2>
        <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "680px", margin: "0 auto", lineHeight: 1.6 }}>
          Not a single cherry-picked payment. A complete batch evaluation: subscription failures, cart abandonment, high and low natural recovery, opt-out cases, agent collisions — all processed through the full ReviveOS pipeline.
        </p>
        <div style={{ display: "inline-flex", marginTop: "12px", padding: "4px 12px", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "6px", fontSize: "10px", color: "#A78BFA", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
          DEMO / TEST ENVIRONMENT — Synthetic batch. All values are simulated.
        </div>
      </div>

      {!ran ? (
        <div style={{ background: "#0F1117", border: "1px dashed #334155", borderRadius: "20px", padding: "48px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#64748B" }}>100 AT-RISK CASES QUEUED · READY TO EVALUATE</div>
          <div style={{ fontSize: "13px", color: "#8E9BB0" }}>Mix: subscription failures, cart abandonment, gateway timeouts, opt-outs, agent collisions</div>
          <button
            onClick={() => setRan(true)}
            style={{
              padding: "14px 28px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)",
              color: "#FFF",
              fontSize: "13px",
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              boxShadow: "0 6px 24px rgba(167,139,250,0.35)",
            }}
          >
            ▶ RUN BATCH EVALUATION
          </button>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Decision breakdown */}
            <div style={{ background: "#0F1117", border: "1px solid #1E2230", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#FFF" }}>STRATEGY DISTRIBUTION — 100 CASES</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#00FF66", background: "rgba(0,255,102,0.1)", padding: "3px 8px", borderRadius: "4px" }}>✓ EVALUATION COMPLETE</span>
              </div>
              {DECISIONS.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ width: 28, textAlign: "center", fontSize: "14px" }}>{d.emoji}</span>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: d.color }}>{d.label}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 900, color: "#FFF" }}>{d.count} cases</span>
                    </div>
                    <div style={{ height: "6px", background: "#1E2230", borderRadius: "3px", overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${d.count}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        style={{ height: "100%", background: d.color, borderRadius: "3px" }}
                      />
                    </div>
                    <span style={{ fontSize: "10px", color: "#64748B" }}>{d.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              {METRICS.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  style={{ background: "#0A0C10", border: `1px solid ${m.color}30`, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "6px" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{m.label.toUpperCase()}</span>
                    {m.tag && <span style={{ fontSize: "9px", color: "#F59E0B", background: "rgba(245,158,11,0.1)", padding: "1px 5px", borderRadius: "3px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{m.tag}</span>}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "22px", fontWeight: 900, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: "10px", color: "#64748B" }}>{m.sub}</div>
                </motion.div>
              ))}
            </div>

            {/* Customer protection */}
            <div style={{ background: "rgba(0,255,102,0.04)", border: "1px solid rgba(0,255,102,0.2)", borderRadius: "16px", padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1", fontSize: "10px", color: "#00FF66", fontFamily: "var(--font-mono)", fontWeight: 800, marginBottom: "4px" }}>
                CUSTOMER PROTECTION METRICS
              </div>
              {PROTECTION_METRICS.map((m, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: 900, color: "#00FF66" }}>{m.value}</div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#CBD5E1" }}>{m.label}</div>
                  <div style={{ fontSize: "10px", color: "#64748B" }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};