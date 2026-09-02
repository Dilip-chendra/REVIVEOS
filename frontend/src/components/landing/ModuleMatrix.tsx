import React, { useState } from "react";
import {
  Layers, Zap, Shield, Cpu, Activity, Scale, Eye,
  BarChart3, FileCode, Terminal, Lock, CheckCircle2
} from "lucide-react";

interface ModuleInfo {
  id: string;
  name: string;
  category: "ARBITRATION" | "INTELLIGENCE" | "SAFETY" | "INFRASTRUCTURE";
  icon: any;
  tag: string;
  description: string;
  inputs: string[];
  outputs: string[];
  invariantsEnforced: string[];
}

export const ModuleMatrix: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<number>(0);

  const modules: ModuleInfo[] = [
    {
      id: "M01",
      name: "Recovery Capital Desk",
      category: "ARBITRATION",
      icon: Scale,
      tag: "KNAPSACK OPTIMIZER",
      description: "Allocates finite daily intervention capital and customer attention budgets to maximize aggregate Net Incremental Contribution (NIC).",
      inputs: ["Multi-Agent Bids", "Merchant Daily Capital Ceiling", "Customer Communication Budget"],
      outputs: ["Authorized Action Order", "Suppression Contracts", "Allocated Budget (paise)"],
      invariantsEnforced: ["Invariant 01: Amount ≠ Opportunity", "Invariant 03: One Customer → One Decision"],
    },
    {
      id: "M02",
      name: "Risk & Opportunities Engine",
      category: "INTELLIGENCE",
      icon: Zap,
      tag: "CAUSAL LIFT ESTIMATOR",
      description: "12-signal machine learning classifier calculating treatment effect deltas (τ) and natural settlement probabilities.",
      inputs: ["12 Real-Time Payment Signals", "Historical Issuer Health", "Customer Tenure"],
      outputs: ["Causal Lift Score (τ)", "P(Natural Settle)", "Failure Root Cause Code"],
      invariantsEnforced: ["Invariant 01: Causal Lift over Gross Rupee Size", "Invariant 02: P(Natural Settle) Calculation"],
    },
    {
      id: "M03",
      name: "Customer Sovereignty Engine",
      category: "SAFETY",
      icon: Eye,
      tag: "FATIGUE GOVERNANCE",
      description: "Tracks customer intent lifecycle (Active, Expired, Cancelled) and enforces strict 7-day communication fatigue ceilings.",
      inputs: ["Customer Intent Telemetry", "7-Day Touch Counter", "Opt-Out Signals"],
      outputs: ["Touch Budget Decrement", "One-Click Stop Signal", "Intent State Tag"],
      invariantsEnforced: ["Invariant 03: Customer Sovereignty", "Invariant 04: Cancelled Intent Gate"],
    },
    {
      id: "M04",
      name: "Revenue Recovery Copilot",
      category: "INTELLIGENCE",
      icon: Cpu,
      tag: "GEMINI 2.0 FLASH",
      description: "Natural-language reasoning assistant equipped with real-time backend tool calling to audit portfolios and simulate policy impacts.",
      inputs: ["Natural Language Queries", "Live Database Schema", "Risk Engine Diagnostics"],
      outputs: ["Factual Reasoning Explanations", "Policy Simulation Previews", "Gateway Health Metrics"],
      invariantsEnforced: ["Zero-Hallucination Fallback", "Deterministic Execution Boundary"],
    },
    {
      id: "M05",
      name: "Gateway Incident Commander",
      category: "INFRASTRUCTURE",
      icon: Activity,
      tag: "SRE AUTO-FAILOVER",
      description: "Real-time socket health monitoring with automated sub-2s traffic rerouting when processor latency spikes.",
      inputs: ["Processor Webhooks", "Error Rate Moving Average (1m/5m)", "Issuer Latency"],
      outputs: ["Automated Route Divert", "Circuit Breaker Trip", "Health Telemetry Log"],
      invariantsEnforced: ["Zero Failed Retries during Outages", "Processor Truth Idempotency"],
    },
    {
      id: "M06",
      name: "Policy Studio & Financial Firewall",
      category: "SAFETY",
      icon: Shield,
      tag: "DETERMINISTIC GATE",
      description: "Immutable code-level safety boundaries enforcing max retry counts (≤3), cooldown windows (≥2h), and 14-point eligibility rules.",
      inputs: ["Proposed Action Contracts", "14-Point Rule Registry", "Merchant Safety Limits"],
      outputs: ["ALLOW / HARD_DENY Verdict", "Cryptographic Suppression Reason", "Compliance Audit Event"],
      invariantsEnforced: ["Invariant 04: Dead Transactions Stay Dead", "14-Point RBI Compliance Gate"],
    },
    {
      id: "M07",
      name: "Counterfactual Attribution Lab",
      category: "INTELLIGENCE",
      icon: BarChart3,
      tag: "WHAT-IF CAUSALITY",
      description: "Decision science studio comparing actual interventions against counterfactual synthetic controls to measure true incremental margin lift.",
      inputs: ["Historical Decision Ledger", "Synthetic Control Group", "Realized Settlement Data"],
      outputs: ["Treatment Effect Delta (pp)", "Margin Leakage Saved", "Counterfactual Decision Replay"],
      invariantsEnforced: ["Invariant 01: Incremental Contribution Verification"],
    },
    {
      id: "M08",
      name: "Holdout A/B Experiments",
      category: "INTELLIGENCE",
      icon: Layers,
      tag: "STATISTICAL RIGOR",
      description: "Continuous randomized holdout splits (10% control vs 90% ReviveOS) demonstrating statistically significant recovery uplift.",
      inputs: ["Random Seed Hash", "Holdout Cohort Assignment", "Provider Settlement Webhooks"],
      outputs: ["Confidence Interval (p < 0.01)", "Recovery Lift vs Blind Retries (+21pp)", "Brier Score Calibration"],
      invariantsEnforced: ["Zero Fabricated Lift Claims", "Honest Empirical Proof"],
    },
    {
      id: "M09",
      name: "Cryptographic Audit Trail",
      category: "SAFETY",
      icon: FileCode,
      tag: "SHA-256 LEDGER",
      description: "Tamper-evident, immutable, append-only decision ledger maintaining cryptographic action hashes for enterprise compliance.",
      inputs: ["Decision Payloads", "Previous Block Hash", "Timestamp & Actor ID"],
      outputs: ["SHA-256 Rolling Hash", "Immutable Audit Record", "SOX / SOC2 Compliance Export"],
      invariantsEnforced: ["Invariant 05: Decision Auditing", "Zero Modification Invariant"],
    },
    {
      id: "M10",
      name: "Webhook Studio & Developer Hub",
      category: "INFRASTRUCTURE",
      icon: Terminal,
      tag: "EVENT STREAMING",
      description: "Interactive Razorpay webhook simulator, HMAC-SHA256 signature verification debugger, and API telemetry monitor.",
      inputs: ["Razorpay Webhook Events", "Secret Key Signatures", "Retry Polling Calls"],
      outputs: ["HMAC Verified Payload", "Event Stream Log", "Idempotency Key Receipt"],
      invariantsEnforced: ["Invariant 05: Provider State Ingestion"],
    },
    {
      id: "M11",
      name: "Zero-Trust Security Center",
      category: "INFRASTRUCTURE",
      icon: Lock,
      tag: "GOVERNANCE PLANE",
      description: "Role-based access control, cryptographic key rotation, and pre-execution atomic locks stopping concurrency race conditions.",
      inputs: ["Operator Auth Tokens", "Encrypted Secrets Vault", "Atomic State Lock Requests"],
      outputs: ["Pre-Execution Lock Granted", "Key Access Audit", "TOCTOU Race Prevention"],
      invariantsEnforced: ["Invariant 05: Decision ≠ Execution (TOCTOU Lock)"],
    },
  ];

  const current = modules[selectedModule];
  const Icon = current.icon;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "24px", alignItems: "start", width: "100%" }}>
      
      {/* Module Selector List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "540px", overflowY: "auto", paddingRight: "6px" }}>
        {modules.map((m, idx) => {
          const isSelected = selectedModule === idx;
          const ModIcon = m.icon;

          return (
            <button
              key={m.id}
              onClick={() => setSelectedModule(idx)}
              style={{
                textAlign: "left",
                padding: "10px 14px",
                borderRadius: "10px",
                background: isSelected ? "#0F1117" : "#0A0C10",
                border: isSelected ? "1.5px solid #00F0FF" : "1px solid #1E2230",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ModIcon size={14} color={isSelected ? "#00F0FF" : "#64748B"} />
                <span style={{ fontSize: "11px", fontWeight: isSelected ? 800 : 600, color: isSelected ? "#FFF" : "#8E9BB0" }}>
                  {m.name}
                </span>
              </div>
              <span
                style={{
                  fontSize: "8px",
                  fontWeight: 800,
                  padding: "1px 5px",
                  borderRadius: "3px",
                  background: isSelected ? "rgba(0, 240, 255, 0.2)" : "rgba(255, 255, 255, 0.05)",
                  color: isSelected ? "#00F0FF" : "#64748B",
                  fontFamily: "monospace",
                }}
              >
                {m.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Module Schematic Details Card */}
      <div style={{ background: "#0F1117", border: "1px solid #1E2230", borderRadius: "18px", padding: "28px", display: "flex", flexDirection: "column", gap: "20px", boxShadow: "0 16px 40px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "4px", background: "rgba(112, 0, 255, 0.2)", color: "#A5B4FC", fontFamily: "monospace" }}>
                MODULE {current.id} • {current.category}
              </span>
              <span style={{ fontSize: "10px", color: "#00F0FF", fontWeight: 700, fontFamily: "monospace" }}>
                {current.tag}
              </span>
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#FFF", marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
              <Icon size={22} color="#00F0FF" />
              <span>{current.name}</span>
            </h3>
          </div>
        </div>

        <p style={{ fontSize: "0.9375rem", color: "#8E9BB0", lineHeight: 1.6, margin: 0 }}>
          {current.description}
        </p>

        {/* Data Pipeline Schematics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", borderTop: "1px solid #1E2230", paddingTop: "16px" }}>
          
          {/* Upstream Inputs */}
          <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "10px", padding: "14px" }}>
            <span style={{ fontSize: "10px", fontWeight: 800, color: "#00F0FF", fontFamily: "monospace" }}>
              ▼ UPSTREAM DATA INGESTION
            </span>
            <ul style={{ margin: "8px 0 0", paddingLeft: "16px", fontSize: "11px", color: "#8E9BB0", lineHeight: 1.6 }}>
              {current.inputs.map((inp, i) => (
                <li key={i}>{inp}</li>
              ))}
            </ul>
          </div>

          {/* Downstream Outputs */}
          <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "10px", padding: "14px" }}>
            <span style={{ fontSize: "10px", fontWeight: 800, color: "#00FF66", fontFamily: "monospace" }}>
              ▲ DOWNSTREAM EXECUTION TARGETS
            </span>
            <ul style={{ margin: "8px 0 0", paddingLeft: "16px", fontSize: "11px", color: "#8E9BB0", lineHeight: 1.6 }}>
              {current.outputs.map((out, i) => (
                <li key={i}>{out}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Invariants Enforced */}
        <div style={{ background: "#0A0C10", border: "1px solid rgba(112, 0, 255, 0.3)", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <CheckCircle2 size={16} color="#00FF66" />
          <span style={{ fontSize: "11px", color: "#F8FAFC", fontWeight: 600 }}>
            Guaranteed Invariants: <strong style={{ color: "#A5B4FC" }}>{current.invariantsEnforced.join(" • ")}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
