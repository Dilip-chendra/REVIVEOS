import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, Filter, Cpu, Award, RefreshCw, Loader2
} from "lucide-react";
import { api } from "../api/client";

interface OpportunityItem {
  case_id: string;
  customer_name?: string;
  amount_inr: number;
  failure_code: string;
  case_type: string;
  p_natural_recovery: number;
  p_intervention_recovery: number;
  causal_lift: number;
  expected_gross_recovery_inr: number;
  expected_incremental_recovery_inr: number;
  expected_nic_inr: number;
  ros_score: number;
  urgency_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  customer_intent: string;
  recommended_decision: string;
  decision_rationale: string;
  is_profitable: boolean;
  requires_human: boolean;
}

interface StrategyEvaluationItem {
  strategy_name: string;
  strategy_type: string;
  p_natural_recovery: number;
  p_intervention_recovery: number;
  causal_lift: number;
  expected_gross_inr: number;
  intervention_cost_inr: number;
  discount_cost_inr: number;
  friction_cost_inr: number;
  expected_nic_inr: number;
  customer_friction_level: string;
  risk_level: string;
  autonomy_level_required: string;
  is_feasible: boolean;
  blocking_reasons: string[];
  verdict: "RECOMMENDED" | "VIABLE" | "SUPPRESSED" | "BLOCKED";
  rationale: string;
}

interface SimulationResult {
  case_id: string;
  amount_inr: number;
  customer_intent: string;
  opted_out: boolean;
  evaluated_strategies: StrategyEvaluationItem[];
  winning_strategy: string;
  winning_rationale: string;
  margin_preserved_vs_aggressive_inr: number;
  contacts_avoided: number;
}

