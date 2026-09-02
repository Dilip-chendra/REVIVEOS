import React, { useEffect, useRef, useState } from "react";

interface AgentProposal {
  id: string;
  name: string;
  type: string;
  action: string;
  amount: string;
  rawAmount: number;
  lift: number;
  cost: number;
  marginLoss: number;
  status: "PENDING" | "EVALUATING" | "WINNER" | "SUPPRESSED";
  suppressReason?: string;
  color: string;
  x: number;
  y: number;
}

export const DecisionCore3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<"WITH_REVIVE" | "WITHOUT_REVIVE">("WITH_REVIVE");
  const [cycleStep, setCycleStep] = useState<number>(0);
  const activeCustomer = "Aarav Mehta (CUST-9821)";

  const [proposals, setProposals] = useState<AgentProposal[]>([
    {
      id: "PROP-SUB",
      name: "🤖 AI Subscription Agent",
      type: "MANDATE_RETRY",
      action: "Smart Retry Mandate",
      amount: "₹2,499",
      rawAmount: 2499,
      lift: 78,
      cost: 2,
      marginLoss: 0,
      status: "WINNER",
      color: "#00FF66",
      x: -165,
      y: -115,
    },
    {
      id: "PROP-CART",
      name: "🤖 AI Cart Recovery Agent",
      type: "PAYMENT_LINK",
      action: "Send WhatsApp Link",
      amount: "₹4,999",
      rawAmount: 4999,
      lift: 30,
      cost: 5,
      marginLoss: 0,
      status: "SUPPRESSED",
      suppressReason: "Lower Net Contribution (NIC)",
      color: "#00F0FF",
      x: 165,
      y: -115,
    },
    {
      id: "PROP-RET",
      name: "🤖 AI Retention Agent",
      type: "DISCOUNT_OFFER",
      action: "Offer 15% Discount",
      amount: "₹4,999",
      rawAmount: 4999,
      lift: 45,
      cost: 5,
      marginLoss: 750,
      status: "SUPPRESSED",
      suppressReason: "Destroys margin (₹750 leakage)",
      color: "#F59E0B",
      x: -165,
      y: 115,
    },
    {
      id: "PROP-COL",
      name: "🤖 AI Collections Agent",
      type: "HUMAN_ESCALATION",
      action: "Escalate to Human",
      amount: "₹4,999",
      rawAmount: 4999,
      lift: 20,
      cost: 50,
      marginLoss: 0,
      status: "SUPPRESSED",
      suppressReason: "High operational fee (₹50 rep cost)",
      color: "#A5B4FC",
      x: 165,
      y: 115,
    },
  ]);

  // Automated 2.8s live arbitration cycle when in WITH_REVIVE mode
  useEffect(() => {
    if (mode === "WITHOUT_REVIVE") return;
    const interval = setInterval(() => {
      setCycleStep((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(interval);
  }, [mode]);

  // Update proposal visual states
  useEffect(() => {
    if (mode === "WITHOUT_REVIVE") {
      setProposals((prev) =>
        prev.map((p) => ({ ...p, status: "WINNER" }))
      );
    } else {
      if (cycleStep === 0) {
        setProposals((prev) =>
          prev.map((p) => ({ ...p, status: "PENDING" }))
        );
      } else if (cycleStep === 1) {
        setProposals((prev) =>
          prev.map((p) => ({ ...p, status: "EVALUATING" }))
        );
      } else {
        setProposals((prev) =>
          prev.map((p) => ({
            ...p,
            status: p.id === "PROP-SUB" ? "WINNER" : "SUPPRESSED",
          }))
        );
      }
    }
  }, [cycleStep, mode]);

  // Canvas Particle & Laser Beam Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      time += 0.02;
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      const cx = width / 2;
      const cy = height * 0.38;

      ctx.clearRect(0, 0, width, height);

      // Subtle Engineering Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      const gridSize = 36;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (mode === "WITH_REVIVE") {
        const pulse = Math.sin(time * 2.0) * 1.5;
        
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 115);
        grad.addColorStop(0, "rgba(112, 0, 255, 0.25)");
        grad.addColorStop(0.5, "rgba(0, 240, 255, 0.1)");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 115, 0, Math.PI * 2);
        ctx.fill();

        // Outer Dashed Cyan Orbit Ring (Radius 96px)
        ctx.strokeStyle = "rgba(0, 240, 255, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 8]);
        ctx.beginPath();
        ctx.arc(cx, cy, 96 + pulse, time * 0.35, time * 0.35 + Math.PI * 2);
        ctx.stroke();

        // Inner Dashed Violet Orbit Ring (Radius 76px)
        ctx.strokeStyle = "rgba(129, 140, 248, 0.65)";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.arc(cx, cy, 76 - pulse, -time * 0.45, -time * 0.45 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Connective Laser Beams to all 4 Agent Nodes
      proposals.forEach((p, pIdx) => {
        const targetX = cx + p.x;
        const targetY = cy + p.y;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(targetX, targetY);

        if (mode === "WITHOUT_REVIVE") {
          ctx.strokeStyle = "rgba(255, 59, 48, 0.7)";
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
        } else if (p.status === "WINNER") {
          ctx.strokeStyle = "rgba(0, 255, 102, 0.95)";
          ctx.lineWidth = 2.5;
          ctx.setLineDash([]);
        } else if (p.status === "SUPPRESSED") {
          ctx.strokeStyle = "rgba(255, 59, 48, 0.3)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
        } else {
          ctx.strokeStyle = "rgba(112, 0, 255, 0.55)";
          ctx.lineWidth = 1.8;
          ctx.setLineDash([6, 6]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Pulsing Energy Packet
        const packetProgress = (time * 1.5 + pIdx * 0.25) % 1;
        const packetX = cx + (targetX - cx) * (p.status === "WINNER" ? 1 - packetProgress : packetProgress);
        const packetY = cy + (targetY - cy) * (p.status === "WINNER" ? 1 - packetProgress : packetProgress);

        ctx.fillStyle = mode === "WITHOUT_REVIVE" ? "#FF3B30" : p.status === "WINNER" ? "#00FF66" : p.status === "SUPPRESSED" ? "#FF3B30" : "#00F0FF";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(packetX, packetY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Output Laser Beam to Razorpay Rail
      const railY = cy + 220;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 55);
      ctx.lineTo(cx, railY - 14);
      ctx.strokeStyle = mode === "WITHOUT_REVIVE"
        ? "rgba(255, 59, 48, 0.8)"
        : cycleStep >= 2
        ? "rgba(0, 255, 102, 0.95)"
        : "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 2.5;
      if (cycleStep >= 2 || mode === "WITHOUT_REVIVE") {
        ctx.shadowColor = mode === "WITHOUT_REVIVE" ? "#FF3B30" : "#00FF66";
        ctx.shadowBlur = 10;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [proposals, cycleStep, mode]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "620px",
        borderRadius: "20px",
        overflow: "hidden",
        background: "radial-gradient(circle at 50% 38%, #0B1120 0%, #08090C 100%)",
        border: "1px solid #1E2230",
        boxShadow: "0 24px 64px rgba(0, 0, 0, 0.8)",
      }}
    >
      {/* Background Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />

      {/* ── 1. Top Controls: Target Badge & Mode Toggle ── */}
      <div style={{ position: "absolute", top: "14px", left: "16px", display: "flex", alignItems: "center", gap: "8px", background: "#0F1117", border: "1px solid #1E2230", borderRadius: "8px", padding: "5px 12px", backdropFilter: "blur(12px)", zIndex: 5 }}>
        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#00F0FF", boxShadow: "0 0 6px #00F0FF" }} />
        <span style={{ fontSize: "10px", color: "#8E9BB0", fontWeight: 700 }}>TARGET:</span>
        <span style={{ fontSize: "10px", color: "#F8FAFC", fontWeight: 800, fontFamily: "var(--font-mono)" }}>{activeCustomer}</span>
      </div>

      {/* Interactive Toggle: With vs Without ReviveOS */}
      <div style={{ position: "absolute", top: "14px", right: "16px", display: "flex", background: "#0F1117", border: "1px solid #1E2230", borderRadius: "8px", padding: "2px", zIndex: 5 }}>
        <button
          onClick={() => setMode("WITH_REVIVE")}
          style={{
            border: "none",
            background: mode === "WITH_REVIVE" ? "rgba(0, 255, 102, 0.2)" : "transparent",
            color: mode === "WITH_REVIVE" ? "#00FF66" : "#64748B",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "10px",
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
          }}
        >
          WITH REVIVEOS
        </button>
        <button
          onClick={() => setMode("WITHOUT_REVIVE")}
          style={{
            border: "none",
            background: mode === "WITHOUT_REVIVE" ? "rgba(255, 59, 48, 0.25)" : "transparent",
            color: mode === "WITHOUT_REVIVE" ? "#FF3B30" : "#64748B",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "10px",
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
          }}
        >
          WITHOUT REVIVEOS (CHAOS)
        </button>
      </div>

      {/* ── 2. Central Decision Core Orb (Diameter 110px, radius 55px) ── */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "38%",
          transform: "translate(-50%, -50%)",
          width: "110px",
          height: "110px",
          borderRadius: "50%",
          background: mode === "WITHOUT_REVIVE"
            ? "radial-gradient(circle at 40% 30%, #3B0707 0%, #1F0808 70%, #0A0202 100%)"
            : "radial-gradient(circle at 40% 30%, #1E1B4B 0%, #0F172A 70%, #08090C 100%)",
          border: mode === "WITHOUT_REVIVE" ? "2px solid #FF3B30" : "2px solid #7000FF",
          boxShadow: mode === "WITHOUT_REVIVE"
            ? "0 0 30px rgba(255, 59, 48, 0.55), inset 0 0 14px rgba(255, 59, 48, 0.35)"
            : "0 0 30px rgba(112, 0, 255, 0.55), inset 0 0 14px rgba(112, 0, 255, 0.35)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "4px",
          zIndex: 10,
          backdropFilter: "blur(16px)",
          userSelect: "none",
        }}
      >
        <div style={{ fontFamily: "var(--font-hero-display)", fontSize: "12px", fontWeight: 800, color: "#FFFFFF", letterSpacing: "0.06em", lineHeight: 1.1 }}>
          {mode === "WITHOUT_REVIVE" ? "NO ARBITRATION" : "REVIVEOS"}
        </div>
        
        <div style={{ fontSize: "7.5px", fontWeight: 800, color: mode === "WITHOUT_REVIVE" ? "#FF8A80" : "#A5B4FC", letterSpacing: "0.08em", marginTop: "1px", textTransform: "uppercase" }}>
          {mode === "WITHOUT_REVIVE" ? "AI COLLISION CHAOS" : "AI ARBITRATOR"}
        </div>

        <div
          style={{
            marginTop: "4px",
            padding: "2px 7px",
            borderRadius: "10px",
            background: mode === "WITHOUT_REVIVE"
              ? "rgba(255, 59, 48, 0.25)"
              : cycleStep === 1
              ? "rgba(245, 158, 11, 0.25)"
              : "rgba(0, 255, 102, 0.25)",
            border: `1px solid ${
              mode === "WITHOUT_REVIVE"
                ? "rgba(255, 59, 48, 0.6)"
                : cycleStep === 1
                ? "rgba(245, 158, 11, 0.6)"
                : "rgba(0, 255, 102, 0.6)"
            }`,
            color: mode === "WITHOUT_REVIVE" ? "#FF3B30" : cycleStep === 1 ? "#FBBF24" : "#00FF66",
            fontSize: "8px",
            fontWeight: 800,
            fontFamily: "var(--font-mono)",
          }}
        >
          {mode === "WITHOUT_REVIVE" && "4 AGENTS FIRING"}
          {mode === "WITH_REVIVE" && cycleStep === 0 && "INGESTING 4 BIDS"}
          {mode === "WITH_REVIVE" && cycleStep === 1 && "EVALUATING NIC"}
          {mode === "WITH_REVIVE" && cycleStep >= 2 && "WINNER LOCKED"}
        </div>

        <div style={{ fontSize: "8px", color: mode === "WITHOUT_REVIVE" ? "#FF3B30" : "#00F0FF", fontWeight: 700, fontFamily: "var(--font-mono)", marginTop: "3px" }}>
          {mode === "WITHOUT_REVIVE" ? "AI COLLISION: -₹800" : "AI LOCKED: +₹1,947"}
        </div>
      </div>

      {/* ── 3. Orbiting Agent Proposal Cards (All 4 Agents) ── */}
      {proposals.map((p) => {
        const isWinner = p.status === "WINNER";
        const isSuppressed = p.status === "SUPPRESSED";
        const isChaos = mode === "WITHOUT_REVIVE";

        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `calc(50% + ${p.x}px)`,
              top: `calc(38% + ${p.y}px)`,
              transform: "translate(-50%, -50%)",
              width: "215px",
              padding: "9px 12px",
              background: isChaos
                ? "rgba(255, 59, 48, 0.12)"
                : isWinner
                ? "rgba(0, 255, 102, 0.14)"
                : "rgba(15, 17, 23, 0.92)",
              border: isChaos
                ? "1.5px solid #FF3B30"
                : isWinner
                ? "1.5px solid #00FF66"
                : isSuppressed
                ? "1px solid rgba(255, 59, 48, 0.35)"
                : "1px solid #1E2230",
              borderRadius: "10px",
              backdropFilter: "blur(14px)",
              transition: "all 0.3s ease",
              boxShadow: isWinner ? "0 0 20px rgba(0, 255, 102, 0.25)" : "0 4px 16px rgba(0,0,0,0.4)",
              opacity: isSuppressed && cycleStep >= 2 && !isChaos ? 0.6 : 1,
              zIndex: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px", gap: "6px" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, color: isChaos ? "#FF3B30" : p.color, whiteSpace: "nowrap" }}>
                {p.name}
              </span>
              <span
                style={{
                  fontSize: "7.5px",
                  fontWeight: 800,
                  padding: "1px 4px",
                  borderRadius: "3px",
                  background: isChaos ? "rgba(255, 59, 48, 0.3)" : isWinner ? "#00FF66" : "rgba(255, 59, 48, 0.2)",
                  color: isChaos ? "#FFF" : isWinner ? "#000" : "#FF3B30",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {isChaos ? "FIRED" : p.status}
              </span>
            </div>

            <div style={{ fontSize: "9.5px", color: "#F8FAFC", fontWeight: 700, lineHeight: 1.2 }}>
              {p.action} <span style={{ color: "#8E9BB0" }}>({p.amount})</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", color: "#8E9BB0", borderTop: "1px solid #1E2230", paddingTop: "3px", marginTop: "3px" }}>
              <span>Lift: <strong style={{ color: "#00F0FF" }}>+{p.lift}pp</strong></span>
              <span>Cost: <strong style={{ color: p.marginLoss > 0 ? "#FF3B30" : "#00FF66" }}>{p.marginLoss > 0 ? `₹${p.marginLoss} loss` : `₹${p.cost} fee`}</strong></span>
            </div>

            {isSuppressed && cycleStep >= 2 && !isChaos && (
              <div style={{ fontSize: "7.5px", color: "#FF3B30", marginTop: "2px", fontStyle: "italic", fontWeight: 600 }}>
                ✕ {p.suppressReason}
              </div>
            )}

            {isChaos && (
              <div style={{ fontSize: "7.5px", color: "#FF3B30", marginTop: "2px", fontWeight: 700 }}>
                ⚠️ Spams customer independently!
              </div>
            )}
          </div>
        );
      })}

      {/* ── 4. Razorpay Execution Rail ── */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "calc(38% + 220px)",
          transform: "translate(-50%, -50%)",
          width: "260px",
          padding: "7px 14px",
          background: mode === "WITHOUT_REVIVE"
            ? "rgba(255, 59, 48, 0.15)"
            : cycleStep >= 2
            ? "rgba(0, 255, 102, 0.15)"
            : "#0F1117",
          border: `1.5px solid ${mode === "WITHOUT_REVIVE" ? "#FF3B30" : cycleStep >= 2 ? "#00FF66" : "#1E2230"}`,
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          boxShadow: mode === "WITHOUT_REVIVE" ? "0 0 20px rgba(255, 59, 48, 0.3)" : cycleStep >= 2 ? "0 0 20px rgba(0, 255, 102, 0.3)" : "none",
          transition: "all 0.3s ease",
          zIndex: 5,
        }}
      >
        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: mode === "WITHOUT_REVIVE" ? "#FF3B30" : cycleStep >= 2 ? "#00FF66" : "#64748B" }} />
        <span style={{ fontSize: "10px", fontWeight: 800, color: mode === "WITHOUT_REVIVE" ? "#FF3B30" : cycleStep >= 2 ? "#00FF66" : "#8E9BB0", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
          {mode === "WITHOUT_REVIVE" ? "RAZORPAY: 4 DUPLICATE CALLS" : "RAZORPAY EXECUTION RAIL"}
        </span>
      </div>

      {/* ── 5. Bottom Metrics Bar ── */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "16px",
          right: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "10px",
          color: "#8E9BB0",
          borderTop: "1px solid #1E2230",
          paddingTop: "6px",
          zIndex: 5,
        }}
      >
        <span>Formula: <strong style={{ color: "#00F0FF" }}>NIC = (τ × Amt) - Cost</strong></span>
        <span>Fatigue Budget: <strong style={{ color: "#F8FAFC" }}>1 Touch / 7 Days</strong></span>
        <span>Margin Saved: <strong style={{ color: mode === "WITHOUT_REVIVE" ? "#FF3B30" : "#00FF66" }}>{mode === "WITHOUT_REVIVE" ? "-₹800 LEAKED" : "₹750 PROTECTED"}</strong></span>
      </div>
    </div>
  );
};
