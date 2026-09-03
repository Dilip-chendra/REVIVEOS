import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Building2,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShoppingCart,
  Laptop,
  Repeat,
  Briefcase,
  Layers,
  ShieldCheck,
  Sparkles,
  Lock,
} from "lucide-react";
import { completeOnboarding } from "../api/client";

// ── Types ─────────────────────────────────────────────────────────────────────
interface WizardData {
  business_name: string;
  business_type: string;
  business_size: string;
  payment_platform: string;
}

interface OnboardingWizardProps {
  onComplete: () => void;
}

// ── Business Type Definitions ────────────────────────────────────────────────
const BUSINESS_TYPES = [
  {
    value: "ecommerce",
    label: "E-commerce & D2C",
    desc: "Online retail, consumer brands, and multi-vendor marketplaces",
    icon: ShoppingCart,
    accent: "#10B981",
    tag: "High checkout drop recovery",
  },
  {
    value: "saas",
    label: "SaaS & Cloud Software",
    desc: "B2B and B2C software subscriptions, user seat licensing",
    icon: Laptop,
    accent: "#38BDF8",
    tag: "Involuntary churn prevention",
  },
  {
    value: "subscription",
    label: "Recurring & Memberships",
    desc: "OTT media, recurring billing boxes, content subscriptions",
    icon: Repeat,
    accent: "#A78BFA",
    tag: "Smart retry scheduling",
  },
  {
    value: "b2b",
    label: "B2B & Enterprise Services",
    desc: "Corporate services, high-ticket invoicing, Net-30 accounts",
    icon: Briefcase,
    accent: "#FACC15",
    tag: "Customer sovereignty guardrails",
  },
  {
    value: "other",
    label: "Fintech & Other Models",
    desc: "Marketplaces, education, health, logistics, hybrid business models",
    icon: Layers,
    accent: "#F472B6",
    tag: "Custom multi-agent workflows",
  },
];

// ── Business Size Definitions ────────────────────────────────────────────────
const BUSINESS_SIZES = [
  {
    value: "small",
    label: "Starter / Early Stage",
    range: "< ₹10 Lakhs / mo",
    desc: "Building baseline revenue predictability",
    potRecovery: "~₹35,000 / mo",
  },
  {
    value: "medium",
    label: "Growth Stage",
    range: "₹10L – ₹1 Crore / mo",
    desc: "Active transaction volume with payment drops",
    potRecovery: "~₹1,85,000 / mo",
  },
  {
    value: "large",
    label: "Scale-Up",
    range: "₹1Cr – ₹10 Crores / mo",
    desc: "Multi-gateway and high-traffic checkout flows",
    potRecovery: "~₹12,40,000 / mo",
  },
  {
    value: "enterprise",
    label: "Enterprise",
    range: "> ₹10 Crores / mo",
    desc: "Complex recurring infrastructure & custom routing",
    potRecovery: "₹50 Lakhs+ / mo",
  },
];

// ── Payment Platform Definitions ─────────────────────────────────────────────
const PAYMENT_PLATFORMS = [
  {
    value: "razorpay",
    label: "Razorpay",
    desc: "Native Deep Integration (Standard / Subscriptions / Links)",
    popular: true,
    badge: "Official Partner Rail",
  },
  {
    value: "payu",
    label: "PayU",
    desc: "Enterprise payment gateway routing & UPI fallback",
    popular: false,
    badge: "Multi-Route Support",
  },
  {
    value: "cashfree",
    label: "Cashfree",
    desc: "Auto-collect, payment links & payout rails",
    popular: false,
    badge: "Webhooks Ready",
  },
  {
    value: "stripe",
    label: "Stripe",
    desc: "Global card processing & recurring billing",
    popular: false,
    badge: "International",
  },
  {
    value: "other",
    label: "Multi-Gateway / Custom",
    desc: "Hybrid or proprietary payment aggregation setup",
    popular: false,
    badge: "Flexible API",
  },
];

