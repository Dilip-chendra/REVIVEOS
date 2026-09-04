import { useState } from "react";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { X, ArrowRight, ShieldCheck } from "lucide-react";
import { Navbar } from "../components/landing/Navbar";
import { AgentCollisionSection } from "../components/landing/AgentCollisionSection";
import { WithWithoutToggle } from "../components/landing/WithWithoutToggle";
import { AiAgentSwarm } from "../components/landing/AiAgentSwarm";
import { NicEngineSection } from "../components/landing/NicEngineSection";
import { DoNothingSection } from "../components/landing/DoNothingSection";
import { InvariantsInteractive } from "../components/landing/InvariantsInteractive";
import { DecisionCore3D } from "../components/landing/DecisionCore3D";
import { DecisionReceiptView } from "../components/landing/DecisionReceiptView";
import { ProviderTruthWidget } from "../components/landing/ProviderTruthWidget";
import { ModuleMatrix } from "../components/landing/ModuleMatrix";
import { ConversionTerminal } from "../components/landing/ConversionTerminal";
import { DynamicHeroText } from "../components/landing/DynamicHeroText";
import RazorpayLogo from "../components/common/RazorpayLogo";
import { LogoIcon } from "../components/Logo";
import Footer from "../components/landing/Footer";
// ── New Championship Sections ─────────────────────────────────────────────────
import { FiveQuestionsSection } from "../components/landing/FiveQuestionsSection";
import { PainPointsSection } from "../components/landing/PainPointsSection";
import { ToctouInteractiveDemo } from "../components/landing/ToctouInteractiveDemo";
import { StrategySimulatorSection } from "../components/landing/StrategySimulatorSection";
import { RevenueWaterfallSection } from "../components/landing/RevenueWaterfallSection";
import { BatchDemoSection } from "../components/landing/BatchDemoSection";

type View = "landing" | "signin" | "signup";

export interface LandingProps {
  onEnterDemo?: () => void;
}

const clerkAppearance = {
  layout: { showOptionalFields: false },
  variables: {
    colorPrimary: "#00F0FF",
    colorBackground: "#08090C",
    colorInputBackground: "#0F1117",
    colorInputText: "#EEF1F8",
    colorText: "#EEF1F8",
    colorTextSecondary: "#8E9BB0",
    colorBorder: "#1E2230",
    borderRadius: "10px",
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    fontSize: "14px",
  },
  elements: {
    card: { background: "#08090C", border: "1px solid #1E2230", boxShadow: "0 32px 64px rgba(0,0,0,0.8)", borderRadius: "16px", padding: "28px" },
    headerTitle: { color: "#EEF1F8", fontSize: "20px", fontWeight: "700" },
    headerSubtitle: { color: "#8E9BB0" },
    formButtonPrimary: { background: "linear-gradient(135deg, #00F0FF 0%, #0099FF 100%)", color: "#040711", borderRadius: "8px", fontWeight: "700" },
    formFieldInput: { background: "#0F1117", border: "1px solid #1E2230", color: "#EEF1F8", borderRadius: "8px" },
    formFieldLabel: { color: "#8E9BB0", fontSize: "12px", fontWeight: "600" },
    dividerLine: { background: "rgba(255,255,255,0.06)" },
    dividerText: { color: "#8E9BB0" },
    socialButtonsBlockButton: { background: "#0F1117", border: "1px solid #1E2230", color: "#EEF1F8", borderRadius: "8px" },
    footerActionLink: { color: "#00F0FF" },
  },
};

