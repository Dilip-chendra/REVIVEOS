import React from "react";
import { motion } from "framer-motion";

const BARS = [
  { label: "AT-RISK REVENUE", sublabel: "Total payment value at risk", value: "₹4.82 Cr", pct: 100, color: "#F97316", desc: "Every rupee identified by ReviveOS as potentially recoverable." },
  { label: "EXPECTED NATURAL RECOVERY", sublabel: "Without any intervention (ESTIMATED)", value: "₹1.64 Cr", pct: 34, color: "#F59E0B", desc: "Revenue that would recover regardless — customers retrying on their own, transient errors resolving, bank-side resolutions." },
  { label: "GROSS RECOVERED", sublabel: "Total actually recovered", value: "₹3.89 Cr", pct: 80, color: "#60A5FA", desc: "All revenue collected after ReviveOS ran recovery workflows." },
  { label: "INCREMENTAL RECOVERY", sublabel: "Gross minus Natural (our causal contribution)", value: "₹2.25 Cr", pct: 46, color: "#00F0FF", desc: "The revenue that would NOT have recovered without intervention. This is ReviveOS's actual causal contribution." },
  { label: "NET INCREMENTAL CONTRIBUTION", sublabel: "After all costs (NIC)", value: "₹1.94 Cr", pct: 40, color: "#00FF66", desc: "Incremental Recovery minus API costs, discount margin, and customer friction costs. This is the real yield." },
];

const COSTS = [
  { label: "Intervention Cost", value: "₹0.18 Cr", desc: "API fees, WhatsApp templates, SMS gateway charges" },
  { label: "Discount Cost", value: "₹0.09 Cr", desc: "Margin surrendered through coupon concessions" },
  { label: "Friction Cost", value: "₹0.04 Cr", desc: "Customer attention budget impact penalty" },
];

export const RevenueWaterfallSection: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "36px", width: "100%" }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "0.8125rem", color: "#F97316", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: "12px" }}>
        REVENUE ATTRIBUTION WATERFALL
      </div>
      <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.2vw, 2.7rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", margin: "0 0 12px 0" }}>
        Don't Tell Us Recovery Happened. Prove It.
      </h2>
      <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "680px", margin: "0 auto", lineHeight: 1.6 }}>
        ReviveOS distinguishes gross recovery from incremental recovery. Every rupee is accounted for. Every cost is subtracted. The result is the Net Incremental Contribution — the real economic yield of the system.
      </p>
      <div style={{ display: "inline-flex", marginTop: "12px", padding: "4px 12px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "6px", fontSize: "10px", color: "#F59E0B", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
        ⚠ DEMO / TEST ENVIRONMENT — All figures are simulated projections
      </div>
    </div>

    <div style={{ background: "#0F1117", border: "1px solid #1E2230", borderRadius: "20px", padding: "28px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {BARS.map((bar, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#FFF" }}>{bar.label}</div>
              <div style={{ fontSize: "10px", color: "#64748B" }}>{bar.sublabel}</div>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "16px", fontWeight: 900, color: bar.color }}>{bar.value}</div>
          </div>
          <div style={{ height: "12px", background: "#1E2230", borderRadius: "6px", overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${bar.pct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: i * 0.15, ease: "easeOut" }}
              style={{ height: "100%", background: `linear-gradient(90deg, ${bar.color}90, ${bar.color})`, borderRadius: "6px" }}
            />
          </div>
          <div style={{ fontSize: "10px", color: "#64748B", lineHeight: 1.4 }}>{bar.desc}</div>
          {i < BARS.length - 1 && <div style={{ borderBottom: "1px dashed #1E2230", marginTop: "4px" }} />}
        </div>
      ))}
    </div>

    {/* Cost breakdown */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
      {COSTS.map((c, i) => (
        <div key={i} style={{ background: "#0A0C10", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ fontSize: "10px", color: "#EF4444", fontFamily: "var(--font-mono)", fontWeight: 800 }}>COST COMPONENT</div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#FFF" }}>{c.label}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "16px", fontWeight: 900, color: "#F87171" }}>−{c.value}</div>
          <div style={{ fontSize: "10px", color: "#64748B" }}>{c.desc}</div>
        </div>
      ))}
    </div>

    {/* NIC formula call-out */}
    <div style={{ textAlign: "center", background: "rgba(0,255,102,0.06)", border: "1.5px solid rgba(0,255,102,0.3)", borderRadius: "16px", padding: "24px" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(1rem, 2vw, 1.4rem)", fontWeight: 900, color: "#FFF", marginBottom: "8px" }}>
        NIC = Incremental Recovery − <span style={{ color: "#F87171" }}>Costs</span> = <span style={{ color: "#00FF66" }}>₹1.94 Cr</span>
      </div>
      <p style={{ fontSize: "12px", color: "#8E9BB0", margin: 0 }}>
        The only metric that matters. Not gross recovery. Not activity. Incremental yield minus all costs.
      </p>
    </div>
  </div>
);