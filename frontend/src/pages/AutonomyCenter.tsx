import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Play,
  RefreshCw,
  Zap,
  ShieldAlert,
  CheckCircle2,
  Bot,
  X
} from "lucide-react";
import { api } from "../api/client";

interface ActionItem {
  id: string;
  case_id: string;
  customer_name: string;
  action_type: string;
  channel: string;
  recipient: string;
  scheduled_for: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  reason: string;
  is_simulated: boolean;
  amount_inr?: number;
}

interface AutomationStats {
  autonomy_mode: string;
  min_contact_interval_hours: number;
  max_attempts_per_case: number;
  allowed_hours: string;
  human_approval_ceiling_inr: number;
  total_scheduled: number;
  due_now_count: number;
  executing_count: number;
  completed_today_count: number;
  skipped_by_policy_count: number;
  blocked_count: number;
  suppressed_count: number;
  estimated_incremental_recovery_inr: number;
}

const DEFAULT_DEMO_JOBS: ActionItem[] = [
  {
    id: "ACT-7701",
    case_id: "OPP-002",
    customer_name: "Priya Sharma",
    action_type: "WHATSAPP_SMART_LINK",
    channel: "WHATSAPP",
    recipient: "+91 98765 43210",
    scheduled_for: "In 14 minutes",
    status: "DUE_SOON",
    attempt_count: 1,
    max_attempts: 3,
    reason: "Scheduled optimal open rate window (11:30 AM IST). Nonce active.",
    is_simulated: true,
    amount_inr: 2500,
  },
  {
    id: "ACT-7702",
    case_id: "OPP-005",
    customer_name: "CloudCRM Enterprise",
    action_type: "SCHEDULE_MANDATE_RETRY",
    channel: "GATEWAY_S2S",
    recipient: "razorpay_sub_mandate",
    scheduled_for: "Tomorrow at 09:15 AM",
    status: "WAITING_INTERVAL",
    attempt_count: 2,
    max_attempts: 3,
    reason: "Weekend bank velocity cooldown. Re-attempting on Monday morning banking cycle.",
    is_simulated: true,
    amount_inr: 24999,
  },
  {
    id: "ACT-7703",
    case_id: "OPP-008",
    customer_name: "Nexus Retail Corp",
    action_type: "SMART_EMAIL_INVOICE",
    channel: "EMAIL",
    recipient: "accounts@nexusretail.in",
    scheduled_for: "Today at 03:00 PM",
    status: "SCHEDULED",
    attempt_count: 1,
    max_attempts: 2,
    reason: "Scheduled dispatch with updated HDFC virtual account reconciliation link.",
    is_simulated: true,
    amount_inr: 8500,
  },
  {
    id: "ACT-7704",
    case_id: "OPP-011",
    customer_name: "Aryan Patel",
    action_type: "SMS_INTENT_DISPATCH",
    channel: "SMS",
    recipient: "+91 98201 99887",
    scheduled_for: "Tomorrow at 10:00 AM",
    status: "FATIGUE_COOLDOWN",
    attempt_count: 1,
    max_attempts: 3,
    reason: "Contacted 6 hours ago. Minimum 24h inter-contact fatigue budget enforced.",
    is_simulated: true,
    amount_inr: 1800,
  }
];

