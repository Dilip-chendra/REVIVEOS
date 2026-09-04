import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getRecoveryOpportunities, getDemoScenarios, getRazorpayStatus } from "../api/client";
import { ChevronRight, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppMode } from "../context/AppModeContext";
import EmptyWorkspaceState from "../components/EmptyWorkspaceState";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

type CustomerGroup = {
  id: string;
  totalAtRisk: number;
  totalExpectedRecovery: number;
  avgRecoveryProb: number;
  ltv: number;
  successRate: number;
  cases: any[];
  topFailure: string;
  segment: string;
};

function segment(ltv: number, prob: number, atRisk: number): string {
  if (atRisk > 100000) return "High-Value at Risk";
  if (prob > 0.75) return "High Recovery Potential";
  if (ltv > 500000) return "Loyal Customer";
  if (prob < 0.3) return "Low Recovery Potential";
  return "Standard";
}

const SEGMENT_COLOR: Record<string, string> = {
  "High-Value at Risk": "#ef4444",
  "High Recovery Potential": "#10b981",
  "Loyal Customer": "#8b5cf6",
  "Low Recovery Potential": "#6b7280",
  "Standard": "var(--text-tertiary)",
};

export default function Customers() {
  const { isRealMode } = useAppMode();
  const [customers, setCustomers] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<string>("all");
  const [providerStatus, setProviderStatus] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      getRecoveryOpportunities(100),
      getRazorpayStatus().catch(() => null)
    ])
      .then(async ([opps, pStatus]) => {
        setProviderStatus(pStatus);
        const isProv = pStatus?.active_environment === "RAZORPAY_TEST" || pStatus?.active_environment === "RAZORPAY_LIVE" || pStatus?.is_real_provider_data;
        
        let list = opps || [];
        if (!isProv && !isRealMode && list.length === 0) {
          list = await getDemoScenarios().catch(() => []);
        }
        // Group by customer_id
        const map: Record<string, CustomerGroup> = {};
        list.forEach((c: any) => {
          const cid = c.customer_name || c.customer_context?.name || c.customer_id || "Customer";
          if (!map[cid]) {
            map[cid] = {
              id: cid,
              totalAtRisk: 0,
              totalExpectedRecovery: 0,
              avgRecoveryProb: 0,
              ltv: c.customer_lifetime_value_inr || 0,
              successRate: c.customer_success_rate || 0,
              cases: [],
              topFailure: "",
              segment: "",
            };
          }
          map[cid].totalAtRisk += c.amount_inr || 0;
          map[cid].totalExpectedRecovery += c.expected_recovery_value_inr || 0;
          map[cid].cases.push(c);
          map[cid].ltv = Math.max(map[cid].ltv, c.customer_lifetime_value_inr || 0);
        });

        // Compute derived fields
        const grouped = Object.values(map).map(g => {
          const avgProb = g.cases.reduce((s: number, c: any) => s + (c.recovery_probability || 0), 0) / g.cases.length;
          const topFailure = Object.entries(
            g.cases.reduce((acc: Record<string, number>, c: any) => {
              acc[c.failure_category || "unknown"] = (acc[c.failure_category || "unknown"] || 0) + 1;
              return acc;
            }, {})
          ).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
          return {
            ...g,
            avgRecoveryProb: avgProb,
            topFailure,
            segment: segment(g.ltv, avgProb, g.totalAtRisk),
          };
        });

        grouped.sort((a, b) => b.totalAtRisk - a.totalAtRisk);
        setCustomers(grouped);
      })
      .finally(() => setLoading(false));
  }, []);

  const segments = ["all", ...Array.from(new Set(customers.map(c => c.segment)))];
  const filtered = activeSegment === "all" ? customers : customers.filter(c => c.segment === activeSegment);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", opacity: 0.5 }}>
      <div className="skeleton" style={{ height: "44px", width: "200px" }} />
      {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: "72px", borderRadius: "var(--r-md)" }} />)}
    </div>
  );

  const isProviderMode = providerStatus?.active_environment === "RAZORPAY_TEST" || providerStatus?.active_environment === "RAZORPAY_LIVE" || providerStatus?.is_real_provider_data;
  const totalCustomers = customers.length;
  const highRisk = customers.filter(c => c.totalAtRisk > 100000).length;
  const totalAtRisk = customers.reduce((s, c) => s + c.totalAtRisk, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "64px" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>Customer Recovery Intelligence</div>
          <span className={`badge ${isProviderMode ? "badge-green" : "badge-blue"}`}>
            {isProviderMode ? `● ${providerStatus?.active_environment || "RAZORPAY TEST"}` : "● DEMO SCENARIOS"}
          </span>
        </div>
        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "4px" }}>Payment reliability profiles derived from active recovery cases.</div>
      </motion.div>

      {/* KPIs */}
      <div className="grid-responsive-3">
        {[
          { label: "Customers with Active Cases", value: totalCustomers, icon: Users, color: "var(--text-primary)" },
          { label: "High-Value at Risk", value: highRisk, icon: AlertTriangle, color: "#ef4444" },
          { label: "Total Revenue at Risk", value: fmt(totalAtRisk), icon: TrendingUp, color: "#f59e0b" },
        ].map((k) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "18px 20px", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--bg-overlay)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <k.icon size={16} color={k.color} />
            </div>
            <div>
              <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{k.label}</div>
              <div className="metric-value-responsive" style={{ color: k.color }}>{String(k.value)}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Segment Filter */}
      {customers.length > 0 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {segments.map(seg => (
            <button key={seg} onClick={() => setActiveSegment(seg)} className="btn btn-secondary btn-sm"
              style={{ background: activeSegment === seg ? "var(--accent)" : "var(--bg-elevated)", color: activeSegment === seg ? "var(--text-inverse)" : "var(--text-secondary)", borderColor: activeSegment === seg ? "var(--accent)" : "var(--border)", fontWeight: activeSegment === seg ? 600 : 500 }}>
              {seg === "all" ? `All Customers (${customers.length})` : seg}
            </button>
          ))}
        </div>
      )}

      {/* Customer List Container */}
      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
        
        {/* Desktop / Tablet Table */}
        <div className="table-responsive-wrapper desktop-hide-mobile">
          <div style={{ minWidth: "920px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1.3fr 1.3fr 1.1fr 1.8fr 100px", gap: "16px", padding: "12px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", alignItems: "center" }}>
              <div>Customer</div>
              <div>Revenue at Risk</div>
              <div>Lifetime Value</div>
              <div>Recover Prob</div>
              <div>Segment</div>
              <div style={{ textAlign: "right" }}>Action</div>
            </div>

            {filtered.length === 0 ? (
              isRealMode ? (
                <div style={{ padding: "40px 24px" }}>
                  <EmptyWorkspaceState
                    title="NO REAL CUSTOMERS AT RISK"
                    subtitle="Your connected Razorpay workspace has zero active customer payment anomalies. As payments process through your Razorpay rails, customer profiles will automatically appear here."
                  />
                </div>
              ) : (
                <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--text-tertiary)" }}>
                  <Users size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: "6px" }}>
                    No customer accounts found
                  </div>
                  <div style={{ fontSize: "0.875rem", maxWidth: "560px", margin: "0 auto", lineHeight: 1.5, color: "var(--text-secondary)" }}>
                    Reset demo scenarios in the topbar to reload customer profiles.
                  </div>
                </div>
              )
            ) : (
              filtered.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                  style={{ display: "grid", gridTemplateColumns: "2.2fr 1.3fr 1.3fr 1.1fr 1.8fr 100px", gap: "16px", padding: "16px 24px", alignItems: "center", borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.15s" }} className="card-hover">

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: `${SEGMENT_COLOR[c.segment]}20`, border: `1px solid ${SEGMENT_COLOR[c.segment]}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, color: SEGMENT_COLOR[c.segment], flexShrink: 0 }}>
                    {c.id.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>{c.id}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "2px" }}>
                      {c.cases.length} active case{c.cases.length > 1 ? "s" : ""} · {c.topFailure.replace(/_/g, " ")}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#ef4444", fontVariantNumeric: "tabular-nums" }}>{fmt(c.totalAtRisk)}</div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(c.ltv)}</div>

                <div style={{ fontSize: "1rem", fontWeight: 700, color: c.avgRecoveryProb > 0.7 ? "#10b981" : c.avgRecoveryProb > 0.4 ? "#f59e0b" : "#ef4444" }}>
                  {(c.avgRecoveryProb * 100).toFixed(0)}%
                </div>

                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ display: "inline-flex", padding: "4px 12px", borderRadius: "var(--r-sm)", background: `${SEGMENT_COLOR[c.segment]}15`, border: `1px solid ${SEGMENT_COLOR[c.segment]}35`, fontSize: "0.75rem", fontWeight: 600, color: SEGMENT_COLOR[c.segment], whiteSpace: "nowrap" }}>
                    {c.segment}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Link to={`/case/${c.cases[0]?.id}`} className="btn btn-ghost btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", padding: "6px 12px", whiteSpace: "nowrap" }}>
                    View <ChevronRight size={13} />
                  </Link>
                </div>
              </motion.div>
            )))}
          </div>
        </div>

        {/* Mobile Customer Cards */}
        <div className="mobile-only" style={{ flexDirection: "column", gap: "10px", padding: "12px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-tertiary)" }}>
              No customer accounts found.
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={`mobile-${c.id}`}
                style={{
                  background: "var(--bg-overlay)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-lg)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: `${SEGMENT_COLOR[c.segment]}20`, border: `1px solid ${SEGMENT_COLOR[c.segment]}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, color: SEGMENT_COLOR[c.segment] }}>
                      {c.id.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)" }}>{c.id}</div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                        {c.cases.length} case{c.cases.length > 1 ? "s" : ""} · {c.topFailure.replace(/_/g, " ")}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.6875rem", padding: "2px 8px", borderRadius: "4px", background: `${SEGMENT_COLOR[c.segment]}15`, color: SEGMENT_COLOR[c.segment], fontWeight: 700 }}>
                    {c.segment}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "var(--bg-surface)", padding: "10px 12px", borderRadius: "8px", fontSize: "0.75rem" }}>
                  <div>
                    <span style={{ color: "var(--text-tertiary)", display: "block" }}>At Risk:</span>
                    <strong style={{ color: "#ef4444", fontSize: "0.875rem" }}>{fmt(c.totalAtRisk)}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-tertiary)", display: "block" }}>LTV:</span>
                    <strong style={{ color: "var(--text-primary)", fontSize: "0.875rem" }}>{fmt(c.ltv)}</strong>
                  </div>
                </div>

                <Link
                  to={`/case/${c.cases[0]?.id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ textAlign: "center", justifyContent: "center", fontSize: "0.75rem" }}
                >
                  View Case File ({fmt(c.totalAtRisk)}) →
                </Link>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
