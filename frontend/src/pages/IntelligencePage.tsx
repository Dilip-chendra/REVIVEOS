import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Activity, CreditCard, RefreshCw, Shield, GitBranch, Zap,
  Users, CheckCircle2, XCircle, TrendingUp, ShieldCheck,
  Lock, Check
} from "lucide-react";

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

const ML_FEATURE_CATEGORIES = [
  {
    name: "Customer Intelligence",
    icon: Users,
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.1)",
    features: [
      "Payment success rate (last 90 days)",
      "Lifetime value (LTV) at risk",
      "Account tenure & loyalty tier",
      "Consecutive failure pattern",
      "Consent & opt-out status",
    ],
  },
  {
    name: "Gateway Telemetry",
    icon: Activity,
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.1)",
    features: [
      "Real-time failure rate (last 1h)",
      "Infrastructure degradation signal",
      "Network latency percentiles (p99)",
      "Backup gateway availability",
      "Historical uptime & payday spikes",
    ],
  },
  {
    name: "Transaction Context",
    icon: CreditCard,
    color: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.1)",
    features: [
      "Amount tier (Micro / Standard / High-Value)",
      "Payment method (Card / UPI / NACH)",
      "Failure code classification (40+ types)",
      "Retry count & cooldown enforcement",
      "Time of day & business hour alignment",
    ],
  },
  {
    name: "Subscription Signals",
    icon: RefreshCw,
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.1)",
    features: [
      "Subscription age & renewal position",
      "Mandate status (E-Mandate / Recurring)",
      "Involuntary vs voluntary churn score",
      "Invoice days overdue",
      "Prior recovery method effectiveness",
    ],
  },
  {
    name: "Anti-Fraud Context",
    icon: Shield,
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.1)",
    features: [
      "IP geolocation vs billing address match",
      "Device fingerprint similarity score",
      "Behavioral change anomaly detection",
      "3D-Secure v2 step-up eligibility",
      "Bank false-positive probability",
    ],
  },
];

