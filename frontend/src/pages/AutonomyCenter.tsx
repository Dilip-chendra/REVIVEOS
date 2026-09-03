import { useState, useEffect } from "react";
import {
  Clock,
  Play,
  Calendar,
  Sliders,
  RefreshCw,
  Zap,
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
  next_action?: ActionItem;
}

export default function AutonomyCenter() {
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [jobs, setJobs] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const [resStats, resJobs] = await Promise.all([
        api.get("/automation/status"),
        api.get("/automation/scheduled"),
      ]);
      setStats(resStats.data);
      setJobs(resJobs.data);
    } catch (e: any) {
      console.error(e);
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
      setMessage(`Autonomy mode updated to ${mode}`);
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
      if (res.data.success) {
        setMessage(`Action ${actionId} executed successfully with live TOCTOU recheck.`);
      } else {
        setMessage(`Action ${actionId} execution halted: ${res.data.reason}`);
      }
      await fetchStatus();
    } catch (e: any) {
      setMessage(`Execution failed: ${e.message}`);
    } finally {
      setExecutingId(null);
    }
  };

  const handleCancel = async (actionId: string) => {
    try {
      await api.post(`/automation/scheduled/${actionId}/cancel?reason=Cancelled+by+operator`);
      setMessage(`Action ${actionId} cancelled.`);
      await fetchStatus();
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-blue-400">
              Autonomous Execution
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400">Interval Cadence & Safety</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            Autonomy Control Center
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono font-medium">
              Smart Wake-Up Active
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Governs when, how often, and under what conditions ReviveOS contacts customers or executes retries.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh Queue
        </button>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/40 text-blue-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-blue-400 shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Autonomy Mode Selector & Cadence Guardrails */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mode Selector */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders size={18} className="text-blue-400" />
                Execution Autonomy Level
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Controls whether bounded actions execute autonomously or require human sign-off.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              Active: {stats?.autonomy_mode || "AUTONOMOUS"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                mode: "MANUAL",
                title: "Manual Approval",
                desc: "Every scheduled action requires explicit human click.",
                color: "border-amber-500/40 bg-amber-500/5",
              },
              {
                mode: "ASSISTED",
                title: "Assisted Autonomy",
                desc: "AI prepares proposal, human one-click dispatches.",
                color: "border-cyan-500/40 bg-cyan-500/5",
              },
              {
                mode: "AUTONOMOUS",
                title: "Governed Autonomy",
                desc: "Bounded actions execute on schedule within strict limits.",
                color: "border-blue-500/40 bg-blue-500/5",
              },
            ].map((m) => {
              const isActive = stats?.autonomy_mode === m.mode;
              return (
                <div
                  key={m.mode}
                  onClick={() => !updating && setAutonomyMode(m.mode)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500"
                      : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{m.title}</span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isActive ? "border-blue-400 bg-blue-400" : "border-slate-600"
                      }`}
                    >
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{m.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Cadence Specs Bar */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Min Contact Interval</span>
              <span className="text-sm font-bold text-slate-200 mt-1 block">
                {stats?.min_contact_interval_hours || 24} Hours
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Max Attempts</span>
              <span className="text-sm font-bold text-slate-200 mt-1 block">
                {stats?.max_attempts_per_case || 3} Contacts
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Allowable Window</span>
              <span className="text-sm font-bold text-slate-200 mt-1 block">
                {stats?.allowed_hours || "09:00–18:00"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Human Ceiling</span>
              <span className="text-sm font-bold text-emerald-400 mt-1 block">
                ₹{(stats?.human_approval_ceiling_inr || 50000).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Next Scheduled Action Card with Live TOCTOU Recheck */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-blue-950/20 to-slate-900/60 border border-blue-500/30 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                <Clock size={14} /> Next Scheduled Action
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                Live State Guarded
              </span>
            </div>

            {stats?.next_action ? (
              <div className="space-y-3">
                <div>
                  <div className="text-base font-bold text-white">{stats.next_action.customer_name}</div>
                  <div className="text-xs text-slate-400">Case: {stats.next_action.case_id}</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Channel:</span>
                    <span className="font-bold text-blue-400">{stats.next_action.channel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Action:</span>
                    <span className="text-slate-200">{stats.next_action.action_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Scheduled Time:</span>
                    <span className="text-slate-300 font-mono">
                      {new Date(stats.next_action.scheduled_for).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  "{stats.next_action.reason}"
                </p>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No pending actions scheduled.
              </div>
            )}
          </div>

          {stats?.next_action && (
            <button
              onClick={() => handleExecute(stats.next_action!.id)}
              disabled={executingId === stats.next_action.id}
              className="w-full mt-4 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/20"
            >
              {executingId === stats.next_action.id ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
              <span>Execute with Live TOCTOU Check</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Scheduled", val: stats?.total_scheduled ?? 0, color: "text-blue-400" },
          { label: "Due Now", val: stats?.due_now_count ?? 0, color: "text-amber-400" },
          { label: "Completed", val: stats?.completed_today_count ?? 0, color: "text-emerald-400" },
          { label: "Policy Skipped", val: stats?.skipped_by_policy_count ?? 0, color: "text-slate-400" },
          { label: "Fatigue Blocked", val: stats?.blocked_count ?? 0, color: "text-red-400" },
          { label: "Est. Recovery", val: `₹${((stats?.estimated_incremental_recovery_inr ?? 0) / 1000).toFixed(0)}K`, color: "text-cyan-400" },
        ].map((kpi, i) => (
          <div key={i} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              {kpi.label}
            </span>
            <span className={`text-xl font-black mt-1 block ${kpi.color}`}>
              {kpi.val}
            </span>
          </div>
        ))}
      </div>

      {/* Scheduled Actions Queue Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar size={16} className="text-blue-400" />
              Intervention Queue & Cadence Ledger
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live scheduled actions. Every execution validates TOCTOU payment state before outreach.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {jobs.length} Actions Registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Action ID</th>
                <th className="py-3 px-4">Customer & Case</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Scheduled For</th>
                <th className="py-3 px-4">Cadence / Attempt</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Governed Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                    {job.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-200">{job.customer_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{job.case_id}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-semibold text-[10px]">
                      {job.channel}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {new Date(job.scheduled_for).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {job.attempt_count} of {job.max_attempts}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                        job.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : job.status === "SCHEDULED" || job.status === "READY"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                          : job.status === "CANCELLED"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-red-500/10 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {job.status === "SCHEDULED" || job.status === "READY" ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleExecute(job.id)}
                          disabled={executingId === job.id}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-colors flex items-center gap-1"
                        >
                          <Play size={11} /> Execute
                        </button>
                        <button
                          onClick={() => handleCancel(job.id)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Audited</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
