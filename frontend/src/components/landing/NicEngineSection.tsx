import React from "react";

export const NicEngineSection: React.FC = () => {
  const variables = [
    { sym: "τ", name: "Causal Lift", def: "Incremental probability added by intervention (P(Rec|Action) - P(Rec|Nothing))", eg: "78%" },
    { sym: "Amt", name: "Gross Amount", def: "Total rupee amount at stake in the order or invoice", eg: "₹2,499" },
    { sym: "Cost", name: "Intervention Fee", def: "Out-of-pocket API charges (WhatsApp template, SMS, gateway retry)", eg: "₹4.00" },
    { sym: "Loss", name: "Margin Leakage", def: "Merchant profit destroyed by offering unnecessary discount codes", eg: "₹0.00" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", width: "100%" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontSize: "0.8125rem", color: "#00FF66", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
          THE ECONOMIC RECOVERY ARBITRATION FORMULA
        </div>
        <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", textTransform: "uppercase", margin: 0 }}>
          Maximum Value. Not Maximum Recovery.
        </h2>
        <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "680px", margin: "0 auto", lineHeight: 1.6 }}>
          Legacy bots chase large transaction amounts on hard declines. ReviveOS optimizes for Net Incremental Contribution (NIC)—the real cash yield added after all costs and discount margin leakage.
        </p>
      </div>

      <div style={{ background: "#0F1117", border: "1.5px solid #00FF66", borderRadius: "20px", padding: "28px", display: "flex", flexDirection: "column", gap: "20px", boxShadow: "0 0 35px rgba(0,255,102,0.1)" }}>
        <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "clamp(1.2rem, 2.5vw, 1.8rem)", fontWeight: 900, color: "#FFF", letterSpacing: "0.02em" }}>
          NIC = (<span style={{ color: "#00FF66" }}>τ</span> × <span style={{ color: "#00F0FF" }}>Gross Amount</span>) − <span style={{ color: "#F59E0B" }}>Intervention Cost</span> − <span style={{ color: "#FF3B30" }}>Margin Leakage</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          {variables.map((v, idx) => (
            <div key={idx} style={{ background: "#08090C", border: "1px solid #1E2230", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 900, color: "#00FF66" }}>{v.sym}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#00F0FF", fontWeight: 800 }}>{v.eg}</span>
              </div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#FFF" }}>{v.name}</div>
              <div style={{ fontSize: "10px", color: "#8E9BB0", lineHeight: 1.4 }}>{v.def}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div style={{ background: "#0A0C10", border: "1px solid rgba(255,59,48,0.3)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#FF3B30", fontWeight: 800 }}>OPPORTUNITY A (THE GROSS TRAP)</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,59,48,0.2)", color: "#FF3B30", fontWeight: 800 }}>HARD DECLINE</span>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.8rem", fontWeight: 900, color: "#FFF" }}>₹1,50,000</div>
          <div style={{ fontSize: "11px", color: "#8E9BB0" }}>Luxury E-Commerce • Causal lift τ = 4% • High chargeback penalty risk</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#FF3B30", fontWeight: 700, marginTop: "4px" }}>
            ReviveOS Decision: Route to Human Review (Zero Capital Burn)
          </div>
        </div>

        <div style={{ background: "#0A0C10", border: "1.5px solid #00FF66", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "0 0 25px rgba(0,255,102,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#00FF66", fontWeight: 800 }}>OPPORTUNITY B (HIGH YIELD)</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: "rgba(0,255,102,0.2)", color: "#00FF66", fontWeight: 800 }}>PRIORITY #1</span>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.8rem", fontWeight: 900, color: "#FFF" }}>₹2,499</div>
          <div style={{ fontSize: "11px", color: "#8E9BB0" }}>SaaS Subscription • Causal lift τ = 78% • ₹4 retry fee • 20x Yield</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#00FF66", fontWeight: 700, marginTop: "4px" }}>
            ReviveOS Decision: Immediate Autonomous Mandate Retry (NIC: +₹1,944)
          </div>
        </div>
      </div>
    </div>
  );
};
