import { useState } from "react";
import {
  Activity, Zap, RefreshCw
} from "lucide-react";
import RazorpayLogo from "./common/RazorpayLogo";

export default function GatewayTopologyGraph() {
  const [stripeDegraded, setStripeDegraded] = useState(true);
  const [payuDegraded, setPayuDegraded] = useState(true);

  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header & Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={18} color="var(--accent)" />
            <h3 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              Live Dynamic Smart Routing Topology
            </h3>
            <span className="badge badge-green" style={{ fontSize: "0.625rem" }}>
              <div className="status-dot live" style={{ width: "6px", height: "6px" }} /> Auto-Failover Active
            </span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Real-time multi-gateway anomaly detection & dynamic sub-2s traffic re-routing
          </div>
        </div>

        {/* Live Simulation Toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setStripeDegraded(!stripeDegraded)}
            className={`btn btn-sm ${stripeDegraded ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: "0.6875rem", padding: "6px 10px" }}
          >
            {stripeDegraded ? "Stripe: Spike Active (38%)" : "Simulate Stripe Spike"}
          </button>
          <button
            onClick={() => setPayuDegraded(!payuDegraded)}
            className={`btn btn-sm ${payuDegraded ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: "0.6875rem", padding: "6px 10px" }}
          >
            {payuDegraded ? "PayU: Degraded (34%)" : "Simulate PayU Timeout"}
          </button>
          <button
            onClick={() => { setStripeDegraded(false); setPayuDegraded(false); }}
            className="btn btn-ghost btn-sm btn-icon"
            title="Reset All"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* SVG Topology Visual Canvas */}
      <div
        style={{
          background: "var(--bg-base)",
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--border)",
          padding: "24px 16px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 2fr 1fr", gap: "16px", alignItems: "center" }}>
          
          {/* Column 1: Source (Merchant Ingestion) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "14px", textAlign: "center" }}>
              <div style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Source</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>Merchant App</div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", marginTop: "4px" }}>2,450 req/min</div>
              <div className="badge badge-gray" style={{ fontSize: "0.5625rem", marginTop: "6px" }}>E-Com / SaaS</div>
            </div>
          </div>

          {/* Column 2: ReviveOS Smart Router Engine */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", position: "relative" }}>
            <div
              style={{
                background: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.35)",
                borderRadius: "var(--r-md)",
                padding: "16px",
                textAlign: "center",
                boxShadow: "0 0 20px rgba(59, 130, 246, 0.1)"
              }}
            >
              <Zap size={18} color="var(--accent)" style={{ margin: "0 auto 4px" }} />
              <div style={{ fontSize: "0.8125rem", fontWeight: 800, color: "var(--text-primary)" }}>ReviveOS Smart Router</div>
              <div style={{ fontSize: "0.625rem", color: "var(--accent)", marginTop: "2px" }}>Dynamic Health Monitor</div>
              <div style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", marginTop: "6px" }}>P99 Latency: 12ms</div>
              <div style={{ fontSize: "0.5625rem", background: "rgba(59,130,246,0.15)", color: "var(--accent)", padding: "2px 6px", borderRadius: "4px", marginTop: "6px" }}>
                1.8s Auto-Failover
              </div>
            </div>
          </div>

          {/* Column 3: 4 Gateway Adapters */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            
            {/* Gateway 1: Razorpay */}
            <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "var(--r-md)", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }} />
                  <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-primary)", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <RazorpayLogo height={13} variant="white" /> Primary
                  </span>
                </div>
                <div style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", marginTop: "2px" }}>210ms · 3.2% err · 99.8% up</div>
              </div>
              <span className="badge badge-green" style={{ fontSize: "0.5625rem" }}>
                78% Traffic
              </span>
            </div>

            {/* Gateway 2: PayU */}
            <div style={{ background: payuDegraded ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)", border: `1px solid ${payuDegraded ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`, borderRadius: "var(--r-md)", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: payuDegraded ? "#EF4444" : "#10B981" }} />
                  <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-primary)" }}>PayU Gateway</span>
                </div>
                <div style={{ fontSize: "0.625rem", color: payuDegraded ? "var(--error-text)" : "var(--text-tertiary)", marginTop: "2px" }}>
                  {payuDegraded ? "2400ms · 34.0% error (SPIKE)" : "190ms · 2.8% error"}
                </div>
              </div>
              <span className={`badge ${payuDegraded ? "badge-red" : "badge-green"}`} style={{ fontSize: "0.5625rem" }}>
                {payuDegraded ? "REROUTED" : "Active"}
              </span>
            </div>

            {/* Gateway 3: Cashfree */}
            <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "var(--r-md)", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }} />
                  <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-primary)" }}>Cashfree Backup</span>
                </div>
                <div style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", marginTop: "2px" }}>185ms · 4.1% err · 99.7% up</div>
              </div>
              <span className="badge badge-green" style={{ fontSize: "0.5625rem" }}>
                {payuDegraded || stripeDegraded ? "+22% Failover" : "Standby"}
              </span>
            </div>

            {/* Gateway 4: Stripe */}
            <div style={{ background: stripeDegraded ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)", border: `1px solid ${stripeDegraded ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`, borderRadius: "var(--r-md)", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: stripeDegraded ? "#EF4444" : "#10B981" }} />
                  <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-primary)" }}>Stripe Global</span>
                </div>
                <div style={{ fontSize: "0.625rem", color: stripeDegraded ? "var(--error-text)" : "var(--text-tertiary)", marginTop: "2px" }}>
                  {stripeDegraded ? "1240ms · 38.0% error (OVERLOAD)" : "220ms · 1.9% error"}
                </div>
              </div>
              <span className={`badge ${stripeDegraded ? "badge-red" : "badge-green"}`} style={{ fontSize: "0.5625rem" }}>
                {stripeDegraded ? "BYPASSED" : "Healthy"}
              </span>
            </div>
          </div>

          {/* Column 4: Card & Bank Networks */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "14px", textAlign: "center" }}>
              <div style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Settlement</div>
              <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>NPCI / Banks</div>
              <div style={{ fontSize: "0.6875rem", color: "var(--success-text)", marginTop: "4px" }}>✓ 94.4% Capture</div>
              <div className="badge badge-green" style={{ fontSize: "0.5625rem", marginTop: "6px" }}>Settled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Impact Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", background: "var(--bg-base)", padding: "14px 18px", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
        <div>
          <div style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Failover Response Time</div>
          <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--accent)", marginTop: "2px" }}>1.8 Seconds</div>
        </div>
        <div>
          <div style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Success Rate Post-Reroute</div>
          <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--success-text)", marginTop: "2px" }}>94.4%</div>
        </div>
        <div>
          <div style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Volume Protected from Drops</div>
          <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>₹1,84,500.00</div>
        </div>
        <div>
          <div style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>False Declines Prevented</div>
          <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--success-text)", marginTop: "2px" }}>480 Transactions</div>
        </div>
      </div>
    </div>
  );
}
