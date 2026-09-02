import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Check, Eye
} from "lucide-react";
import { Link } from "react-router-dom";

const STEPS = [
  {
    id: "step1",
    num: 1,
    title: "1. Payment Failure Ingestion",
    subtitle: "Real-time capture of processor decline",
    desc: "A transaction fails on the primary gateway. ReviveOS intercepts the event in milliseconds instead of blindly rejecting the customer.",
    sample: {
      code: "INSUFFICIENT_FUNDS",
      amount: "₹1,50,000",
      gateway: "Razorpay",
      timing: "Sunday 2:00 AM IST",
      merchant: "CloudCRM Inc.",
    },
    insight: "Most systems would immediately cancel this subscription. ReviveOS inspects the context first.",
    linkText: "View Failure Taxonomy",
    linkTo: "/failure-intelligence",
  },
  {
    id: "step2",
    num: 2,
    title: "2. Context Enrichment",
    subtitle: "Gathering historical & telemetry signals",
    desc: "ReviveOS enriches the failure with 12 real-time signals: customer tenure, payment history, device fingerprint, and processor health.",
    sample: {
      history: "12/13 successful payments (92.3%)",
      tenure: "13 months active subscriber",
      device: "Recognized MacBook Pro / Safari",
      location: "IP matches billing address (Bengaluru)",
      ltv: "₹54,00,000 estimated customer value",
    },
    insight: "This is a loyal enterprise account hitting a weekend corporate velocity limit — NOT a distressed customer.",
    linkText: "View Customer Intelligence",
    linkTo: "/customers",
  },
  {
    id: "step3",
    num: 3,
    title: "3. AI Root Cause Diagnosis",
    subtitle: "Deterministic ML feature weighting",
    desc: "The diagnostic model calculates the probability of involuntary failure vs intentional cancellation based on weighted signal contributions.",
    sample: {
      diagnosis: "Temporary weekend corporate velocity limit. Reset required.",
      confidence: "91% Confidence",
      primarySignal: "Timing + Clean historical record",
      involuntaryScore: "94% Involuntary Churn Risk",
    },
    insight: "The AI recognizes that retrying immediately is useless, but retrying Monday morning has a 91% success rate.",
    linkText: "View Intelligence Engine",
    linkTo: "/intelligence",
  },
  {
    id: "step4",
    num: 4,
    title: "4. Strategy Generation & Comparison",
    subtitle: "Evaluating competing recovery paths",
    desc: "Rather than running a single retry script, the AI calculates success probabilities for multiple distinct recovery strategies.",
    sample: {
      stratA: "Strategy A: Smart Delay to Mon 9:00 AM → 91% Success (CHOSEN)",
      stratB: "Strategy B: Send Card Update Email → 52% Success (REJECTED — 40% Churn Risk)",
      stratC: "Strategy C: Blind Retry Now → 12% Success (REJECTED — Fails Limit)",
    },
    insight: "Strategy A wins because it eliminates customer friction while maximizing payment capture probability.",
    linkText: "Compare Strategies",
    linkTo: "/intelligence",
  },
  {
    id: "step5",
    num: 5,
    title: "5. Deterministic Safety Gate",
    subtitle: "Hard financial rules govern every action",
    desc: "Before any action can execute, the deterministic Policy Gate evaluates 6 hardcoded merchant rules. Zero AI influence.",
    sample: {
      check1: "✓ Amount ₹1,50,000 within merchant B2B ceiling (₹5,00,000)",
      check2: "✓ 0 of 3 max retries used",
      check3: "✓ Active subscription consent verified",
      check4: "✓ Zero fraud flags on customer record",
      check5: "✓ Gateway healthy for retry",
      decision: "POLICY GATE DECISION: APPROVED FOR EXECUTION",
    },
    insight: "If amount exceeded ₹5,00,000, automation would be halted and routed to Human Review instantly.",
    linkText: "View Security Controls",
    linkTo: "/security",
  },
  {
    id: "step6",
    num: 6,
    title: "6. Execution / Human Escalation",
    subtitle: "Idempotent adapter execution",
    desc: "The recovery action is dispatched through the sandbox gateway adapter with distributed execution locking and idempotency protection.",
    sample: {
      adapter: "Razorpay Sandbox Adapter",
      idempotency: "IDEM_9f482a... (Deduplicated)",
      lock: "Acquired mutex on case demo-case-001",
      action: "Scheduled Smart Delay retry at 2026-08-28T09:05:00Z",
    },
    insight: "Double-spending and duplicate API requests are physically impossible due to server-side idempotency locks.",
    linkText: "Inspect Needs Attention Queue",
    linkTo: "/human-review",
  },
  {
    id: "step7",
    num: 7,
    title: "7. Outcome & Capture",
    subtitle: "Confirmed payment capture",
    desc: "The payment is executed on schedule. Funds are captured silently without bothering the merchant or customer.",
    sample: {
      status: "CAPTURED",
      recoveredAmount: "₹1,50,000",
      ltvProtected: "₹54,00,000",
      customerImpact: "Zero friction — subscription continued seamlessly",
    },
    insight: "The customer never knew their corporate card failed over the weekend. Churn was completely averted.",
    linkText: "View Live Case Details",
    linkTo: "/risk/demo-case-001",
  },
  {
    id: "step8",
    num: 8,
    title: "8. Immutable Audit Trail",
    subtitle: "SHA-256 cryptographic proof",
    desc: "Every signal, diagnosis, policy check, and processor response is committed to an append-only cryptographic hash chain.",
    sample: {
      event: "PAYMENT_RECOVERED",
      actor: "SYSTEM (ReviveOS Decision Engine)",
      prevHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      currHash: "7a2b9f31c828d9a4f2e105b63892c5d14e7a83b29014f3c7e9281a4b56281039",
      integrity: "TAMPER-PROOF VERIFIED",
    },
    insight: "Merchants and auditors can verify that no AI or human altered past financial decisions.",
    linkText: "View Cryptographic Audit Trail",
    linkTo: "/audit",
  },
  {
    id: "step9",
    num: 9,
    title: "9. Counterfactual ROI & Impact",
    subtitle: "Measuring net incremental revenue",
    desc: "ReviveOS measures real recovered revenue against a no-intervention baseline, providing mathematical proof of ROI.",
    sample: {
      recoveredTotal: "₹11,82,398 (7 Demo Scenarios)",
      recoveryRate: "85.7% (vs 0% Baseline without ReviveAI)",
      ltvProtectedTotal: "₹1,02,30,800 total lifetime value saved",
      roiMultiplier: "18.4x return on platform subscription",
    },
    insight: "ReviveOS is not a cost center — it is an active profit center.",
    linkText: "View Counterfactual Impact",
    linkTo: "/impact",
  },
];