export default function OpportunityQueue() {
  const [queueData, setQueueData] = useState<OpportunityItem[]>([]);
  const [totalStats, setTotalStats] = useState({
    total_count: 0,
    total_at_risk_inr: 0,
    total_expected_incremental_inr: 0,
    total_expected_nic_inr: 0,
  });
  const [selectedUrgency, setSelectedUrgency] = useState<string>("ALL");
  const [selectedDecision, setSelectedDecision] = useState<string>("ALL");
  const [activeSimulation, setActiveSimulation] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueue();
  }, [selectedUrgency, selectedDecision]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      let url = "/opportunities/queue";
      const params = new URLSearchParams();
      if (selectedUrgency !== "ALL") params.append("urgency", selectedUrgency);
      if (selectedDecision !== "ALL") params.append("decision", selectedDecision);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get(url).then(r => r.data);
      setQueueData(res?.queue || []);
      setTotalStats({
        total_count: res?.total_count || 0,
        total_at_risk_inr: res?.total_at_risk_inr || 0,
        total_expected_incremental_inr: res?.total_expected_incremental_inr || 0,
        total_expected_nic_inr: res?.total_expected_nic_inr || 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async (oppId: string) => {
    setSimLoading(true);
    try {
      const res = await api.get(`/opportunities/${oppId}/simulate-strategies`).then(r => r.data);
      setActiveSimulation(res);
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#3B82F6", background: "rgba(59, 130, 246, 0.1)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(59, 130, 246, 0.2)" }}>
              Revenue Recovery Intelligence Control Plane
            </span>
            <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <ShieldCheck size={12} /> Causal Attribution Active
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
            Recovery Opportunity Queue
          </h1>
          <p style={{ fontSize: 13, color: "#94A3B8", margin: "4px 0 0 0" }}>
            Priority-ranked by Recovery Opportunity Score (ROS) & Net Incremental Contribution (NIC).
          </p>
        </div>

        <button 
          onClick={loadQueue}
          style={{ background: "#1E293B", border: "1px solid #334155", color: "#E2E8F0", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Queue
        </button>
      </div>

      {/* Macro KPI Ribbon */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)", border: "1px solid rgba(148, 163, 184, 0.15)", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "#94A3B8", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Total Queue Opportunities</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#F8FAFC" }}>{totalStats.total_count}</div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Gross At-Risk: ₹{totalStats.total_at_risk_inr.toLocaleString("en-IN")}</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "#93C5FD", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Expected Incremental Recovery</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#60A5FA" }}>₹{totalStats.total_expected_incremental_inr.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Observed minus Natural Counterfactual</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, rgba(6, 78, 59, 0.3) 0%, rgba(15, 23, 42, 0.8) 100%)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "#6EE7B7", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Net Incremental Contribution (NIC)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#34D399" }}>₹{totalStats.total_expected_nic_inr.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: 11, color: "#A7F3D0", marginTop: 4 }}>Pure profit after API, discount & attention costs</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94A3B8" }}>
          <Filter size={14} /> Filter Urgency:
        </div>
        {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((u) => (
          <button
            key={u}
            onClick={() => setSelectedUrgency(u)}
            style={{
              background: selectedUrgency === u ? "#3B82F6" : "#1E293B",
              border: `1px solid ${selectedUrgency === u ? "#60A5FA" : "#334155"}`,
              color: selectedUrgency === u ? "#FFF" : "#94A3B8",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {u}
          </button>
        ))}

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94A3B8", marginLeft: 16 }}>
          Decision:
        </div>
        {["ALL", "MANDATE_RETRY", "PAYMENT_LINK", "WAIT", "DO_NOT_INTERVENE", "HUMAN_REVIEW"].map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDecision(d)}
            style={{
              background: selectedDecision === d ? "#10B981" : "#1E293B",
              border: `1px solid ${selectedDecision === d ? "#34D399" : "#334155"}`,
              color: selectedDecision === d ? "#FFF" : "#94A3B8",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Opportunities List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {queueData.map((opp) => (
          <div
            key={opp.case_id}
            style={{
              background: "#0F172A",
              border: "1px solid rgba(148, 163, 184, 0.15)",
              borderRadius: 10,
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              transition: "border-color 0.2s ease",
            }}
          >
            {/* Left Info */}
            <div style={{ minWidth: 260, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#F8FAFC" }}>{opp.case_id}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: opp.urgency_level === "CRITICAL" ? "rgba(239, 68, 68, 0.2)" : opp.urgency_level === "HIGH" ? "rgba(249, 115, 22, 0.2)" : "rgba(59, 130, 246, 0.2)", color: opp.urgency_level === "CRITICAL" ? "#F87171" : opp.urgency_level === "HIGH" ? "#FB923C" : "#60A5FA", border: `1px solid ${opp.urgency_level === "CRITICAL" ? "rgba(239, 68, 68, 0.4)" : "rgba(59, 130, 246, 0.4)"}` }}>
                  {opp.urgency_level}
                </span>
                <span style={{ fontSize: 11, color: "#94A3B8" }}>
                  Intent: <strong style={{ color: "#E2E8F0" }}>{opp.customer_intent}</strong>
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span>Amount: <strong style={{ color: "#F8FAFC" }}>₹{opp.amount_inr.toLocaleString("en-IN")}</strong></span>
                <span>Failure: <strong style={{ color: "#CBD5E1" }}>{opp.failure_code}</strong></span>
                <span>Type: <strong style={{ color: "#CBD5E1" }}>{opp.case_type}</strong></span>
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>
                {opp.decision_rationale}
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase" }}>Natural P(Nat)</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#94A3B8" }}>{(opp.p_natural_recovery * 100).toFixed(0)}%</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#60A5FA", textTransform: "uppercase" }}>Lift (τ)</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#60A5FA" }}>+{(opp.causal_lift * 100).toFixed(0)}%</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#34D399", textTransform: "uppercase" }}>Expected NIC</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#34D399" }}>+₹{opp.expected_nic_inr.toLocaleString("en-IN")}</div>
              </div>
              <div style={{ textAlign: "center", background: "rgba(59, 130, 246, 0.1)", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                <div style={{ fontSize: 10, color: "#93C5FD", textTransform: "uppercase", fontWeight: 700 }}>ROS SCORE</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#3B82F6" }}>{opp.ros_score.toFixed(0)}</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => handleSimulate(opp.case_id)}
                disabled={simLoading}
                style={{
                  background: "#1E293B",
                  border: "1px solid #3B82F6",
                  color: "#93C5FD",
                  padding: "8px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {simLoading ? <Loader2 size={14} className="spin" /> : <Cpu size={14} />}
                Simulate 7 Strategies
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 7-Strategy Simulation Modal */}
      <AnimatePresence>
        {activeSimulation && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 12, maxWidth: 900, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#3B82F6", textTransform: "uppercase" }}>7-Strategy Multi-Action Evaluator</span>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "#F8FAFC", margin: "4px 0" }}>
                    Simulation for Opportunity: {activeSimulation.case_id} (₹{activeSimulation.amount_inr.toLocaleString("en-IN")})
                  </h2>
                  <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>
                    First-class side-by-side evaluation of Deliberate Abstention (WAIT), S2S Mandate Retry, 1-Tap Links, and Margin-burning Discounts.
                  </p>
                </div>
                <button 
                  onClick={() => setActiveSimulation(null)}
                  style={{ background: "#1E293B", border: "none", color: "#94A3B8", padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
                >
                  ✕ Close
                </button>
              </div>

              {/* Winning Banner */}
              <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#34D399", fontWeight: 700, fontSize: 13 }}>
                  <Award size={16} /> ReviveOS Arbitration Winner: {activeSimulation.winning_strategy}
                </div>
                <div style={{ fontSize: 12, color: "#A7F3D0", marginTop: 4 }}>
                  {activeSimulation.winning_rationale}
                </div>
                <div style={{ fontSize: 11, color: "#6EE7B7", marginTop: 6, display: "flex", gap: 16 }}>
                  <span>Margin Saved vs Aggressive Concession: <strong>₹{activeSimulation.margin_preserved_vs_aggressive_inr.toLocaleString("en-IN")}</strong></span>
                  <span>Unnecessary Contacts Avoided: <strong>{activeSimulation.contacts_avoided}</strong></span>
                </div>
              </div>

              {/* Table Comparison */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #334155", color: "#94A3B8" }}>
                      <th style={{ padding: "8px 10px" }}>Strategy</th>
                      <th style={{ padding: "8px 10px" }}>P(Intervention)</th>
                      <th style={{ padding: "8px 10px" }}>Lift (τ)</th>
                      <th style={{ padding: "8px 10px" }}>Expected NIC</th>
                      <th style={{ padding: "8px 10px" }}>Customer Friction</th>
                      <th style={{ padding: "8px 10px" }}>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSimulation.evaluated_strategies.map((strat) => (
                      <tr 
                        key={strat.strategy_type}
                        style={{ 
                          borderBottom: "1px solid rgba(51, 65, 85, 0.5)",
                          background: strat.strategy_type === activeSimulation.winning_strategy ? "rgba(59, 130, 246, 0.1)" : "transparent"
                        }}
                      >
                        <td style={{ padding: "10px 10px", fontWeight: 600, color: "#F8FAFC" }}>
                          {strat.strategy_name}
                          <div style={{ fontSize: 10, color: "#64748B", fontWeight: 400 }}>{strat.rationale}</div>
                        </td>
                        <td style={{ padding: "10px 10px", color: "#CBD5E1" }}>{(strat.p_intervention_recovery * 100).toFixed(0)}%</td>
                        <td style={{ padding: "10px 10px", color: strat.causal_lift > 0 ? "#60A5FA" : "#94A3B8" }}>
                          {strat.causal_lift > 0 ? `+${(strat.causal_lift * 100).toFixed(0)}%` : "0%"}
                        </td>
                        <td style={{ padding: "10px 10px", fontWeight: 700, color: strat.expected_nic_inr > 0 ? "#34D399" : strat.expected_nic_inr < 0 ? "#F87171" : "#94A3B8" }}>
                          {strat.expected_nic_inr > 0 ? `+₹${strat.expected_nic_inr.toLocaleString("en-IN")}` : `₹${strat.expected_nic_inr.toLocaleString("en-IN")}`}
                        </td>
                        <td style={{ padding: "10px 10px", color: "#94A3B8" }}>{strat.customer_friction_level}</td>
                        <td style={{ padding: "10px 10px" }}>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            background: strat.verdict === "RECOMMENDED" ? "rgba(16, 185, 129, 0.2)" : strat.verdict === "SUPPRESSED" ? "rgba(239, 68, 68, 0.2)" : "rgba(148, 163, 184, 0.2)",
                            color: strat.verdict === "RECOMMENDED" ? "#34D399" : strat.verdict === "SUPPRESSED" ? "#F87171" : "#94A3B8"
                          }}>
                            {strat.verdict}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}