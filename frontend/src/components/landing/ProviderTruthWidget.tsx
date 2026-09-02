import React, { useState } from "react";

export const ProviderTruthWidget: React.FC = () => {
  const [selectedUniverse, setSelectedUniverse] = useState<"DEMO" | "PROVIDER">("DEMO");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
      {/* Toggle Selector */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ display: "inline-flex", background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "10px", padding: "4px" }}>
          <button
            onClick={() => setSelectedUniverse("DEMO")}
            style={{
              border: "none",
              background: selectedUniverse === "DEMO" ? "rgba(112, 0, 255, 0.25)" : "transparent",
              color: selectedUniverse === "DEMO" ? "#A5B4FC" : "#64748B",
              padding: "8px 20px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "monospace",
              transition: "all 0.2s ease",
            }}
          >
            ● DEMO UNIVERSE (SYNTHETIC BENCHMARK)
          </button>
          <button
            onClick={() => setSelectedUniverse("PROVIDER")}
            style={{
              border: "none",
              background: selectedUniverse === "PROVIDER" ? "rgba(0, 255, 102, 0.2)" : "transparent",
              color: selectedUniverse === "PROVIDER" ? "#00FF66" : "#64748B",
              padding: "8px 20px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "monospace",
              transition: "all 0.2s ease",
            }}
          >
            ● RAZORPAY MODE (PROVIDER TRUTH)
          </button>
        </div>
      </div>

      {/* Side-by-Side Universe Display */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Left: Demo Universe */}
        <div
          style={{
            background: "#0F1117",
            border: selectedUniverse === "DEMO" ? "1.5px solid #7000FF" : "1px solid #1E2230",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: selectedUniverse === "DEMO" ? "0 0 30px rgba(112, 0, 255, 0.2)" : "none",
            transition: "all 0.3s ease",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#A5B4FC", fontFamily: "monospace" }}>
              DEMO UNIVERSE
            </span>
            <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: "rgba(112, 0, 255, 0.2)", color: "#A5B4FC", fontWeight: 800 }}>
              SYNTHETIC FOR EVALUATION
            </span>
          </div>

          <h4 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#FFF", margin: 0 }}>
            NovaCart Commerce (500-Case Benchmark)
          </h4>

          <p style={{ fontSize: "0.8125rem", color: "#8E9BB0", lineHeight: 1.5, margin: 0 }}>
            Designed for hackathon evaluators to test multi-agent collisions, synthetic gateway outages, and counterfactual A/B experiments under diverse edge conditions.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px", color: "#CBD5E1", borderTop: "1px solid #1E2230", paddingTop: "12px" }}>
            <div>✓ 500 Curated recovery opportunities with realistic failure distributions</div>
            <div>✓ 7 Distinct failure scenarios (mandates, abandoned carts, fraud flags)</div>
            <div>✓ Simulated PayU latency spike & automated Cashfree rerouting</div>
            <div>✓ Calibrated holdout experiments with treatment uplift verification</div>
          </div>
        </div>

        {/* Right: Live Provider Truth */}
        <div
          style={{
            background: "#0F1117",
            border: selectedUniverse === "PROVIDER" ? "1.5px solid #00FF66" : "1px solid #1E2230",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: selectedUniverse === "PROVIDER" ? "0 0 30px rgba(0, 255, 102, 0.15)" : "none",
            transition: "all 0.3s ease",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#00FF66", fontFamily: "monospace" }}>
              RAZORPAY TEST MODE
            </span>
            <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: "rgba(0, 255, 102, 0.15)", color: "#00FF66", fontWeight: 800 }}>
              100% REAL PROVIDER TRUTH
            </span>
          </div>

          <h4 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#FFF", margin: 0 }}>
            rzp_test_TVwFUQgZPsAmiC
          </h4>

          <p style={{ fontSize: "0.8125rem", color: "#8E9BB0", lineHeight: 1.5, margin: 0 }}>
            Zero synthetic contamination. When connected to your live Razorpay credentials, ReviveOS reflects only authentic provider records. If 0 declines exist, it honestly reports 0 opportunities.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px", color: "#CBD5E1", borderTop: "1px solid #1E2230", paddingTop: "12px" }}>
            <div>✓ Cryptographic HMAC-SHA256 signature verification on all webhooks</div>
            <div>✓ Strict idempotency keys on every payment link and e-mandate call</div>
            <div>✓ Integer paise precision across all ledger allocations</div>
            <div>✓ Zero synthetic fallback or fake numbers when in live provider mode</div>
          </div>
        </div>
      </div>

      {/* Positioning Statement Banner */}
      <div style={{ textAlign: "center", padding: "24px", background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "14px" }}>
        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#8E9BB0" }}>
          Razorpay moves the money.
        </div>
        <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#FFF", marginTop: "2px" }}>
          ReviveOS decides <span style={{ color: "#00F0FF" }}>whether it should move.</span>
        </div>
      </div>
    </div>
  );
};
