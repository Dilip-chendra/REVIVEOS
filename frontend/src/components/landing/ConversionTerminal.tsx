import React, { useState } from "react";
import { Play, ArrowRight, ShieldCheck } from "lucide-react";

export const ConversionTerminal: React.FC<{ onLaunchSandbox: () => void; onConnectProvider: () => void }> = ({
  onLaunchSandbox,
  onConnectProvider,
}) => {
  const [terminalOutput, setTerminalOutput] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const runCurlSimulation = () => {
    setIsExecuting(true);
    setTerminalOutput("Connecting to ReviveOS Economic Arbitration Node [127.0.0.1:8000]...\n");
    setTimeout(() => {
      setTerminalOutput((prev) => prev + "POST /api/v1/recover/evaluate HTTP/1.1\nAuthorization: Bearer rzp_test_TVw...\n\n[+] Ingested 3 agent bids for CUST-9821\n[+] Calculated Causal Lift: tau = 0.78\n[+] Net Incremental Contribution: +Rs 1,947.22\n[+] Verdict: AUTHORIZE SubscriptionAgent (Smart Retry Mandate)\n[+] Issued SHA-256 Action Contract: e3b0c44298fc1c14...\n[+] Dispatched to Razorpay Rail: HTTP 200 OK\n\n[SUCCESS] 1 Customer -> 1 Decision Locked. Margin Leakage Prevented: Rs 750.00");
      setIsExecuting(false);
    }, 900);
  };

  return (
    <div style={{ background: "#0F1117", border: "1px solid #1E2230", borderRadius: "20px", padding: "36px", display: "flex", flexDirection: "column", gap: "28px", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ fontSize: "0.8125rem", color: "#00F0FF", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
          THE AUTONOMOUS CONTROL PLANE
        </div>
        <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", textTransform: "uppercase", margin: 0 }}>
          Govern Your Autonomous Recovery Infrastructure.
        </h2>
        <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "680px", margin: "0 auto", lineHeight: 1.6 }}>
          More autonomous agents will make more recovery decisions. Someone has to arbitrate collisions, calculate causal lift, and verify live provider state. That is what ReviveOS builds.
        </p>
      </div>

      {/* Interactive CLI Terminal Window */}
      <div style={{ background: "#08090C", border: "1px solid #1E2230", borderRadius: "14px", overflow: "hidden" }}>
        {/* Terminal Titlebar */}
        <div style={{ background: "#0A0C10", borderBottom: "1px solid #1E2230", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FF5F56" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FFBD2E" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#27C93F" }} />
            <span style={{ fontSize: "11px", color: "#64748B", fontFamily: "var(--font-mono)", marginLeft: "8px" }}>
              reviveos-cli --sandbox-eval
            </span>
          </div>

          <button
            onClick={runCurlSimulation}
            disabled={isExecuting}
            style={{
              background: "rgba(0, 240, 255, 0.15)",
              border: "1px solid rgba(0, 240, 255, 0.4)",
              color: "#00F0FF",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "var(--font-mono)",
            }}
          >
            <Play size={11} />
            <span>{isExecuting ? "Executing..." : "Run Live Simulation"}</span>
          </button>
        </div>

        {/* Terminal Content */}
        <div style={{ padding: "16px", minHeight: "130px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "#CBD5E1", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {terminalOutput || (
            <span style={{ color: "#64748B" }}>
              $ curl -X POST https://api.reviveos.io/v1/recover/evaluate \<br />
              &nbsp;&nbsp;-H "Authorization: Bearer rzp_test_TVwFUQgZPsAmiC" \<br />
              &nbsp;&nbsp;-d '&#123;"customer_id": "CUST-9821", "proposals": 3&#125;'<br /><br />
              <span style={{ color: "#00F0FF" }}>Click "Run Live Simulation" to trigger the multi-agent arbitration kernel...</span>
            </span>
          )}
        </div>
      </div>

      {/* Dual Access Action Buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
        <button
          onClick={onLaunchSandbox}
          style={{
            padding: "15px 30px",
            background: "linear-gradient(135deg, #00F0FF 0%, #0099FF 100%)",
            color: "#040711",
            borderRadius: "12px",
            fontSize: "0.875rem",
            fontWeight: 700,
            fontFamily: "var(--font-section-heading)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 8px 24px rgba(0, 240, 255, 0.35)",
          }}
        >
          <span>Explore Interactive Sandbox (Demo Universe)</span>
          <ArrowRight size={16} />
        </button>

        <button
          onClick={onConnectProvider}
          style={{
            padding: "15px 28px",
            background: "#0A0C10",
            border: "1.5px solid #1E2230",
            color: "#F8FAFC",
            borderRadius: "12px",
            fontSize: "0.875rem",
            fontWeight: 700,
            fontFamily: "var(--font-section-heading)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#00FF66")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1E2230")}
        >
          <ShieldCheck size={16} color="#00FF66" />
          <span>Connect Razorpay Infrastructure (Real Mode)</span>
        </button>
      </div>

      <div style={{ textAlign: "center", fontSize: "11px", color: "#64748B", display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
        <span>✓ 250/250 Automated Tests Passing</span>
        <span>✓ 100% Integer Paise Precision</span>
        <span>✓ Zero-Trust Pre-Execution Locks</span>
      </div>
    </div>
  );
};
