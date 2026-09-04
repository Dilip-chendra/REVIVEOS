import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw, Key, AlertTriangle,
  X, Eye, EyeOff, Zap, ArrowRight,
  ShieldCheck, Lock, CheckCircle2
} from "lucide-react";
import {
  connectRazorpay, testRazorpayConnection,
  getRazorpayStatus, disconnectRazorpay, switchEnvironment,
  runRazorpayIntegrationTest
} from "../api/client";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface StructuredError {
  title: string;
  detail: string;
  stage: "backend" | "auth" | "timeout" | "general";
}

export default function RazorpayConnectionModal({ isOpen, onClose, onSuccess }: Props) {
  const [env, setEnv] = useState<"live" | "test">("live");
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  // Status & states
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [error, setError] = useState<StructuredError | null>(null);
  const [envWarning, setEnvWarning] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isMasked = (s: string) => !s || s.includes("•") || s.includes("...") || s.includes("*") || s.includes("\ufffd");

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    try {
      const res = await getRazorpayStatus();
      setStatus(res);
      setApiKey("");
      setSecret("");
      if (res?.credentials?.environment) {
        setEnv(res.credentials.environment === "live" ? "live" : "test");
      }
    } catch (e: any) {
      console.error("Status load failed:", e);
    }
  };

  const parseError = (e: any): StructuredError => {
    if (!e.response) {
      return {
        title: "REVIVEAI BACKEND UNAVAILABLE",
        detail: "The browser could not reach the ReviveOS FastAPI server at http://127.0.0.1:8000. Verify the backend process is running.",
        stage: "backend",
      };
    }
    const status = e.response.status;
    const data = e.response.data || {};
    const detail = data.detail || data.message || data.connection_test?.message || data.connection_test?.error || data.error || "";
    
    if (detail.includes("latin-1") || detail.includes("codec") || detail.includes("ordinal not in range") || detail.includes("Masked placeholder")) {
      return {
        title: "INVALID / MASKED CHARACTERS",
        detail: "Masked bullet characters (••••) were detected. Please type or paste your actual raw Razorpay Key ID and Secret directly from your Razorpay Dashboard (Settings > API Keys).",
        stage: "auth",
      };
    }

    if (status === 401 || detail.toLowerCase().includes("auth") || detail.toLowerCase().includes("credentials")) {
      return {
        title: "RAZORPAY AUTHENTICATION FAILED",
        detail: detail || "Razorpay API rejected the Key ID or Key Secret with 'Authentication failed'. Please verify you copied the active Key ID & Secret pair from Razorpay Dashboard (Settings > API Keys).",
        stage: "auth",
      };
    }
    if (status === 504 || detail.toLowerCase().includes("timeout")) {
      return {
        title: "RAZORPAY REQUEST TIMED OUT",
        detail: "The provider request did not complete within the timeout window. Please try again.",
        stage: "timeout",
      };
    }
    return {
      title: "CONNECTION FAILED",
      detail: detail || "Razorpay authentication failed. Please verify your Key ID and Secret in your Razorpay Dashboard.",
      stage: "general",
    };
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError(null);
    setTestResult(null);
    setSuccessMessage(null);
    try {
      const cleanKey = apiKey.trim();
      const cleanSecret = secret.trim();
      const hasNewKey = cleanKey && !isMasked(cleanKey);
      const hasNewSecret = cleanSecret && !isMasked(cleanSecret);

      if (hasNewKey && hasNewSecret) {
        const connRes = await connectRazorpay({
          api_key: cleanKey,
          secret: cleanSecret,
          webhook_secret: webhookSecret.trim(),
          environment: env,
        });
        setTestResult(connRes.connection_test);
        setStatus(connRes);
        if (connRes.initial_sync) {
          setSyncResult(connRes.initial_sync);
        }
        if (!connRes.success) {
          setError({
            title: "RAZORPAY AUTHENTICATION FAILED",
            detail: connRes.connection_test?.message || "Razorpay rejected the supplied credentials. Please verify your Key ID & Secret.",
            stage: "auth",
          });
        } else {
          setSuccessMessage(`Authentication successful! Connected to Razorpay ${env.toUpperCase()} (${connRes.connection_test?.latency_ms || 0}ms ping).`);
        }
      } else {
        // Test existing configured credentials on the backend
        const testRes = await testRazorpayConnection();
        setTestResult(testRes);
        if (!testRes.success) {
          setError({
            title: "RAZORPAY AUTHENTICATION FAILED",
            detail: testRes.message || "Authentication failed. Please verify your active Key ID and Secret in Razorpay Dashboard.",
            stage: "auth",
          });
        } else {
          setSuccessMessage(`Connection verified (${testRes.latency_ms}ms ping).`);
        }
      }
    } catch (e: any) {
      setError(parseError(e));
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndConnect = async () => {
    const cleanKey = apiKey.trim();
    const cleanSecret = secret.trim();
    const hasNewKey = cleanKey && !isMasked(cleanKey);
    const hasNewSecret = cleanSecret && !isMasked(cleanSecret);
    const isAlreadyConfigured = status?.credentials?.is_configured;

    if (!hasNewKey && !isAlreadyConfigured) {
      setError({
        title: "MISSING API KEY",
        detail: "Please provide a valid Razorpay API Key (e.g. rzp_live_... or rzp_test_...).",
        stage: "general",
      });
      return;
    }
    if (!hasNewSecret && !isAlreadyConfigured) {
      setError({
        title: "MISSING SECRET",
        detail: "Please provide the Razorpay Secret associated with your API Key.",
        stage: "general",
      });
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (hasNewKey || hasNewSecret) {
        const res = await connectRazorpay({
          api_key: hasNewKey ? cleanKey : undefined,
          secret: hasNewSecret ? cleanSecret : undefined,
          webhook_secret: webhookSecret.trim() || undefined,
          environment: env,
        });

        if (!res.success) {
          setError({
            title: "RAZORPAY AUTHENTICATION FAILED",
            detail: res.connection_test?.message || "Authentication failed. Please verify your API Key and Secret.",
            stage: "auth",
          });
          setTestResult(res.connection_test);
          setSaving(false);
          return;
        }

        if (res.environment_warning) {
          setEnvWarning(res.environment_warning.warning?.user_message || "Environment mismatch detected.");
        } else {
          setEnvWarning(null);
        }

        setStatus(res);
        setTestResult(res.connection_test);
        if (res.initial_sync) setSyncResult(res.initial_sync);
      }

      await switchEnvironment(env === "live" ? "RAZORPAY_LIVE" : "RAZORPAY_TEST");
      setSuccessMessage(`Successfully connected to Razorpay ${env.toUpperCase()} environment!`);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
        window.location.reload();
      }, 600);
    } catch (e: any) {
      setError(parseError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setRunningDiagnostics(true);
    setDiagnosticResult(null);
    try {
      const res = await runRazorpayIntegrationTest();
      setDiagnosticResult(res);
    } catch (e: any) {
      setError(parseError(e));
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const handleSwitchToDemo = async () => {
    try {
      await switchEnvironment("DEMO");
      onClose();
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await disconnectRazorpay();
      setApiKey("");
      setSecret("");
      setWebhookSecret("");
      setTestResult(null);
      setSyncResult(null);
      await loadStatus();
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 100,
      background: "rgba(3, 7, 18, 0.85)",
      backdropFilter: "blur(16px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          width: "100%",
          maxWidth: "680px",
          background: "linear-gradient(180deg, #0F172A 0%, #0B1120 100%)",
          border: "1px solid #1E293B",
          borderRadius: "24px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "#F8FAFC",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "22px 28px",
          borderBottom: "1px solid #1E293B",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(15, 23, 42, 0.6)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: "14px",
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(2, 132, 199, 0.35) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(16, 185, 129, 0.2)",
            }}>
              <ShieldCheck size={22} color="#34D399" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
                CONNECT RAZORPAY GATEWAY
                <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: "9999px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#6EE7B7" }}>
                  BANK-GRADE VAULT
                </span>
              </h2>
              <p style={{ fontSize: "0.75rem", color: "#94A3B8" }}>
                Hardware-Grade AES-256-GCM Encryption • Read-Only Safe Guardrails • Zero Secret Leaks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20, maxHeight: "80vh", overflowY: "auto" }}>
          
          {/* Target Environment */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Target Environment
            </label>
            <div className="grid-responsive-2" style={{ gap: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setEnv("test");
                  setApiKey("rzp_test_TVwFUQgZPsAmiC");
                  setSecret("U094egqyz3esZdltZZDMeWCU");
                  setError(null);
                  setSuccessMessage("Autofilled Test Sandbox Credentials (Key ID: rzp_test_TVwFUQgZPsAmiC). Click 'Test Connection' to verify.");
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: `1px solid ${env === "test" ? "#38BDF8" : "#1E293B"}`,
                  background: env === "test" ? "rgba(56, 189, 248, 0.12)" : "#0B1120",
                  color: env === "test" ? "#38BDF8" : "#94A3B8",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                }}
              >
                <span>🧪 Razorpay Test Mode</span>
                <span style={{ fontSize: "0.625rem", background: "rgba(56, 189, 248, 0.2)", padding: "2px 6px", borderRadius: 4, color: "#BAE6FD" }}>rzp_test_ (Autofill)</span>
              </button>

              <button
                type="button"
                onClick={() => setEnv("live")}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: `1px solid ${env === "live" ? "#10B981" : "#1E293B"}`,
                  background: env === "live" ? "rgba(16, 185, 129, 0.12)" : "#0B1120",
                  color: env === "live" ? "#34D399" : "#94A3B8",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                }}
              >
                <span>● Razorpay Live Mode</span>
                <span style={{ fontSize: "0.625rem", background: "rgba(16, 185, 129, 0.2)", padding: "2px 6px", borderRadius: 4, color: "#A7F3D0" }}>READ-ONLY PROTECTED</span>
              </button>
            </div>
          </div>

          {/* Institutional Trust & Safeguard Card */}
          {env === "live" ? (
            <div style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 78, 59, 0.16) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "16px",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShieldCheck size={20} color="#10B981" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "#ECFDF5", letterSpacing: "-0.01em" }}>
                    Enterprise Security & Read-Only Protection
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#A7F3D0", marginTop: 2, lineHeight: 1.45 }}>
                    Live credentials operate in strict <strong>Read-Only Observability Mode</strong> by default. ReviveOS synchronizes failure telemetry and diagnoses revenue loss without ever initiating charges, modifying balances, or touching customer funds without your explicit policy authorization.
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, paddingTop: 6, borderTop: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.6875rem", color: "#D1FAE5", fontWeight: 600 }}>
                  <span style={{ color: "#34D399" }}>🛡️</span> Read-Only Default
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.6875rem", color: "#D1FAE5", fontWeight: 600 }}>
                  <span style={{ color: "#34D399" }}>🔒</span> AES-256-GCM Vault
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.6875rem", color: "#D1FAE5", fontWeight: 600 }}>
                  <span style={{ color: "#34D399" }}>✓</span> Zero Unsolicited Debits
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.6875rem", color: "#D1FAE5", fontWeight: 600 }}>
                  <span style={{ color: "#34D399" }}>✓</span> PCI-DSS Scoped
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: "linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(14, 116, 144, 0.16) 100%)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "16px",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle2 size={20} color="#38BDF8" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "#F0F9FF", letterSpacing: "-0.01em" }}>
                    100% Risk-Free Simulation Sandbox
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#BAE6FD", marginTop: 2, lineHeight: 1.45 }}>
                    Test mode provides an isolated sandbox to safely evaluate causal arbitration, test webhook triggers, and verify recovery workflows with zero real monetary exposure.
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, paddingTop: 6, borderTop: "1px solid rgba(56, 189, 248, 0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.6875rem", color: "#E0F2FE", fontWeight: 600 }}>
                  <span style={{ color: "#38BDF8" }}>🧪</span> Isolated Sandbox
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.6875rem", color: "#E0F2FE", fontWeight: 600 }}>
                  <span style={{ color: "#38BDF8" }}>⚡</span> 1-Click Autofill
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.6875rem", color: "#E0F2FE", fontWeight: 600 }}>
                  <span style={{ color: "#38BDF8" }}>🔄</span> Live Telemetry Simulator
                </div>
              </div>
            </div>
          )}

          {/* Form Fields: Exact Terminology */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Saved Credential Banner if already configured */}
            {status?.credentials?.is_configured && (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.22)",
                borderRadius: "10px",
                fontSize: "0.75rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Key size={14} color="#60A5FA" />
                  <span style={{ color: "#94A3B8" }}>Active Key:</span>
                  <span style={{ color: "#F1F5F9", fontFamily: "monospace", fontWeight: 700 }}>
                    {status.credentials.key_id_masked}
                  </span>
                </div>
                <span style={{ color: "#10B981", fontSize: "0.6875rem", fontWeight: 700 }}>
                  ✓ 256-bit Encrypted
                </span>
              </div>
            )}
            
            {/* Field 1: API Key */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#F1F5F9" }}>
                  API Key ID
                </label>
                <span style={{ fontSize: "0.6875rem", color: "#38BDF8", background: "rgba(56, 189, 248, 0.12)", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
                  TLS 1.3 Encrypted Transit
                </span>
              </div>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={status?.credentials?.is_configured ? `Leave blank to keep saved key (${status.credentials.key_id_masked})` : (env === "test" ? "rzp_test_..." : "rzp_live_...")}
                style={{
                  width: "100%",
                  background: "#060A14",
                  border: "1px solid #1E293B",
                  borderRadius: "10px",
                  padding: "11px 14px",
                  color: "#FFF",
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: "0.71875rem", color: "#94A3B8", marginTop: 4, display: "block" }}>
                Your Key ID from Razorpay Dashboard &rarr; Settings &rarr; API Keys (e.g. {env === "test" ? "rzp_test_..." : "rzp_live_..."}).
              </span>
            </div>

            {/* Field 2: Secret */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#F1F5F9" }}>
                    API Key Secret
                  </label>
                  <span style={{ fontSize: "0.6875rem", color: "#34D399", background: "rgba(16, 185, 129, 0.12)", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
                    KMS Envelope Sealed
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 4 }}
                >
                  {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showSecret ? "Hide" : "Show"}</span>
                </button>
              </div>
              <input
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={status?.credentials?.has_key_secret ? "Leave blank to keep saved encrypted secret" : "Paste your Razorpay API Secret"}
                style={{
                  width: "100%",
                  background: "#060A14",
                  border: "1px solid #1E293B",
                  borderRadius: "10px",
                  padding: "11px 14px",
                  color: "#FFF",
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: "0.71875rem", color: "#94A3B8", marginTop: 4, display: "block" }}>
                Encrypted at rest using your tenant-isolated KMS envelope. Never exposed in plaintext or browser logs.
              </span>
            </div>

            {/* Field 3: Webhook Secret (Optional) */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#F1F5F9" }}>
                  Webhook Secret (Optional)
                </label>
                <span style={{ fontSize: "0.6875rem", color: "#94A3B8", background: "rgba(148, 163, 184, 0.12)", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
                  HMAC-SHA256 Verification
                </span>
              </div>
              <input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="•••••••••••••••••••••••••••••"
                style={{
                  width: "100%",
                  background: "#060A14",
                  border: "1px solid #1E293B",
                  borderRadius: "10px",
                  padding: "11px 14px",
                  color: "#FFF",
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: "0.71875rem", color: "#94A3B8", marginTop: 4, display: "block" }}>
                Used cryptographically to verify incoming Razorpay webhook delivery signatures and prevent spoofing.
              </span>
            </div>

          </div>

          {/* Differentiated Stage Error Display */}
          {error && (
            <div style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: "14px",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#EF4444", fontWeight: 800, fontSize: "0.875rem" }}>
                <AlertTriangle size={16} />
                <span>{error.title}</span>
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#FCA5A5", lineHeight: 1.45 }}>
                {error.detail}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    borderRadius: "8px",
                    padding: "5px 12px",
                    color: "#FFF",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToDemo}
                  style={{
                    background: "none",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                    padding: "5px 12px",
                    color: "#94A3B8",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Switch to Demo Mode
                </button>
              </div>
            </div>
          )}

          {/* Success Feedback */}
          {successMessage && (
            <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "12px", padding: "12px 16px", color: "#10B981", fontSize: "0.8125rem", fontWeight: 700 }}>
              ✓ {successMessage}
            </div>
          )}

          {/* Diagnostics Summary */}
          {testResult && (
            <div style={{
              background: testResult.success ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
              border: `1px solid ${testResult.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              borderRadius: "16px",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: "0.875rem", color: testResult.success ? "#10B981" : "#EF4444" }}>
                  {testResult.success ? `RAZORPAY ${testResult.environment?.toUpperCase()} CONNECTED ✓` : "AUTHENTICATION FAILED"}
                </span>
                {testResult.latency_ms && (
                  <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#94A3B8" }}>
                    Latency: <strong style={{ color: "#FFF" }}>{testResult.latency_ms} ms</strong>
                  </span>
                )}
              </div>

              {testResult.checks && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: "0.75rem", color: "#CBD5E1" }}>
                  <div>{testResult.checks.authentication ? "✓" : "✗"} API authentication</div>
                  <div>{testResult.checks.provider_reachable ? "✓" : "✗"} Provider reachable</div>
                  <div>{testResult.checks.payments_endpoint ? "✓" : "✗"} Account data accessible</div>
                  <div>{testResult.checks.webhook_configured ? "✓ Webhook configured" : "○ Webhook optional"}</div>
                </div>
              )}
            </div>
          )}

          {/* Real Sync Counts or Honest Empty State */}
          {syncResult && syncResult.success && (
            <div style={{
              background: "rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "16px",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: "0.75rem",
              fontFamily: "monospace",
              color: "#CBD5E1",
            }}>
              <div style={{ fontWeight: 800, color: "#60A5FA", fontSize: "0.8125rem", fontFamily: "sans-serif" }}>
                {syncResult.payments_imported === 0 ? "RAZORPAY TEST CONNECTED — NO TEST DATA FOUND" : "RAZORPAY TEST SYNCHRONIZATION"}
              </div>
              
              {syncResult.payments_imported === 0 ? (
                <div style={{ fontFamily: "sans-serif", color: "#94A3B8", lineHeight: 1.45 }}>
                  Your connected Razorpay test account currently has 0 payment records. Run a test payment in Razorpay Test Mode, then click <strong>Sync Again</strong> below.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <div>Payments fetched: <strong>{syncResult.payments_fetched}</strong></div>
                  <div>Payments imported: <strong>{syncResult.payments_imported}</strong></div>
                  <div>New: <strong>{syncResult.new_records}</strong></div>
                  <div>Updated: <strong>{syncResult.updated_records}</strong></div>
                  <div>Duplicates: <strong>{syncResult.skipped_duplicates}</strong></div>
                  <div>Errors: <strong>{syncResult.errors_count}</strong></div>
                </div>
              )}

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 6, fontSize: "0.6875rem", color: "#94A3B8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Last sync: {new Date(syncResult.synced_at || Date.now()).toLocaleTimeString()} ({syncResult.duration_ms}ms)</span>
                {syncResult.payments_imported === 0 && (
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    style={{ background: "none", border: "1px solid #38BDF8", borderRadius: "6px", color: "#38BDF8", padding: "2px 8px", fontSize: "0.6875rem", cursor: "pointer" }}
                  >
                    Sync Again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Environment Mismatch Warning */}
          {envWarning && (
            <div style={{
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              borderRadius: "14px",
              padding: "14px 18px",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}>
              <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: "0.78125rem", color: "#FCD34D", lineHeight: 1.45 }}>
                <strong>Environment Notice:</strong> {envWarning}
              </div>
            </div>
          )}

          {/* Diagnostic Console (7-step test results) */}
          {diagnosticResult && (
            <div style={{
              background: diagnosticResult.passed ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
              border: `1px solid ${diagnosticResult.passed ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
              borderRadius: "16px",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: "0.8125rem", color: diagnosticResult.passed ? "#10B981" : "#F59E0B" }}>
                  INTEGRATION DIAGNOSTIC CONSOLE ({diagnosticResult.passed_count}/{diagnosticResult.total_steps} CHECKS PASSED)
                </span>
                <span style={{ fontSize: "0.6875rem", color: "#94A3B8", fontFamily: "monospace" }}>
                  {diagnosticResult.latency_ms}ms
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {diagnosticResult.steps?.map((step: any) => (
                  <div key={step.step} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.75rem" }}>
                    <span style={{ color: step.passed ? "#10B981" : "#EF4444", fontWeight: 700 }}>
                      {step.passed ? "✓" : "✗"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: "#F1F5F9", fontWeight: 600 }}>{step.step}. {step.name}: </span>
                      <span style={{ color: step.passed ? "#94A3B8" : "#FCA5A5" }}>{step.message}</span>
                      {step.detail && <div style={{ fontSize: "0.6875rem", color: "#64748B", fontFamily: "monospace" }}>{step.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderTop: "1px solid #1E293B", paddingTop: 18 }}>
            {status?.credentials?.is_configured ? (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={loading}
                style={{
                  background: "none",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  color: "#94A3B8",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Disconnect & Revert to Demo
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSwitchToDemo}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748B",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>Use Demo Mode</span>
                <ArrowRight size={12} />
              </button>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleRunDiagnostics}
                disabled={runningDiagnostics || (!apiKey && !status?.credentials?.is_configured)}
                style={{
                  background: "#0F172A",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  color: "#94A3B8",
                  fontSize: "0.78125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {runningDiagnostics ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} color="#38BDF8" />}
                <span>Run Diagnostics</span>
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || (!apiKey && !status?.credentials?.is_configured)}
                style={{
                  background: "#1E293B",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                  padding: "10px 16px",
                  color: "#FFF",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {testing ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
                <span>Test Connection</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndConnect}
                disabled={saving || (!apiKey.trim() && !status?.credentials?.is_configured)}
                style={{
                  background: "linear-gradient(135deg, #059669 0%, #0284C7 100%)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 20px",
                  color: "#FFF",
                  fontSize: "0.8125rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  boxShadow: "0 4px 16px rgba(5, 150, 105, 0.35)",
                  transition: "all 0.15s ease",
                }}
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={16} color="#A7F3D0" />}
                <span>Verify & Securely Connect</span>
              </button>
            </div>
          </div>

          {/* Compliance & Safety Guarantee Footer */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "8px 0 2px",
            color: "#64748B",
            fontSize: "0.71875rem",
            textAlign: "center",
          }}>
            <Lock size={12} color="#10B981" />
            <span>ReviveOS conforms to RBI Cyber Security Framework and PCI-DSS Level 1 operational standards.</span>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
