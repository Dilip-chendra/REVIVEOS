import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, GitBranch, Shield, Bot,
  ChevronDown, ChevronUp
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

interface CommandCenterProps {
  portfolio?: any;
  isRealMode?: boolean;
}

interface MetricItem {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}

interface MetricGroup {
  id: string;
  icon: React.ComponentType<any>;
  color: string;
  label: string;
  subtitle: string;
  metrics: MetricItem[];
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ portfolio, isRealMode = false }) => {
  const [expanded, setExpanded] = useState(true);

  const isReal = isRealMode;
  const label = isReal ? "RAZORPAY PROVIDER" : "SIMULATION";
  const labelColor = isReal ? "#00FF66" : "#F59E0B";

  const opp = portfolio?.opportunities || [];
  const recovered = opp.filter((o: any) => o.state === "RECOVERED" || o.state === "NATURALLY_RECOVERED");
  const suppressed = opp.filter((o: any) => o.state === "ABSTAINED" || o.state === "BLOCKED");
  const totalAmount = recovered.reduce((s: number, o: any) => s + (o.amount_inr || 0), 0);
  const naturalAmount = opp.filter((o: any) => o.state === "NATURALLY_RECOVERED").reduce((s: number, o: any) => s + (o.amount_inr || 0), 0);
  const incrementalRevenue = totalAmount - naturalAmount;

  const simDefaults = {
    incrementalRevenue: 2847500,
    nic: 2391820,
    capitalDeployed: 43200,
    roi: 55.4,
    evaluated: 10000,
    authorized: 6241,
    actionsSupp: 18723,
    doNothing: 3759,
    dupPrevented: 89,
    policyDenials: 412,
    toctouRevocations: 14,
    optOuts: 7,
    agentProposals: 24964,
    collisions: 9823,
    winningAgents: 6241,
    suppressedAgents: 18723,
  };

  const groups: MetricGroup[] = [
    {
      id: "MONEY",
      icon: TrendingUp,
      color: "#00FF66",
      label: "MONEY",
      subtitle: "Economic outcomes",
      metrics: [
        { label: "Incremental Revenue Recovered", value: isReal ? fmt(incrementalRevenue) : fmt(simDefaults.incrementalRevenue), highlight: true },
        { label: "Net Incremental Contribution", value: isReal ? fmt(incrementalRevenue * 0.84) : fmt(simDefaults.nic), highlight: true },
        { label: "Recovery Capital Deployed", value: isReal ? fmt(portfolio?.recovery_budget_limit_inr || 0) : fmt(simDefaults.capitalDeployed) },
        { label: "Recovery ROI", value: isReal ? "—" : `${simDefaults.roi}×` },
      ],
    },
    {
      id: "DECISIONS",
      icon: GitBranch,
      color: "#00F0FF",
      label: "DECISIONS",
      subtitle: "Arbitration outcomes",
      metrics: [
        { label: "Opportunities Evaluated", value: isReal ? String(opp.length) : String(simDefaults.evaluated) },
        { label: "Actions Authorized", value: isReal ? String(recovered.length) : String(simDefaults.authorized) },
        { label: "Actions Suppressed", value: isReal ? String(suppressed.length) : String(simDefaults.actionsSupp) },
        { label: "DO NOTHING Decisions", value: isReal ? "—" : String(simDefaults.doNothing), muted: true },
      ],
    },
    {
      id: "SAFETY",
      icon: Shield,
      color: "#A5B4FC",
      label: "SAFETY",
      subtitle: "Governance enforcement",
      metrics: [
        { label: "Duplicate Debits Prevented", value: isReal ? "—" : String(simDefaults.dupPrevented), highlight: true },
        { label: "Policy Denials Issued", value: isReal ? "—" : String(simDefaults.policyDenials) },
        { label: "TOCTOU Revocations", value: isReal ? "—" : String(simDefaults.toctouRevocations) },
        { label: "Customer Opt-Outs Honored", value: isReal ? "—" : String(simDefaults.optOuts) },
      ],
    },
    {
      id: "AGENTS",
      icon: Bot,
      color: "#F59E0B",
      label: "AGENT GOVERNANCE",
      subtitle: "Multi-agent coordination",
      metrics: [
        { label: "Agent Proposals Received", value: isReal ? "—" : String(simDefaults.agentProposals) },
        { label: "Agent Collisions Resolved", value: isReal ? "—" : String(simDefaults.collisions), highlight: true },
        { label: "Winning Agent Actions", value: isReal ? "—" : String(simDefaults.winningAgents) },
        { label: "Suppressed Agent Actions", value: isReal ? "—" : String(simDefaults.suppressedAgents) },
      ],
    },
  ];

  return (
    <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "20px", overflow: "hidden" }}>
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", borderBottom: "1px solid #1E2230", cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800,
            color: "#00F0FF", letterSpacing: "0.15em"
          }}>
            EXECUTIVE ECONOMIC COMMAND CENTER
          </span>
          <span style={{
            fontSize: "9px", fontWeight: 800, padding: "2px 8px", borderRadius: "4px",
            background: `${labelColor}18`, color: labelColor, fontFamily: "var(--font-mono)"
          }}>
            {label}
          </span>
        </div>
        <button
          type="button"
          aria-label="Toggle executive command center"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
        >
          {groups.map((group, gi) => {
            const Icon = group.icon;
            return (
              <div
                key={group.id}
                style={{
                  padding: "20px 24px",
                  borderRight: gi < groups.length - 1 ? "1px solid #1E2230" : "none",
                  borderBottom: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "8px",
                    background: `${group.color}15`, border: `1px solid ${group.color}25`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={13} color={group.color} />
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 800, color: group.color, letterSpacing: "0.12em" }}>
                      {group.label}
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748B" }}>{group.subtitle}</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {group.metrics.map((m) => (
                    <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#8E9BB0" }}>{m.label}</span>
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: m.highlight ? "14px" : "13px",
                        fontWeight: m.highlight ? 800 : 700,
                        color: m.highlight ? group.color : (m.muted ? "#64748B" : "#CBD5E1"),
                      }}>
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      <div style={{
        padding: "8px 24px", borderTop: "1px solid #1E2230",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <span style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
          {isReal ? "Derived from connected Razorpay provider." : "SIMULATION — deterministic benchmark data. Not live merchant data."}
        </span>
        <span style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
          ReviveOS v2.0 Control Plane
        </span>
      </div>
    </div>
  );
};