const STRATEGY_SCENARIOS = {
  saas: {
    title: "B2B SaaS — CloudCRM",
    badge: "INVOLUNTARY CHURN RISK",
    amount: 150000,
    ltv: 5400000,
    customer: "CloudCRM Inc. (13 months · 12/13 prior payments)",
    failure: "INSUFFICIENT_FUNDS (2:00 AM Sunday Corporate Velocity Limit)",
    diagnosis: "Weekend corporate card velocity limit reset required. Customer has 12 consecutive successful payments. Isolated timing issue, not insolvency.",
    strategies: [
      {
        id: "A",
        name: "Strategy A: Smart Delay",
        desc: "Wait until Monday 9:00 AM (business hours). Corporate card limits reset at 00:00 IST Monday.",
        prob: 91,
        risk: "Low",
        chosen: true,
        tag: "OPTIMAL — Highest Probability",
      },
      {
        id: "B",
        name: "Strategy B: Send Card Update Email",
        desc: "Notify customer to update details. Risk: 40% of B2B accounts churn when prompted to re-enter card data.",
        prob: 52,
        risk: "Medium",
        chosen: false,
        tag: "REJECTED — Unnecessary Churn Risk",
      },
    ],
    policy: [
      { rule: "Amount below automated ceiling", passed: true, detail: "₹1,50,000 within merchant B2B limit of ₹5,00,000" },
      { rule: "Retry count within limit", passed: true, detail: "0 of 3 max retries used" },
      { rule: "Customer consent active", passed: true, detail: "Active enterprise subscription verified" },
      { rule: "No fraud signals detected", passed: true, detail: "12/13 clean history — verified trusted account" },
      { rule: "Gateway healthy for scheduled retry", passed: true, detail: "Razorpay failure rate 3.2% (healthy baseline)" },
      { rule: "Failure code is recoverable", passed: true, detail: "Weekend velocity limit — recoverable after reset" },
    ],
    outcome: "ALL 6 RULES PASSED → Scheduled for Monday 9:05 AM silent recovery",
  },
  flashsale: {
    title: "E-Commerce Flash Sale — Aura Cosmetics",
    badge: "GATEWAY OVERLOAD ANOMALY",
    amount: 14999,
    ltv: 32000,
    customer: "Priya M. (8 months · 4/4 prior purchases)",
    failure: "GATEWAY_CONNECTION_ERROR (Stripe 38% Failure Spike)",
    diagnosis: "Primary gateway experiencing severe infrastructure degradation under Black Friday load. Customer funds & card are 100% valid.",
    strategies: [
      {
        id: "A",
        name: "Strategy A: Gateway Failover to PayU",
        desc: "Route payment through healthy PayU backup gateway (2.9% failure rate). Seamless to customer.",
        prob: 94,
        risk: "Low",
        chosen: true,
        tag: "OPTIMAL — Immediate Failover",
      },
      {
        id: "B",
        name: "Strategy B: Retry on Stripe",
        desc: "Wait 30s and retry Stripe. Stripe is still overloaded (38% error rate). High probability of repeat failure.",
        prob: 28,
        risk: "High",
        chosen: false,
        tag: "REJECTED — Gateway Still Degraded",
      },
    ],
    policy: [
      { rule: "Amount below automated ceiling", passed: true, detail: "₹14,999 under ₹50,000 auto-limit" },
      { rule: "Retry count within limit", passed: true, detail: "0 of 3 retries used" },
      { rule: "Customer record clean", passed: true, detail: "4/4 successful purchases" },
      { rule: "Gateway degradation confirmed", passed: true, detail: "Stripe failure rate: 38% (baseline: 1.2%)" },
      { rule: "Backup gateway healthy", passed: true, detail: "PayU failure rate: 2.9% — routing approved" },
      { rule: "Session active (urgency)", passed: true, detail: "Customer waiting on loading spinner (<2s budget)" },
    ],
    outcome: "ALL 6 RULES PASSED → Instant failover executed in 1.8s. Customer sees success.",
  },
  expired: {
    title: "Subscription Renewal — SaaSFlow",
    badge: "CARD EXPIRY CHURN PREVENTION",
    amount: 49900,
    ltv: 598800,
    customer: "Mehta & Associates (24 months · 23/23 payments)",
    failure: "CARD_EXPIRED (Bank Replacement — Not Fraud)",
    diagnosis: "Customer's card reached expiry date. Retrying this card will ALWAYS fail and causes Visa penalty flags. Smart update reminder required.",
    strategies: [
      {
        id: "A",
        name: "Strategy A: Send Card Update Link",
        desc: "Email/SMS secure tokenized update link. 73% of 2-year loyal customers update within 24 hours.",
        prob: 73,
        risk: "Low",
        chosen: true,
        tag: "OPTIMAL — Zero Gateway Penalties",
      },
      {
        id: "B",
        name: "Strategy B: Retry Same Card (BLOCKED)",
        desc: "Blindly retry expired card. 100% chance of failure + triggers payment network merchant penalty flags.",
        prob: 0,
        risk: "Extreme",
        chosen: false,
        tag: "POLICY SAFEGUARD — Card Fatigue Prevented",
      },
      {
        id: "C",
        name: "Strategy C: Cancel Subscription",
        desc: "Auto-cancel account. Destroys ₹5,98,800 LTV of a 2-year loyal customer unnecessarily.",
        prob: 0,
        risk: "Catastrophic",
        chosen: false,
        tag: "REJECTED — Involuntary Churn",
      },
    ],
    policy: [
      { rule: "Retry BLOCKED for CARD_EXPIRED", passed: true, detail: "Policy explicitly prevents pointless retries on expired cards" },
      { rule: "Amount below automated ceiling", passed: true, detail: "₹49,900 within ₹50,000 automated limit" },
      { rule: "Customer consent active", passed: true, detail: "2-year active enterprise subscriber" },
      { rule: "Churn protection tier enabled", passed: true, detail: "Loyal customer protection prevents auto-cancellation" },
      { rule: "Communication channels verified", passed: true, detail: "Verified email and SMS on file" },
      { rule: "Zero network penalty guarantee", passed: true, detail: "No invalid API calls dispatched to processor" },
    ],
    outcome: "ALL 6 RULES PASSED → Secure reminder dispatched. Retry strictly blocked.",
  },
};

