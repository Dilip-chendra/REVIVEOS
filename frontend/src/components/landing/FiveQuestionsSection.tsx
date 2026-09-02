import React from "react";
import { motion } from "framer-motion";

const QUESTIONS = [
  {
    num: "01",
    q: "SHOULD WE INTERVENE?",
    sub: "Or would the customer recover naturally without any action?",
    detail: "ReviveOS estimates P(Natural Recovery | Context) before every decision. If natural probability is high, WAIT is the optimal action — free margin, zero friction.",
    color: "#00F0FF",
  },
  {
    num: "02",
    q: "WHEN SHOULD WE INTERVENE?",
    sub: "Bank lull windows, salary cycles, customer intent signals",
    detail: "Timing matters. S2S mandate retries work best during 06:00–08:00 AM post-salary windows. Wrong timing wastes retry budgets and frustrates customers.",
    color: "#A78BFA",
  },
  {
    num: "03",
    q: "WHAT SHOULD WE DO?",
    sub: "Mandate retry, payment link, customer prompt, wait, or escalate?",
    detail: "7 strategies evaluated side-by-side. ReviveOS picks the strategy with the highest risk-adjusted Net Incremental Contribution — not just highest gross recovery.",
    color: "#00FF66",
  },
  {
    num: "04",
    q: "WHICH AGENT SHOULD WIN?",
    sub: "When Subscription, Cart, and Retention agents all propose simultaneously",
    detail: "Central Arbitration prevents competing agents from bombarding the same customer. One winning proposal. All others suppressed with full audit trail.",
    color: "#F59E0B",
  },
  {
    num: "05",
    q: "DID IT CREATE REAL VALUE?",
    sub: "Incremental recovery vs natural baseline — proven causality",
    detail: "NIC = (τ × Amount) − Costs. ReviveOS measures what the intervention itself caused, not just what happened to be recovered afterward.",
    color: "#F472B6",
  },
];

export const FiveQuestionsSection: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "40px", width: "100%" }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "0.8125rem", color: "#00F0FF", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: "12px" }}>
        THE CORE PRODUCT THESIS
      </div>
      <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.2vw, 2.7rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", margin: "0 0 12px 0" }}>
        5 Questions. Every Recovery Event. Every Time.
      </h2>
      <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "620px", margin: "0 auto", lineHeight: 1.6 }}>
        ReviveOS doesn't just retry payments. It answers the fundamental economic and governance questions before any money moves.
      </p>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
      {QUESTIONS.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          style={{
            background: "#0F1117",
            border: `1px solid rgba(255,255,255,0.08)`,
            borderTop: `2px solid ${item.color}`,
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "2.8rem", fontWeight: 900, color: item.color, opacity: 0.15, position: "absolute", top: "12px", right: "16px", lineHeight: 1 }}>
            {item.num}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 800, color: item.color, letterSpacing: "0.1em" }}>
            {item.num}
          </div>
          <div style={{ fontFamily: "var(--font-section-heading)", fontSize: "1rem", fontWeight: 800, color: "#FFF", lineHeight: 1.3 }}>
            {item.q}
          </div>
          <div style={{ fontSize: "12px", color: "#8E9BB0", lineHeight: 1.5 }}>
            {item.sub}
          </div>
          <div style={{ fontSize: "11px", color: "#64748B", lineHeight: 1.6, borderTop: "1px solid #1E2230", paddingTop: "12px", marginTop: "4px" }}>
            {item.detail}
          </div>
        </motion.div>
      ))}
    </div>

    <div style={{ textAlign: "center", background: "linear-gradient(135deg, rgba(0,240,255,0.06) 0%, rgba(112,0,255,0.06) 100%)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: "16px", padding: "28px 20px" }}>
      <p style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(1.1rem, 2vw, 1.4rem)", fontWeight: 700, color: "#CBD5E1", margin: 0, lineHeight: 1.5 }}>
        "Recovery without attribution is just activity.
        <span style={{ color: "#00F0FF" }}> ReviveOS proves causality.</span>"
      </p>
    </div>
  </div>
);