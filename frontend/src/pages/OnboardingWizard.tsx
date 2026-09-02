import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Building2, CreditCard, BarChart3, ArrowRight, CheckCircle } from "lucide-react";
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

// ── Config ────────────────────────────────────────────────────────────────────
const BUSINESS_TYPES = [
  { value: "ecommerce",    label: "E-commerce",    desc: "Online retail, marketplaces" },
  { value: "saas",         label: "SaaS",          desc: "Subscriptions, software" },
  { value: "subscription", label: "Subscription",  desc: "Recurring billing products" },
  { value: "b2b",          label: "B2B",           desc: "Business services, invoices" },
  { value: "other",        label: "Other",         desc: "Different business model" },
];

const BUSINESS_SIZES = [
  { value: "small",      label: "Small",      desc: "< ₹10L / month" },
  { value: "medium",     label: "Medium",     desc: "₹10L – ₹1Cr / month" },
  { value: "large",      label: "Large",      desc: "₹1Cr – ₹10Cr / month" },
  { value: "enterprise", label: "Enterprise", desc: "> ₹10Cr / month" },
];

const PAYMENT_PLATFORMS = [
  { value: "razorpay",  label: "Razorpay" },
  { value: "payu",      label: "PayU" },
  { value: "cashfree",  label: "Cashfree" },
  { value: "stripe",    label: "Stripe" },
  { value: "other",     label: "Other" },
];

// ── Animation variants ────────────────────────────────────────────────────────
const slide = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -20 },
};