const MOAT_COMPARISONS = [
  {
    traditional: "Retry every 24 hours blindly without context",
    revive: "AI analyzes 12 real-time signals to calculate optimal retry timing",
  },
  {
    traditional: "Same gateway, same route on every attempt",
    revive: "Real-time telemetry detects degradation & auto-routes to healthy backup",
  },
  {
    traditional: "Treats CARD_EXPIRED same as FRAUD_SUSPECTED",
    revive: "40+ failure classifications with specialized recovery workflows",
  },
  {
    traditional: "Retries dead/stolen cards → triggers Visa penalty flags",
    revive: "Deterministic Policy Gate halts retries on hard declines instantly",
  },
  {
    traditional: "Cancels subscriptions on first renewal failure (involuntary churn)",
    revive: "Smart dunning, payday alignment & frictionless card update flows",
  },
  {
    traditional: "No human escalation — 100% blind automation or 100% manual",
    revive: "Threshold gates route high-value / low-confidence cases to human review",
  },
];

export default function IntelligencePage() {
  const [selectedCase, setSelectedCase] = useState<"saas" | "flashsale" | "expired">("saas");
  const currentScenario = STRATEGY_SCENARIOS[selectedCase];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "36px", paddingBottom: "80px" }}>
      {/* ── Section 1: Page Header ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Brain size={18} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
            Intelligence Engine
          </h1>
        </div>
        <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", maxWidth: "720px", lineHeight: 1.6 }}>
          How ReviveOS diagnoses payment failures, generates competing recovery strategies, and applies deterministic financial safety controls.
        </p>
      </div>

      {/* ── Section 2: Feature Matrix (12 ML Signals) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
              The 12 Real-Time Decision Signals
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "2px" }}>
              Every failed payment is evaluated against 5 signal categories before any recovery action is considered
            </div>
          </div>
          <span className="badge badge-blue" style={{ fontSize: "0.75rem" }}>
            Deterministic Scoring Model
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          {ML_FEATURE_CATEGORIES.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-lg)",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={15} color={cat.color} />
                  </div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {cat.name}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {cat.features.map((feat) => (
                    <div key={feat} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: cat.color, marginTop: "6px", flexShrink: 0 }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Section 3: Dynamic Strategy Selection & Policy Gate ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-xl)",
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <GitBranch size={18} color="var(--accent)" />
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Strategy Selection & Policy Gate Engine
              </h2>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)" }}>
              The AI calculates competing strategies with success probabilities — then the deterministic Policy Gate evaluates safety.
            </p>
          </div>

          {/* Scenario Selector */}
          <div style={{ display: "flex", background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "3px", gap: "2px" }}>
            <button
              onClick={() => setSelectedCase("saas")}
              className={`btn btn-sm ${selectedCase === "saas" ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: "0.75rem", padding: "6px 12px" }}
            >
              1. B2B SaaS (Smart Delay)
            </button>
            <button
              onClick={() => setSelectedCase("flashsale")}
              className={`btn btn-sm ${selectedCase === "flashsale" ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: "0.75rem", padding: "6px 12px" }}
            >
              2. Flash Sale (Failover)
            </button>
            <button
              onClick={() => setSelectedCase("expired")}
              className={`btn btn-sm ${selectedCase === "expired" ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: "0.75rem", padding: "6px 12px" }}
            >
              3. Expired Card (Churn Protection)
            </button>
          </div>
        </div>

        {/* Case Context Strip */}
        <div style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Scenario</div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>{currentScenario.title}</div>
            <span className="badge badge-blue" style={{ fontSize: "0.625rem", marginTop: "4px", display: "inline-block" }}>{currentScenario.badge}</span>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Amount & LTV at Risk</div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>{formatINR(currentScenario.amount)}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--success-text)", marginTop: "2px" }}>LTV: {formatINR(currentScenario.ltv)}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Customer Profile</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "2px" }}>{currentScenario.customer}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Failure Reason</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--warning-text)", marginTop: "2px", fontWeight: 600 }}>{currentScenario.failure}</div>
          </div>
        </div>

        {/* 2-Column: AI Strategies vs Policy Gate */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Left: Strategies */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
                AI Strategy Comparison
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                Probabilistic Evaluation
              </span>
            </div>

            {currentScenario.strategies.map((strat) => (
              <div
                key={strat.id}
                style={{
                  background: strat.chosen ? "rgba(16, 185, 129, 0.04)" : "var(--bg-overlay)",
                  border: strat.chosen ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--border)",
                  borderRadius: "var(--r-lg)",
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  opacity: strat.chosen ? 1 : 0.65,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: strat.chosen ? "var(--success-text)" : "var(--text-secondary)" }}>
                      {strat.name}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 800, color: strat.chosen ? "var(--success-text)" : "var(--text-tertiary)" }}>
                      {strat.prob}%
                    </span>
                    <span className={`badge ${strat.chosen ? "badge-green" : "badge-gray"}`} style={{ fontSize: "0.625rem" }}>
                      {strat.tag}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {strat.desc}
                </div>
              </div>
            ))}
          </div>

          {/* Right: Policy Gate */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock size={14} color="var(--warning-text)" />
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Deterministic Policy Gate
                </span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                Zero AI Influence
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {currentScenario.policy.map((check, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--bg-overlay)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-md)",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: check.passed ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                    {check.passed ? <Check size={11} color="var(--success-text)" strokeWidth={3} /> : <XCircle size={11} color="var(--error-text)" />}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {check.rule}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                      {check.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "var(--r-md)", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <ShieldCheck size={16} color="var(--success-text)" />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--success-text)" }}>
                {currentScenario.outcome}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Section 4: Why Competitors Cannot Build This ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <div>
          <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Why This Cannot Be Built as a Simple Script
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "2px" }}>
            The difference between "dumb" retry cron jobs and enterprise-grade payment intelligence
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {/* Competitor / Legacy Column */}
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
              <XCircle size={16} color="var(--error-text)" />
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Traditional "Dumb" Retry Scripts
              </span>
              <span className="badge badge-red" style={{ marginLeft: "auto", fontSize: "0.625rem" }}>
                High Risk
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {MOAT_COMPARISONS.map((comp, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.8125rem", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                  <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--error-text)", marginTop: "8px", flexShrink: 0 }} />
                  <span>{comp.traditional}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ReviveOS Column */}
          <div style={{ background: "var(--bg-elevated)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "var(--r-lg)", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
              <CheckCircle2 size={16} color="var(--success-text)" />
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
                ReviveOS Intelligence Platform
              </span>
              <span className="badge badge-green" style={{ marginLeft: "auto", fontSize: "0.625rem" }}>
                Enterprise Grade
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {MOAT_COMPARISONS.map((comp, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.8125rem", color: "var(--text-primary)", fontWeight: 500, lineHeight: 1.5 }}>
                  <Check size={14} color="var(--success-text)" style={{ marginTop: "3px", flexShrink: 0 }} />
                  <span>{comp.revive}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4 Moat Badges */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          {[
            { label: "12 Real-Time Signals", desc: "Customer, gateway & device telemetry" },
            { label: "40+ Failure Taxonomies", desc: "Deep bank decline code mapping" },
            { label: "6 Bounded Strategies", desc: "Smart delay, failover, 3DS, reminder" },
            { label: "100% Policy-Bound", desc: "Deterministic safety rules enforce every act" },
          ].map((item) => (
            <div key={item.label} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "14px 18px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--accent)" }}>{item.label}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Section 5: Real World Impact Metrics ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <div>
          <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Demonstrated Financial ROI
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "2px" }}>
            The mathematical return on investment across our 3 primary recovery vectors
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {[
            {
              title: "Involuntary Churn Saved",
              amount: "₹5,98,800",
              label: "LTV Protected on 1 Account",
              desc: "A 2-year subscriber's card expired. Old way: subscription canceled. ReviveAI: card-update reminder sent, payment captured in 3h.",
              icon: TrendingUp,
              color: "var(--success-text)",
            },
            {
              title: "Flash Sale Failover",
              amount: "₹74,99,500",
              label: "Protected in 5 Minutes",
              desc: "500 simultaneous checkouts triggered Stripe gateway overload. ReviveOS routed traffic to PayU within 1.8s, saving 480 transactions.",
              icon: Zap,
              color: "var(--warning-text)",
            },
            {
              title: "False Positive Cleared",
              amount: "₹8,75,000",
              label: "Single High-Ticket Sale",
              desc: "Luxury watch declined as suspected fraud. AI identified false positive, human reviewed & approved, 3DS OTP verified in 45s.",
              icon: ShieldCheck,
              color: "var(--accent)",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-lg)",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)" }}>{item.title}</span>
                  <Icon size={16} color={item.color} />
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: item.color, letterSpacing: "-0.03em" }}>
                  {item.amount}
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5, marginTop: "4px" }}>
                  {item.desc}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
