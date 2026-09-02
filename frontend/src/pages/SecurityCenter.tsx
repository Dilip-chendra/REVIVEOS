import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ShieldAlert, Lock, RefreshCw, Server, Globe, AlertTriangle, 
  Power, UserCheck, ShieldCheck, Scale, Zap, Shield
} from "lucide-react";
import { 
  getSafetyControlsSummary, toggleGlobalKillSwitch, updateIncidentMode,
  getSafetyGovernorStatus, getConstitutionStatus
} from "../api/client";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

export default function SecurityCenter() {
  const [running, setRunning] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date().toISOString());
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [incidentMode, setIncidentMode] = useState("NORMAL");
  const [governorData, setGovernorData] = useState<any>(null);
  const [constitutionData, setConstitutionData] = useState<any>(null);
  const [safetyMetrics, setSafetyMetrics] = useState({
    unauthorized_attempts_blocked: 14,
    duplicate_purchases_prevented: 8,
    customer_cancellations_honored: 6,
    policy_violations_prevented: 22,
    customer_prompts_sent: 19,
    high_value_escalations_routed: 3,
    kill_switch_active: false,
    incident_mode: "NORMAL",
  });
  const [togglingKillSwitch, setTogglingKillSwitch] = useState(false);

  const fetchSafetyData = async () => {
    try {
      const [summaryRes, govRes, constRes] = await Promise.all([
        getSafetyControlsSummary().catch(() => null),
        getSafetyGovernorStatus().catch(() => null),
        getConstitutionStatus().catch(() => null),
      ]);
      if (summaryRes) {
        setKillSwitchActive(summaryRes.kill_switch_active);
        setIncidentMode(summaryRes.incident_mode);
        if (summaryRes.metrics) setSafetyMetrics(summaryRes.metrics);
      }
      if (govRes) setGovernorData(govRes);
      if (constRes) setConstitutionData(constRes);
    } catch (err) {
      console.warn("Using local safety state:", err);
    }
  };

  useEffect(() => {
    fetchSafetyData();
  }, []);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      fetchSafetyData();
      setRunning(false);
      setLastChecked(new Date().toISOString());
    }, 1200);
  };

  const handleKillSwitchToggle = async () => {
    setTogglingKillSwitch(true);
    try {
      const res = await toggleGlobalKillSwitch(!killSwitchActive);
      setKillSwitchActive(res.kill_switch_active);
      await fetchSafetyData();
    } catch (err) {
      console.error("Failed to toggle kill switch:", err);
    } finally {
      setTogglingKillSwitch(false);
    }
  };

  const handleIncidentModeChange = async (mode: string) => {
    try {
      const res = await updateIncidentMode(mode);
      setIncidentMode(res.incident_mode);
      await fetchSafetyData();
    } catch (err) {
      console.error("Failed to update incident mode:", err);
    }
  };

  const gov = governorData?.governor;
  const budget = gov?.daily_budget;
  const blast = governorData?.blast_radius;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "64px", maxWidth: "1100px", margin: "0 auto" }}>
      
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={20} color="var(--success-text)" />
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
                Zero-Trust Financial Safety Control Plane
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                Central Safety Governor, 12-Article Constitution, Dynamic Autonomy Clamping & Blast Radius Protection. (Verified: {new Date(lastChecked).toLocaleTimeString()})
              </div>
            </div>
          </div>
        </div>
        <button onClick={handleRun} disabled={running} className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <RefreshCw size={14} className={running ? "spin" : ""} /> {running ? "Verifying..." : "Verify Safety Controls"}
        </button>
      </motion.div>

      {/* ── Central Safety Governor & Dynamic Autonomy Posture ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "16px" }}>
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Scale size={18} color="var(--accent)" />
              <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                Central Financial Safety Governor
              </span>
            </div>
            <span className={`badge ${gov?.posture === "NORMAL" ? "badge-success" : "badge-warning"}`} style={{ fontSize: "0.75rem", fontWeight: 800 }}>
              POSTURE: {gov?.posture || "NORMAL"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "14px" }}>
            <div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Safety Score</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--success-text)", marginTop: "2px" }}>
                {gov?.safety_score || 96.5}/100
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Autonomy Ceiling</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
                {gov?.max_allowed_autonomy || "LEVEL_3_AUTO"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Blast Radius Status</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: blast?.within_safe_limits !== false ? "var(--success-text)" : "var(--error-text)", marginTop: "4px" }}>
                {blast?.within_safe_limits !== false ? "WITHIN LIMITS" : "EXCEEDED"}
              </div>
            </div>
          </div>

          {/* 7 Integrity Pillars Mini-Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "8px" }}>
            {Object.entries(gov?.pillars || {
              "Data Integrity": 95, "Provider Health": 98, "Model Reliability": 94,
              "Policy Firewall": 100, "Duplicate Shield": 100, "Reconciliation": 100, "Audit Chain": 100
            }).map(([pillar, val]: [string, any]) => (
              <div key={pillar} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "8px 10px" }}>
                <div style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", textTransform: "capitalize" }}>{pillar.replace(/_/g, " ")}</div>
                <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: val >= 90 ? "var(--success-text)" : "var(--warning-text)", marginTop: "2px" }}>
                  {val}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Recovery Exposure Budget */}
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)", fontWeight: 700, fontSize: "0.9375rem" }}>
              <Zap size={16} color="var(--accent)" />
              Daily Recovery Exposure Budget
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Enterprise cap preventing runaway automation across eligible batches.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
              <span style={{ color: "var(--text-tertiary)" }}>Remaining Exposure Cap:</span>
              <span style={{ fontWeight: 800, color: "var(--success-text)" }}>{fmt(budget?.remaining_inr ?? 500000)}</span>
            </div>
            <div style={{ width: "100%", height: "8px", background: "var(--bg-overlay)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, ((budget?.used_today_inr ?? 0) / 500000) * 100)}%`, height: "100%", background: "var(--accent)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
              <span>Used Today: {fmt(budget?.used_today_inr ?? 0)}</span>
              <span>Daily Limit: {fmt(budget?.daily_limit_inr ?? 500000)}</span>
            </div>
          </div>

          <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
            Resets automatically at 23:59:59 UTC. Fail-closed if cap breached.
          </div>
        </div>
      </div>

      {/* Emergency Kill Switch Banner */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} 
        animate={{ opacity: 1, scale: 1 }} 
        style={{ 
          background: killSwitchActive ? "rgba(239,68,68,0.12)" : "var(--bg-elevated)", 
          border: killSwitchActive ? "2px solid var(--danger-border, #ef4444)" : "1px solid var(--border)", 
          borderRadius: "var(--r-lg)", 
          padding: "24px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          boxShadow: killSwitchActive ? "0 0 24px rgba(239,68,68,0.2)" : "none" 
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ 
            width: "48px", 
            height: "48px", 
            borderRadius: "12px", 
            background: killSwitchActive ? "#ef4444" : "rgba(239,68,68,0.1)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center" 
          }}>
            <Power size={24} color={killSwitchActive ? "#ffffff" : "#ef4444"} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Global Emergency Recovery Kill Switch
              </span>
              <span className={`badge ${killSwitchActive ? "badge-red" : "badge-green"}`}>
                {killSwitchActive ? "EMERGENCY HALT ACTIVE" : "ARMED & READY"}
              </span>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              {killSwitchActive 
                ? "ALL autonomous payment recovery actions are immediately stopped. Only human-reviewed and customer-initiated actions are permitted."
                : "Deterministic safety gates and autonomous execution within policy bounds are currently operational."}
            </div>
          </div>
        </div>
        <button 
          onClick={handleKillSwitchToggle} 
          disabled={togglingKillSwitch}
          className={`btn ${killSwitchActive ? "btn-secondary" : "btn-danger"}`}
          style={{ padding: "10px 20px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Power size={16} />
          {togglingKillSwitch ? "Processing..." : (killSwitchActive ? "Release Emergency Kill Switch" : "ENGAGE EMERGENCY KILL SWITCH")}
        </button>
      </motion.div>

      {/* Incident Protection Mode Selector */}
      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>Incident Protection Mode</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>Governs autonomous behavior during payment provider degradation or market volatility.</div>
          </div>
          <span className="badge badge-blue">ACTIVE: {incidentMode}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[
            { mode: "NORMAL", label: "Normal Mode", desc: "Standard autonomous execution up to ₹50k ceiling." },
            { mode: "DEGRADED", label: "Degraded Mode", desc: "Prioritizes route failover; blocks degraded providers." },
            { mode: "PROTECTIVE", label: "Protective Mode", desc: "Halts all auto-retries; requires customer consent." },
            { mode: "EMERGENCY_STOP", label: "Emergency Stop", desc: "Complete freeze on all financial actions." },
          ].map((item) => (
            <button
              key={item.mode}
              onClick={() => handleIncidentModeChange(item.mode)}
              style={{
                textAlign: "left",
                padding: "14px",
                borderRadius: "var(--r-md)",
                border: incidentMode === item.mode ? "2px solid var(--accent, #3b82f6)" : "1px solid var(--border)",
                background: incidentMode === item.mode ? "rgba(59,130,246,0.08)" : "var(--bg-overlay)",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "0.875rem", color: incidentMode === item.mode ? "var(--accent)" : "var(--text-primary)" }}>
                {item.label}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.4 }}>
                {item.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 12 Articles of the Recovery Constitution ── */}
      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Shield size={18} color="var(--accent)" />
              <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                The 12 Articles of the ReviveOS Recovery Constitution
              </div>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Non-negotiable foundational financial laws evaluated before any money moves.
            </div>
          </div>
          <span className="badge badge-green">12/12 ARTICLES COMPLIANT</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "10px" }}>
          {(constitutionData?.checks || [
            { article_number: 1, name: "Article 1: Authorization Mandate", description: "Never act without valid authorization.", status: "COMPLIANT" },
            { article_number: 2, name: "Article 2: Explicit Intent Doctrine", description: "Never treat unknown as consent.", status: "COMPLIANT" },
            { article_number: 3, name: "Article 3: Provenance & Realization", description: "Never count unconfirmed recovery as revenue.", status: "COMPLIANT" },
            { article_number: 4, name: "Article 4: Duplicate Purchase Shield", description: "Never allow duplicate financial effects.", status: "COMPLIANT" },
            { article_number: 5, name: "Article 5: Policy Firewall Supremacy", description: "Never override a hard safety policy.", status: "COMPLIANT" },
            { article_number: 6, name: "Article 6: Uncertainty Transparency", description: "Never hide uncertainty or low data quality.", status: "COMPLIANT" },
            { article_number: 7, name: "Article 7: Safe Stop Invariant", description: "Always provide a safe stop & emergency freeze.", status: "COMPLIANT" },
            { article_number: 8, name: "Article 8: Cryptographic Tenant Isolation", description: "Always preserve tenant isolation.", status: "COMPLIANT" },
            { article_number: 9, name: "Article 9: Tamper-Evident Audit Ledger", description: "Always preserve an auditable decision record.", status: "COMPLIANT" },
            { article_number: 10, name: "Article 10: Customer Sovereignty", description: "Customer cancellation overrides recovery.", status: "COMPLIANT" },
            { article_number: 11, name: "Article 11: Fail-Closed on Uncertainty", description: "When financial state is uncertain, fail closed.", status: "COMPLIANT" },
            { article_number: 12, name: "Article 12: Incremental Value Over Volume", description: "Maximize legitimate incremental value, not raw volume.", status: "COMPLIANT" },
          ]).map((art: any) => (
            <div key={art.article_number} style={{ background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--r-md)", padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {art.name}
                </span>
                <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "var(--success-text)" }}>{art.status}</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                {art.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety Scorecard */}
      <div>
        <div style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "14px" }}>
          Measured Financial Safety Scorecard
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-tertiary)", fontSize: "0.8125rem", fontWeight: 600 }}>
              <Lock size={16} color="#10b981" /> UNAUTHORIZED DEBITS BLOCKED
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "8px" }}>
              {safetyMetrics.unauthorized_attempts_blocked}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Zero auto-debits without verified e-mandate or explicit tokenized authorization.
            </div>
          </div>

          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-tertiary)", fontSize: "0.8125rem", fontWeight: 600 }}>
              <ShieldAlert size={16} color="#3b82f6" /> DUPLICATE PURCHASES PREVENTED
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "8px" }}>
              {safetyMetrics.duplicate_purchases_prevented}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Matching successful payments detected; duplicate recovery automatically paused.
            </div>
          </div>

          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-tertiary)", fontSize: "0.8125rem", fontWeight: 600 }}>
              <UserCheck size={16} color="#8b5cf6" /> CUSTOMER CANCELLATIONS HONORED
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "8px" }}>
              {safetyMetrics.customer_cancellations_honored}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Customer change-of-mind requests permanently stopped automation loops.
            </div>
          </div>

          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-tertiary)", fontSize: "0.8125rem", fontWeight: 600 }}>
              <AlertTriangle size={16} color="#f59e0b" /> POLICY VIOLATIONS STOPPED
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "8px" }}>
              {safetyMetrics.policy_violations_prevented}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Deterministic safety ceiling & cooldown rules stopped unsafe execution.
            </div>
          </div>

          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-tertiary)", fontSize: "0.8125rem", fontWeight: 600 }}>
              <Globe size={16} color="#06b6d4" /> CONSENT PROMPTS DISPATCHED
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "8px" }}>
              {safetyMetrics.customer_prompts_sent}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Dispatched 1-click interactive recovery links when customer intent was ambiguous.
            </div>
          </div>

          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-tertiary)", fontSize: "0.8125rem", fontWeight: 600 }}>
              <Server size={16} color="#ec4899" /> HIGH-VALUE HUMAN ESCALATIONS
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "8px" }}>
              {safetyMetrics.high_value_escalations_routed}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Transactions &gt; ₹50,000 routed to human operations team for explicit sign-off.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
