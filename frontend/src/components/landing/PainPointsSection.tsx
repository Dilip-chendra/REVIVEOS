import React, { useState } from "react";
import { motion } from "framer-motion";

const PAIN_POINTS = [
  {
    num: "01",
    title: "The Counterfactual Illusion",
    problem: "Traditional recovery tools claim credit for ALL recovered transactions — including payments the customer would have completed on their own.",
    solution: "ReviveOS estimates P(Natural Recovery | Context) using ML calibration. Only genuine causal lift τ = P(Intervention) − P(Natural) is attributed to the system.",
    tag: "FALSE ATTRIBUTION",
    color: "#F472B6",
  },
  {
    num: "02",
    title: "Double-Debit TOCTOU Race",
    problem: "AI retry fires at 10:42:01.200 while customer manually pays at 10:42:01.250. Without live state checks, the customer gets charged twice.",
    solution: "Financial Action Gateway performs TOCTOU pre-flight: queries authoritative Razorpay state at millisecond 0. If CAPTURED → CONTRACT REVOKED. Zero double-debits in test scenarios.",
    tag: "SAFETY RISK",
    color: "#FF3B30",
  },
  {
    num: "03",
    title: "India's e-Mandate Involuntary Churn",
    problem: "RBI recurring payment guidelines cause 20–40% subscription failures. Blind immediate retries exhaust the bank retry allowance, permanently halting mandates.",
    solution: "Scheduled S2S Mandate Retries during 06:00–08:00 AM bank lull windows. Completely silent to the customer. Zero friction. Recovers mandates before churn is permanent.",
    tag: "₹B LOST ANNUALLY",
    color: "#F59E0B",
  },
  {
    num: "04",
    title: "Customer Attention Fatigue",
    problem: "5 bots bombard the same customer: subscription retry + cart WhatsApp + discount email + sales CRM + collections call — all within minutes of each other.",
    solution: "Central Arbitration enforces a hard 24-hour Attention Budget (max 1 contact per customer per day). All competing agent proposals beyond the winner are suppressed.",
    tag: "BRAND DAMAGE",
    color: "#A78BFA",
  },
  {
    num: "05",
    title: "The Margin-Burning Discount Trap",
    problem: "Dumb dunning tools blast 15–20% discount coupons to every failed transaction — including high-intent customers who were ready to pay full price in 10 minutes.",
    solution: "First-class Deliberate Abstention (WAIT). When P(Natural Recovery) ≥ 82%, ReviveOS chooses WAIT — preserving full merchant margin at zero cost.",
    tag: "MARGIN DESTRUCTION",
    color: "#F97316",
  },
  {
    num: "06",
    title: "Customer Opt-Out Violations",
    problem: "A user cancels their subscription or replies STOP. Background retry queues continue charging their card and sending messages — violating consumer protection laws.",
    solution: "Customer Sovereignty Shield: irrevocable hard block on all outreach the moment intent transitions to CANCELLED or OPTED_OUT. No economic score overrides this.",
    tag: "COMPLIANCE RISK",
    color: "#EF4444",
  },
  {
    num: "07",
    title: "Unbounded AI Financial Execution",
    problem: "Giving AI agents direct access to payment APIs creates hallucinated refund amounts, infinite retry loops, and unauthorized transaction executions.",
    solution: "Iron Invariant: Agents Propose → ReviveOS Arbitrates → Financial Gateway Executes. Every action requires a single-use HMAC-signed Action Contract with 300s TTL.",
    tag: "AI GOVERNANCE",
    color: "#00F0FF",
  },
];

export const PainPointsSection: React.FC = () => {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "36px", width: "100%" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "0.8125rem", color: "#FF3B30", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: "12px" }}>
          THE 7 PROBLEMS WE SOLVE
        </div>
        <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.2vw, 2.7rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", margin: "0 0 12px 0" }}>
          Revenue Doesn't Disappear in One Place
        </h2>
        <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "640px", margin: "0 auto", lineHeight: 1.6 }}>
          From ghost attribution to double-debits to discount traps — these are the real infrastructure problems in payment recovery that ReviveOS solves.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "14px" }}>
        {PAIN_POINTS.map((pp, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.45 }}
            onClick={() => setExpanded(expanded === i ? null : i)}
            style={{
              background: expanded === i ? "#0F1117" : "#08090C",
              border: `1px solid ${expanded === i ? pp.color + "60" : "#1E2230"}`,
              borderLeft: `3px solid ${pp.color}`,
              borderRadius: "12px",
              padding: "20px",
              cursor: "pointer",
              transition: "all 0.25s ease",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: pp.color, fontWeight: 800 }}>{pp.num}</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#FFF" }}>{pp.title}</span>
              </div>
              <span style={{ fontSize: "9px", fontWeight: 800, padding: "2px 6px", borderRadius: "4px", background: pp.color + "20", color: pp.color, whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>
                {pp.tag}
              </span>
            </div>

            <p style={{ fontSize: "11px", color: "#8E9BB0", margin: 0, lineHeight: 1.55 }}>{pp.problem}</p>

            {expanded === i && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                style={{ borderTop: `1px solid ${pp.color}30`, paddingTop: "10px" }}
              >
                <div style={{ fontSize: "10px", fontWeight: 700, color: pp.color, fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                  ✅ REVIVEOS SOLUTION
                </div>
                <p style={{ fontSize: "11px", color: "#A7F3D0", margin: 0, lineHeight: 1.55 }}>{pp.solution}</p>
              </motion.div>
            )}

            <div style={{ fontSize: "10px", color: "#334155", fontFamily: "var(--font-mono)" }}>
              {expanded === i ? "▲ collapse" : "▼ see solution"}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};