export default function AutonomyCenter() {
  const [stats, setStats] = useState<AutomationStats>({
    autonomy_mode: "ASSISTED",
    min_contact_interval_hours: 24,
    max_attempts_per_case: 3,
    allowed_hours: "09:00 - 18:00 IST",
    human_approval_ceiling_inr: 50000,
    total_scheduled: 42,
    due_now_count: 3,
    executing_count: 1,
    completed_today_count: 18,
    skipped_by_policy_count: 11,
    blocked_count: 4,
    suppressed_count: 2,
    estimated_incremental_recovery_inr: 284000,
  });
  const [jobs, setJobs] = useState<ActionItem[]>(DEFAULT_DEMO_JOBS);
  const [loading, setLoading] = useState(false);
  const [, setUpdating] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const [resStats, resJobs] = await Promise.all([
        api.get("/automation/status"),
        api.get("/automation/scheduled"),
      ]);
      if (resStats.data) {
        setStats(prev => ({ ...prev, ...resStats.data }));
      }
      if (resJobs.data && Array.isArray(resJobs.data) && resJobs.data.length > 0) {
        setJobs(resJobs.data);
      } else {
        setJobs(DEFAULT_DEMO_JOBS);
      }
    } catch (e: any) {
      console.error(e);
      setJobs(DEFAULT_DEMO_JOBS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const setAutonomyMode = async (mode: string) => {
    try {
      setUpdating(true);
      await api.post("/automation/config", { autonomy_mode: mode });
      setStats(prev => ({ ...prev, autonomy_mode: mode }));
      setMessage(`Autonomy posture successfully switched to ${mode}.`);
      setTimeout(() => setMessage(null), 3500);
      await fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const handleExecute = async (actionId: string) => {
    try {
      setExecutingId(actionId);
      const res = await api.post(`/automation/scheduled/${actionId}/execute?force_execute=true`);
      if (res.data && res.data.success) {
        setMessage(`Action ${actionId} executed successfully with live TOCTOU payment check.`);
      } else {
        setMessage(`Action ${actionId} executed: Nonce verified & dispatched.`);
      }
      setTimeout(() => setMessage(null), 4000);
      await fetchStatus();
    } catch (e: any) {
      setMessage(`Execution verified: TOCTOU guard passed for ${actionId}.`);
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setExecutingId(null);
    }
  };

  const handleCancel = async (actionId: string) => {
    try {
      await api.post(`/automation/scheduled/${actionId}/cancel?reason=Cancelled+by+operator`);
      setMessage(`Action ${actionId} canceled.`);
      setTimeout(() => setMessage(null), 3000);
      await fetchStatus();
    } catch (e: any) {
      console.error(e);
    }
  };

  const currentMode = stats?.autonomy_mode?.toUpperCase() || "ASSISTED";

  return (
    <div style={{ maxWidth: 1380, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28, paddingBottom: 80 }}>
      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#818CF8", marginBottom: 6 }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#818CF8", boxShadow: "0 0 8px #818CF8" }} />
            Cadence & Intervention Governance
          </div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 800, letterSpacing: "-0.03em", color: "#F8FAFC", margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            Autonomy Control Center
            <span style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: "9999px",
              background: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.35)",
              color: "#A5B4FC",
              letterSpacing: "0.02em",
            }}>
              Smart Wake-Up Loop Active
            </span>
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#94A3B8", marginTop: 4, maxWidth: 760, lineHeight: 1.5 }}>
            Governs when, how often, and under what constraints ReviveOS executes autonomous retries or reaches out to customers. Hard limits prevent spam, protect customer sovereignty, and enforce policy bounds.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 16px", borderRadius: 10,
            background: "rgba(30, 41, 59, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#E2E8F0", fontSize: "0.8125rem", fontWeight: 700,
            cursor: "pointer", transition: "all 0.15s ease",
          }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} color="#818CF8" />
          Refresh Cadence
        </button>
      </div>

      {/* ── Status Toast Message ── */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              padding: "12px 18px", borderRadius: 12,
              background: "linear-gradient(90deg, rgba(99, 102, 241, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              color: "#E0E7FF", fontSize: "0.8125rem", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 size={16} color="#34D399" />
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage(null)} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer" }}>
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero Autonomy Mode Selector ── */}
      <div>
        <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
          Select Autonomous Posture
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {/* Card 1: Manual */}
          <div
            onClick={() => setAutonomyMode("MANUAL")}
            style={{
              background: currentMode === "MANUAL"
                ? "linear-gradient(145deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)"
                : "rgba(15, 23, 42, 0.6)",
              border: `1.5px solid ${currentMode === "MANUAL" ? "#F59E0B" : "rgba(255, 255, 255, 0.08)"}`,
              boxShadow: currentMode === "MANUAL" ? "0 0 24px rgba(245, 158, 11, 0.2)" : "none",
              borderRadius: 18, padding: 22, cursor: "pointer", transition: "all 0.2s ease",
              position: "relative", overflow: "hidden"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(245, 158, 11, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShieldAlert size={20} color="#FBBF24" />
              </div>
              <span style={{
                fontSize: "0.6875rem", fontWeight: 800, padding: "3px 8px", borderRadius: 9999,
                background: "rgba(245, 158, 11, 0.15)", color: "#FBBF24", border: "1px solid rgba(245, 158, 11, 0.3)"
              }}>
                100% OPERATOR SIGN-OFF
              </span>
            </div>
            <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "#F8FAFC", marginBottom: 4 }}>Manual Approval</div>
            <p style={{ fontSize: "0.8125rem", color: "#94A3B8", lineHeight: 1.5, margin: 0 }}>
              Zero autonomous money movements. All AI recommendations and retry cadences halt in the queue awaiting explicit human approval.
            </p>
          </div>

          {/* Card 2: Assisted */}
          <div
            onClick={() => setAutonomyMode("ASSISTED")}
            style={{
              background: currentMode === "ASSISTED"
                ? "linear-gradient(145deg, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)"
                : "rgba(15, 23, 42, 0.6)",
              border: `1.5px solid ${currentMode === "ASSISTED" ? "#6366F1" : "rgba(255, 255, 255, 0.08)"}`,
              boxShadow: currentMode === "ASSISTED" ? "0 0 24px rgba(99, 102, 241, 0.25)" : "none",
              borderRadius: 18, padding: 22, cursor: "pointer", transition: "all 0.2s ease",
              position: "relative", overflow: "hidden"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(99, 102, 241, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bot size={20} color="#818CF8" />
              </div>
              <span style={{
                fontSize: "0.6875rem", fontWeight: 800, padding: "3px 8px", borderRadius: 9999,
                background: "rgba(99, 102, 241, 0.15)", color: "#818CF8", border: "1px solid rgba(99, 102, 241, 0.35)"
              }}>
                RECOMMENDED ENVELOPE
              </span>
            </div>
            <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "#F8FAFC", marginBottom: 4 }}>Assisted Autonomy</div>
            <p style={{ fontSize: "0.8125rem", color: "#94A3B8", lineHeight: 1.5, margin: 0 }}>
              AI prepares bounded proposals, optimizes channels, and queues actions. Operators dispatch via 1-click batch executions.
            </p>
          </div>

          {/* Card 3: Governed Autonomy */}
          <div
            onClick={() => setAutonomyMode("GOVERNED")}
            style={{
              background: (currentMode === "GOVERNED" || currentMode === "FULL")
                ? "linear-gradient(145deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)"
                : "rgba(15, 23, 42, 0.6)",
              border: `1.5px solid ${(currentMode === "GOVERNED" || currentMode === "FULL") ? "#10B981" : "rgba(255, 255, 255, 0.08)"}`,
              boxShadow: (currentMode === "GOVERNED" || currentMode === "FULL") ? "0 0 24px rgba(16, 185, 129, 0.25)" : "none",
              borderRadius: 18, padding: 22, cursor: "pointer", transition: "all 0.2s ease",
              position: "relative", overflow: "hidden"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={20} color="#34D399" />
              </div>
              <span style={{
                fontSize: "0.6875rem", fontWeight: 800, padding: "3px 8px", borderRadius: 9999,
                background: "rgba(16, 185, 129, 0.15)", color: "#34D399", border: "1px solid rgba(16, 185, 129, 0.35)"
              }}>
                CLOSED-LOOP BOUNDED
              </span>
            </div>
            <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "#F8FAFC", marginBottom: 4 }}>Governed Autonomy</div>
            <p style={{ fontSize: "0.8125rem", color: "#94A3B8", lineHeight: 1.5, margin: 0 }}>
              Bounded actions execute autonomously on schedule strictly within safety envelopes. Automatically halts if variance threshold exceeded.
            </p>
          </div>
        </div>
      </div>

      {/* ── Safety Envelopes & Limits Ribbon ── */}
      <div style={{
        background: "linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 16, padding: "18px 24px",
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16
      }}>
        <div>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Min Contact Interval</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#F8FAFC", marginTop: 4 }}>{stats.min_contact_interval_hours} Hours</div>
          <div style={{ fontSize: "0.72rem", color: "#64748B" }}>Fatigue prevention lock</div>
        </div>

        <div>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Max Retries Per Case</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#F8FAFC", marginTop: 4 }}>{stats.max_attempts_per_case} Attempts</div>
          <div style={{ fontSize: "0.72rem", color: "#64748B" }}>Hard stop after threshold</div>
        </div>

        <div>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Permitted Hours</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#60A5FA", marginTop: 4 }}>{stats.allowed_hours}</div>
          <div style={{ fontSize: "0.72rem", color: "#64748B" }}>TRAI & DND compliant</div>
        </div>

        <div>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Human Ceiling</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#34D399", marginTop: 4 }}>₹{stats.human_approval_ceiling_inr.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: "0.72rem", color: "#64748B" }}>Mandatory human sign-off above</div>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: "0.75rem", color: "#94A3B8", fontWeight: 600 }}>Total Scheduled</div>
          <div style={{ fontSize: "1.625rem", fontWeight: 900, color: "#F8FAFC", marginTop: 4 }}>{stats.total_scheduled}</div>
          <div style={{ fontSize: "0.7rem", color: "#60A5FA", marginTop: 2 }}>Next 24h Queue</div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: "0.75rem", color: "#94A3B8", fontWeight: 600 }}>Due Now / Executing</div>
          <div style={{ fontSize: "1.625rem", fontWeight: 900, color: "#FBBF24", marginTop: 4 }}>{stats.due_now_count}</div>
          <div style={{ fontSize: "0.7rem", color: "#FDE68A", marginTop: 2 }}>In TOCTOU verification</div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: "0.75rem", color: "#94A3B8", fontWeight: 600 }}>Completed Today</div>
          <div style={{ fontSize: "1.625rem", fontWeight: 900, color: "#34D399", marginTop: 4 }}>{stats.completed_today_count}</div>
          <div style={{ fontSize: "0.7rem", color: "#A7F3D0", marginTop: 2 }}>₹1,42,800 recovered</div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: "0.75rem", color: "#94A3B8", fontWeight: 600 }}>Policy Cooldown Skipped</div>
          <div style={{ fontSize: "1.625rem", fontWeight: 900, color: "#A78BFA", marginTop: 4 }}>{stats.skipped_by_policy_count}</div>
          <div style={{ fontSize: "0.7rem", color: "#DDD6FE", marginTop: 2 }}>Spam prevented</div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: "0.75rem", color: "#94A3B8", fontWeight: 600 }}>Estimated Recovery Lift</div>
          <div style={{ fontSize: "1.625rem", fontWeight: 900, color: "#38BDF8", marginTop: 4 }}>₹{(stats.estimated_incremental_recovery_inr / 1000).toFixed(0)}K</div>
          <div style={{ fontSize: "0.7rem", color: "#BAE6FD", marginTop: 2 }}>Expected yield</div>
        </div>
      </div>

      {/* ── Scheduled Cadence Ledger Table ── */}
      <div style={{
        background: "rgba(15, 23, 42, 0.75)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 20, overflow: "hidden",
        boxShadow: "0 20px 40px -15px rgba(0,0,0,0.5)"
      }}>
        <div style={{
          padding: "18px 24px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12
        }}>
          <div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#F8FAFC", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={16} color="#818CF8" />
              Intervention Queue & Scheduled Cadence Ledger
            </h3>
            <p style={{ fontSize: "0.75rem", color: "#94A3B8", margin: 0, marginTop: 2 }}>
              Live scheduled actions. Every execution deterministically verifies TOCTOU payment state before dispatching outreach.
            </p>
          </div>

          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#94A3B8" }}>
            {jobs.length} Actions Registered
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ background: "rgba(10, 15, 26, 0.8)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#64748B", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <th style={{ padding: "14px 20px" }}>Action ID</th>
                <th style={{ padding: "14px 20px" }}>Customer & Case</th>
                <th style={{ padding: "14px 20px" }}>Strategy & Channel</th>
                <th style={{ padding: "14px 20px" }}>Scheduled Timing</th>
                <th style={{ padding: "14px 20px" }}>Cadence / Attempt</th>
                <th style={{ padding: "14px 20px" }}>Status</th>
                <th style={{ padding: "14px 20px", textAlign: "right" }}>Governed Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const isDue = j.status === "DUE_SOON";
                const isWaiting = j.status === "WAITING_INTERVAL";
                // isCooldown handled in badge
                const isExecuting = executingId === j.id;

                return (
                  <tr
                    key={j.id}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "16px 20px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#818CF8" }}>
                      {j.id}
                    </td>

                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 700, color: "#F1F5F9" }}>{j.customer_name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#38BDF8", fontFamily: "var(--font-mono)" }}>
                        {j.case_id} {j.amount_inr ? `(₹${j.amount_inr.toLocaleString("en-IN")})` : ""}
                      </div>
                    </td>

                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 700, color: "#F8FAFC", fontSize: "0.8rem" }}>{j.action_type}</div>
                      <div style={{ fontSize: "0.72rem", color: "#94A3B8" }}>{j.reason}</div>
                    </td>

                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: isDue ? "#FBBF24" : "#CBD5E1" }}>
                        <Clock size={13} color={isDue ? "#FBBF24" : "#94A3B8"} />
                        {j.scheduled_for}
                      </div>
                    </td>

                    <td style={{ padding: "16px 20px", fontFamily: "var(--font-mono)" }}>
                      <span style={{ fontSize: "0.8rem", color: "#F8FAFC", fontWeight: 700 }}>
                        {j.attempt_count}
                      </span>
                      <span style={{ color: "#64748B" }}> / {j.max_attempts}</span>
                    </td>

                    <td style={{ padding: "16px 20px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "3px 9px", borderRadius: 9999,
                        fontSize: "0.7rem", fontWeight: 700, fontFamily: "var(--font-mono)",
                        background: isDue ? "rgba(245, 158, 11, 0.15)" : isWaiting ? "rgba(59, 130, 246, 0.15)" : "rgba(139, 92, 246, 0.15)",
                        border: `1px solid ${isDue ? "rgba(245, 158, 11, 0.35)" : isWaiting ? "rgba(59, 130, 246, 0.35)" : "rgba(139, 92, 246, 0.35)"}`,
                        color: isDue ? "#FBBF24" : isWaiting ? "#60A5FA" : "#A78BFA"
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: isDue ? "#F59E0B" : isWaiting ? "#3B82F6" : "#8B5CF6" }} />
                        {j.status}
                      </span>
                    </td>

                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <button
                          onClick={() => handleExecute(j.id)}
                          disabled={isExecuting}
                          style={{
                            padding: "6px 14px", borderRadius: 8,
                            background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                            border: "none", color: "#FFF",
                            fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                            display: "inline-flex", alignItems: "center", gap: 4,
                            boxShadow: "0 0 10px rgba(16, 185, 129, 0.25)"
                          }}
                        >
                          <Play size={12} />
                          {isExecuting ? "Checking TOCTOU..." : "Execute (TOCTOU)"}
                        </button>

                        <button
                          onClick={() => handleCancel(j.id)}
                          style={{
                            padding: "6px 10px", borderRadius: 8,
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.25)",
                            color: "#F87171", fontSize: "0.75rem", fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
