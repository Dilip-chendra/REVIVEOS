import React from "react";
import { AlertCircle, ArrowDown, RefreshCw, Zap, Shield, PhoneCall } from "lucide-react";

export const AgentCollisionSection: React.FC = () => {
  const agents = [
    { name: "AI Subscription Agent", action: "Retry Mandate", icon: RefreshCw, color: "#00FF66", reason: "Attempting automated bank debit" },
    { name: "AI Cart Recovery Agent", action: "Send WhatsApp Link", icon: Zap, color: "#00F0FF", reason: "Sending checkout link to phone" },
    { name: "AI Retention Agent", action: "Offer 15% Discount", icon: Shield, color: "#F59E0B", reason: "Burning ₹750 merchant profit" },
    { name: "AI Collections Agent", action: "Escalate to Human", icon: PhoneCall, color: "#A5B4FC", reason: "Triggering call center task" },
  ];

  const chaosPoints = [
    { title: "4 Uncoordinated Touches", desc: "Customer bombarded across SMS, WhatsApp, Email, and Push within 5 minutes." },
    { title: "₹750 Profit Destroyed", desc: "Retention bot gave away a discount to a customer who was already going to pay." },
    { title: "Double-Debit Liability", desc: "Mandate retry fires at the same time customer clicks the WhatsApp payment link." },
    { title: "Compliance Violation", desc: "Outreach attempted after customer requested Do Not Disturb (RBI Article 6)." },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "36px", width: "100%" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontSize: "0.8125rem", color: "#FF3B30", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
          THE MULTI-AGENT COORDINATION PROBLEM
        </div>
        <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", textTransform: "uppercase", margin: 0 }}>
          Autonomous Agents Don't Coordinate.
        </h2>
        <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "680px", margin: "0 auto", lineHeight: 1.6 }}>
          Each specialized AI agent makes a locally rational decision. Without a centralized economic arbitration kernel, their combined behavior destroys margin, spams customers, and causes double-debit race conditions.
        </p>
      </div>

      <div style={{ background: "#0A0C10", border: "1px solid rgba(255, 59, 48, 0.3)", borderRadius: "20px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px", boxShadow: "0 0 40px rgba(255, 59, 48, 0.08)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          {agents.map((ag, idx) => {
            const Icon = ag.icon;
            return (
              <div
                key={idx}
                style={{
                  background: "#0F1117",
                  border: `1px solid ${ag.color}40`,
                  borderRadius: "14px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon size={16} color={ag.color} />
                  <span style={{ fontFamily: "var(--font-section-heading)", fontSize: "12px", fontWeight: 700, color: "#FFF" }}>
                    {ag.name}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: ag.color }}>
                  ▶ {ag.action}
                </div>
                <div style={{ fontSize: "10px", color: "#8E9BB0" }}>{ag.reason}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", color: "#FF3B30", fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800 }}>
          <ArrowDown size={18} />
          <span>ALL 4 AGENTS SIMULTANEOUSLY TARGET THE SAME CUSTOMER</span>
          <ArrowDown size={18} />
        </div>

        <div style={{ background: "#0F1117", border: "1.5px solid #FF3B30", borderRadius: "14px", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#FF3B30", fontWeight: 800 }}>
              COLLISION POINT: CUST-4821
            </div>
            <div style={{ fontFamily: "var(--font-section-heading)", fontSize: "18px", fontWeight: 800, color: "#FFF", marginTop: "2px" }}>
              Aarav Mehta • Failed Checkout: ₹4,999
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, padding: "4px 10px", borderRadius: "6px", background: "rgba(255,59,48,0.2)", color: "#FF3B30" }}>
            4 CONFLICTING ACTIONS PENDING
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          {chaosPoints.map((pt, pIdx) => (
            <div key={pIdx} style={{ background: "#08090C", border: "1px solid #1E2230", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#FF8A80", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertCircle size={14} color="#FF3B30" />
                <span>{pt.title}</span>
              </div>
              <p style={{ fontSize: "11px", color: "#8E9BB0", margin: 0, lineHeight: 1.4 }}>{pt.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