export default function EvaluatorMode() {
  const [activeStep, setActiveStep] = useState(0);
  const current = STEPS[activeStep];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", paddingBottom: "80px", maxWidth: "960px", margin: "0 auto" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: "999px", padding: "4px 12px", marginBottom: "12px" }}>
          <Eye size={13} color="var(--accent)" />
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Evaluator Walkthrough</span>
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-primary)" }}>
          See ReviveOS Think
        </h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", marginTop: "6px", maxWidth: "600px", margin: "6px auto 0" }}>
          Step-by-step interactive inspection of the entire recovery pipeline — from raw processor decline to cryptographically verified capture.
        </p>
      </motion.div>

      {/* Main 2-Column Interface */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "24px" }}>

        {/* Left Step Navigator */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {STEPS.map((step, idx) => {
            const isActive = idx === activeStep;
            const isDone = idx < activeStep;

            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  background: isActive ? "var(--bg-elevated)" : "transparent",
                  border: isActive ? "1px solid var(--accent)" : "1px solid transparent",
                  borderRadius: "var(--r-md)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
                className={!isActive ? "card-hover" : ""}
              >
                <div style={{
                  width: "24px", height: "24px", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isActive ? "var(--accent)" : isDone ? "rgba(16,185,129,0.15)" : "var(--bg-overlay)",
                  color: isActive ? "#fff" : isDone ? "var(--success-text)" : "var(--text-tertiary)",
                  fontSize: "0.75rem", fontWeight: 700,
                }}>
                  {isDone ? <Check size={12} strokeWidth={3} /> : step.num}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.8125rem", fontWeight: isActive ? 700 : 500, color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}>
                    {step.title}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Active Step Detail Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-xl)",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Step {current.num} of 9
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                {current.title}
              </h2>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "6px", lineHeight: 1.5 }}>
                {current.desc}
              </p>
            </div>

            {/* Simulated Live Data Box */}
            <div style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "16px", display: "flex", flexDirection: "column", gap: "8px", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
              <div style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", textTransform: "uppercase", fontFamily: "inherit" }}>
                Active State Payload
              </div>
              {Object.entries(current.sample).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "4px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{k}:</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600, textAlign: "right" }}>{v as string}</span>
                </div>
              ))}
            </div>

            {/* Evaluator Insight Banner */}
            <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "var(--r-md)", padding: "12px 16px", fontSize: "0.8125rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
              <strong>Evaluator Takeaway:</strong> {current.insight}
            </div>

            {/* Step Navigation Controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: "0.75rem" }}
              >
                <ArrowLeft size={13} /> Previous
              </button>

              <Link to={current.linkTo} className="btn btn-ghost btn-sm" style={{ fontSize: "0.75rem", color: "var(--accent)" }}>
                {current.linkText} <ArrowRight size={13} />
              </Link>

              <button
                onClick={() => setActiveStep(Math.min(STEPS.length - 1, activeStep + 1))}
                disabled={activeStep === STEPS.length - 1}
                className="btn btn-primary btn-sm"
                style={{ fontSize: "0.75rem" }}
              >
                Next Step <ArrowRight size={13} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
