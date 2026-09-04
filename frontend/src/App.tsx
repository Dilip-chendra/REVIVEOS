import { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { Settings, LogOut, Zap, Code2, Sparkles, Scale, ShieldCheck, Menu, X } from "lucide-react";
import { resetDemo, getOnboardingStatus, getRazorpayStatus, syncRazorpayNow } from "./api/client";
import Landing from "./pages/Landing";
import OnboardingWizard from "./pages/OnboardingWizard";
import { LogoIcon, LogoText } from "./components/Logo";
import PitchDeckModal from "./components/PitchDeckModal";
import ExecutiveComplianceModal from "./components/ExecutiveComplianceModal";
import JudgeDefenseModal from "./components/JudgeDefenseModal";
import RazorpayConnectionModal from "./components/RazorpayConnectionModal";
import RawProviderInspectorModal from "./components/RawProviderInspectorModal";
import { SidebarAccordion } from "./components/SidebarAccordion";
import ErrorBoundary from "./components/ErrorBoundary";
import { AppModeProvider, useAppMode } from "./context/AppModeContext";

import { lazyRetry } from "./utils/lazyRetry";

const Dashboard           = lazyRetry(() => import("./pages/Dashboard"));
const RiskView            = lazyRetry(() => import("./pages/RiskView"));
const CaseDetail          = lazyRetry(() => import("./pages/CaseDetail"));
const HumanReview         = lazyRetry(() => import("./pages/HumanReview"));
const AuditTrail          = lazyRetry(() => import("./pages/AuditTrail"));
const Evaluation          = lazyRetry(() => import("./pages/Evaluation"));
const Impact              = lazyRetry(() => import("./pages/Impact"));
const Insights            = lazyRetry(() => import("./pages/Insights"));
const Customers           = lazyRetry(() => import("./pages/Customers"));
const SettingsPage        = lazyRetry(() => import("./pages/Settings"));
const SecurityCenter      = lazyRetry(() => import("./pages/SecurityCenter"));
const EvaluatorMode       = lazyRetry(() => import("./pages/EvaluatorMode"));
const IntelligencePage    = lazyRetry(() => import("./pages/IntelligencePage"));
const GatewayIntelligence = lazyRetry(() => import("./pages/GatewayIntelligence"));
const FailureIntelligence = lazyRetry(() => import("./pages/FailureIntelligence"));
const WebhookStudio       = lazyRetry(() => import("./pages/WebhookStudio"));
const DeveloperHub        = lazyRetry(() => import("./pages/DeveloperHub"));
const RoiCalculator       = lazyRetry(() => import("./pages/RoiCalculator"));

// ── ReviveOS 2.0 Core Engines ────────────────────────────────────────────────
const CounterfactualLab   = lazyRetry(() => import("./pages/CounterfactualLab").then(m => ({ default: m.CounterfactualLab })));
const PolicyStudio        = lazyRetry(() => import("./pages/PolicyStudio").then(m => ({ default: m.PolicyStudio })));
const JudgeMode           = lazyRetry(() => import("./pages/JudgeMode").then(m => ({ default: m.JudgeMode })));
const ChaosLab            = lazyRetry(() => import("./pages/ChaosLab").then(m => ({ default: m.ChaosLab })));
const GatewayCommander    = lazyRetry(() => import("./pages/GatewayCommander").then(m => ({ default: m.GatewayCommander })));
const Experiments         = lazyRetry(() => import("./pages/Experiments").then(m => ({ default: m.Experiments })));
const RecruiterView       = lazyRetry(() => import("./pages/RecruiterView").then(m => ({ default: m.RecruiterView })));
const RevenueCopilot      = lazyRetry(() => import("./pages/RevenueCopilot").then(m => ({ default: m.RevenueCopilot })));
const CollisionLab        = lazyRetry(() => import("./pages/CollisionLab").then(m => ({ default: m.CollisionLab })));
const ToctouSimulator     = lazyRetry(() => import("./pages/ToctouSimulator").then(m => ({ default: m.ToctouSimulator })));
const RecoveryArena       = lazyRetry(() => import("./pages/RecoveryArena").then(m => ({ default: m.RecoveryArena })));
const OpportunityQueue    = lazyRetry(() => import("./pages/OpportunityQueue"));
const RecoveryExperimentLab = lazyRetry(() => import("./pages/RecoveryExperimentLab"));
const AutonomyCenter      = lazyRetry(() => import("./pages/AutonomyCenter"));
const CommunicationQueue  = lazyRetry(() => import("./pages/CommunicationQueue"));
const PayoutControlCenter = lazyRetry(() => import("./pages/PayoutControlCenter"));


function PageLoader() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 960, margin: "0 auto" }}>
      <div className="skeleton" style={{ height: 48, width: 260 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" style={{ height: 120 }} />
      </div>
      <div className="skeleton" style={{ height: 320 }} />
    </div>
  );
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function AppLayout({ onExitDemo }: { onExitDemo?: () => void }) {
  const { isDemoMode, isRealMode, setMode } = useAppMode();
  const [showPitch, setShowPitch] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const [showDefense, setShowDefense] = useState(false);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [showInspectorModal, setShowInspectorModal] = useState(false);
  const [razorpayStatus, setRazorpayStatus] = useState<any>(null);

  const loadProviderStatus = async () => {
    try {
      const res = await getRazorpayStatus();
      setRazorpayStatus(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadProviderStatus();
  }, []);

  const handleDemo = async () => {
    try {
      await resetDemo();
      window.location.href = "/";
    } catch (e) {
      console.error(e);
    }
  };


  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentEnv = isRealMode
    ? (razorpayStatus?.active_environment && razorpayStatus.active_environment !== "DEMO" ? razorpayStatus.active_environment : "RAZORPAY_TEST")
    : "DEMO";
  const isConnected = razorpayStatus?.is_configured;

  return (
    <div className="page-shell">
      {/* ── Mobile Sidebar Backdrop Overlay ── */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar (Fixed Desktop, Off-Canvas Drawer on Tablet/Mobile) ── */}
      <aside className={`sidebar ${mobileMenuOpen ? "open" : ""}`}>
        {/* Logo & Mobile Close */}
        <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <LogoIcon size={30} />
            <LogoText fontSize="1rem" />
          </div>
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
            style={{ width: 28, height: 28 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Accordion Navigation with Auto-Close on Mobile Route Click */}
        <SidebarAccordion onNavigate={() => setMobileMenuOpen(false)} />

        {/* Bottom User Area */}
        <div style={{ padding: "12px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "4px", flexShrink: 0, marginTop: "auto", background: "var(--bg-surface)", zIndex: 10 }}>
          <NavLink
            to="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            <Settings size={15} strokeWidth={1.8} />
            <span>Settings</span>
          </NavLink>
          {onExitDemo && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onExitDemo();
              }}
              className="nav-link"
              style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer", color: "var(--text-tertiary)" }}
            >
              <LogOut size={15} strokeWidth={1.8} />
              <span>Exit Demo Mode</span>
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "0 20px",
          height: "60px",
          minHeight: "60px",
          background: "rgba(10, 15, 29, 0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 40,
          flexWrap: "nowrap",
        }}>
          {/* Left Group: Mobile Menu Button + Data Source & Connection */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Hamburger Menu Toggle on Tablet/Mobile */}
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              title="Open Navigation"
            >
              <Menu size={18} />
            </button>

            {/* Segmented Data Source Control */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              padding: "3px 4px",
              borderRadius: "10px",
              background: "#060A14",
              border: "1px solid #1E293B",
            }}>
              <button
                type="button"
                onClick={async () => {
                  await setMode("demo");
                  window.location.reload();
                }}
                style={{
                  padding: "4px 12px",
                  borderRadius: "7px",
                  border: "none",
                  background: isDemoMode ? "rgba(59, 130, 246, 0.22)" : "transparent",
                  color: isDemoMode ? "#60A5FA" : "#94A3B8",
                  fontWeight: isDemoMode ? 800 : 600,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: "0.65rem", color: isDemoMode ? "#60A5FA" : "#64748B" }}>
                  {isDemoMode ? "●" : "○"}
                </span>
                <span>Demo Mode</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await setMode("real");
                  window.location.reload();
                }}
                style={{
                  padding: "4px 12px",
                  borderRadius: "7px",
                  border: "none",
                  background: isRealMode ? "rgba(16, 185, 129, 0.22)" : "transparent",
                  color: isRealMode ? "#34D399" : "#94A3B8",
                  fontWeight: isRealMode ? 800 : 600,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: "0.65rem", color: isRealMode ? "#10B981" : "#64748B" }}>
                  {isRealMode ? "●" : "○"}
                </span>
                <span>Real Mode</span>
              </button>
            </div>

            {/* Provider Connection Indicator / Trigger */}
            <button
              type="button"
              className="razorpay-topbar-btn"
              onClick={() => setShowRazorpayModal(true)}
              title={isConnected ? `Connected: ${razorpayStatus?.credentials?.key_id_masked || "Active"} • Click to configure` : "Connect your Razorpay account"}
              style={{
                background: isConnected
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.05) 100%)"
                  : "linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.05) 100%)",
                border: `1px solid ${isConnected ? "rgba(16, 185, 129, 0.35)" : "rgba(59, 130, 246, 0.35)"}`,
                boxShadow: isConnected ? "0 0 12px rgba(16, 185, 129, 0.18)" : "none",
              }}
            >
              {/* Pulsing Status Dot */}
              <span style={{ position: "relative", display: "flex", width: 7, height: 7 }}>
                {isConnected && (
                  <span
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      backgroundColor: "#10B981",
                      opacity: 0.75,
                      animation: "ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite",
                    }}
                  />
                )}
                <span
                  style={{
                    position: "relative",
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: isConnected ? "#10B981" : "#60A5FA",
                  }}
                />
              </span>

              {/* Razorpay Brand Icon */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.5 2L5 13H12L9.5 22L19 11H12L14.5 2Z" fill={isConnected ? "#10B981" : "#60A5FA"} />
              </svg>

              <span style={{
                fontWeight: 700,
                fontSize: "0.74rem",
                color: isConnected ? "#34D399" : "#93C5FD",
                letterSpacing: "0.01em",
              }}>
                {isConnected ? "Razorpay Connected" : "Connect Razorpay"}
              </span>

              {isConnected && (
                <span style={{
                  fontSize: "0.62rem",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "#6EE7B7",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}>
                  {razorpayStatus?.credentials?.environment === "live" ? "LIVE" : "TEST"}
                </span>
              )}
            </button>

            {/* Raw Provider Data Inspector */}
            {isConnected && (
              <button
                type="button"
                onClick={() => setShowInspectorModal(true)}
                title="Inspect safely redacted raw provider JSON telemetry"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 9px",
                  borderRadius: "8px",
                  background: "rgba(56, 189, 248, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  color: "#38BDF8",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <Code2 size={12} />
                <span className="topbar-label-desktop">Raw Data</span>
              </button>
            )}
          </div>

          {/* Right Group: Presentation, Actions, & Profile */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Pitch Deck */}
            <motion.button
              onClick={() => setShowPitch(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="btn btn-secondary btn-sm"
              title="Open Investor Pitch Deck"
              style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 10px", whiteSpace: "nowrap" }}
            >
              <Sparkles size={13} color="var(--accent)" />
              <span className="topbar-label-desktop">Pitch Deck</span>
            </motion.button>

            {/* Judge Q&A */}
            <motion.button
              onClick={() => setShowDefense(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="btn btn-secondary btn-sm"
              title="Open Judge Defense & Architecture Q&A"
              style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 10px", whiteSpace: "nowrap" }}
            >
              <Scale size={13} color="var(--warning-text)" />
              <span className="topbar-label-desktop">Judge Q&A</span>
            </motion.button>

            {/* Board Proof */}
            <motion.button
              onClick={() => setShowCompliance(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="btn btn-secondary btn-sm"
              title="View Cryptographic Compliance Certificate"
              style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 10px", whiteSpace: "nowrap" }}
            >
              <ShieldCheck size={13} color="var(--success-text)" />
              <span className="topbar-label-desktop">Board Proof</span>
            </motion.button>

            {/* Contextual Action Button */}
            {currentEnv === "DEMO" ? (
              <motion.button
                onClick={handleDemo}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="btn btn-primary btn-sm"
                style={{ fontSize: "0.75rem", padding: "5px 12px", whiteSpace: "nowrap" }}
              >
                Reset Demo
              </motion.button>
            ) : (
              <motion.button
                onClick={async () => {
                  try {
                    await syncRazorpayNow();
                    window.location.reload();
                  } catch (e) {
                    console.error(e);
                  }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="btn btn-primary btn-sm"
                style={{ fontSize: "0.75rem", padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}
              >
                <Zap size={12} />
                <span>Sync Live</span>
              </motion.button>
            )}

            {/* User Auth */}
            <SignedIn>
              <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8 rounded-lg" } }} />
            </SignedIn>
            <SignedOut>
              <div
                title="Demo Administrator Session"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: "#FFF",
                  boxShadow: "0 0 8px rgba(59, 130, 246, 0.4)",
                  cursor: "default",
                  flexShrink: 0,
                }}
              >
                D
              </div>
            </SignedOut>
          </div>
        </header>

        {/* Global Environment Isolation Banner */}
        {currentEnv === "DEMO" && (
          <div style={{
            background: "linear-gradient(90deg, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.4) 100%)",
            borderBottom: "1px solid rgba(59, 130, 246, 0.25)",
            padding: "6px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#93C5FD",
            flexWrap: "wrap",
            gap: "8px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#60A5FA", boxShadow: "0 0 6px #60A5FA" }} />
              <span><strong>DEMO UNIVERSE (NovaCart Commerce)</strong>: All records, agent proposals, and outcomes on this screen are synthetic evaluation data. No real customer or provider action is represented.</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "11px", color: "#60A5FA", background: "rgba(59, 130, 246, 0.15)", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                SIMULATION COHORT
              </span>
              <button
                onClick={handleDemo}
                style={{ background: "rgba(59, 130, 246, 0.25)", border: "1px solid rgba(59, 130, 246, 0.4)", color: "#BFDBFE", borderRadius: "4px", padding: "2px 8px", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}
              >
                Reset Demo State
              </button>
            </div>
          </div>
        )}

        {(currentEnv === "RAZORPAY_TEST" || currentEnv === "RAZORPAY_LIVE" || currentEnv === "REAL") && (
          <div style={{
            background: "linear-gradient(90deg, rgba(6, 78, 59, 0.25) 0%, rgba(15, 23, 42, 0.4) 100%)",
            borderBottom: "1px solid rgba(16, 185, 129, 0.25)",
            padding: "8px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#6EE7B7",
            flexWrap: "wrap",
            gap: "8px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 6px #10B981" }} />
              <span><strong>REAL MODE (Razorpay Test Environment)</strong>: Authenticated against live Razorpay Test rails ({razorpayStatus?.credentials?.key_id_masked || "rzp_test_TVw..."}). Demo data is completely disabled.</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "11px", color: "#A7F3D0", background: "rgba(16, 185, 129, 0.15)", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                ZERO SYNTHETIC FALLBACK
              </span>
              <button
                onClick={async () => {
                  try {
                    await syncRazorpayNow();
                    window.location.reload();
                  } catch (e) {
                    console.error(e);
                  }
                }}
                style={{ background: "rgba(16, 185, 129, 0.25)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#D1FAE5", borderRadius: "4px", padding: "2px 8px", cursor: "pointer", fontSize: "11px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Zap size={12} /> Sync Live Activity
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="page-content">
          <ErrorBoundary section="ReviveOS Workspace">
            <Suspense fallback={<PageLoader />}>
              <PageTransition>
                <Routes>
                  <Route path="/"                      element={<Dashboard />} />
                  <Route path="/recovery-experiments"  element={<RecoveryExperimentLab />} />
                  <Route path="/opportunities"         element={<OpportunityQueue />} />
                  <Route path="/communications"        element={<CommunicationQueue />} />
                  <Route path="/automation"            element={<AutonomyCenter />} />
                  <Route path="/autonomy"              element={<AutonomyCenter />} />
                  <Route path="/payouts"               element={<PayoutControlCenter />} />
                  <Route path="/collision-lab"         element={<CollisionLab />} />
                  <Route path="/toctou"                element={<ToctouSimulator />} />
                  <Route path="/recovery-arena"        element={<RecoveryArena />} />
                  <Route path="/counterfactual-lab"    element={<CounterfactualLab />} />
                  <Route path="/policy-studio"         element={<PolicyStudio />} />
                  <Route path="/judge-mode"            element={<JudgeMode />} />
                  <Route path="/chaos-lab"             element={<ChaosLab />} />
                  <Route path="/gateway-commander"     element={<GatewayCommander />} />
                  <Route path="/experiments"           element={<Experiments />} />
                  <Route path="/recruiter-audit"       element={<RecruiterView />} />
                  <Route path="/copilot"               element={<RevenueCopilot />} />
                  <Route path="/webhook-studio"        element={<WebhookStudio />} />
                  <Route path="/risk"                  element={<RiskView />} />
                  <Route path="/risk/:id"              element={<CaseDetail />} />
                  <Route path="/case/:id"              element={<CaseDetail />} />
                  <Route path="/human-review"          element={<HumanReview />} />
                  <Route path="/failure-intelligence"  element={<FailureIntelligence />} />
                  <Route path="/intelligence"          element={<IntelligencePage />} />
                  <Route path="/gateway-intelligence"  element={<GatewayIntelligence />} />
                  <Route path="/customers"             element={<Customers />} />
                  <Route path="/calculator"            element={<RoiCalculator />} />
                  <Route path="/impact"                element={<Impact />} />
                  <Route path="/insights"              element={<Insights />} />
                  <Route path="/security"              element={<SecurityCenter />} />
                  <Route path="/audit"                 element={<AuditTrail />} />
                  <Route path="/integrations"          element={<DeveloperHub />} />
                  <Route path="/evaluator"             element={<EvaluatorMode />} />
                  <Route path="/evaluation"            element={<Evaluation />} />
                  <Route path="/settings"              element={<SettingsPage />} />
                  <Route path="/recovery"              element={<OpportunityQueue />} />
                  <Route path="/queue"                 element={<OpportunityQueue />} />
                  <Route path="/portfolio"             element={<OpportunityQueue />} />
                  <Route path="/cases"                 element={<OpportunityQueue />} />
                  <Route path="/desk"                  element={<Dashboard />} />
                  <Route path="/dashboard"             element={<Dashboard />} />
                  <Route path="/simulator"             element={<CounterfactualLab />} />
                  <Route path="/developers"            element={<DeveloperHub />} />
                  <Route path="*"                      element={<Dashboard />} />
                </Routes>
              </PageTransition>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Modals */}
      <PitchDeckModal isOpen={showPitch} onClose={() => setShowPitch(false)} />
      <ExecutiveComplianceModal isOpen={showCompliance} onClose={() => setShowCompliance(false)} />
      <JudgeDefenseModal isOpen={showDefense} onClose={() => setShowDefense(false)} />
      <RazorpayConnectionModal
        isOpen={showRazorpayModal}
        onClose={() => setShowRazorpayModal(false)}
        onSuccess={() => {
          loadProviderStatus();
          window.location.reload();
        }}
      />
      <RawProviderInspectorModal
        isOpen={showInspectorModal}
        onClose={() => setShowInspectorModal(false)}
      />
    </div>
  );
}

function AuthenticatedApp({ onExitDemo }: { onExitDemo?: () => void }) {
  // Top MNC standard: Instant entry, never block workspace with a questionnaire.
  const [onboarded, setOnboarded] = useState<boolean>(() => {
    // If completed/skipped previously, or session active, allow immediate access
    return (
      localStorage.getItem("revive_onboarded") === "true" ||
      localStorage.getItem("revive_onboarding_skipped") === "true"
    );
  });

  useEffect(() => {
    // If already marked onboarded locally, background verify with backend
    if (localStorage.getItem("revive_onboarded") === "true") {
      getOnboardingStatus().catch(() => {});
      return;
    }

    getOnboardingStatus()
      .then((d: { onboarded: boolean }) => {
        if (d?.onboarded) {
          localStorage.setItem("revive_onboarded", "true");
          setOnboarded(true);
        } else {
          // If fresh user who has never onboarded, show wizard
          setOnboarded(false);
        }
      })
      .catch(() => {
        // Fallback for offline or resilient access: drop directly into dashboard
        localStorage.setItem("revive_onboarded", "true");
        setOnboarded(true);
      });
  }, []);

  const handleComplete = () => {
    localStorage.setItem("revive_onboarded", "true");
    setOnboarded(true);
  };

  const isExplicitWizard = typeof window !== "undefined" && window.location.search.includes("wizard=true");

  if (!onboarded || isExplicitWizard) {
    return <OnboardingWizard onComplete={handleComplete} />;
  }

  return <AppLayout onExitDemo={onExitDemo} />;
}

export default function App() {
  const [hasEnteredWorkspace, setHasEnteredWorkspace] = useState<boolean>(() => {
    return (
      localStorage.getItem("revive_session_active") === "true" ||
      localStorage.getItem("revive_demo_mode") === "true" ||
      localStorage.getItem("revive_app_mode") === "real" ||
      localStorage.getItem("revive_app_mode") === "demo"
    );
  });

  const handleEnterWorkspace = () => {
    localStorage.setItem("revive_session_active", "true");
    localStorage.setItem("revive_demo_mode", "true");
    localStorage.setItem("revive_onboarded", "true");
    setHasEnteredWorkspace(true);
  };

  const handleExitWorkspace = () => {
    localStorage.removeItem("revive_session_active");
    localStorage.removeItem("revive_demo_mode");
    localStorage.removeItem("revive_onboarded");
    setHasEnteredWorkspace(false);
  };

  return (
    <AppModeProvider>
      <BrowserRouter>
        <SignedIn>
          {/* Real Authenticated ReviveOS Workspace (Clerk verified) */}
          <AuthenticatedApp onExitDemo={hasEnteredWorkspace ? handleExitWorkspace : undefined} />
        </SignedIn>
        <SignedOut>
          {hasEnteredWorkspace ? (
            /* Synthetic NovaCart Evaluation Universe or Real Test Sandbox */
            <AuthenticatedApp onExitDemo={handleExitWorkspace} />
          ) : (
            /* Public Landing Page & Clerk Auth Gateway */
            <Landing onEnterDemo={handleEnterWorkspace} />
          )}
        </SignedOut>
      </BrowserRouter>
    </AppModeProvider>
  );
}