// ── Animation variants ────────────────────────────────────────────────────────
const slide = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
};

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | "creating" | "done">(1);
  const [data, setData] = useState<WizardData>({
    business_name: "",
    business_type: "",
    business_size: "",
    payment_platform: "",
  });
  const [error, setError] = useState("");

  const update = (key: keyof WizardData, value: string) =>
    setData((d) => ({ ...d, [key]: value }));

  const handleComplete = async () => {
    setStep("creating");
    setError("");
    try {
      await completeOnboarding(data);
      setStep("done");
      setTimeout(onComplete, 1600);
    } catch (e: any) {
      console.error("Onboarding error:", e);
      const msg = e?.response?.data?.detail || e?.message || "Failed to initialize workspace. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
      setStep(3);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#060A14",
        backgroundImage: "radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.14) 0%, rgba(6, 10, 20, 0.95) 75%)",
        padding: "32px 16px",
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#F8FAFC",
      }}
    >
      {/* Glow Orbs behind card */}
      <div
        style={{
          position: "fixed",
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "300px",
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "680px",
        }}
      >
        {/* Top Header & Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
            padding: "0 8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 16px rgba(37, 99, 235, 0.5)",
              }}
            >
              <Zap size={20} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em", color: "#FFFFFF" }}>
                ReviveOS
              </div>
              <div style={{ fontSize: "0.7rem", color: "#60A5FA", fontWeight: 600 }}>
                Enterprise Revenue Recovery Engine
              </div>
            </div>
          </div>

          {/* Stepper Progress */}
          {typeof step === "number" && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {[
                { s: 1, label: "Profile" },
                { s: 2, label: "Scale & Rails" },
                { s: 3, label: "Launch" },
              ].map(({ s, label }) => {
                const isActive = step === s;
                const isPassed = step > s;
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        background: isActive
                          ? "rgba(59, 130, 246, 0.2)"
                          : isPassed
                          ? "rgba(16, 185, 129, 0.15)"
                          : "rgba(30, 41, 59, 0.6)",
                        border: `1px solid ${
                          isActive
                            ? "rgba(59, 130, 246, 0.5)"
                            : isPassed
                            ? "rgba(16, 185, 129, 0.4)"
                            : "rgba(51, 65, 85, 0.5)"
                        }`,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          color: isActive ? "#60A5FA" : isPassed ? "#34D399" : "#64748B",
                        }}
                      >
                        {isPassed ? "✓" : s}
                      </span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: isActive ? "#F8FAFC" : isPassed ? "#CBD5E1" : "#64748B",
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Main Card */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "20px",
            padding: "32px",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          }}
        >
          <AnimatePresence mode="wait">
            {/* ── Step 1: Business Profile & Type ── */}
            {step === 1 && (
              <motion.div key="step1" {...slide} transition={{ duration: 0.25 }}>
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#60A5FA",
                      }}
                    >
                      Step 1 of 3
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#475569" }}>•</span>
                    <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>Business Identity</span>
                  </div>
                  <h1
                    style={{
                      fontSize: "1.65rem",
                      fontWeight: 800,
                      color: "#F8FAFC",
                      margin: "0 0 8px 0",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Tell us about your business
                  </h1>
                  <p style={{ fontSize: "0.88rem", color: "#94A3B8", margin: 0, lineHeight: 1.5 }}>
                    This parameters help ReviveOS tailor autonomous recovery policies, threshold guardrails, and customer communication tone.
                  </p>
                </div>

                {/* Business Name Field */}
                <div style={{ marginBottom: "26px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#CBD5E1",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Building2 size={14} color="#60A5FA" />
                      Business / Merchant Name
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "#64748B", fontWeight: 500, textTransform: "none" }}>
                      As registered on gateway
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Payments Pvt Ltd or NovaCart Retail"
                    value={data.business_name}
                    onChange={(e) => update("business_name", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "13px 16px",
                      borderRadius: "12px",
                      background: "#090E1A",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      color: "#F8FAFC",
                      fontSize: "0.92rem",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#3B82F6";
                      e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.25)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(148, 163, 184, 0.2)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Business Type Selector */}
                <div style={{ marginBottom: "28px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#CBD5E1",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: "10px",
                    }}
                  >
                    Select Business Model & Archetype
                  </label>

                  <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                    {BUSINESS_TYPES.map((bt) => {
                      const Icon = bt.icon;
                      const isSelected = data.business_type === bt.value;
                      return (
                        <div
                          key={bt.value}
                          onClick={() => update("business_type", bt.value)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 16px",
                            borderRadius: "12px",
                            background: isSelected ? "rgba(37, 99, 235, 0.14)" : "rgba(11, 18, 34, 0.8)",
                            border: `1px solid ${isSelected ? "#3B82F6" : "rgba(148, 163, 184, 0.14)"}`,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            boxShadow: isSelected ? "0 4px 16px rgba(37, 99, 235, 0.2)" : "none",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.35)";
                              e.currentTarget.style.background = "rgba(15, 23, 42, 0.9)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.14)";
                              e.currentTarget.style.background = "rgba(11, 18, 34, 0.8)";
                            }
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                background: isSelected ? "rgba(59, 130, 246, 0.25)" : "rgba(30, 41, 59, 0.6)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: isSelected ? "#60A5FA" : bt.accent,
                              }}
                            >
                              <Icon size={18} />
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span
                                  style={{
                                    fontSize: "0.9rem",
                                    fontWeight: 700,
                                    color: isSelected ? "#FFFFFF" : "#E2E8F0",
                                  }}
                                >
                                  {bt.label}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.68rem",
                                    fontWeight: 600,
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: isSelected ? "rgba(59, 130, 246, 0.2)" : "rgba(30, 41, 59, 0.8)",
                                    color: isSelected ? "#93C5FD" : "#94A3B8",
                                  }}
                                >
                                  {bt.tag}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.76rem", color: "#94A3B8", marginTop: "2px" }}>
                                {bt.desc}
                              </div>
                            </div>
                          </div>

                          {/* Selection indicator bullet */}
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              border: `2px solid ${isSelected ? "#3B82F6" : "rgba(148, 163, 184, 0.3)"}`,
                              background: isSelected ? "#3B82F6" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {isSelected && (
                              <div
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background: "#FFFFFF",
                                }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Continue Button */}
                <button
                  onClick={() => setStep(2)}
                  disabled={!data.business_name.trim() || !data.business_type}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    borderRadius: "12px",
                    background:
                      !data.business_name.trim() || !data.business_type
                        ? "rgba(30, 41, 59, 0.6)"
                        : "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                    color: !data.business_name.trim() || !data.business_type ? "#64748B" : "#FFFFFF",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "0.92rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    cursor: !data.business_name.trim() || !data.business_type ? "not-allowed" : "pointer",
                    boxShadow:
                      !data.business_name.trim() || !data.business_type
                        ? "none"
                        : "0 6px 20px rgba(37, 99, 235, 0.4)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>Continue to Volume & Rails</span>
                  <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {/* ── Step 2: Scale and Payment Platform ── */}
            {step === 2 && (
              <motion.div key="step2" {...slide} transition={{ duration: 0.25 }}>
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#60A5FA",
                      }}
                    >
                      Step 2 of 3
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#475569" }}>•</span>
                    <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>Scale & Infrastructure</span>
                  </div>
                  <h1
                    style={{
                      fontSize: "1.65rem",
                      fontWeight: 800,
                      color: "#F8FAFC",
                      margin: "0 0 8px 0",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Scale & Payment Gateway Rails
                  </h1>
                  <p style={{ fontSize: "0.88rem", color: "#94A3B8", margin: 0, lineHeight: 1.5 }}>
                    Allows the Knapsack Capital Allocator to compute realistic daily recovery budgets and evaluate gateway incident health.
                  </p>
                </div>

                {/* Monthly Revenue Scale */}
                <div style={{ marginBottom: "24px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#CBD5E1",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: "10px",
                    }}
                  >
                    Estimated Monthly GMV / Payment Volume
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {BUSINESS_SIZES.map((bs) => {
                      const isSelected = data.business_size === bs.value;
                      return (
                        <div
                          key={bs.value}
                          onClick={() => update("business_size", bs.value)}
                          style={{
                            padding: "14px 16px",
                            borderRadius: "12px",
                            background: isSelected ? "rgba(37, 99, 235, 0.14)" : "rgba(11, 18, 34, 0.8)",
                            border: `1px solid ${isSelected ? "#3B82F6" : "rgba(148, 163, 184, 0.14)"}`,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            boxShadow: isSelected ? "0 4px 16px rgba(37, 99, 235, 0.2)" : "none",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: isSelected ? "#60A5FA" : "#F1F5F9" }}>
                              {bs.label}
                            </span>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                color: "#34D399",
                                background: "rgba(16, 185, 129, 0.12)",
                                padding: "2px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              {bs.range}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.74rem", color: "#94A3B8" }}>{bs.desc}</div>
                          <div style={{ fontSize: "0.7rem", color: "#60A5FA", marginTop: "6px", fontWeight: 600 }}>
                            Est. Recovery: {bs.potRecovery}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Platform */}
                <div style={{ marginBottom: "28px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#CBD5E1",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: "10px",
                    }}
                  >
                    Primary Payment Gateway Rail
                  </label>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {PAYMENT_PLATFORMS.map((pp) => {
                      const isSelected = data.payment_platform === pp.value;
                      return (
                        <div
                          key={pp.value}
                          onClick={() => update("payment_platform", pp.value)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "11px 16px",
                            borderRadius: "10px",
                            background: isSelected ? "rgba(37, 99, 235, 0.14)" : "rgba(11, 18, 34, 0.8)",
                            border: `1px solid ${isSelected ? "#3B82F6" : "rgba(148, 163, 184, 0.14)"}`,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <CreditCard size={16} color={isSelected ? "#60A5FA" : "#94A3B8"} />
                            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: isSelected ? "#FFFFFF" : "#E2E8F0" }}>
                              {pp.label}
                            </span>
                            <span
                              style={{
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                color: pp.popular ? "#38BDF8" : "#94A3B8",
                                background: pp.popular ? "rgba(56, 189, 248, 0.12)" : "rgba(30, 41, 59, 0.6)",
                                padding: "2px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              {pp.badge}
                            </span>
                          </div>

                          <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>{pp.desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => setStep(1)}
                    style={{
                      flex: 1,
                      padding: "13px 16px",
                      borderRadius: "12px",
                      background: "rgba(30, 41, 59, 0.6)",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      color: "#CBD5E1",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={() => setStep(3)}
                    disabled={!data.business_size || !data.payment_platform}
                    style={{
                      flex: 2,
                      padding: "13px 20px",
                      borderRadius: "12px",
                      background:
                        !data.business_size || !data.payment_platform
                          ? "rgba(30, 41, 59, 0.6)"
                          : "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                      color: !data.business_size || !data.payment_platform ? "#64748B" : "#FFFFFF",
                      border: "none",
                      fontWeight: 700,
                      fontSize: "0.92rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: !data.business_size || !data.payment_platform ? "not-allowed" : "pointer",
                      boxShadow:
                        !data.business_size || !data.payment_platform
                          ? "none"
                          : "0 6px 20px rgba(37, 99, 235, 0.4)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>Review & Launch</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Review & Pre-Flight Launch ── */}
            {step === 3 && (
              <motion.div key="step3" {...slide} transition={{ duration: 0.25 }}>
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#34D399",
                      }}
                    >
                      Step 3 of 3
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#475569" }}>•</span>
                    <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>Pre-Flight Confirmation</span>
                  </div>
                  <h1
                    style={{
                      fontSize: "1.65rem",
                      fontWeight: 800,
                      color: "#F8FAFC",
                      margin: "0 0 8px 0",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Launch Your ReviveOS Workspace
                  </h1>
                  <p style={{ fontSize: "0.88rem", color: "#94A3B8", margin: 0, lineHeight: 1.5 }}>
                    Your configuration will calibrate the causal uplift engine and initialize your Razorpay recovery environment.
                  </p>
                </div>

                {/* Profile Summary Card */}
                <div
                  style={{
                    background: "rgba(11, 18, 34, 0.9)",
                    borderRadius: "14px",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    padding: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#60A5FA", textTransform: "uppercase", marginBottom: "14px" }}>
                    Selected Business Architecture
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>Merchant Organization</span>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#F8FAFC", marginTop: "2px" }}>
                        {data.business_name || "Merchant Inc"}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>Business Archetype</span>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#38BDF8", marginTop: "2px", textTransform: "capitalize" }}>
                        {data.business_type}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>Revenue Scale (GMV)</span>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#34D399", marginTop: "2px", textTransform: "capitalize" }}>
                        {data.business_size}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>Primary Gateway Rail</span>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FACC15", marginTop: "2px", textTransform: "capitalize" }}>
                        {data.payment_platform}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic AI Value Projection */}
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)",
                    borderRadius: "14px",
                    border: "1px solid rgba(59, 130, 246, 0.35)",
                    padding: "18px 20px",
                    marginBottom: "24px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <Sparkles size={16} color="#60A5FA" />
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#93C5FD" }}>
                      ReviveOS Causal Recovery Forecast
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Natural Settlement</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#CBD5E1", marginTop: "2px" }}>
                        ~27.4%
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "#64748B" }}>Without ReviveOS</div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#60A5FA" }}>ReviveOS Governed</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#60A5FA", marginTop: "2px" }}>
                        ~61.2%
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "#38BDF8" }}>Multi-agent yield</div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#34D399" }}>Incremental Lift (τ)</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#34D399", marginTop: "2px" }}>
                        +33.8pp
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "#10B981" }}>Net causal recovery</div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      color: "#F87171",
                      fontSize: "0.82rem",
                      marginBottom: "18px",
                      textAlign: "center",
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => setStep(2)}
                    style={{
                      flex: 1,
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: "rgba(30, 41, 59, 0.6)",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      color: "#CBD5E1",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={handleComplete}
                    style={{
                      flex: 2,
                      padding: "14px 20px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                      color: "#FFFFFF",
                      border: "none",
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: "pointer",
                      boxShadow: "0 6px 20px rgba(16, 185, 129, 0.4)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>Launch ReviveOS Workspace</span>
                    <CheckCircle2 size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Creating Workspace Progress State ── */}
            {step === "creating" && (
              <motion.div
                key="creating"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: "center", padding: "48px 16px" }}
              >
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "rgba(37, 99, 235, 0.15)",
                    border: "2px solid #3B82F6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                    boxShadow: "0 0 24px rgba(37, 99, 235, 0.4)",
                  }}
                >
                  <Zap size={28} color="#60A5FA" className="animate-pulse" />
                </div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#F8FAFC", margin: "0 0 8px 0" }}>
                  Calibrating ReviveOS Engine...
                </h2>
                <p style={{ fontSize: "0.85rem", color: "#94A3B8", maxWidth: "420px", margin: "0 auto 20px", lineHeight: 1.5 }}>
                  Synthesizing counterfactual cohorts, configuring Razorpay rails, and arming customer sovereignty guardrails.
                </p>

                <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3B82F6" }}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Done State ── */}
            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: "center", padding: "48px 16px" }}
              >
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    background: "rgba(16, 185, 129, 0.2)",
                    border: "2px solid #10B981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                    boxShadow: "0 0 30px rgba(16, 185, 129, 0.4)",
                  }}
                >
                  <CheckCircle2 size={36} color="#34D399" />
                </div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#F8FAFC", margin: "0 0 6px 0" }}>
                  Workspace Ready
                </h2>
                <p style={{ fontSize: "0.88rem", color: "#94A3B8", margin: 0 }}>
                  Launching ReviveOS Recovery Command Center...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trust Badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            marginTop: "20px",
            color: "#64748B",
            fontSize: "0.74rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Lock size={12} color="#60A5FA" />
            <span>Bank-Grade 256-bit Encryption</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={12} color="#34D399" />
            <span>RBI & NPCI Mandate Compliant</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Sparkles size={12} color="#A78BFA" />
            <span>Customer Sovereignty Guaranteed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
