import { ShieldCheck, ArrowUpRight, Cpu, Lock } from "lucide-react";
import { LogoIcon, LogoText } from "../Logo";

interface FooterProps {
  onGetStarted?: () => void;
  onOpenDeck?: () => void;
}

export default function Footer({ onGetStarted }: FooterProps) {
  return (
    <footer
      style={{
        background: "linear-gradient(180deg, #08090C 0%, #050608 100%)",
        borderTop: "1px solid #1E2230",
        color: "#CBD5E1",
        fontFamily: "var(--font-body, sans-serif)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle Top Glow Accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "1px",
          background: "linear-gradient(90deg, transparent 0%, #00F0FF 50%, transparent 100%)",
          boxShadow: "0 0 20px #00F0FF",
        }}
      />

      {/* Live System Status Ribbon */}
      <div
        style={{
          borderBottom: "1px solid #141824",
          background: "rgba(10, 12, 16, 0.6)",
          padding: "12px 28px",
        }}
      >
        <div
          style={{
            maxWidth: 1360,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#00FF66", fontWeight: 700 }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#00FF66", boxShadow: "0 0 8px #00FF66" }} />
              SYSTEM OPERATIONAL
            </span>
            <span style={{ color: "#475569" }}>|</span>
            <span style={{ color: "#8E9BB0", display: "flex", alignItems: "center", gap: "5px" }}>
              <Cpu size={13} color="#00F0FF" /> KERNEL: KNAPSACK ARBITRATION v2.0
            </span>
            <span style={{ color: "#475569" }}>|</span>
            <span style={{ color: "#8E9BB0", display: "flex", alignItems: "center", gap: "5px" }}>
              <Lock size={13} color="#A5B4FC" /> TOCTOU CONCURRENCY LOCK: ACTIVE
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ color: "#64748B" }}>REGION: ap-south-1 (Mumbai)</span>
            <span style={{ color: "#475569" }}>|</span>
            <span style={{ color: "#00F0FF", fontWeight: 700 }}>RAZORPAY DIRECT RAILS</span>
          </div>
        </div>
      </div>

      {/* Main 4-Column Directory Grid */}
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "56px 28px 40px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "36px" }}>
          
          {/* Column 1: Brand & Core Thesis */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <LogoIcon size={30} />
              <LogoText fontSize="1.2rem" />
            </div>

            <p style={{ fontSize: "12px", color: "#8E9BB0", lineHeight: 1.6, margin: 0 }}>
              The Economic Control Plane for Autonomous Revenue Recovery. Sits between autonomous commerce agents and payment execution rails.
            </p>

            <div
              style={{
                background: "#0F1117",
                border: "1px solid #1E2230",
                borderRadius: "10px",
                padding: "10px 12px",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "#00F0FF",
                lineHeight: 1.5,
              }}
            >
              "Razorpay moves the money. ReviveOS decides whether, when, and how it should move."
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
              <span style={{ fontSize: "9px", padding: "3px 8px", borderRadius: "4px", background: "rgba(0, 255, 102, 0.12)", color: "#00FF66", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                100% AUDITABLE
              </span>
              <span style={{ fontSize: "9px", padding: "3px 8px", borderRadius: "4px", background: "rgba(0, 240, 255, 0.12)", color: "#00F0FF", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                ZERO-TRUST EXECUTION
              </span>
            </div>
          </div>

          {/* Column 2: Governance & Core Architecture */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#FFF", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              GOVERNANCE KERNEL
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
              <li>
                <a href="#coordination-problem" style={{ color: "#8E9BB0", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")} onMouseLeave={(e) => (e.currentTarget.style.color = "#8E9BB0")}>
                  Multi-Agent Collision Problem
                </a>
              </li>
              <li>
                <a href="#nic-engine" style={{ color: "#8E9BB0", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")} onMouseLeave={(e) => (e.currentTarget.style.color = "#8E9BB0")}>
                  Net Incremental Contribution (NIC)
                </a>
              </li>
              <li>
                <a href="#invariants" style={{ color: "#8E9BB0", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")} onMouseLeave={(e) => (e.currentTarget.style.color = "#8E9BB0")}>
                  5 Economic & Concurrency Invariants
                </a>
              </li>
              <li>
                <a href="#decision-core" style={{ color: "#8E9BB0", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")} onMouseLeave={(e) => (e.currentTarget.style.color = "#8E9BB0")}>
                  One Customer → One Decision
                </a>
              </li>
              <li>
                <a href="#invariants" style={{ color: "#8E9BB0", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")} onMouseLeave={(e) => (e.currentTarget.style.color = "#8E9BB0")}>
                  Deliberate Abstention (DO NOTHING)
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Simulators & Arenas */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#FFF", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              INTERACTIVE ARENAS
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
              <li>
                <button
                  onClick={onGetStarted}
                  style={{ background: "none", border: "none", padding: 0, color: "#8E9BB0", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8E9BB0")}
                >
                  <span>Agent Collision Lab</span>
                  <ArrowUpRight size={12} />
                </button>
              </li>
              <li>
                <button
                  onClick={onGetStarted}
                  style={{ background: "none", border: "none", padding: 0, color: "#8E9BB0", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8E9BB0")}
                >
                  <span>TOCTOU Race Simulator</span>
                  <ArrowUpRight size={12} />
                </button>
              </li>
              <li>
                <button
                  onClick={onGetStarted}
                  style={{ background: "none", border: "none", padding: 0, color: "#8E9BB0", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8E9BB0")}
                >
                  <span>Recovery Arena Benchmark</span>
                  <ArrowUpRight size={12} />
                </button>
              </li>
              <li>
                <button
                  onClick={onGetStarted}
                  style={{ background: "none", border: "none", padding: 0, color: "#8E9BB0", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8E9BB0")}
                >
                  <span>Counterfactual Lab (τ)</span>
                  <ArrowUpRight size={12} />
                </button>
              </li>
              <li>
                <button
                  onClick={onGetStarted}
                  style={{ background: "none", border: "none", padding: 0, color: "#8E9BB0", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8E9BB0")}
                >
                  <span>Executive Command Center</span>
                  <ArrowUpRight size={12} />
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Razorpay Security & Compliance */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#FFF", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              SAFETY & COMPLIANCE
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8E9BB0" }}>
                <ShieldCheck size={14} color="#00FF66" />
                <span>HMAC-SHA256 Signed Action Contracts</span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8E9BB0" }}>
                <ShieldCheck size={14} color="#00FF66" />
                <span>Zero Double-Debit Guarantee</span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8E9BB0" }}>
                <ShieldCheck size={14} color="#00FF66" />
                <span>RBI Article 6 Customer DND Consent</span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8E9BB0" }}>
                <ShieldCheck size={14} color="#00FF66" />
                <span>Integer Minor Units (Paise Precision)</span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8E9BB0" }}>
                <ShieldCheck size={14} color="#00FF66" />
                <span>Tamper-Evident SHA-256 Decision Ledger</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Legal & Buildathon Bar */}
      <div
        style={{
          borderTop: "1px solid #141824",
          background: "#040507",
          padding: "20px 28px",
        }}
      >
        <div
          style={{
            maxWidth: 1360,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            fontSize: "11px",
            color: "#64748B",
          }}
        >
          <div>
            © 2026 <strong>ReviveOS</strong>. Autonomous Revenue Recovery & Economic Arbitration Operating System.
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ padding: "3px 10px", borderRadius: "12px", background: "rgba(0, 240, 255, 0.08)", border: "1px solid rgba(0, 240, 255, 0.25)", color: "#00F0FF", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "10px" }}>
              🏆 Razorpay AI Revenue Recovery Track
            </span>
          </div>

          <div style={{ display: "flex", gap: "16px", fontSize: "11px" }}>
            <span style={{ color: "#475569" }}>Zero Synthetic Mixing in Live Mode</span>
            <span style={{ color: "#475569" }}>•</span>
            <span style={{ color: "#475569" }}>Deterministic Fallbacks Enabled</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
