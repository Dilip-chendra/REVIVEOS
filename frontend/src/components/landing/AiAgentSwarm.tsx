import React, { useState } from "react";
import { Sparkles, Shield, Zap, RefreshCw, CheckCircle2 } from "lucide-react";

interface AgentProfile {
  id: string;
  name: string;
  codename: string;
  role: string;
  model: string;
  icon: any;
  color: string;
  badge: string;
  actionStrategy: string;
  intelligence: string;
  liveStats: { label: string; value: string }[];
  examplePrompt: string;
  exampleOutput: string;
}

export const AiAgentSwarm: React.FC = () => {
  const [activeAgent, setActiveAgent] = useState<number>(0);

  const agents: AgentProfile[] = [
    {
      id: "AGENT-01",
      name: "AI Subscription Autopay Agent",
      codename: "RETRY-SWARM-ALPHA",
      role: "AUTONOMOUS MANDATE & RECURRING BILLING",
      model: "Causal Treatment Lift Model + Razorpay Mandate API",
      icon: RefreshCw,
      color: "#00FF66",
      badge: "ACTIVE AGENT",
      actionStrategy: "Smart E-Mandate Reschedule & Card Retries",
      intelligence: "Predicts customer account balance replenishment cycles and banking uptime windows to maximize autopay capture without triggering NSF fees.",
      liveStats: [
        { label: "Causal Recovery Lift", value: "+78.4pp" },
        { label: "Execution Latency", value: "8ms" },
        { label: "Chargeback Rate", value: "0.01%" },
      ],
      examplePrompt: "Ingest failed NACH/UPI mandate #sub_9219 for ₹2,499. Check issuer health and schedule next retry window.",
      exampleOutput: "AUTOPAY DECISION: Scheduled execution at T+4h (HDFC balance refresh peak). Causal lift τ = 87%. Direct fee: ₹2.00.",
    },
    {
      id: "AGENT-02",
      name: "AI Checkout & Cart Resurrect Agent",
      codename: "CONVERSION-NEURAL-BETA",
      role: "PREDICTIVE CHECKOUT ABANDONMENT RECOVERY",
      model: "Intent Classification ML + Dynamic Payment Links",
      icon: Zap,
      color: "#00F0FF",
      badge: "ACTIVE AGENT",
      actionStrategy: "Contextual WhatsApp & UPI Intent Links",
      intelligence: "Detects drop-off friction during 3DS OTP verification and generates instant, pre-filled Razorpay payment links with localized messaging.",
      liveStats: [
        { label: "Cart Conversion Lift", value: "+34.2pp" },
        { label: "Link Open Rate", value: "82.6%" },
        { label: "Avg Recovery Time", value: "4.2 mins" },
      ],
      examplePrompt: "Customer Aarav Mehta dropped at OTP screen on ₹4,999 cart. Generate localized WhatsApp link with 30m expiry.",
      exampleOutput: "LINK CREATED: https://rzp.io/i/c9821. Pre-filled UPI intent. Sent via WhatsApp Business API (Cost: ₹5).",
    },
    {
      id: "AGENT-03",
      name: "AI Margin & Retention Governor",
      codename: "PROFIT-SENTINEL-GAMMA",
      role: "DISCOUNT SUPPRESSION & PROFIT PRESERVATION",
      model: "Natural Settlement Estimator + Margin Leakage Guard",
      icon: Shield,
      color: "#F59E0B",
      badge: "MARGIN GUARD",
      actionStrategy: "Autonomous Discount Blocking & Intent Check",
      intelligence: "Monitors customer payment propensity and actively SUPPRESSES other AI agents from offering unnecessary coupons if the customer was going to pay anyway.",
      liveStats: [
        { label: "Margin Leakage Saved", value: "₹8,42,000" },
        { label: "Discounts Suppressed", value: "1,420 orders" },
        { label: "Natural Settle Acc.", value: "94.6%" },
      ],
      examplePrompt: "Cart Agent proposes 15% discount code (₹750 profit loss) for ₹4,999 checkout. Evaluate natural settlement propensity.",
      exampleOutput: "SUPPRESSION ISSUED: Customer has P(Natural Settle) = 89%. Blocked 15% coupon. Preserved ₹750 merchant profit.",
    },
    {
      id: "AGENT-04",
      name: "Gemini 2.0 Flash Reasoning Copilot",
      codename: "COPILOT-COGNITIVE-DELTA",
      role: "EXPLAINABLE DIAGNOSTICS & NATURAL LANGUAGE AUDITING",
      model: "Google Gemini 2.0 Flash (Deterministic Sandbox)",
      icon: Sparkles,
      color: "#A5B4FC",
      badge: "AI REASONING",
      actionStrategy: "Factual Root-Cause Diagnostics & Policy Simulation",
      intelligence: "Analyzes cryptic bank decline codes, issuer socket latency, and historical telemetry to generate plain-English explanations for finance teams with 0 hallucination.",
      liveStats: [
        { label: "Model Architecture", value: "Gemini 2.0 Flash" },
        { label: "Hallucination Rate", value: "0.00%" },
        { label: "Tool Calling Sockets", value: "23 Live Routers" },
      ],
      examplePrompt: "Why did payment #pay_8291 fail on SBI Netbanking at 14:02? Should we retry via PayU?",
      exampleOutput: "DIAGNOSIS: SBI Core Banking Gateway degraded (latency >4,200ms). Rerouting to Razorpay ICICI Smart Gateway captures +62% lift.",
    },
  ];

  const current = agents[activeAgent];
  const Icon = current.icon;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", width: "100%" }}>
      
      {/* 4 Agent Selection Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
        {agents.map((ag, idx) => {
          const isSelected = activeAgent === idx;
          const AgIcon = ag.icon;

          return (
            <button
              key={ag.id}
              onClick={() => setActiveAgent(idx)}
              style={{
                textAlign: "left",
                padding: "16px 18px",
                borderRadius: "14px",
                background: isSelected ? "#0F1117" : "#0A0C10",
                border: isSelected ? `1.5px solid ${ag.color}` : "1px solid #1E2230",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                boxShadow: isSelected ? `0 0 24px ${ag.color}25` : "none",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: `${ag.color}15`, border: `1px solid ${ag.color}35`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <AgIcon size={14} color={ag.color} />
                  </div>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#8E9BB0", fontFamily: "var(--font-mono)" }}>
                    {ag.id}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "8px",
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: `${ag.color}20`,
                    color: ag.color,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {ag.badge}
                </span>
              </div>

              <div style={{ fontFamily: "var(--font-section-heading)", fontSize: "13px", fontWeight: 700, color: isSelected ? "#FFF" : "#CBD5E1" }}>
                {ag.name}
              </div>

              <div style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                {ag.codename}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Agent Deep-Dive Dashboard */}
      <div style={{ background: "#0F1117", border: "1px solid #1E2230", borderRadius: "20px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
        
        {/* Agent Profile Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, padding: "3px 8px", borderRadius: "4px", background: `${current.color}18`, color: current.color, fontFamily: "var(--font-mono)" }}>
                {current.id} • {current.role}
              </span>
              <span style={{ fontSize: "10px", color: "#8E9BB0", fontFamily: "var(--font-mono)" }}>
                Engine: {current.model}
              </span>
            </div>

            <h3 style={{ fontFamily: "var(--font-section-heading)", fontSize: "1.7rem", fontWeight: 800, color: "#FFF", marginTop: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
              <Icon size={24} color={current.color} />
              <span>{current.name}</span>
            </h3>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            {current.liveStats.map((st, i) => (
              <div key={i} style={{ background: "#08090C", border: "1px solid #1E2230", borderRadius: "10px", padding: "10px 16px", textAlign: "center" }}>
                <div style={{ fontSize: "9px", color: "#64748B", fontFamily: "var(--font-mono)" }}>{st.label}</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: current.color, fontFamily: "var(--font-mono)", marginTop: "2px" }}>{st.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Intelligence Description */}
        <p style={{ fontSize: "0.9375rem", color: "#8E9BB0", lineHeight: 1.65, margin: 0 }}>
          {current.intelligence}
        </p>

        {/* Autonomous Execution Simulation Terminal */}
        <div style={{ background: "#08090C", border: "1px solid #1E2230", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "10px", fontWeight: 800, color: "#00F0FF", fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>
              ▶ AUTONOMOUS AI AGENT LOG TRACE
            </span>
            <span style={{ fontSize: "9px", color: "#00FF66", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              ● 100% DETERMINISTIC EXECUTION
            </span>
          </div>

          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#94A3B8", lineHeight: 1.5 }}>
            <span style={{ color: "#64748B" }}>[INGEST]</span> {current.examplePrompt}
          </div>

          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#00FF66", lineHeight: 1.5, background: "rgba(0, 255, 102, 0.05)", borderLeft: `2px solid ${current.color}`, padding: "8px 12px", borderRadius: "4px" }}>
            <span style={{ color: current.color, fontWeight: 700 }}>[OUTPUT]</span> {current.exampleOutput}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", fontSize: "11px", color: "#64748B", borderTop: "1px solid #1E2230", paddingTop: "14px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle2 size={14} color="#00FF66" />
            <span>Governed by ReviveOS 14-Point Financial Safety Policy Firewall.</span>
          </span>
          <span style={{ fontFamily: "var(--font-mono)", color: "#00F0FF" }}>
            One Customer → One Decision Protocol
          </span>
        </div>
      </div>
    </div>
  );
};
