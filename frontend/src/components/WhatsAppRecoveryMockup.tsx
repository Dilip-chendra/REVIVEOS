import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Smartphone, CheckCircle2, ShieldCheck,
  CreditCard, Lock, RefreshCw, Sparkles
} from "lucide-react";

interface WhatsAppMockupProps {
  customerName?: string;
  merchantName?: string;
  amountInr?: number;
  failureReason?: string;
  scenarioType?: string;
  onPaymentSuccess?: () => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

export default function WhatsAppRecoveryMockup({
  customerName = "Rahul Sharma",
  merchantName = "CloudCRM Pro",
  amountInr = 150000,
  failureReason = "Weekend card velocity limit",
  scenarioType = "card_expired",
  onPaymentSuccess
}: WhatsAppMockupProps) {
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [paymentState, setPaymentState] = useState<"idle" | "authorizing" | "success">("idle");
  const [activeUpiApp] = useState<string>("GPay");

  const handle1TapPay = () => {
    setPaymentState("authorizing");
    setTimeout(() => {
      setPaymentState("success");
      if (onPaymentSuccess) onPaymentSuccess();
    }, 1200);
  };

  const handleReset = () => {
    setPaymentState("idle");
  };

  const isCardExpired = scenarioType === "card_expired" || failureReason.toLowerCase().includes("expired");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "420px", margin: "0 auto", width: "100%" }}>
      {/* Channel Selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-overlay)", padding: "4px", borderRadius: "10px", border: "1px solid var(--border)" }}>
        <button
          onClick={() => setChannel("whatsapp")}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: "8px", border: "none",
            background: channel === "whatsapp" ? "#25D366" : "transparent",
            color: channel === "whatsapp" ? "#000" : "var(--text-secondary)",
            fontWeight: 700, fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            cursor: "pointer", transition: "all 0.2s"
          }}
        >
          <MessageSquare size={14} /> WhatsApp Business
        </button>
        <button
          onClick={() => setChannel("sms")}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: "8px", border: "none",
            background: channel === "sms" ? "var(--accent)" : "transparent",
            color: channel === "sms" ? "#000" : "var(--text-secondary)",
            fontWeight: 700, fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            cursor: "pointer", transition: "all 0.2s"
          }}
        >
          <Smartphone size={14} /> Smart SMS Intent
        </button>
      </div>

      {/* Smartphone Outer Chassis */}
      <div
        style={{
          background: "#0c0d0e",
          border: "4px solid #27272a",
          borderRadius: "36px",
          padding: "16px 12px 20px",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Dynamic Island / Speaker Notch */}
        <div style={{ width: "90px", height: "18px", background: "#000", borderRadius: "10px", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#18181b" }} />
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#27272a" }} />
        </div>

        {/* WhatsApp App Top Bar */}
        {channel === "whatsapp" ? (
          <div style={{ background: "#075E54", borderRadius: "16px 16px 0 0", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px", color: "#fff" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#128C7E", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.8125rem" }}>
              {merchantName.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "-0.01em" }}>{merchantName}</span>
                <ShieldCheck size={13} color="#25D366" />
              </div>
              <div style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.75)" }}>Verified Enterprise Account</div>
            </div>
            <span style={{ fontSize: "0.625rem", background: "rgba(255,255,255,0.15)", padding: "2px 6px", borderRadius: "4px" }}>
              Official
            </span>
          </div>
        ) : (
          <div style={{ background: "#18181b", borderRadius: "16px 16px 0 0", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px", color: "var(--text-primary)", borderBottom: "1px solid var(--border)" }}>
            <Smartphone size={16} color="var(--accent)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: 700 }}>VM-{merchantName.substring(0, 6).toUpperCase()}</div>
              <div style={{ fontSize: "0.625rem", color: "var(--text-tertiary)" }}>Smart Payment Dispatch</div>
            </div>
            <span style={{ fontSize: "0.625rem", color: "var(--text-tertiary)" }}>12:42 PM</span>
          </div>
        )}

        {/* Message Container */}
        <div
          style={{
            background: channel === "whatsapp" ? "#0b141a" : "#09090b",
            padding: "16px 10px",
            minHeight: "340px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            fontSize: "0.8125rem",
            position: "relative"
          }}
        >
          {/* Timestamp Pill */}
          <div style={{ alignSelf: "center", background: "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: "6px", fontSize: "0.625rem", color: "var(--text-tertiary)" }}>
            TODAY · 12:42 PM
          </div>

          {/* Incoming Message Bubble */}
          <div
            style={{
              background: channel === "whatsapp" ? "#1f2c34" : "#18181b",
              color: "#e9edef",
              borderRadius: "12px",
              padding: "12px 14px",
              maxWidth: "92%",
              boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}
          >
            <div style={{ fontWeight: 700, color: "#25D366", display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={13} /> {merchantName} Billing Alert
            </div>

            <p style={{ margin: 0, lineHeight: 1.45, color: "#d1d7db", fontSize: "0.75rem" }}>
              Hi <strong>{customerName}</strong>, your recent renewal of <strong>{fmt(amountInr)}</strong> could not be processed due to: <em>{failureReason}</em>.
            </p>

            <div style={{ background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", fontSize: "0.6875rem" }}>
              <div style={{ color: "var(--text-tertiary)" }}>Involuntary Churn Protection:</div>
              <div style={{ color: "#25D366", fontWeight: 600 }}>Your subscription & data remain 100% active.</div>
            </div>

            {/* Interactive Recovery Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
              {isCardExpired ? (
                <button
                  onClick={handle1TapPay}
                  disabled={paymentState !== "idle"}
                  style={{
                    background: "#25D366",
                    color: "#000",
                    border: "none",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    fontWeight: 800,
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer"
                  }}
                >
                  <CreditCard size={14} /> Update Card Details (1-Click)
                </button>
              ) : (
                <button
                  onClick={handle1TapPay}
                  disabled={paymentState !== "idle"}
                  style={{
                    background: "#25D366",
                    color: "#000",
                    border: "none",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    fontWeight: 800,
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer"
                  }}
                >
                  <Lock size={13} /> 1-Tap Pay {fmt(amountInr)} via UPI
                </button>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <button
                  onClick={() => alert("Simulated: Opening NetBanking Portal")}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "var(--text-secondary)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    fontSize: "0.6875rem",
                    cursor: "pointer"
                  }}
                >
                  NetBanking
                </button>
                <button
                  onClick={() => alert("Simulated: Support ticket connected.")}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "var(--text-secondary)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    fontSize: "0.6875rem",
                    cursor: "pointer"
                  }}
                >
                  Need Help?
                </button>
              </div>
            </div>

            <div style={{ fontSize: "0.5625rem", color: "var(--text-tertiary)", textAlign: "right" }}>
              12:42 PM · Delivered ✓✓
            </div>
          </div>

          {/* Authorizing / Success Modal Overlay inside phone */}
          <AnimatePresence>
            {paymentState === "authorizing" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "absolute",
                  inset: "10px",
                  background: "rgba(0,0,0,0.92)",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  zIndex: 20,
                  textAlign: "center"
                }}
              >
                <div className="status-dot live" />
                <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.875rem" }}>
                  Triggering UPI Intent ({activeUpiApp})...
                </div>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-secondary)" }}>
                  Connecting to NPCI Fast Payment Gateway
                </div>
              </motion.div>
            )}

            {paymentState === "success" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "absolute",
                  inset: "10px",
                  background: "rgba(11, 20, 26, 0.96)",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  zIndex: 20,
                  textAlign: "center",
                  border: "1px solid rgba(37, 211, 102, 0.3)"
                }}
              >
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(37, 211, 102, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle2 size={28} color="#25D366" />
                </div>
                <div style={{ fontWeight: 800, color: "#25D366", fontSize: "1rem" }}>
                  {fmt(amountInr)} Captured!
                </div>
                <div style={{ fontSize: "0.6875rem", color: "#d1d7db", lineHeight: 1.4 }}>
                  Payment confirmed via UPI Intent. Instant GST tax invoice sent to customer WhatsApp.
                </div>
                <button
                  onClick={handleReset}
                  style={{
                    marginTop: "8px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "0.6875rem",
                    cursor: "pointer"
                  }}
                >
                  <RefreshCw size={11} style={{ display: "inline", marginRight: "4px" }} /> Reset Simulation
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Home Indicator Bar */}
        <div style={{ width: "120px", height: "4px", background: "rgba(255,255,255,0.3)", borderRadius: "2px", margin: "14px auto 0" }} />
      </div>
    </div>
  );
}
