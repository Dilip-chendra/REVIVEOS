import { useState, useEffect } from "react";
import {
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Plus,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import { api } from "../api/client";

interface PayoutRecord {
  id: string;
  case_id: string;
  beneficiary_name: string;
  beneficiary_account_masked: string;
  amount_inr: number;
  purpose: string;
  status: string;
  requires_human_approval: boolean;
  risk_score: number;
  idempotency_key: string;
  requested_by: string;
  approved_by?: string;
  provider_reference?: string;
  created_at: string;
  is_simulated: boolean;
}

export default function PayoutControlCenter() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // New Payout Request Modal
  const [showModal, setShowModal] = useState(false);
  const [caseId, setCaseId] = useState("OPP-001");
  const [beneficiaryName, setBeneficiaryName] = useState("Nexus Retail Corp");
  const [accountNumber, setAccountNumber] = useState("9876543210");
  const [amountInr, setAmountInr] = useState("5000");
  const [purpose, setPurpose] = useState("CUSTOMER_REFUND");
  const [submitting, setSubmitting] = useState(false);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payouts");
      setPayouts(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await api.post(`/payouts/${id}/approve`);
      if (res.data.success) {
        setMessage(`Payout ${id} approved and executed successfully.`);
      }
      await fetchPayouts();
    } catch (e: any) {
      setMessage(`Approval failed: ${e.message}`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await api.post(`/payouts/${id}/reject`, { reason: "Policy limit violation or suspicious account" });
      if (res.data.success) {
        setMessage(`Payout ${id} rejected.`);
      }
      await fetchPayouts();
    } catch (e: any) {
      setMessage(`Rejection failed: ${e.message}`);
    }
  };

  const handleRequestPayout = async () => {
    try {
      setSubmitting(true);
      const res = await api.post("/payouts/request", {
        case_id: caseId,
        beneficiary_name: beneficiaryName,
        beneficiary_account: accountNumber,
        amount_inr: parseFloat(amountInr),
        purpose: purpose,
      });
      if (res.data.success) {
        setMessage(`Payout request created: Status ${res.data.status} (Human Approval: ${res.data.requires_human_approval})`);
        setShowModal(false);
        await fetchPayouts();
      }
    } catch (e: any) {
      setMessage(`Failed: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-blue-400">
              Outbound Governance
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400">Disbursements & Refunds</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            Payout Control Center
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono font-medium">
              Dual Authorization Safe
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Governs customer refunds, dispute settlements, and operational disbursements with strict auto-limits (≤₹10K) and idempotency locks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPayouts}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus size={14} />
            <span>Request Governed Disbursement</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/40 text-blue-200 text-xs flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Safety Policy Guardrail Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-white">Auto-Disbursement Ceiling</div>
            <div className="text-slate-400">Strictly capped at ≤ ₹10,000 per transaction.</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-400 shrink-0" />
          <div>
            <div className="font-bold text-white">Mandatory Human Sign-Off</div>
            <div className="text-slate-400">Disbursements &gt; ₹10,000 require operator sign-off.</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <FileCheck size={20} className="text-blue-400 shrink-0" />
          <div>
            <div className="font-bold text-white">Idempotency & Double-Spend Lock</div>
            <div className="text-slate-400">Unique cryptographic key per beneficiary & case.</div>
          </div>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Payout ID</th>
                <th className="py-3 px-4">Beneficiary & Account</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Approval Info</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payouts.map((po) => (
                <tr key={po.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                    {po.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-200">{po.beneficiary_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{po.beneficiary_account_masked}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-semibold text-[10px]">
                      {po.purpose}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    ₹{po.amount_inr.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {(po.risk_score * 100).toFixed(0)}%
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                        po.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : po.status === "PENDING_APPROVAL"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-red-500/10 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[11px] text-slate-400">
                    {po.approved_by ? (
                      <span className="text-slate-300 font-mono">{po.approved_by}</span>
                    ) : po.requires_human_approval ? (
                      <span className="text-amber-400 font-bold">Operator Sign-Off Needed</span>
                    ) : (
                      <span>System Auto</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {po.status === "PENDING_APPROVAL" ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(po.id)}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(po.id)}
                          className="px-2.5 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-300 font-bold text-[11px] transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-mono">
                        {po.provider_reference || "Audited"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Payout Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard size={18} className="text-blue-400" />
                Request Governed Disbursement / Refund
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Case Reference</label>
                <input
                  type="text"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Beneficiary Name</label>
                <input
                  type="text"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Account Number / UPI ID</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Amount (INR)</label>
                <input
                  type="number"
                  value={amountInr}
                  onChange={(e) => setAmountInr(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Amounts &gt; ₹10,000 will be held in PENDING_APPROVAL for human sign-off.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Disbursement Purpose</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="CUSTOMER_REFUND">Customer Refund (Duplicate / Erroneous Charge)</option>
                  <option value="GOODWILL_CREDIT">Customer Compensation / Goodwill Credit</option>
                  <option value="DISPUTE_RESOLUTION">Recovery Dispute Resolution Settlement</option>
                  <option value="PARTNER_SETTLEMENT">Partner / Referral Fee Settlement</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestPayout}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2"
                >
                  {submitting ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  <span>Submit Request</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
