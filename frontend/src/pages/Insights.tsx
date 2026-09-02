import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getRecoveryOpportunities, getCategoryBreakdown, getDashboardMetrics, getGatewayHealth, getRazorpayStatus } from "../api/client";
import { TrendingUp, AlertTriangle, Zap, Activity, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

type Insight = {
  id: string;
  type: "opportunity" | "anomaly" | "trend" | "action";
  title: string;
  observation: string;
  evidence: string;
  financialImpact: number;
  recommendation: string;
  priority: "critical" | "high" | "medium";
  icon: any;
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#3b82f6",
};

export default function Insights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerStatus, setProviderStatus] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      getRecoveryOpportunities(100),
      getCategoryBreakdown(),
      getDashboardMetrics(),
      getGatewayHealth(),
      getRazorpayStatus().catch(() => null),
    ]).then(([opps, categories, _metrics, gateways, pStatus]) => {
      setProviderStatus(pStatus);
      const isProv = pStatus?.active_environment === "RAZORPAY_TEST" || pStatus?.active_environment === "RAZORPAY_LIVE" || pStatus?.is_real_provider_data;
      const derived: Insight[] = [];

      // 1. Find biggest failure category by count
      const failCats = (categories as any[]).filter(c => c.category !== "success");
      failCats.sort((a, b) => b.count - a.count);
      const top = failCats[0];
      if (top && opps.length > 0) {
        const topOpps = opps.filter((o: any) => o.failure_category === top.category);
        const topAmount = topOpps.reduce((s: number, o: any) => s + (o.amount_inr || 0), 0);
        const topRecovery = topOpps.reduce((s: number, o: any) => s + (o.expected_recovery_value_inr || 0), 0);
        const avgProb = topOpps.length
          ? topOpps.reduce((s: number, o: any) => s + (o.recovery_probability || 0), 0) / topOpps.length : 0;

        derived.push({
          id: "top-category",
          type: "opportunity",
          title: `${top.category.replace(/_/g," ")} is your largest revenue risk`,
          observation: `${top.count} cases of ${top.category.replace(/_/g," ")} represent the highest failure count in your portfolio.`,
          evidence: `${top.count} events · ${fmt(topAmount)} total exposure · avg ${fmtPct(avgProb)} recovery probability`,
          financialImpact: topRecovery,
          recommendation: `Execute batch recovery on ${top.category.replace(/_/g," ")} cases. Expected to recover ${fmt(topRecovery)}.`,
          priority: avgProb > 0.6 ? "critical" : "high",
          icon: TrendingUp,
        });
      }

      // 2. High-value high-probability opportunities (sweet spot)
      const sweetSpot = opps.filter((o: any) => o.recovery_probability > 0.7 && o.amount_inr > 10000 && !o.is_human_required);
      const sweetAmount = sweetSpot.reduce((s: number, o: any) => s + (o.expected_recovery_value_inr || 0), 0);
      if (sweetSpot.length > 0) {
        derived.push({
          id: "sweet-spot",
          type: "action",
          title: `${sweetSpot.length} high-confidence opportunities ready for immediate execution`,
          observation: `${sweetSpot.length} cases have >70% recovery probability, >₹10,000 value, and pass all policy gates.`,
          evidence: `${sweetSpot.length} cases · ${fmt(sweetAmount)} expected recovery · no human review needed`,
          financialImpact: sweetAmount,
          recommendation: "These cases can be auto-executed right now. Go to Revenue Recovery and execute each one.",
          priority: "critical",
          icon: Zap,
        });
      }

      // 3. Gateway anomaly detection
      const degraded = (gateways as any[]).filter(g => g.is_degraded || g.failure_rate > 0.2);
      if (degraded.length > 0) {
        const affectedOpps = opps.filter((o: any) => degraded.some((g: any) => g.gateway === o.gateway));
        const affectedAmount = affectedOpps.reduce((s: number, o: any) => s + (o.amount_inr || 0), 0);
        derived.push({
          id: "gateway-anomaly",
          type: "anomaly",
          title: `${degraded.map((g: any) => g.gateway).join(", ")} gateway degraded — switch routes now`,
          observation: `${degraded.length} gateway(s) showing elevated failure rates. ${affectedOpps.length} transactions affected.`,
          evidence: `${affectedOpps.length} cases on degraded gateway · ${fmt(affectedAmount)} at risk · recommended: route_switch`,
          financialImpact: affectedAmount * 0.8,
          recommendation: "Execute route_switch strategy for all affected cases to move payment volume to healthy gateways.",
          priority: "critical",
          icon: AlertTriangle,
        });
      }

      // 4. Human escalations piling up
      const humanQ = opps.filter((o: any) => o.is_human_required && o.status === "open");
      const humanAmount = humanQ.reduce((s: number, o: any) => s + (o.amount_inr || 0), 0);
      if (humanQ.length > 0) {
        derived.push({
          id: "human-queue",
          type: "action",
          title: `${humanQ.length} high-value cases awaiting human decision`,
          observation: `${humanQ.length} transactions exceeded automated thresholds and are pending manual review.`,
          evidence: `${humanQ.length} cases in queue · ${fmt(humanAmount)} total · avg ${fmt(humanAmount / humanQ.length)} per case`,
          financialImpact: humanAmount * 0.7,
          recommendation: "Review and approve eligible cases in Needs Attention. Each approval can trigger immediate recovery.",
          priority: humanQ.length > 5 ? "critical" : "high",
          icon: Activity,
        });
      }

      // 5. Subscription failures trend
      const subFails = opps.filter((o: any) => o.case_type === "subscription_failure");
      if (subFails.length > 2) {
        const subAmount = subFails.reduce((s: number, o: any) => s + (o.amount_inr || 0), 0);
        const subRecovery = subFails.reduce((s: number, o: any) => s + (o.expected_recovery_value_inr || 0), 0);
        derived.push({
          id: "subscription-trend",
          type: "trend",
          title: `Subscription billing failures represent recurring revenue risk`,
          observation: `${subFails.length} subscription payments have failed. These are typically recoverable with a retry sequence.`,
          evidence: `${subFails.length} cases · ${fmt(subAmount)} MRR at risk · ${fmt(subRecovery)} recoverable`,
          financialImpact: subRecovery,
          recommendation: "Use 'sequence' strategy — retry at 30 min, 2h, and 24h intervals with customer notification.",
          priority: "high",
          icon: TrendingUp,
        });
      }

      if (derived.length === 0 && !isProv) {
        derived.push(
          {
            id: "sweet-spot-demo",
            type: "opportunity",
            title: "₹11.45L in high-confidence recoverable opportunities identified",
            observation: "7 active recovery scenarios analyzed across B2B SaaS, e-commerce, and subscription billing.",
            evidence: "12 ML signals evaluated · 85.7% overall recovery probability · Deterministic policy gates active",
            financialImpact: 1144898,
            recommendation: "Execute Smart Delay for Case 001 and Auto-Failover for Case 002 in Revenue Recovery.",
            priority: "critical",
            icon: Zap,
          },
          {
            id: "gateway-failover-demo",
            type: "anomaly",
            title: "PayU and Stripe showing elevated latency and error spikes",
            observation: "PayU error rate at 34.0% (p95 2,400ms) and Stripe at 38.0%. Razorpay remains healthy at 3.2% error.",
            evidence: "Real-time processor telemetry · Failover routing rule triggered (< 1.8s reroute)",
            financialImpact: 14999,
            recommendation: "Switch active transaction routing to Razorpay or Cashfree for flash sale campaigns.",
            priority: "high",
            icon: AlertTriangle,
          },
          {
            id: "involuntary-churn-demo",
            type: "trend",
            title: "Card Expiration represents ₹5.99L LTV involuntary churn risk",
            observation: "Bank card replacement on active subscribers will cause false cancellation if retried blindly.",
            evidence: "Customer tenure 24 months · 23 prior successful payments · No fraud indicators",
            financialImpact: 49900,
            recommendation: "Dispatch smart tokenized card update link instead of triggering standard payment retry.",
            priority: "high",
            icon: TrendingUp,
          }
        );
      }

      derived.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2 };
        return order[a.priority] - order[b.priority];
      });

      setInsights(derived);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", opacity: 0.5 }}>
      <div className="skeleton" style={{ height: "44px", width: "200px" }} />
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: "160px", borderRadius: "var(--r-lg)" }} />)}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "64px" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>AI Revenue Insights</div>
        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "4px" }}>
          Derived from live recovery cases. Each insight has real evidence and a financial impact estimate.
        </div>
      </motion.div>

      {/* Total recoverable from insights */}
      {insights.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Total Recoverable if All Insights Actioned</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#10b981", letterSpacing: "-0.03em" }}>
              {fmt(insights.reduce((s, i) => s + i.financialImpact, 0))}
            </div>
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{insights.length} actionable insights</div>
        </motion.div>
      )}

      {/* Insight Cards */}
      {insights.length === 0 ? (
        <div style={{ padding: "80px 24px", textAlign: "center", color: "var(--text-tertiary)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)" }}>
          <Activity size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: "6px" }}>
            {providerStatus?.active_environment === "RAZORPAY_TEST" || providerStatus?.active_environment === "RAZORPAY_LIVE" || providerStatus?.is_real_provider_data
              ? "Insufficient Data for a Statistically Reliable Insight"
              : "No Demo Insights Available"}
          </div>
          <div style={{ fontSize: "0.875rem", maxWidth: "540px", margin: "0 auto", lineHeight: 1.5, color: "var(--text-secondary)" }}>
            {providerStatus?.active_environment === "RAZORPAY_TEST" || providerStatus?.active_environment === "RAZORPAY_LIVE" || providerStatus?.is_real_provider_data
              ? "Connect your Razorpay account and synchronize payment records to generate live root-cause intelligence and actionable recovery opportunities."
              : "Reset demo scenarios in the topbar to reload the curated intelligence dataset."}
          </div>
        </div>
      ) : (
        insights.map((insight, i) => (
          <motion.div key={insight.id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>

            {/* Priority bar */}
            <div style={{ height: "3px", background: PRIORITY_COLOR[insight.priority] }} />

            <div style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: `${PRIORITY_COLOR[insight.priority]}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <insight.icon size={16} color={PRIORITY_COLOR[insight.priority]} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: PRIORITY_COLOR[insight.priority], textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 8px", background: `${PRIORITY_COLOR[insight.priority]}15`, borderRadius: "var(--r-sm)" }}>
                      {insight.priority}
                    </span>
                    <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "capitalize" }}>{insight.type}</span>
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>{insight.title}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Financial Impact</div>
                  <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#10b981" }}>{fmt(insight.financialImpact)}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                <div style={{ background: "var(--bg-overlay)", padding: "14px 16px", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Observation</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-primary)", lineHeight: 1.5 }}>{insight.observation}</div>
                </div>
                <div style={{ background: "var(--bg-overlay)", padding: "14px 16px", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Evidence</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-primary)", lineHeight: 1.5, fontFamily: "monospace" }}>{insight.evidence}</div>
                </div>
                <div style={{ background: `${PRIORITY_COLOR[insight.priority]}08`, padding: "14px 16px", borderRadius: "var(--r-md)", border: `1px solid ${PRIORITY_COLOR[insight.priority]}25` }}>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: PRIORITY_COLOR[insight.priority], textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Recommended Action</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-primary)", lineHeight: 1.5 }}>{insight.recommendation}</div>
                </div>
              </div>

              <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                <Link to="/opportunities" className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", padding: "6px 14px", background: "rgba(255,255,255,0.04)", borderRadius: "var(--r-sm)" }}>
                  View Cases <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}

