import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { Settings, LogOut, Zap, Code2, Sparkles, Scale, ShieldCheck, Menu, X } from "lucide-react";
import { resetDemo, getOnboardingStatus, getRazorpayStatus, switchEnvironment, syncRazorpayNow } from "./api/client";
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

const Dashboard           = lazy(() => import("./pages/Dashboard"));
const RiskView            = lazy(() => import("./pages/RiskView"));
const CaseDetail          = lazy(() => import("./pages/CaseDetail"));
const HumanReview         = lazy(() => import("./pages/HumanReview"));
const AuditTrail          = lazy(() => import("./pages/AuditTrail"));
const Evaluation          = lazy(() => import("./pages/Evaluation"));
const Impact              = lazy(() => import("./pages/Impact"));
const Insights            = lazy(() => import("./pages/Insights"));
const Customers           = lazy(() => import("./pages/Customers"));
const SettingsPage        = lazy(() => import("./pages/Settings"));
const SecurityCenter      = lazy(() => import("./pages/SecurityCenter"));
const EvaluatorMode       = lazy(() => import("./pages/EvaluatorMode"));
const IntelligencePage    = lazy(() => import("./pages/IntelligencePage"));
const GatewayIntelligence = lazy(() => import("./pages/GatewayIntelligence"));
const FailureIntelligence = lazy(() => import("./pages/FailureIntelligence"));
const WebhookStudio       = lazy(() => import("./pages/WebhookStudio"));
const DeveloperHub        = lazy(() => import("./pages/DeveloperHub"));
const RoiCalculator       = lazy(() => import("./pages/RoiCalculator"));

// ── ReviveOS 2.0 Core Engines ────────────────────────────────────────────────
const CounterfactualLab   = lazy(() => import("./pages/CounterfactualLab").then(m => ({ default: m.CounterfactualLab })));
const PolicyStudio        = lazy(() => import("./pages/PolicyStudio").then(m => ({ default: m.PolicyStudio })));
const JudgeMode           = lazy(() => import("./pages/JudgeMode").then(m => ({ default: m.JudgeMode })));
const ChaosLab            = lazy(() => import("./pages/ChaosLab").then(m => ({ default: m.ChaosLab })));
const GatewayCommander    = lazy(() => import("./pages/GatewayCommander").then(m => ({ default: m.GatewayCommander })));
const Experiments         = lazy(() => import("./pages/Experiments").then(m => ({ default: m.Experiments })));
const RecruiterView       = lazy(() => import("./pages/RecruiterView").then(m => ({ default: m.RecruiterView })));
const RevenueCopilot      = lazy(() => import("./pages/RevenueCopilot").then(m => ({ default: m.RevenueCopilot })));
const CollisionLab        = lazy(() => import("./pages/CollisionLab").then(m => ({ default: m.CollisionLab })));
const ToctouSimulator     = lazy(() => import("./pages/ToctouSimulator").then(m => ({ default: m.ToctouSimulator })));
const RecoveryArena       = lazy(() => import("./pages/RecoveryArena").then(m => ({ default: m.RecoveryArena })));
const OpportunityQueue    = lazy(() => import("./pages/OpportunityQueue"));


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
  const [showPitch, setShowPitch] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const [showDefense, setShowDefense] = useState(false);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [showInspectorModal, setShowInspectorModal] = useState(false);
  const [razorpayStatus, setRazorpayStatus] = useState<any>(null);

  useEffect(() => {
    loadProviderStatus();
  }, []);

  const loadProviderStatus = async () => {
    try {
      const res = await getRazorpayStatus();
      setRazorpayStatus(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDemo = async () => {
    try {
      await resetDemo();
      window.location.href = "/";
    } catch (e) {
      console.error(e);
    }
  };

  const handleSwitchEnv = async (targetEnv: "DEMO" | "RAZORPAY_TEST" | "RAZORPAY_LIVE") => {
    try {
      localStorage.setItem("reviveai_active_environment", targetEnv);
      await switchEnvironment(targetEnv);
      await loadProviderStatus();
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentEnv = razorpayStatus?.active_environment || "DEMO";
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
                onClick={() => handleSwitchEnv("DEMO")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "7px",
                  border: "none",
                  background: (!isConnected || currentEnv === "DEMO") ? "rgba(59, 130, 246, 0.22)" : "transparent",
                  color: (!isConnected || currentEnv === "DEMO") ? "#60A5FA" : "#94A3B8",
                  fontWeight: (!isConnected || currentEnv === "DEMO") ? 800 : 600,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: "0.55rem" }}>●</span>
                <span>Demo Mode</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchEnv("RAZORPAY_TEST")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "7px",
                  border: "none",
                  background: (currentEnv === "RAZORPAY_TEST" || currentEnv === "RAZORPAY_LIVE" || currentEnv === "REAL") ? "rgba(16, 185, 129, 0.22)" : "transparent",
                  color: (currentEnv === "RAZORPAY_TEST" || currentEnv === "RAZORPAY_LIVE" || currentEnv === "REAL") ? "#10B981" : "#94A3B8",
                  fontWeight: (currentEnv === "RAZORPAY_TEST" || currentEnv === "RAZORPAY_LIVE" || currentEnv === "REAL") ? 800 : 600,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: "0.55rem", color: (currentEnv === "RAZORPAY_TEST" || currentEnv === "RAZORPAY_LIVE" || currentEnv === "REAL") ? "#10B981" : "#64748B" }}>●</span>
                <span>Real Mode</span>
              </button>
            </div>

            {/* Provider Connection Indicator / Trigger */}
            <button
              type="button"
              onClick={() => setShowRazorpayModal(true)}
              title={isConnected ? `Active Key: ${razorpayStatus?.credentials?.key_id_masked}` : "Connect your Razorpay account"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: "8px",
                background: isConnected ? "rgba(16, 185, 129, 0.08)" : "rgba(59, 130, 246, 0.08)",
                border: `1px solid ${isConnected ? "rgba(16, 185, 129, 0.25)" : "rgba(59, 130, 246, 0.25)"}`,
                color: isConnected ? "#10B981" : "#60A5FA",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Zap size={12} />
              <span>{isConnected ? (razorpayStatus?.credentials?.key_id_masked || "Connected") : "Connect Razorpay"}</span>
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
                  <Route path="/opportunities"         element={<OpportunityQueue />} />
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
                  <Route path="/cases"                 element={<OpportunityQueue />} />
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
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    getOnboardingStatus()
      .then((d: { onboarded: boolean }) => setOnboarded(d?.onboarded ?? true))
      .catch(() => setOnboarded(true));
  }, []);

  if (onboarded === null) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-base)", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
      </div>
    );
  }

  if (!onboarded) return <OnboardingWizard onComplete={() => setOnboarded(true)} />;

  return <AppLayout onExitDemo={onExitDemo} />;
}

export default function App() {
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    return localStorage.getItem("revive_demo_mode") === "true";
  });

  const handleEnterDemo = () => {
    localStorage.setItem("revive_demo_mode", "true");
    setIsDemo(true);
  };

  const handleExitDemo = () => {
    localStorage.removeItem("revive_demo_mode");
    setIsDemo(false);
  };

  return (
    <BrowserRouter>
      {isDemo ? (
        <AuthenticatedApp onExitDemo={handleExitDemo} />
      ) : (
        <>
          <SignedIn><AuthenticatedApp /></SignedIn>
          <SignedOut><Landing onEnterDemo={handleEnterDemo} /></SignedOut>
        </>
      )}
    </BrowserRouter>
  );
}