// ── Main component ────────────────────────────────────────────────────────────
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
      setTimeout(onComplete, 1800);
    } catch (e: any) {
      setError("Something went wrong. Please try again.");
      setStep(3);
    }
  };

  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: "var(--clr-bg)" }}
    >
      <div className="w-full max-w-lg px-6">

        {/* Logo + step indicator */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--clr-accent)" }}
            >
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm">ReviveAI</span>
          </div>
          {typeof step === "number" && (
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: s === step ? "24px" : "8px",
                    background: s <= step ? "var(--clr-accent)" : "var(--clr-border)",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">

          {/* ── Step 1: Business name + type ── */}
          {step === 1 && (
            <motion.div key="step1" {...slide} transition={{ duration: 0.28 }}>
              <h1 className="text-2xl font-bold text-white mb-1">
                Tell us about your business
              </h1>
              <p className="text-sm mb-8" style={{ color: "var(--clr-text-muted)" }}>
                This helps ReviveOS tailor recovery strategies for you.
              </p>

              {/* Business name */}
              <label className="block mb-5">
                <span className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: "var(--clr-text-muted)" }}>
                  Business Name
                </span>
                <input
                  type="text"
                  placeholder="e.g. Acme Payments Pvt Ltd"
                  value={data.business_name}
                  onChange={(e) => update("business_name", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-[var(--clr-text-muted)] focus:outline-none transition-colors"
                  style={{
                    background: "var(--clr-surface)",
                    border: "1px solid var(--clr-border)",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--clr-accent)")}
                  onBlur={e => (e.target.style.borderColor = "var(--clr-border)")}
                />
              </label>

              {/* Business type */}
              <div className="mb-8">
                <span className="block text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--clr-text-muted)" }}>
                  Business Type
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {BUSINESS_TYPES.map((bt) => (
                    <button
                      key={bt.value}
                      onClick={() => update("business_type", bt.value)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm text-left transition-all"
                      style={{
                        background: data.business_type === bt.value
                          ? "var(--clr-accent-dim)"
                          : "var(--clr-surface)",
                        border: `1px solid ${data.business_type === bt.value
                          ? "var(--clr-accent)"
                          : "var(--clr-border)"}`,
                        color: data.business_type === bt.value
                          ? "var(--clr-accent)"
                          : "var(--clr-text-secondary)",
                      }}
                    >
                      <span className="font-medium">{bt.label}</span>
                      <span className="text-xs opacity-60">{bt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                onClick={() => setStep(2)}
                disabled={!data.business_name.trim() || !data.business_type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                style={{ background: "var(--clr-accent)" }}
              >
                Continue <ArrowRight size={15} />
              </motion.button>
            </motion.div>
          )}

          {/* ── Step 2: Size + platform ── */}
          {step === 2 && (
            <motion.div key="step2" {...slide} transition={{ duration: 0.28 }}>
              <h1 className="text-2xl font-bold text-white mb-1">
                Scale and payments
              </h1>
              <p className="text-sm mb-8" style={{ color: "var(--clr-text-muted)" }}>
                Helps us set the right recovery thresholds and connect to your
                payment data.
              </p>

              {/* Business size */}
              <div className="mb-6">
                <span className="block text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--clr-text-muted)" }}>
                  Monthly Revenue
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {BUSINESS_SIZES.map((bs) => (
                    <button
                      key={bs.value}
                      onClick={() => update("business_size", bs.value)}
                      className="flex flex-col px-4 py-3 rounded-xl text-sm text-left transition-all"
                      style={{
                        background: data.business_size === bs.value
                          ? "var(--clr-accent-dim)"
                          : "var(--clr-surface)",
                        border: `1px solid ${data.business_size === bs.value
                          ? "var(--clr-accent)"
                          : "var(--clr-border)"}`,
                        color: data.business_size === bs.value
                          ? "var(--clr-accent)"
                          : "var(--clr-text-secondary)",
                      }}
                    >
                      <span className="font-medium">{bs.label}</span>
                      <span className="text-xs opacity-60 mt-0.5">{bs.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment platform */}
              <div className="mb-8">
                <span className="block text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--clr-text-muted)" }}>
                  Payment Platform
                </span>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_PLATFORMS.map((pp) => (
                    <button
                      key={pp.value}
                      onClick={() => update("payment_platform", pp.value)}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: data.payment_platform === pp.value
                          ? "var(--clr-accent-dim)"
                          : "var(--clr-surface)",
                        border: `1px solid ${data.payment_platform === pp.value
                          ? "var(--clr-accent)"
                          : "var(--clr-border)"}`,
                        color: data.payment_platform === pp.value
                          ? "var(--clr-accent)"
                          : "var(--clr-text-muted)",
                      }}
                    >
                      {pp.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: "var(--clr-surface)",
                    border: "1px solid var(--clr-border)",
                    color: "var(--clr-text-muted)",
                  }}
                >
                  Back
                </button>
                <motion.button
                  onClick={() => setStep(3)}
                  disabled={!data.business_size || !data.payment_platform}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-[2] py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "var(--clr-accent)" }}
                >
                  Continue <ArrowRight size={15} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 3 && (
            <motion.div key="step3" {...slide} transition={{ duration: 0.28 }}>
              <h1 className="text-2xl font-bold text-white mb-1">
                Ready to recover revenue
              </h1>
              <p className="text-sm mb-8" style={{ color: "var(--clr-text-muted)" }}>
                We'll set up your workspace with realistic data so you can see
                ReviveOS in action immediately.
              </p>

              {/* Summary card */}
              <div
                className="rounded-xl p-5 mb-8 space-y-3"
                style={{ background: "var(--clr-surface)", border: "1px solid var(--clr-border)" }}
              >
                {[
                  { icon: Building2, label: "Business",  value: data.business_name },
                  { icon: BarChart3, label: "Type",      value: data.business_type },
                  { icon: BarChart3, label: "Scale",     value: data.business_size },
                  { icon: CreditCard,label: "Platform",  value: data.payment_platform },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2" style={{ color: "var(--clr-text-muted)" }}>
                      <Icon size={13} />
                      {label}
                    </div>
                    <span className="capitalize font-medium text-white">{value}</span>
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-sm mb-4 text-center" style={{ color: "var(--clr-danger)" }}>
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: "var(--clr-surface)",
                    border: "1px solid var(--clr-border)",
                    color: "var(--clr-text-muted)",
                  }}
                >
                  Back
                </button>
                <motion.button
                  onClick={handleComplete}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-[2] py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 text-sm"
                  style={{ background: "var(--clr-accent)" }}
                >
                  Create my workspace <ArrowRight size={15} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Creating workspace ── */}
          {step === "creating" && (
            <motion.div
              key="creating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="flex gap-1.5 justify-center mb-6">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ background: "var(--clr-accent)" }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                  />
                ))}
              </div>
              <p className="font-semibold text-white mb-1">Setting up your workspace…</p>
              <p className="text-sm" style={{ color: "var(--clr-text-muted)" }}>
                Analysing your payment profile and seeding recovery data.
              </p>
            </motion.div>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "var(--clr-accent-dim)" }}
              >
                <CheckCircle size={32} style={{ color: "var(--clr-accent)" }} />
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2">
                Your workspace is ready
              </h2>
              <p className="text-sm" style={{ color: "var(--clr-text-muted)" }}>
                Entering ReviveAI…
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
