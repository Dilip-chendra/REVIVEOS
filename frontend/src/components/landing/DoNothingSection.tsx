import React from "react";

export const DoNothingSection: React.FC = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", width: "100%", textAlign: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontSize: "0.8125rem", color: "#64748B", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
          INVARIANT #02: DELIBERATE ABSTENTION
        </div>
        <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", textTransform: "uppercase", margin: 0 }}>
          Sometimes the smartest recovery action is no action.
        </h2>
        <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "640px", margin: "0 auto", lineHeight: 1.6 }}>
          When banking networks experience transient 2-minute sync timeouts, 89% of transactions settle naturally within 2 hours. ReviveOS intentionally abstains from sending spam.
        </p>
      </div>

      <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "24px", padding: "48px 32px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        <div style={{ fontFamily: "var(--font-hero-display)", fontSize: "clamp(3.5rem, 8vw, 6.5rem)", fontWeight: 900, WebkitTextStroke: "2px rgba(0, 240, 255, 0.35)", color: "transparent", userSelect: "none", lineHeight: 1, letterSpacing: "0.04em" }}>
          DO NOTHING
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", width: "100%", maxWidth: "800px" }}>
          <div style={{ background: "#0F1117", border: "1px solid #1E2230", borderRadius: "12px", padding: "14px" }}>
            <div style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>NATURAL RECOVERY PROBABILITY</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 900, color: "#00F0FF", marginTop: "2px" }}>89.0%</div>
          </div>

          <div style={{ background: "#0F1117", border: "1px solid #1E2230", borderRadius: "12px", padding: "14px" }}>
            <div style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>INTERVENTION LIFT (τ)</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 900, color: "#F59E0B", marginTop: "2px" }}>+2.0pp</div>
          </div>

          <div style={{ background: "#0F1117", border: "1px solid #1E2230", borderRadius: "12px", padding: "14px" }}>
            <div style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>SAVINGS FROM ABSTENTION</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 900, color: "#00FF66", marginTop: "2px" }}>₹0 Fees • 0 Spam</div>
          </div>
        </div>

        <p style={{ fontSize: "12px", color: "#8E9BB0", maxWidth: "600px", margin: 0, lineHeight: 1.5 }}>
          ReviveOS does not treat inactivity as an error. <strong>Intentional abstention</strong> preserves merchant capital, saves gateway quota, and prevents customer fatigue.
        </p>
      </div>
    </div>
  );
};