export default function Landing({ onEnterDemo }: LandingProps) {
  const [view, setView] = useState<View>("landing");

  const handleSignIn = () => {
    setView("signin");
  };

  const handleSignUp = () => {
    setView("signup");
  };

  const handleDemo = () => {
    if (onEnterDemo) {
      onEnterDemo();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#08090C",
        color: "#CBD5E1",
        fontFamily: "var(--font-body, sans-serif)",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      {/* Clean Public Navigation */}
      <Navbar
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onEnterDemo={handleDemo}
      />

      {/* Modal Dialog for Clerk Sign-In / Sign-Up */}
      {view !== "landing" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(4, 6, 12, 0.85)",
            backdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setView("landing");
          }}
        >
          <div
            style={{
              position: "relative",
              minWidth: "360px",
              maxWidth: "480px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => setView("landing")}
              title="Close modal"
              style={{
                position: "absolute",
                top: -16,
                right: -16,
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#0F1117",
                border: "1px solid #1E2230",
                color: "#CBD5E1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 20,
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              }}
            >
              <X size={18} />
            </button>

            {/* Quick View Toggle Header */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "#0F1117",
                border: "1px solid #1E2230",
                borderRadius: "10px",
                padding: "4px",
                marginBottom: "16px",
                zIndex: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setView("signin")}
                style={{
                  padding: "6px 16px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: 700,
                  fontFamily: "var(--font-section-heading)",
                  border: "none",
                  cursor: "pointer",
                  background: view === "signin" ? "#00F0FF" : "transparent",
                  color: view === "signin" ? "#040711" : "#8E9BB0",
                  transition: "all 0.2s ease",
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setView("signup")}
                style={{
                  padding: "6px 16px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: 700,
                  fontFamily: "var(--font-section-heading)",
                  border: "none",
                  cursor: "pointer",
                  background: view === "signup" ? "#00F0FF" : "transparent",
                  color: view === "signup" ? "#040711" : "#8E9BB0",
                  transition: "all 0.2s ease",
                }}
              >
                Create Account
              </button>
            </div>

            <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
              {view === "signin" ? (
                <SignIn
                  appearance={clerkAppearance}
                  routing="virtual"
                  fallbackRedirectUrl="/"
                  signUpFallbackRedirectUrl="/"
                />
              ) : (
                <SignUp
                  appearance={clerkAppearance}
                  routing="virtual"
                  fallbackRedirectUrl="/"
                  signInFallbackRedirectUrl="/"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Master Content Stream */}
      <main style={{ display: "flex", flexDirection: "column", gap: "100px", paddingTop: "120px", paddingBottom: "80px" }}>
        
        {/* ── SECTION 01: HERO SECTION ───────────────────────────── */}
        <section style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "28px" }}>
          
          {/* ── EYEBROW: AUTONOMOUS AGENT GOVERNANCE BADGE ───────────────── */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "6px 18px",
              borderRadius: "9999px",
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              boxShadow: "0 0 24px rgba(0, 240, 255, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.12)",
            }}
          >
            {/* Live Pulsing Radar Dot */}
            <span
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "8px",
                height: "8px",
              }}
            >
              <span
                className="animate-ping"
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: "#00F0FF",
                  opacity: 0.75,
                }}
              />
              <span
                style={{
                  position: "relative",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#00F0FF",
                  boxShadow: "0 0 8px #00F0FF",
                }}
              />
            </span>

            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#E2E8F0",
                letterSpacing: "0.02em",
                fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>Financial Agent Governance</span>
              <span style={{ color: "rgba(255, 255, 255, 0.25)" }}>·</span>
              <span
                style={{
                  background: "linear-gradient(135deg, #00F0FF 0%, #38BDF8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: 700,
                }}
              >
                Economic Arbitration
              </span>
            </span>
          </div>

          <DynamicHeroText />

          <p
            style={{
              fontSize: "clamp(1.05rem, 1.6vw, 1.25rem)",
              color: "#94A3B8",
              maxWidth: "820px",
              lineHeight: 1.65,
              margin: 0,
              fontWeight: 400,
              textAlign: "center",
            }}
          >
            When payments fail, uncoordinated bots spam customers and give away needless discounts.{" "}
            <span style={{ color: "#F8FAFC", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <LogoIcon size={18} style={{ verticalAlign: "middle" }} />
              <span>
                <span style={{ color: "#FFFFFF" }}>Revive</span>
                <span
                  style={{
                    background: "linear-gradient(135deg, #6366F1 0%, #38BDF8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  OS
                </span>
              </span>
              {" "}is the smart decision brain
            </span>
            {" "}that picks the exact right recovery action — protecting your customer experience while recovering lost revenue automatically.
          </p>

          {/* ── ARCHITECTURE GUARANTEE STRIP ─────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              padding: "12px 20px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.65) 0%, rgba(10, 15, 26, 0.8) 100%)",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              maxWidth: "760px",
              width: "100%",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(0, 240, 255, 0.08)",
                  border: "1px solid rgba(0, 240, 255, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={16} color="#00F0FF" />
              </div>
              <div style={{ fontSize: "0.8125rem", lineHeight: 1.45 }}>
                <strong style={{ color: "#F8FAFC", fontWeight: 700 }}>
                  Deterministic Economic Arbiter
                </strong>
                <span style={{ color: "#64748B", margin: "0 6px" }}>—</span>
                <span style={{ color: "#94A3B8" }}>
                  Coordinates multi-agent workflows, enforces 5 mathematical invariants, and guarantees zero customer friction.
                </span>
              </div>
            </div>

            <div
              className="hidden sm:inline-flex"
              style={{
                alignItems: "center",
                padding: "3px 10px",
                borderRadius: "9999px",
                background: "rgba(0, 240, 255, 0.08)",
                border: "1px solid rgba(0, 240, 255, 0.25)",
                color: "#00F0FF",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                fontFamily: "var(--font-mono)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              100% DETERMINISTIC
            </div>
          </div>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }}>
            {/* Enter Demo Mode Button */}
            <button
              type="button"
              onClick={handleDemo}
              title="Launch synthetic NovaCart evaluation universe"
              style={{
                padding: "14px 28px",
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
                boxShadow: "0 6px 24px rgba(0, 240, 255, 0.35)",
              }}
            >
              <span>EXPLORE DEMO UNIVERSE</span>
              <ArrowRight size={15} strokeWidth={2.5} />
            </button>

            {/* Sign In Button */}
            <button
              type="button"
              onClick={handleSignIn}
              title="Sign in with your Clerk credentials"
              style={{
                padding: "14px 24px",
                borderRadius: "10px",
                background: "#0A0C10",
                border: "1px solid #1E2230",
                color: "#CBD5E1",
                fontFamily: "var(--font-section-heading)",
                fontSize: "13px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>SIGN IN TO WORKSPACE</span>
            </button>

            <a
              href="#architecture"
              style={{
                padding: "14px 24px",
                borderRadius: "10px",
                background: "#0A0C10",
                border: "1px solid #1E2230",
                color: "#CBD5E1",
                fontFamily: "var(--font-section-heading)",
                fontSize: "13px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              EXPLORE ARCHITECTURE
            </a>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", width: "100%", maxWidth: "900px", marginTop: "16px" }}>
            {[
              { label: "ARBITRATION LATENCY", val: "12ms" },
              { label: "DISCOUNT LEAKAGE SAVED", val: "₹8,42,000" },
              { label: "TOCTOU RACE REVOCATIONS", val: "100% BLOCKED" },
              { label: "AI HALLUCINATION RATE", val: "0.00%" },
            ].map((m, idx) => (
              <div key={idx} style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "10px", padding: "12px 16px" }}>
                <div style={{ fontSize: "9px", color: "#64748B", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>{m.label}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 800, color: "#00F0FF", marginTop: "2px" }}>{m.val}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 02: AGENT COLLISION PROBLEM ─────────────────── */}
        <section id="coordination-problem" style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%" }}>
          <AgentCollisionSection />
        </section>

        {/* ── SECTION 03: WITH VS WITHOUT REVIVEOS ───────────────── */}
        <section style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%" }}>
          <WithWithoutToggle />
        </section>

        {/* ── SECTION 04: AUTONOMOUS AI AGENT SWARM ───────────────── */}
        <section id="ai-swarm" style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%", display: "flex", flexDirection: "column", gap: "28px" }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "0.8125rem", color: "#00F0FF", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
              AUTONOMOUS MULTI-AGENT SWARM
            </div>
            <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.2vw, 2.7rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", textTransform: "uppercase", margin: 0 }}>
              Meet the Specialized AI Workers
            </h2>
            <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "640px", margin: "0 auto", lineHeight: 1.6 }}>
              AI workers collaborate, submit structured proposals, and diagnose failures with Google Gemini 2.0 Flash reasoning—strictly bounded by deterministic economic laws.
            </p>
          </div>
          <AiAgentSwarm />
        </section>

        {/* ── SECTION 05: NIC ECONOMIC ENGINE ─────────────────────── */}
        <section id="nic-engine" style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%" }}>
          <NicEngineSection />
        </section>

        {/* ── SECTION 06: DELIBERATE ABSTENTION / DO NOTHING ───────── */}
        <section style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%" }}>
          <DoNothingSection />
        </section>

        {/* ── SECTION 07: 5 INVARIANTS INTERACTIVE ────────────────── */}
        <section id="invariants" style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%", display: "flex", flexDirection: "column", gap: "28px" }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "0.8125rem", color: "#00F0FF", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
              SYSTEMATIC SAFETY ARCHITECTURE
            </div>
            <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.2vw, 2.7rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", textTransform: "uppercase", margin: 0 }}>
              The 5 Core Economic & Concurrency Invariants
            </h2>
            <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "640px", margin: "0 auto", lineHeight: 1.6 }}>
              Mathematical and concurrency guarantees enforced across every transaction before touching payment execution rails.
            </p>
          </div>
          <InvariantsInteractive />
        </section>

        {/* ── SECTION 08: ORBITAL DECISION CORE ──────────────────── */}
        <section id="decision-core" style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%", display: "flex", flexDirection: "column", gap: "28px" }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "0.8125rem", color: "#00F0FF", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
              LIVE ARBITRATION KERNEL
            </div>
            <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.2vw, 2.7rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", textTransform: "uppercase", margin: 0 }}>
              One Customer → One Recovery Decision
            </h2>
            <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "640px", margin: "0 auto", lineHeight: 1.6 }}>
              Interactive visualizer of multi-agent proposals converging on the ReviveOS Knapsack Arbitration Kernel.
            </p>
          </div>
          <DecisionCore3D />
        </section>

        {/* ── SECTION 09: CRYPTOGRAPHIC DECISION RECEIPT ──────────── */}
        <section style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%", display: "flex", flexDirection: "column", gap: "28px" }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "0.8125rem", color: "#00F0FF", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
              FORENSIC AUDITABILITY
            </div>
            <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.2vw, 2.7rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", textTransform: "uppercase", margin: 0 }}>
              Tamper-Evident SHA-256 Decision Receipts
            </h2>
            <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "640px", margin: "0 auto", lineHeight: 1.6 }}>
              Every authorized action and suppression decision generates an immutable, signed cryptographic receipt in integer paise precision.
            </p>
          </div>
          <DecisionReceiptView />
        </section>

        {/* ── SECTION 10: PROVIDER TRUTH BOUNDARY ─────────────────── */}
        <section id="provider-truth" style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%", display: "flex", flexDirection: "column", gap: "28px" }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "0.8125rem", color: "#00F0FF", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
              DATA PROVENANCE & ISOLATION
            </div>
            <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.2vw, 2.7rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", textTransform: "uppercase", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
              <span>Demo Universe vs</span>
              <RazorpayLogo height="0.82em" variant="white" glow />
              <span>Provider Truth</span>
            </h2>
            <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "640px", margin: "0 auto", lineHeight: 1.6 }}>
              Zero synthetic contamination. Real mode displays only genuine <RazorpayLogo height="0.95em" variant="white" style={{ margin: "0 4px" }} /> transaction telemetry with honest zero-data states.
            </p>
          </div>
          <ProviderTruthWidget />
        </section>

        {/* ── SECTION 11: 11 CONTROL PLANE MODULES ────────────────── */}
        <section id="architecture" style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%", display: "flex", flexDirection: "column", gap: "28px" }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "0.8125rem", color: "#00F0FF", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
              COMPLETE CONTROL PLANE TOPOLOGY
            </div>
            <h2 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(2rem, 3.2vw, 2.7rem)", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", textTransform: "uppercase", margin: 0 }}>
              11 Integrated Financial Modules
            </h2>
            <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "640px", margin: "0 auto", lineHeight: 1.6 }}>
              From capital allocation to policy firewalls and counterfactual labs—explore the full architecture.
            </p>
          </div>
          <ModuleMatrix />
        </section>


        {/* ── SECTION 12: CONVERSION TERMINAL ─────────────────────── */}
        <section style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%" }}>
          <ConversionTerminal onLaunchSandbox={handleDemo} onConnectProvider={handleSignIn} />
        </section>

        {/* ── SECTION NEW-A: 5 QUESTIONS FRAMEWORK ─────────────────── */}
        <section id="thesis" style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%" }}>
          <FiveQuestionsSection />
        </section>

        {/* ── SECTION NEW-B: 7 PAIN POINTS ─────────────────────────── */}
        <section id="pain-points" style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%" }}>
          <PainPointsSection />
        </section>

        {/* ── SECTION NEW-C: TOCTOU INTERACTIVE DEMO ───────────────── */}
        <section id="toctou" style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%" }}>
          <ToctouInteractiveDemo />
        </section>

        {/* ── SECTION NEW-D: 7-STRATEGY SIMULATOR ──────────────────── */}
        <section id="strategy-simulator" style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%" }}>
          <StrategySimulatorSection />
        </section>

        {/* ── SECTION NEW-E: REVENUE ATTRIBUTION WATERFALL ─────────── */}
        <section id="attribution" style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%" }}>
          <RevenueWaterfallSection />
        </section>

        {/* ── SECTION NEW-F: BATCH DEMO ─────────────────────────────── */}
        <section id="batch-demo" style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%" }}>
          <BatchDemoSection />
        </section>

        {/* ── SECTION 13: FINAL VISION & ENTERPRISE CTA ───────────── */}
        <section style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", width: "100%" }}>
          <div style={{ background: "linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(112, 0, 255, 0.08) 100%)", border: "1px solid rgba(0, 240, 255, 0.3)", borderRadius: "24px", padding: "56px 32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", boxShadow: "0 0 50px rgba(0, 240, 255, 0.1)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#00F0FF", letterSpacing: "0.15em" }}>
              THE CONTROL PLANE FOR AUTONOMOUS COMMERCE
            </div>

            <h2 style={{ fontFamily: "var(--font-hero-display)", fontSize: "clamp(2.2rem, 4vw, 3.4rem)", fontWeight: 800, color: "#FFF", margin: 0, maxWidth: "800px", lineHeight: 1.1 }}>
              Autonomous Commerce Needs a Control Plane.
            </h2>

            <p style={{ fontSize: "1rem", color: "#8E9BB0", maxWidth: "660px", margin: 0, lineHeight: 1.6 }}>
              As financial agents become increasingly autonomous, merchants need more than another retry bot. They need a system that can arbitrate competing actions, protect customer attention, preserve profit margin, and verify execution before money moves.
            </p>

            <button
              type="button"
              onClick={handleDemo}
              style={{
                padding: "16px 36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #00F0FF 0%, #0099FF 100%)",
                color: "#040711",
                fontFamily: "var(--font-section-heading)",
                fontSize: "14px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginTop: "12px",
                boxShadow: "0 8px 30px rgba(0, 240, 255, 0.4)",
              }}
            >
              <span>ENTER RECOVERY ARENA</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>

            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#64748B", marginTop: "10px" }}>
              ReviveOS — Governing the decisions behind autonomous revenue recovery.
            </div>
          </div>
        </section>

      </main>

      {/* Global Footer */}
      <Footer onGetStarted={handleSignIn} />
    </div>
  );
}
