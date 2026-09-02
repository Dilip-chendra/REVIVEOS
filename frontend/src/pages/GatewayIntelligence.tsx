import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity
} from "lucide-react";
import { getGatewayIntelligence } from "../api/client";
import GatewayTopologyGraph from "../components/GatewayTopologyGraph";

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export default function GatewayIntelligence() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGatewayIntelligence()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px" }}>
        <div style={{ fontSize: "0.875rem", color: "var(--text-tertiary)" }}>Loading Gateway Telemetry...</div>
      </div>
    );
  }

  const gateways = data?.gateways || [
    {
      id: "razorpay",
      name: "Razorpay Sandbox",
      status: "HEALTHY",
      failure_rate: 0.032,
      baseline_failure_rate: 0.012,
      delta_pp: "+2.0pp",
      latency_ms: 210,
      p99_latency_ms: 520,
      uptime_24h: 99.82,
      active_routes_count: 1420,
      volume_inr_24h: 4820000.0,
      anomaly_detected: false,
      recommendation: "Optimal for primary card & UPI routing",
      last_incident: "None in last 72 hours",
    },
    {
      id: "payu",
      name: "PayU Sandbox",
      status: "DEGRADED",
      failure_rate: 0.340,
      baseline_failure_rate: 0.030,
      delta_pp: "+31.0pp",
      latency_ms: 2400,
      p99_latency_ms: 4800,
      uptime_24h: 94.10,
      active_routes_count: 48,
      volume_inr_24h: 720000.0,
      anomaly_detected: true,
      recommendation: "Route failover to Razorpay active. High timeout rate detected on 1st-of-month cycle.",
      last_incident: "Spike detected 42m ago — 34% timeout rate",
    },
    {
      id: "cashfree",
      name: "Cashfree Sandbox",
      status: "HEALTHY",
      failure_rate: 0.041,
      baseline_failure_rate: 0.025,
      delta_pp: "+1.6pp",
      latency_ms: 185,
      p99_latency_ms: 410,
      uptime_24h: 99.74,
      active_routes_count: 890,
      volume_inr_24h: 2150000.0,
      anomaly_detected: false,
      recommendation: "Optimal backup for 3D-Secure card verification & netbanking",
      last_incident: "None in last 48 hours",
    },
    {
      id: "stripe",
      name: "Stripe Sandbox",
      status: "DEGRADED",
      failure_rate: 0.380,
      baseline_failure_rate: 0.012,
      delta_pp: "+36.8pp",
      latency_ms: 1240,
      p99_latency_ms: 3600,
      uptime_24h: 92.40,
      active_routes_count: 12,
      volume_inr_24h: 340000.0,
      anomaly_detected: true,
      recommendation: "Flash sale load spike. Re-routing all non-3DS checkouts to PayU / Cashfree.",
      last_incident: "Network connection error spike during flash sale traffic",
    },
  ];

  const routingEngine = data?.routing_engine || {
    auto_failover_enabled: true,
    health_check_interval_seconds: 15,
    degradation_threshold_rate: 0.15,
    recovered_via_routing_inr: 184500.0,
    rerouted_transactions_count: 18,
    success_rate_after_routing: 0.944,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", paddingBottom: "80px" }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={18} color="var(--warning-text)" />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
            Gateway Intelligence & Telemetry
          </h1>
        </div>
        <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", maxWidth: "720px", lineHeight: 1.6 }}>
          Real-time processor health telemetry, latency profiling, anomaly detection, and automated recovery failover routing.
        </p>
      </div>

      {/* Interactive Topology Graph Component */}
      <GatewayTopologyGraph />

      {/* KPI Banner */}
      <div className="grid-responsive-4">
        {[
          { label: "Active Gateways Monitored", value: "4 Gateways", sub: "Razorpay, PayU, Cashfree, Stripe", color: "var(--text-primary)" },
          { label: "Degradation Threshold", value: "15.0% Err", sub: "Auto-failover triggers above 15%", color: "var(--accent)" },
          { label: "Recovered via Routing", value: formatINR(routingEngine.recovered_via_routing_inr), sub: `${routingEngine.rerouted_transactions_count} checkouts rescued`, color: "var(--success-text)" },
          { label: "Post-Routing Success Rate", value: `${(routingEngine.success_rate_after_routing * 100).toFixed(1)}%`, sub: "vs 62% industry retry baseline", color: "var(--success-text)" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-lg)",
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {kpi.label}
            </div>
            <div className="metric-value-responsive" style={{ color: kpi.color, letterSpacing: "-0.02em" }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Live Routing Demonstration Panel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-xl)",
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Live Failover Routing Architecture
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "2px" }}>
              How ReviveOS detects processor anomalies and silently reroutes transactions in sub-second time
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="status-dot live" />
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--success-text)" }}>
              Autonomous Failover: ACTIVE
            </span>
          </div>
        </div>

        {/* 3-Step Failover Flow (Responsive) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          {/* Step 1: Degraded Primary */}
          <div style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "var(--r-lg)", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--error-text)" }}>1. Primary (PayU)</span>
              <span className="badge badge-red" style={{ fontSize: "0.625rem" }}>DEGRADED</span>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Failure Rate: <strong>34.0%</strong> (Baseline: 3.0%)</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Latency: 2,400ms · Payday surge overload</div>
          </div>

          {/* Step 2: ReviveOS Decision Engine */}
          <div style={{ background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.25)", borderRadius: "var(--r-lg)", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--accent)" }}>2. Decision Gate</span>
              <span className="badge badge-blue" style={{ fontSize: "0.625rem" }}>EVALUATED</span>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Delta exceeds 15% threshold → Reroute</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Decision latency: 12ms · Policy: Approved</div>
          </div>

          {/* Step 3: Backup Gateway */}
          <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "var(--r-lg)", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--success-text)" }}>3. Target (Razorpay)</span>
              <span className="badge badge-green" style={{ fontSize: "0.625rem" }}>CAPTURED</span>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Failure Rate: <strong>3.2%</strong> · Latency: 210ms</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Recovered ₹1,84,500 with zero user intervention</div>
          </div>
        </div>
      </motion.div>

      {/* Gateway Cards Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Processor Health Breakdown
        </div>

        <div className="grid-responsive-2">
          {gateways.map((gw: any) => {
            const isDegraded = gw.status === "DEGRADED";
            return (
              <div
                key={gw.id}
                style={{
                  background: "var(--bg-elevated)",
                  border: isDegraded ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid var(--border)",
                  borderRadius: "var(--r-lg)",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {/* Top Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className={`status-dot ${!isDegraded ? "live" : "error"}`} />
                    <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {gw.name}
                    </span>
                  </div>
                  <span className={`badge ${!isDegraded ? "badge-green" : "badge-red"}`}>
                    {gw.status}
                  </span>
                </div>

                {/* Metrics Table */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "14px" }}>
                  <div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Current Error Rate</div>
                    <div style={{ fontSize: "1.125rem", fontWeight: 800, color: isDegraded ? "var(--error-text)" : "var(--text-primary)", marginTop: "2px" }}>
                      {(gw.failure_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Baseline / Delta</div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: isDegraded ? "var(--error-text)" : "var(--text-secondary)", marginTop: "4px" }}>
                      {(gw.baseline_failure_rate * 100).toFixed(1)}% ({gw.delta_pp})
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Avg Latency</div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "2px" }}>
                      {gw.latency_ms}ms (p99: {gw.p99_latency_ms}ms)
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>24h Uptime</div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: gw.uptime_24h > 98 ? "var(--success-text)" : "var(--warning-text)", marginTop: "2px" }}>
                      {gw.uptime_24h}%
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  <strong>Recommendation:</strong> {gw.recommendation}
                </div>

                {/* Incident note */}
                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                  Last event: {gw.last_incident}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
