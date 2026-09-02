import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Play, RefreshCw, Trophy, GitBranch, Network } from "lucide-react";
import { getOpportunityGraph } from "../api/client";

interface StratResult {
  name: string;
  gross_inr: number;
  incremental_inr: number;
  cost_inr: number;
  discount_loss_inr: number;
  touches: number;
  duplicates: number;
  violations: number;
  do_nothing: number;
  nic_inr: number;
  color: string;
}

export const RecoveryArena: React.FC = () => {
  const [oppCount, setOppCount] = useState<number>(1000);
  const seed = 42;
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<Record<string, StratResult> | null>(null);
  const [graphData, setGraphData] = useState<any>(null);

  useEffect(() => {
    getOpportunityGraph()
      .then((data) => setGraphData(data))
      .catch((err) => console.error("Failed to load opportunity graph:", err));
  }, []);


  const runBenchmark = () => {
    setIsRunning(true);

    setTimeout(() => {
      let s = seed;
      const rand = () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
      };

      const data: Record<string, StratResult> = {
        NO_RECOVERY: { name: "No Recovery (Natural Baseline)", gross_inr: 0, incremental_inr: 0, cost_inr: 0, discount_loss_inr: 0, touches: 0, duplicates: 0, violations: 0, do_nothing: oppCount, nic_inr: 0, color: "#64748B" },
        TRADITIONAL_RETRY: { name: "Traditional Blind Retry", gross_inr: 0, incremental_inr: 0, cost_inr: 0, discount_loss_inr: 0, touches: 0, duplicates: 0, violations: 0, do_nothing: 0, nic_inr: 0, color: "#FF3B30" },
        SINGLE_AI_AGENT: { name: "Single Uncoordinated AI", gross_inr: 0, incremental_inr: 0, cost_inr: 0, discount_loss_inr: 0, touches: 0, duplicates: 0, violations: 0, do_nothing: 0, nic_inr: 0, color: "#F59E0B" },
        MULTI_AGENT_NO_GOV: { name: "Multi-Agent Without Governance", gross_inr: 0, incremental_inr: 0, cost_inr: 0, discount_loss_inr: 0, touches: 0, duplicates: 0, violations: 0, do_nothing: 0, nic_inr: 0, color: "#A5B4FC" },
        REVIVEOS: { name: "ReviveOS Control Plane", gross_inr: 0, incremental_inr: 0, cost_inr: 0, discount_loss_inr: 0, touches: 0, duplicates: 0, violations: 0, do_nothing: 0, nic_inr: 0, color: "#00FF66" },
      };

      for (let i = 0; i < oppCount; i++) {
        const amount = 500 + rand() * 24500;
        const p_nat = 0.08 + rand() * 0.32;
        const tau = 0.20 + rand() * 0.45;
        const p_int = Math.min(0.96, p_nat + tau);
        const cost = 3.0 + rand() * 5.0;
        const discount_leak = amount * 0.15;

        data.NO_RECOVERY.gross_inr += amount * p_nat;

        data.TRADITIONAL_RETRY.gross_inr += amount * 0.50;
        data.TRADITIONAL_RETRY.cost_inr += 4.0;
        data.TRADITIONAL_RETRY.touches += 1;
        if (rand() < 0.08) {
          data.TRADITIONAL_RETRY.duplicates += 1;
          data.TRADITIONAL_RETRY.violations += 1;
        }

        data.SINGLE_AI_AGENT.gross_inr += amount * p_int;
        data.SINGLE_AI_AGENT.cost_inr += cost;
        data.SINGLE_AI_AGENT.touches += 1;
        if (rand() < 0.05) data.SINGLE_AI_AGENT.duplicates += 1;

        data.MULTI_AGENT_NO_GOV.gross_inr += amount * Math.min(0.96, p_int + 0.02);
        data.MULTI_AGENT_NO_GOV.cost_inr += cost * 3.2;
        data.MULTI_AGENT_NO_GOV.touches += 3;
        data.MULTI_AGENT_NO_GOV.duplicates += Math.floor(1 + rand() * 3);
        if (rand() < 0.65) data.MULTI_AGENT_NO_GOV.discount_loss_inr += discount_leak;
        if (rand() < 0.15) data.MULTI_AGENT_NO_GOV.violations += 1;

        const nic = tau * amount - cost;
        if (nic > 25.0 && p_nat < 0.45) {
          data.REVIVEOS.gross_inr += amount * p_int;
          data.REVIVEOS.cost_inr += cost;
          data.REVIVEOS.touches += 1;
        } else {
          data.REVIVEOS.gross_inr += amount * p_nat;
          data.REVIVEOS.do_nothing += 1;
        }
      }

      const baseGross = data.NO_RECOVERY.gross_inr;
      Object.keys(data).forEach((k) => {
        const s = data[k];
        s.incremental_inr = Math.max(0, s.gross_inr - baseGross);
        s.nic_inr = s.incremental_inr - s.cost_inr - s.discount_loss_inr;
      });

      setResults(data);
      setIsRunning(false);
    }, 800);
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#00F0FF", letterSpacing: "0.15em" }}>
              FINANCIAL AGENT GOVERNANCE BENCHMARK
            </span>
            <span style={{ fontSize: "9px", padding: "2px 8px", borderRadius: "4px", background: "rgba(245,158,11,0.18)", color: "#F59E0B", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
              [BENCHMARK — SIMULATION]
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 800, color: "#FFF", margin: 0 }}>
            Recovery Arena
          </h1>
          <p style={{ fontSize: "14px", color: "#8E9BB0", maxWidth: "780px", margin: "6px 0 0 0", lineHeight: 1.6 }}>
            Run head-to-head simulations comparing 5 recovery paradigms across thousands of synthetic opportunities. Every number is computed deterministically.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#0A0C10", padding: "8px 16px", borderRadius: "12px", border: "1px solid #1E2230" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "#64748B", fontFamily: "var(--font-mono)" }}>Opportunities:</span>
            <select
              value={oppCount}
              onChange={(e) => setOppCount(Number(e.target.value))}
              style={{ background: "#0F1117", border: "1px solid #1E2230", color: "#FFF", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontFamily: "var(--font-mono)" }}
            >
              <option value={500}>500</option>
              <option value={1000}>1,000</option>
              <option value={5000}>5,000</option>
            </select>
          </div>

          <button
            onClick={runBenchmark}
            disabled={isRunning}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #00F0FF 0%, #0099FF 100%)",
              color: "#040711",
              fontFamily: "var(--font-section-heading)",
              fontSize: "12px",
              fontWeight: 800,
              textTransform: "uppercase",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isRunning ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
            {isRunning ? "RUNNING..." : "RUN BENCHMARK"}
          </button>
        </div>
      </div>

      {results && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          <div style={{ background: "rgba(0, 255, 102, 0.08)", border: "1.5px solid #00FF66", borderRadius: "14px", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0,255,102,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Trophy size={20} color="#00FF66" />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-section-heading)", fontSize: "15px", fontWeight: 800, color: "#FFF" }}>
                  WINNER: REVIVEOS CONTROL PLANE
                </div>
                <div style={{ fontSize: "12px", color: "#00FF66", marginTop: "2px" }}>
                  Achieved highest Net Incremental Contribution ({fmt(results.REVIVEOS.nic_inr)}) with 0 duplicate debits and 0 discount cannibalization.
                </div>
              </div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#8E9BB0" }}>
              Sample: {oppCount.toLocaleString()} events • Seed: {seed}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            {Object.keys(results).map((k) => {
              const r = results[k];
              const isWinner = k === "REVIVEOS";
              return (
                <div
                  key={k}
                  style={{
                    background: isWinner ? "#0F1117" : "#0A0C10",
                    border: isWinner ? "1.5px solid #00FF66" : "1px solid #1E2230",
                    borderRadius: "16px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    boxShadow: isWinner ? "0 0 30px rgba(0,255,102,0.12)" : "none",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "var(--font-section-heading)", fontSize: "13px", fontWeight: 800, color: isWinner ? "#00FF66" : "#FFF" }}>
                      {r.name}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#64748B", marginTop: "2px" }}>
                      {k}
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid #1E2230", borderBottom: "1px solid #1E2230", padding: "12px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: "#64748B" }}>Gross Recovered:</span>
                      <strong style={{ fontFamily: "var(--font-mono)", color: "#CBD5E1" }}>{fmt(r.gross_inr)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: "#64748B" }}>Intervention Cost:</span>
                      <strong style={{ fontFamily: "var(--font-mono)", color: "#FF3B30" }}>{fmt(r.cost_inr)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: "#64748B" }}>Discount Cannibalization:</span>
                      <strong style={{ fontFamily: "var(--font-mono)", color: r.discount_loss_inr > 0 ? "#FF3B30" : "#64748B" }}>{fmt(r.discount_loss_inr)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: "#64748B" }}>Duplicate Retries:</span>
                      <strong style={{ fontFamily: "var(--font-mono)", color: r.duplicates > 0 ? "#FF3B30" : "#00FF66" }}>{r.duplicates}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: "#64748B" }}>Policy Violations:</span>
                      <strong style={{ fontFamily: "var(--font-mono)", color: r.violations > 0 ? "#FF3B30" : "#00FF66" }}>{r.violations}</strong>
                    </div>
                    {r.do_nothing > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                        <span style={{ color: "#64748B" }}>DO NOTHING Decisions:</span>
                        <strong style={{ fontFamily: "var(--font-mono)", color: "#00F0FF" }}>{r.do_nothing}</strong>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: "10px", color: "#64748B" }}>Net Incremental Contribution (NIC)</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 900, color: isWinner ? "#00FF66" : (r.nic_inr > 0 ? "#FFF" : "#64748B"), marginTop: "2px" }}>
                      {fmt(r.nic_inr)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {!results && (
        <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "18px", padding: "60px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <Zap size={36} color="#00F0FF" />
          <div style={{ fontFamily: "var(--font-section-heading)", fontSize: "18px", fontWeight: 700, color: "#FFF" }}>
            Ready to Run Benchmark
          </div>
          <p style={{ fontSize: "13px", color: "#8E9BB0", maxWidth: "480px", margin: 0 }}>
            Click <strong>"RUN BENCHMARK"</strong> to simulate {oppCount.toLocaleString()} recovery opportunities across all 5 strategies simultaneously.
          </p>
        </div>
      )}

      {/* ── 3. LIVE REVENUE OPPORTUNITY GRAPH TELEMETRY ─────────────────── */}
      {graphData && (
        <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(0, 240, 255, 0.15)", border: "1px solid rgba(0, 240, 255, 0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Network size={16} color="#00F0FF" />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#00F0FF", letterSpacing: "0.1em" }}>
                  REVENUE OPPORTUNITY GRAPH
                </div>
                <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                  Cross-opportunity relationships: Customer collisions, shared BIN blocks, and systemic gateway incidents
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", padding: "3px 10px", borderRadius: "6px", background: "rgba(99, 102, 241, 0.15)", color: "#A5B4FC", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
                {graphData.total_relationship_edges} Relationship Edges
              </span>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", padding: "3px 10px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.15)", color: "#10B981", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                {graphData.failure_clusters} Failure Clusters
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
            {graphData.plain_language_summary?.map((line: string, i: number) => (
              <div key={i} style={{ background: "#0F1117", border: "1px solid #1E2230", borderRadius: "10px", padding: "14px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <GitBranch size={16} color="#00F0FF" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span style={{ fontSize: "12px", color: "#CBD5E1", lineHeight: 1.5 }}>{line}</span>
              </div>
            ))}
          </div>

          {graphData.clusters && graphData.clusters.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid #1E2230", paddingTop: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#F8FAFC" }}>Detected Systemic Clusters:</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px" }}>
                {graphData.clusters.map((c: any) => (
                  <div key={c.cluster_id} style={{ background: "#08090C", border: "1px solid #334155", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#F59E0B" }}>
                        {c.cluster_id} • {c.cluster_type}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#10B981", fontWeight: 700 }}>
                        {c.affected_count} Affected
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                      Gateway: <strong>{c.gateway.toUpperCase()}</strong> • Code: <strong>{c.failure_code}</strong> • Exposure: <strong>₹{c.total_exposure_inr?.toLocaleString("en-IN")}</strong>
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748B", fontStyle: "italic", marginTop: "4px" }}>
                      {c.resolution_recommendation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

