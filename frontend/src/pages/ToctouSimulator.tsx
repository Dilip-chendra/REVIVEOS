import React, { useState } from "react";
import { motion } from "framer-motion";
import { Play, RefreshCw } from "lucide-react";

export const ToctouSimulator: React.FC = () => {
  const [injectRace, setInjectRace] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);

  const stepsWithRace = [
    {
      t: "T0 (10:00:00.000)",
      event: "DECISION_APPROVED",
      title: "Action Contract Signed",
      desc: "ReviveOS authorizes mandate retry for pay_DEMO_9821 (₹5,000). Signed with SHA-256 HMAC.",
      state: "APPROVED",
      color: "#00FF66",
    },
    {
      t: "T1 (10:00:01.120)",
      event: "CUSTOMER_PAYS",
      title: "Customer Pays Independently",
      desc: "Customer opens their HDFC UPI app and completes payment outside ReviveOS. Razorpay status changes to 'captured'.",
      state: "EXTERNAL_CAPTURED",
      color: "#00F0FF",
    },
    {
      t: "T2a (10:00:02.005)",
      event: "WORKER_DISPATCH",
      title: "Worker Prepares Execution",
      desc: "Background recovery worker dequeues contract and prepares to call Razorpay retry endpoint.",
      state: "PREFLIGHT",
      color: "#F59E0B",
    },
    {
      t: "T2b (10:00:02.040)",
      event: "PROVIDER_CHECK",
      title: "Live Provider Pre-Flight Check",
      desc: "ReviveOS makes synchronous GET /v1/payments/pay_DEMO_9821. Razorpay reports: status='captured'.",
      state: "STALE_DETECTED",
      color: "#A5B4FC",
    },
    {
      t: "T2c (10:00:02.052)",
      event: "ACTION_REVOKED",
      title: "Execution Revoked (TOCTOU Lock)",
      desc: "Contract revoked before touching payment rail. Duplicate debit prevented. Customer charged exactly once.",
      state: "DUPLICATE_PREVENTED",
      color: "#00FF66",
    },
  ];

  const stepsWithoutRace = [
    {
      t: "T0 (10:00:00.000)",
      event: "DECISION_APPROVED",
      title: "Action Contract Signed",
      desc: "ReviveOS authorizes mandate retry for pay_DEMO_9821 (₹5,000).",
      state: "APPROVED",
      color: "#00FF66",
    },
    {
      t: "T1 (10:00:01.000)",
      event: "NO_EXTERNAL_CHANGE",
      title: "Customer Remains Unpaid",
      desc: "Payment remains in 'failed' status on Razorpay.",
      state: "STILL_FAILED",
      color: "#64748B",
    },
    {
      t: "T2a (10:00:02.005)",
      event: "WORKER_DISPATCH",
      title: "Worker Prepares Execution",
      desc: "Background recovery worker dequeues contract.",
      state: "PREFLIGHT",
      color: "#F59E0B",
    },
    {
      t: "T2b (10:00:02.040)",
      event: "PROVIDER_CHECK",
      title: "Live Provider Check Verified",
      desc: "Razorpay confirms status='failed'. Safe to execute.",
      state: "VERIFIED_SAFE",
      color: "#00FF66",
    },
    {
      t: "T2c (10:00:02.180)",
      event: "EXECUTION_SUCCESS",
      title: "Dispatched to Razorpay Rail",
      desc: "Payment retry executed successfully on Razorpay. ₹5,000 captured.",
      state: "CAPTURED",
      color: "#00FF66",
    },
  ];

  const activeSteps = injectRace ? stepsWithRace : stepsWithoutRace;

  const triggerSimulation = () => {
    setIsRunning(true);
    setCurrentStep(0);

    const stepIntervals = [600, 1200, 1800, 2400];
    stepIntervals.forEach((time, index) => {
      setTimeout(() => {
        setCurrentStep(index + 1);
        if (index === stepIntervals.length - 1) {
          setIsRunning(false);
        }
      }, time);
    });
  };

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#00F0FF", letterSpacing: "0.15em" }}>
              ZERO-TRUST CONCURRENCY PROTECTION
            </span>
            <span style={{ fontSize: "9px", padding: "2px 8px", borderRadius: "4px", background: "rgba(245,158,11,0.18)", color: "#F59E0B", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
              [SIMULATION]
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 800, color: "#FFF", margin: 0 }}>
            A Decision Is Not an Execution.
          </h1>
          <p style={{ fontSize: "14px", color: "#8E9BB0", maxWidth: "780px", margin: "6px 0 0 0", lineHeight: 1.6 }}>
            Between the moment ReviveOS authorizes a recovery action and the moment a background worker executes it, the external world can change. Live pre-flight verification prevents duplicate debits.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={() => {
              setInjectRace(!injectRace);
              setCurrentStep(-1);
            }}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              background: injectRace ? "rgba(255, 59, 48, 0.15)" : "#0A0C10",
              border: injectRace ? "1.5px solid #FF3B30" : "1px solid #1E2230",
              color: injectRace ? "#FF8A80" : "#8E9BB0",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            RACE CONDITION: {injectRace ? "ON (CUSTOMER PAYS AT T+1)" : "OFF"}
          </button>

          <button
            onClick={triggerSimulation}
            disabled={isRunning}
            style={{
              padding: "12px 24px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #00F0FF 0%, #0099FF 100%)",
              color: "#040711",
              fontFamily: "var(--font-section-heading)",
              fontSize: "13px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 6px 20px rgba(0, 240, 255, 0.3)",
            }}
          >
            {isRunning ? <RefreshCw size={15} className="spin" /> : <Play size={15} />}
            {isRunning ? "RUNNING PRE-FLIGHT..." : "TRIGGER CONCURRENCY TEST"}
          </button>
        </div>
      </div>

      <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "18px", padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#94A3B8" }}>
            CHRONOLOGICAL EXECUTION TIMELINE
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#00F0FF" }}>
            Target: pay_DEMO_9821 • ₹5,000
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {activeSteps.map((step, idx) => {
            const isVisible = currentStep >= idx;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isVisible ? 1 : 0.25, x: isVisible ? 0 : -5 }}
                transition={{ duration: 0.3 }}
                style={{
                  background: isVisible ? "#0F1117" : "#08090C",
                  border: isVisible ? `1.5px solid ${step.color}50` : "1px solid #1E2230",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: isVisible ? `0 0 20px ${step.color}10` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 800, color: step.color, minWidth: "140px" }}>
                    {step.t}
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#FFF" }}>{step.title}</div>
                    <div style={{ fontSize: "11px", color: "#8E9BB0", marginTop: "2px" }}>{step.desc}</div>
                  </div>
                </div>

                <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", padding: "3px 8px", borderRadius: "4px", background: `${step.color}20`, color: step.color, fontWeight: 800 }}>
                  {step.state}
                </span>
              </motion.div>
            );
          })}
        </div>

        {currentStep === 4 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: "16px 20px",
              borderRadius: "12px",
              background: injectRace ? "rgba(0, 255, 102, 0.08)" : "rgba(0, 240, 255, 0.08)",
              border: injectRace ? "1.5px solid #00FF66" : "1.5px solid #00F0FF",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-section-heading)", fontSize: "14px", fontWeight: 800, color: "#FFF" }}>
                {injectRace ? "🛡️ DUPLICATE DEBIT PREVENTED" : "✅ RECOVERY EXECUTED SAFELY"}
              </div>
              <div style={{ fontSize: "12px", color: injectRace ? "#00FF66" : "#00F0FF", marginTop: "2px" }}>
                {injectRace
                  ? "Live Provider Check intercepted stale decision. 0 duplicate charges reached Razorpay."
                  : "Provider verified payment still failed. Retry dispatched to Razorpay rail."}
              </div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#8E9BB0" }}>
              TOCTOU INVARIANT #05 ENFORCED
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
};
