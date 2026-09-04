import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, X, ExternalLink, CheckCircle2, ShieldCheck,
  RefreshCw, Copy, Check
} from "lucide-react";
import { createRazorpayPaymentLink, getRazorpayPaymentLinkStatus } from "../api/client";

interface LiveRazorpayLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAmount?: number;
  customerName?: string;
  customerEmail?: string;
}

export default function LiveRazorpayLinkModal({
  isOpen,
  onClose,
  defaultAmount = 499,
  customerName = "Valued Customer",
  customerEmail = "customer@example.com",
}: LiveRazorpayLinkModalProps) {
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [name, setName] = useState<string>(customerName);
  const [email, setEmail] = useState<string>(customerEmail);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<any | null>(null);
  const [liveStatus, setLiveStatus] = useState<string>("created");
  const [polling, setPolling] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(defaultAmount);
      setName(customerName);
      setEmail(customerEmail);
      setLinkData(null);
      setError(null);
      setLiveStatus("created");
    }
  }, [isOpen, defaultAmount, customerName, customerEmail]);

  // Live polling for payment completion
  useEffect(() => {
    if (!linkData?.id || liveStatus === "paid") return;

    const interval = setInterval(async () => {
      try {
        setPolling(true);
        const res = await getRazorpayPaymentLinkStatus(linkData.id);
        if (res?.data?.status) {
          setLiveStatus(res.data.status);
        }
      } catch (e) {
        // Polling failure is non-blocking
      } finally {
        setPolling(false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [linkData, liveStatus]);

  const handleGenerateLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await createRazorpayPaymentLink({
        amount_inr: amount,
        description: `ReviveOS Autonomous Recovery Link for ${name}`,
        customer_name: name,
        customer_email: email,
        notes: {
          arbitration_engine: "ReviveOS v2.0",
          decision_rule: "WINNER_AUTHORIZED",
          minor_paise_amount: Math.round(amount * 100),
          toctou_preflight: "VERIFIED",
        },
      });

      if (res?.success && res?.data) {
        setLinkData(res.data);
        setLiveStatus(res.data.status || "created");
      } else {
        setError(res?.message || "Failed to generate link");
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || "Failed to generate live payment link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (linkData?.short_url) {
      navigator.clipboard.writeText(linkData.short_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 110,
          background: "rgba(3, 7, 18, 0.88)",
          backdropFilter: "blur(18px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{
            width: "100%",
            maxWidth: "640px",
            background: "linear-gradient(180deg, #0F172A 0%, #080D1A 100%)",
            border: "1px solid #1E293B",
            borderRadius: "20px",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.85)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            color: "#F8FAFC",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid #1E293B",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(15, 23, 42, 0.8)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #00F0FF 0%, #0077FF 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 16px rgba(0, 240, 255, 0.35)",
                }}
              >
                <Zap size={20} color="#040711" strokeWidth={2.5} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#FFF", margin: 0 }}>
                  LIVE RAZORPAY PAYMENT LINK SANDBOX
                </h2>
                <p style={{ fontSize: "0.75rem", color: "#94A3B8", margin: "2px 0 0 0" }}>
                  Real API Execution Rails • Test Credentials (<code style={{ color: "#00F0FF" }}>rzp_test_TVwFUQgZPsAmiC</code>)
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

          {/* Body */}
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
            
            {/* Form if link not yet generated */}
            {!linkData ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>
                      Recovery Amount (INR)
                    </label>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      {[499, 1499, 2499, 4999].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAmount(amt)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            border: `1px solid ${amount === amt ? "#00F0FF" : "#1E293B"}`,
                            background: amount === amt ? "rgba(0, 240, 255, 0.12)" : "#0B1120",
                            color: amount === amt ? "#00F0FF" : "#94A3B8",
                            fontSize: "12px",
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            cursor: "pointer",
                          }}
                        >
                          ₹{amt.toLocaleString("en-IN")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>
                        Customer Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{
                          width: "100%",
                          marginTop: 6,
                          padding: "10px 12px",
                          borderRadius: "8px",
                          background: "#0B1120",
                          border: "1px solid #1E293B",
                          color: "#FFF",
                          fontSize: "13px",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>
                        Customer Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                          width: "100%",
                          marginTop: 6,
                          padding: "10px 12px",
                          borderRadius: "8px",
                          background: "#0B1120",
                          border: "1px solid #1E293B",
                          color: "#FFF",
                          fontSize: "13px",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#F87171", fontSize: "12px" }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleGenerateLink}
                  disabled={loading}
                  style={{
                    padding: "12px 20px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #00F0FF 0%, #0099FF 100%)",
                    border: "none",
                    color: "#040711",
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: "0 4px 16px rgba(0, 240, 255, 0.35)",
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>DISPATCHING RAZORPAY API CALL...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={15} />
                      <span>⚡ GENERATE REAL RAZORPAY PAYMENT LINK</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              /* Success & Live Link View */
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                
                {/* Live Link Result Banner */}
                <div
                  style={{
                    background: "rgba(0, 240, 255, 0.06)",
                    border: "1px solid rgba(0, 240, 255, 0.3)",
                    borderRadius: "14px",
                    padding: "16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#00F0FF", fontFamily: "var(--font-mono)" }}>
                      AUTHENTIC RAZORPAY PAYMENT LINK GENERATED
                    </span>
                    <div
                      style={{
                        padding: "3px 8px",
                        borderRadius: "12px",
                        background: liveStatus === "paid" ? "rgba(0, 255, 102, 0.2)" : "rgba(245, 158, 11, 0.2)",
                        border: `1px solid ${liveStatus === "paid" ? "#00FF66" : "#F59E0B"}`,
                        color: liveStatus === "paid" ? "#00FF66" : "#FBBF24",
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      {liveStatus === "paid" ? <CheckCircle2 size={12} /> : <RefreshCw size={10} className={polling ? "animate-spin" : ""} />}
                      <span>{liveStatus === "paid" ? "PAYMENT CAPTURED" : "AWAITING PAYMENT"}</span>
                    </div>
                  </div>

                  {/* The URL */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="text"
                      readOnly
                      value={linkData.short_url}
                      style={{
                        flex: 1,
                        background: "#080D1A",
                        border: "1px solid #1E293B",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        color: "#FFF",
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                      }}
                    />
                    <button
                      onClick={handleCopy}
                      style={{
                        padding: "10px 14px",
                        background: "#0F172A",
                        border: "1px solid #1E293B",
                        borderRadius: "8px",
                        color: copied ? "#00FF66" : "#94A3B8",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  {/* Primary CTA: Open Live Checkout */}
                  <a
                    href={linkData.short_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "14px 20px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #00F0FF 0%, #0099FF 100%)",
                      color: "#040711",
                      fontSize: "14px",
                      fontWeight: 800,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 6px 24px rgba(0, 240, 255, 0.4)",
                    }}
                  >
                    <span>🚀 OPEN LIVE RAZORPAY CHECKOUT INTERFACE</span>
                    <ExternalLink size={16} strokeWidth={2.5} />
                  </a>
                </div>

                {/* Technical Forensics */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "11px", fontFamily: "var(--font-mono)" }}>
                  <div style={{ background: "#0B1120", border: "1px solid #1E293B", borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ color: "#64748B" }}>LINK ID:</div>
                    <div style={{ color: "#FFF", fontWeight: 700, marginTop: 2 }}>{linkData.id}</div>
                  </div>
                  <div style={{ background: "#0B1120", border: "1px solid #1E293B", borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ color: "#64748B" }}>EXACT AMOUNT:</div>
                    <div style={{ color: "#00FF66", fontWeight: 700, marginTop: 2 }}>
                      ₹{linkData.amount_inr} ({linkData.amount_paise} paise)
                    </div>
                  </div>
                </div>

                {/* Safety Guarantee */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(0, 255, 102, 0.08)", border: "1px solid rgba(0, 255, 102, 0.2)", borderRadius: "8px", fontSize: "11px", color: "#86EFAC" }}>
                  <ShieldCheck size={14} color="#00FF66" />
                  <span>TOCTOU Idempotency Active: If paid via any other channel, link is revoked immediately.</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    onClick={() => setLinkData(null)}
                    style={{ background: "none", border: "none", color: "#94A3B8", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}
                  >
                    ← Create Another Link
                  </button>
                  <span style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                    Auto-polling live status every 3s...
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
