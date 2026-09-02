import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  {
    time: "10:42:01.100",
    label: "Payment = FAILED",
    detail: "Razorpay returns failure_code: GATEWAY_TIMEOUT for customer C-4821. ReviveOS Risk Engine detects revenue at risk: ₹4,999.",
    state: "FAILED",
    color: "#F59E0B",
    icon: "⚠️",
    system: "RISK DETECTION",
  },
  {
    time: "10:42:01.200",
    label: "ReviveOS approves MANDATE_RETRY",
    detail: "Central Arbitration evaluates 7 strategies. MANDATE_RETRY wins with NIC +₹3,480. Action Contract issued: TTL 300s. Contract ID: ACT-8f4a...91cd",
    state: "CONTRACT ISSUED",
    color: "#00F0FF",
    icon: "📋",
    system: "ARBITRATION → CONTRACT",
  },
  {
    time: "10:42:01.250",
    label: "⚡ Customer pays manually via UPI",
    detail: "Customer opens Razorpay checkout on their phone and completes payment via GPay. Razorpay processes ₹4,999 successfully. Status: CAPTURED.",
    state: "PAYMENT CAPTURED",
    color: "#A78BFA",
    icon: "📱",
    system: "EXTERNAL EVENT",
  },
  {
    time: "10:42:01.280",
    label: "Agent attempts execution → BLOCKED",
    detail: "Subscription Agent submits signed Action Contract ACT-8f4a...91cd to Financial Action Gateway. Gateway performs TOCTOU pre-flight: queries Razorpay live state...",
    state: "REVOKED",
    color: "#FF3B30",
    icon: "🛡️",
    system: "TOCTOU GATEWAY",
    blocked: true,
  },
];

export const ToctouInteractiveDemo: React.FC = () => {
  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);

  const currentStep = STEPS[step];
  const isBlocked = currentStep?.blocked;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "36px", width: "100%" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "0.8125rem", color: "#A78BFA", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: "12px" }}>
          TOCTOU RACE CONDITION PROTECTION
        </div>
        <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.2vw, 2.7rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", margin: "0 0 12px 0" }}>
          What if the Customer Pays While the AI is Preparing a Retry?
        </h2>
        <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "640px", margin: "0 auto", lineHeight: 1.6 }}>
          Time-of-Check to Time-of-Use (TOCTOU) race conditions are one of the most dangerous failure modes in autonomous payment recovery. Click through the simulation.
        </p>
      </div>

      <div style={{ background: "#0F1117", border: "1px solid #1E2230", borderRadius: "20px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: "16px", opacity: !started ? 0.3 : i <= step ? 1 : 0.3, transition: "opacity 0.4s" }}>
              {/* Line */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 32, flexShrink: 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: i <= step && started ? s.color + "30" : "#1E2230",
                  border: `2px solid ${i <= step && started ? s.color : "#334155"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "14px", flexShrink: 0,
                  boxShadow: i === step && started ? `0 0 16px ${s.color}60` : "none",
                  transition: "all 0.4s",
                }}>
                  {i <= step && started ? s.icon : <span style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>{i + 1}</span>}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 28, background: i < step && started ? s.color + "50" : "#1E2230", transition: "background 0.4s", margin: "4px 0" }} />
                )}
              </div>

              {/* Content */}
              <div style={{ paddingBottom: i < STEPS.length - 1 ? 20 : 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: i <= step && started ? s.color : "#64748B", fontWeight: 700 }}>{s.time}</span>
                  <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "4px", background: "#1E2230", color: "#64748B", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{s.system}</span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: i <= step && started ? "#FFF" : "#4B5563", marginBottom: "4px" }}>{s.label}</div>
                {i === step && started && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: "11px", color: "#8E9BB0", margin: 0, lineHeight: 1.55 }}>
                    {s.detail}
                  </motion.p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Dramatic BLOCKED result */}
        <AnimatePresence>
          {isBlocked && started && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: "rgba(255, 59, 48, 0.08)",
                border: "2px solid rgba(255, 59, 48, 0.5)",
                borderRadius: "14px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                boxShadow: "0 0 40px rgba(255, 59, 48, 0.15)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#FF3B30" }}>TOCTOU PRE-FLIGHT RESULT</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#64748B", marginTop: "2px" }}>
                    LIVE STATE: <span style={{ color: "#00FF66" }}>CAPTURED</span> &nbsp;|&nbsp; CONTRACT: <span style={{ color: "#FF3B30" }}>REVOKED</span> &nbsp;|&nbsp; Reason: PAYMENT_STATE_CHANGED
                  </div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 900, color: "#00FF66", background: "rgba(0,255,102,0.1)", border: "1px solid #00FF6640", padding: "8px 16px", borderRadius: "8px" }}>
                  🛡️ DOUBLE-DEBIT PREVENTED
                </div>
              </div>
              <p style={{ fontSize: "11px", color: "#8E9BB0", margin: 0, lineHeight: 1.5 }}>
                The Financial Action Gateway queried Razorpay's authoritative payment state immediately before execution. The state had changed from FAILED → CAPTURED. The Action Contract was atomically revoked. No second charge was issued.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {!started ? (
            <button
              onClick={() => { setStarted(true); setStep(0); }}
              style={{ padding: "10px 20px", borderRadius: "8px", background: "linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)", color: "#FFF", fontSize: "12px", fontWeight: 800, border: "none", cursor: "pointer", fontFamily: "var(--font-mono)" }}
            >
              ▶ START TOCTOU SIMULATION
            </button>
          ) : (
            <>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  style={{ padding: "10px 20px", borderRadius: "8px", background: "#1E2230", color: "#CBD5E1", fontSize: "12px", fontWeight: 800, border: "1px solid #334155", cursor: "pointer", fontFamily: "var(--font-mono)" }}
                >
                  NEXT STEP →
                </button>
              ) : (
                <button
                  onClick={() => { setStep(0); setStarted(false); }}
                  style={{ padding: "10px 20px", borderRadius: "8px", background: "#1E2230", color: "#CBD5E1", fontSize: "12px", fontWeight: 800, border: "1px solid #334155", cursor: "pointer", fontFamily: "var(--font-mono)" }}
                >
                  ↺ REPLAY DEMO
                </button>
              )}
              <span style={{ fontSize: "11px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                Step {step + 1} of {STEPS.length}
              </span>
            </>
          )}
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "20px", background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "12px" }}>
        <p style={{ fontFamily: "var(--font-section-heading)", fontSize: "1.1rem", fontWeight: 700, color: "#A78BFA", margin: 0 }}>
          "The system checks reality immediately before money moves."
        </p>
      </div>
    </div>
  );
};