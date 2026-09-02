import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const WithWithoutToggle: React.FC = () => {
  const [mode, setMode] = useState<"WITHOUT" | "WITH">("WITH");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "0.8125rem", color: "#00F0FF", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
            SIDE-BY-SIDE ARCHITECTURE COMPARISON
          </div>
          <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 800, color: "#FFF", margin: "4px 0 0 0" }}>
            Uncoordinated Chaos vs Economic Control Plane
          </h2>
        </div>

        <div style={{ display: "flex", background: "#0A0C10", padding: "4px", borderRadius: "12px", border: "1px solid #1E2230" }}>
          <button
            onClick={() => setMode("WITHOUT")}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              background: mode === "WITHOUT" ? "rgba(255, 59, 48, 0.2)" : "transparent",
              border: mode === "WITHOUT" ? "1px solid #FF3B30" : "none",
              color: mode === "WITHOUT" ? "#FF3B30" : "#64748B",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            WITHOUT REVIVEOS
          </button>
          <button
            onClick={() => setMode("WITH")}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              background: mode === "WITH" ? "rgba(0, 240, 255, 0.15)" : "transparent",
              border: mode === "WITH" ? "1px solid #00F0FF" : "none",
              color: mode === "WITH" ? "#00F0FF" : "#64748B",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            WITH REVIVEOS
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === "WITHOUT" ? (
          <motion.div
            key="without"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ background: "#0F1117", border: "1.5px solid rgba(255, 59, 48, 0.4)", borderRadius: "20px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#FF3B30", fontWeight: 800 }}>
                ❌ UNCHECKED MULTI-AGENT COLLISION
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#FF3B30" }}>
                Margin Destroyed: -₹750
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              {[
                { title: "Subscription Agent", act: "Autopay retry fires at 10:00", cost: "₹4 fee" },
                { title: "Cart Recovery Agent", act: "WhatsApp link sent at 10:00", cost: "₹5 fee" },
                { title: "Retention Agent", act: "15% discount coupon emailed", cost: "₹750 margin loss" },
                { title: "Collections Agent", act: "Task assigned to call rep", cost: "₹50 rep time" },
              ].map((c, i) => (
                <div key={i} style={{ background: "#0A0C10", border: "1px solid rgba(255, 59, 48, 0.2)", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#FFF" }}>{c.title}</div>
                  <div style={{ fontSize: "11px", color: "#FF8A80" }}>{c.act}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#FF3B30", fontWeight: 800 }}>Cost: {c.cost}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#08090C", border: "1px solid #1E2230", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <strong style={{ color: "#FFF", fontSize: "13px" }}>Outcome: Total Chaos</strong>
                <p style={{ fontSize: "11px", color: "#8E9BB0", margin: "2px 0 0 0" }}>Customer received 4 messages, used the discount code, and caused a duplicate debit chargeback.</p>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#FF3B30", fontWeight: 800 }}>Net Loss: -₹809</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="with"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ background: "#0F1117", border: "1.5px solid rgba(0, 240, 255, 0.4)", borderRadius: "20px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px", boxShadow: "0 0 40px rgba(0, 240, 255, 0.08)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#00F0FF", fontWeight: 800 }}>
                ✅ REVIVEOS ECONOMIC ARBITRATION KERNEL
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#00FF66", fontWeight: 800 }}>
                Net Yield (NIC): +₹1,944
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "#0A0C10", border: "1.5px solid #00FF66", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#00FF66", fontWeight: 800 }}>🏆 1 AUTHORIZED ACTION</span>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#FFF" }}>AI Subscription Agent • Mandate Retry</div>
                <p style={{ fontSize: "11px", color: "#8E9BB0", margin: 0 }}>Selected for highest Net Incremental Contribution (τ = 78%, ₹4 cost, ₹0 discount loss).</p>
              </div>

              <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#FF3B30", fontWeight: 800 }}>🛡️ 3 SUPPRESSED ACTIONS</span>
                <div style={{ fontSize: "12px", color: "#CBD5E1" }}>Cart Link, 15% Discount, and Collections blocked.</div>
                <p style={{ fontSize: "11px", color: "#8E9BB0", margin: 0 }}>Preserved ₹750 merchant margin and prevented customer fatigue under Article 6.</p>
              </div>
            </div>

            <div style={{ background: "#08090C", border: "1px solid #1E2230", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <strong style={{ color: "#FFF", fontSize: "13px" }}>Outcome: Clean, Governed Recovery</strong>
                <p style={{ fontSize: "11px", color: "#8E9BB0", margin: "2px 0 0 0" }}>1 single background payment retry succeeded. 0 spam messages. ₹0 margin leakage.</p>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#00FF66", fontWeight: 800 }}>Net Profit Gain: +₹1,944</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
