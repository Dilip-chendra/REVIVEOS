import { useState, useEffect } from "react";
import {
  MessageSquare,
  Mail,
  Send,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { api } from "../api/client";

interface CommRecord {
  id: string;
  case_id: string;
  customer_name: string;
  channel: string;
  strategy: string;
  status: string;
  subject_or_preview: string;
  message_body: string;
  recipient: string;
  expected_nic_inr: number;
  actual_cost_inr: number;
  dispatched_at: string;
  delivered_at?: string;
  read_at?: string;
  paid_at?: string;
  is_simulated: boolean;
  contract_hash?: string;
}

interface TimelineEvent {
  event_id: string;
  timestamp: string;
  stage: string;
  title: string;
  description: string;
  status: string;
  actor: string;
}

export default function CommunicationQueue() {
  const [comms, setComms] = useState<CommRecord[]>([]);
  // loading
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedCaseId, setSelectedCaseId] = useState<string>("OPP-002");
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  // loadingTimeline

  // Dispatch modal
  const [showModal, setShowModal] = useState(false);
  const [dispatchChannel, setDispatchChannel] = useState<"EMAIL" | "WHATSAPP">("WHATSAPP");
  const [targetCaseId, setTargetCaseId] = useState("OPP-002");
  const [recipient, setRecipient] = useState("+91 98765 43210");
  const [subject, setSubject] = useState("NovaCart Pro Payment Reminder");
  const [body, setBody] = useState("Hi Priya, your payment of ₹2,500 is pending. Tap below to complete your payment seamlessly.");
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<any>(null);

  const fetchComms = async () => {
    try {
      
      const params: any = {};
      if (channelFilter !== "ALL") params.channel = channelFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;
      const res = await api.get("/communications", { params });
      setComms(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      
    }
  };

  const fetchTimeline = async (caseId: string) => {
    try {
      
      setSelectedCaseId(caseId);
      const res = await api.get(`/communications/timeline/${caseId}`);
      setTimeline(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      
    }
  };

  useEffect(() => {
    fetchComms();
  }, [channelFilter, statusFilter]);

  useEffect(() => {
    fetchTimeline(selectedCaseId);
  }, []);

  const handleSendDispatch = async () => {
    try {
      setDispatching(true);
      setDispatchResult(null);
      const res = await api.post("/communications/send", {
        case_id: targetCaseId,
        customer_id: "CUST-DEMO-01",
        customer_name: "Customer",
        channel: dispatchChannel,
        recipient: recipient,
        subject_or_preview: subject,
        message_body: body,
        strategy: "CUSTOMER_PROMPT",
        expected_nic_inr: 2150.0,
      });
      setDispatchResult(res.data);
      await fetchComms();
      await fetchTimeline(targetCaseId);
    } catch (e: any) {
      setDispatchResult({ success: false, error: e.message });
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-blue-400">
              Omnichannel Governance
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400">Execution Primitives</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            Communications Queue
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-medium">
              Fatigue & Sovereignty Guarded
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Centrally arbitrated outreach across WhatsApp, Email, SMS, and Payment Links. AI only proposes; ReviveOS arbitrates and governs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setDispatchChannel("EMAIL");
              setRecipient("customer@example.com");
              setShowModal(true);
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <Mail size={14} className="text-blue-400" />
            <span>Send Email</span>
          </button>

          <button
            onClick={() => {
              setDispatchChannel("WHATSAPP");
              setRecipient("+91 98765 43210");
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <MessageSquare size={14} />
            <span>Send WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold mr-2">Channel:</span>
          {["ALL", "WHATSAPP", "EMAIL", "PAYMENT_LINK", "SMS", "HUMAN"].map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                channelFilter === ch
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold mr-2">Status:</span>
          {["ALL", "SENT", "DELIVERED", "READ", "PAID", "FAILED", "BLOCKED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                statusFilter === st
                  ? "bg-slate-200 text-slate-900"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Communications Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Message ID</th>
                <th className="py-3 px-4">Customer & Case</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Message Preview</th>
                <th className="py-3 px-4">Expected NIC</th>
                <th className="py-3 px-4">Cost</th>
                <th className="py-3 px-4">Delivery Status</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {comms.map((rec) => (
                <tr
                  key={rec.id}
                  onClick={() => fetchTimeline(rec.case_id)}
                  className={`cursor-pointer transition-colors ${
                    selectedCaseId === rec.case_id ? "bg-blue-950/20" : "hover:bg-slate-800/20"
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                    {rec.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-200">{rec.customer_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{rec.case_id}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-semibold text-[10px]">
                      {rec.channel}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-medium text-slate-300 truncate">{rec.subject_or_preview}</div>
                    <div className="text-[11px] text-slate-500 truncate">{rec.message_body}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                    +₹{rec.expected_nic_inr.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    ₹{rec.actual_cost_inr.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                        rec.status === "PAID" || rec.status === "DELIVERED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : rec.status === "READ" || rec.status === "SENT"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                          : "bg-red-500/10 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchTimeline(rec.case_id);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] transition-colors"
                    >
                      View Lifecycle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 10-Stage Recovery Case Timeline Visualization */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-400" />
              10-Stage Recovery Case Timeline: {selectedCaseId}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Visual proof of non-bypassable governance: Detect ➔ Diagnose ➔ Natural Recovery ➔ Strategy ➔ Channel ➔ Timing ➔ Contract ➔ Dispatch ➔ Delivery ➔ Settlement.
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Case: {selectedCaseId}
          </span>
        </div>

        {/* Timeline Swimlane */}
        <div className="relative border-l border-blue-500/30 ml-4 space-y-6">
          {timeline.map((evt, idx) => (
            <div key={evt.event_id} className="relative pl-6">
              {/* Bullet Node */}
              <div className="absolute -left-2.5 top-0.5 w-5 h-5 rounded-full bg-slate-950 border-2 border-blue-500 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-400">
                      Stage {idx + 1}: {evt.stage}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs font-bold text-slate-200">{evt.title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{evt.description}</p>
                <div className="mt-2 text-[10px] font-mono text-slate-500 flex items-center gap-1">
                  <span>Actor:</span>
                  <span className="text-slate-300 font-semibold">{evt.actor}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Direct Dispatch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {dispatchChannel === "WHATSAPP" ? <MessageSquare size={18} className="text-emerald-400" /> : <Mail size={18} className="text-blue-400" />}
                Governed {dispatchChannel} Dispatch
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Case ID</label>
                <input
                  type="text"
                  value={targetCaseId}
                  onChange={(e) => setTargetCaseId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Recipient ({dispatchChannel === "WHATSAPP" ? "Phone" : "Email"})</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Subject / Header</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Message Body</label>
                <textarea
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              {dispatchResult && (
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    dispatchResult.success
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                      : "bg-red-950/40 border-red-500/40 text-red-300"
                  }`}
                >
                  {dispatchResult.success ? (
                    <div>✓ Dispatch executed. Status: {dispatchResult.status}. Audited to ledger.</div>
                  ) : (
                    <div>✗ Blocked: {dispatchResult.error || dispatchResult.reason}</div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Close
                </button>
                <button
                  onClick={handleSendDispatch}
                  disabled={dispatching}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2"
                >
                  {dispatching ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Execute Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
