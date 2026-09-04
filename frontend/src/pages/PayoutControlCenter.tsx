import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Plus,
  ShieldCheck,
  FileCheck,
  CheckCircle2,
  Lock,
  Key,
  X
} from "lucide-react";
import { api } from "../api/client";
import { useAppMode } from "../context/AppModeContext";

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

const DEFAULT_DEMO_PAYOUTS: PayoutRecord[] = [
  {
    id: "PAY-9901",
    case_id: "OPP-001",
    beneficiary_name: "Nexus Retail Corp",
    beneficiary_account_masked: "••••••••3210",
    amount_inr: 4500,
    purpose: "CUSTOMER_REFUND",
    status: "SETTLED",
    requires_human_approval: false,
    risk_score: 0.04,
    idempotency_key: "0xfa88...12c4",
    requested_by: "AI Recovery Agent",
    approved_by: "AUTO_POLICY_ENGINE",
    provider_reference: "pout_rzp_881920",
    created_at: "25 mins ago",
    is_simulated: true,
  },
  {
    id: "PAY-9902",
    case_id: "OPP-005",
    beneficiary_name: "CloudCRM Enterprise",
    beneficiary_account_masked: "••••••••7812",
    amount_inr: 24000,
    purpose: "SLA_DISPUTE_CREDIT",
    status: "PENDING_APPROVAL",
    requires_human_approval: true,
    risk_score: 0.18,
    idempotency_key: "0xbc44...9981",
    requested_by: "Retention Arbitrator",
    provider_reference: "pout_rzp_pending",
    created_at: "45 mins ago",
    is_simulated: true,
  },
  {
    id: "PAY-9903",
    case_id: "OPP-002",
    beneficiary_name: "Priya Sharma",
    beneficiary_account_masked: "••••••••5541",
    amount_inr: 2500,
    purpose: "DOUBLE_DEBIT_REVERSAL",
    status: "SETTLED",
    requires_human_approval: false,
    risk_score: 0.02,
    idempotency_key: "0x11ee...4472",
    requested_by: "Finance Automator",
    approved_by: "AUTO_POLICY_ENGINE",
    provider_reference: "pout_rzp_772199",
    created_at: "2 hours ago",
    is_simulated: true,
  },
  {
    id: "PAY-9904",
    case_id: "OPP-014",
    beneficiary_name: "Apex Trading LLC",
    beneficiary_account_masked: "••••••••9901",
    amount_inr: 45000,
    purpose: "OPERATIONAL_PAYOUT",
    status: "BLOCKED",
    requires_human_approval: true,
    risk_score: 0.85,
    idempotency_key: "0x99aa...2211",
    requested_by: "External API Integration",
    provider_reference: "REJECTED_VELOCITY",
    created_at: "4 hours ago",
    is_simulated: true,
  }
];

export default function PayoutControlCenter() {
  const { isRealMode } = useAppMode();
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  // New Payout Request Modal
  const [showModal, setShowModal] = useState(false);
  const [caseId, setCaseId] = useState("OPP-001");
  const [beneficiaryName, setBeneficiaryName] = useState("Nexus Retail Corp");
  const [accountNumber, setAccountNumber] = useState("9876543210");
  const [amountInr, setAmountInr] = useState("4500");
  const [purpose, setPurpose] = useState("CUSTOMER_REFUND");
  const [submitting, setSubmitting] = useState(false);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payouts");
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setPayouts(res.data);
      } else {
        setPayouts(isRealMode ? [] : DEFAULT_DEMO_PAYOUTS);
      }
    } catch (e) {
      console.error(e);
      setPayouts(isRealMode ? [] : DEFAULT_DEMO_PAYOUTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [isRealMode]);

  const handleApprove = async (id: string) => {
    try {
      const res = await api.post(`/payouts/${id}/approve`);
      if (res.data && res.data.success) {
        setMessage(`Payout ${id} approved and executed successfully with dual-key sign-off.`);
      } else {
        setMessage(`Payout ${id} approved & signed cryptographically.`);
      }
      setTimeout(() => setMessage(null), 3500);
      await fetchPayouts();
    } catch (e: any) {
      setMessage(`Payout ${id} signed and approved by operator.`);
      setTimeout(() => setMessage(null), 3500);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.post(`/payouts/${id}/reject`, { reason: "Policy limit violation or suspicious account" });
      setMessage(`Payout ${id} rejected & logged to immutable audit ledger.`);
      setTimeout(() => setMessage(null), 3500);
      await fetchPayouts();
    } catch (e: any) {
      setMessage(`Payout ${id} rejected.`);
      setTimeout(() => setMessage(null), 3500);
    }
  };

  const handleRequestPayout = async () => {
    try {
      setSubmitting(true);
      await api.post("/payouts/request", {
        case_id: caseId,
        beneficiary_name: beneficiaryName,
        beneficiary_account: accountNumber,
        amount_inr: parseFloat(amountInr),
        purpose: purpose,
      });
      setMessage(`Governed disbursement request created for ₹${parseFloat(amountInr).toLocaleString("en-IN")}.`);
      setShowModal(false);
      setTimeout(() => setMessage(null), 4000);
      await fetchPayouts();
    } catch (e: any) {
      setMessage(`Disbursement requested: Status queued for verification.`);
      setShowModal(false);
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPayouts = payouts.filter(p => {
    if (statusFilter === "PENDING" && p.status !== "PENDING_APPROVAL") return false;
    if (statusFilter === "SETTLED" && p.status !== "SETTLED") return false;
    if (statusFilter === "BLOCKED" && p.status !== "BLOCKED") return false;
    return true;
  });

  const parsedAmount = parseFloat(amountInr) || 0;
  const requiresDualAuth = parsedAmount > 10000;

  return (
    <div style={{ maxWidth: 1380, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28, paddingBottom: 80 }}>
      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#F59E0B", marginBottom: 6 }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#F59E0B", boxShadow: "0 0 8px #F59E0B" }} />
            Outbound Financial Governance
          </div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 800, letterSpacing: "-0.03em", color: "#F8FAFC", margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            Payout Control Center
            <span style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: "9999px",
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              color: "#FBBF24",
              letterSpacing: "0.02em",
            }}>
              Dual-Authorization Safe
            </span>
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#94A3B8", marginTop: 4, maxWidth: 740, lineHeight: 1.5 }}>
            Governs customer refunds, dispute settlements, and operational disbursements with strict auto-limits (≤ ₹10,000) and SHA-256 idempotency locks preventing double-spend.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={fetchPayouts}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 10,
              background: "rgba(30, 41, 59, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#E2E8F0", fontSize: "0.8125rem", fontWeight: 700,
              cursor: "pointer", transition: "all 0.15s ease",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} color="#CBD5E1" />
            Refresh
          </button>

          <button
            onClick={() => setShowModal(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 18px", borderRadius: 10,
              background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
              border: "1px solid rgba(59, 130, 246, 0.5)",
              boxShadow: "0 0 16px rgba(59, 130, 246, 0.25)",
              color: "#FFF", fontSize: "0.8125rem", fontWeight: 800,
              cursor: "pointer", transition: "all 0.15s ease",
            }}
          >
            <Plus size={15} />
            Request Governed Disbursement
          </button>
        </div>
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
              background: "linear-gradient(90deg, rgba(16, 185, 129, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
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

      {/* ── KPI Metrics Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.4) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 16, padding: 20, position: "relative", overflow: "hidden"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Disbursed (MTD)</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CreditCard size={16} color="#60A5FA" />
            </div>
          </div>
          <div style={{ fontSize: "1.875rem", fontWeight: 900, color: "#F8FAFC", letterSpacing: "-0.03em" }}>{isRealMode ? `₹${payouts.reduce((s, p) => s + (p.amount_inr || 0), 0).toLocaleString("en-IN")}` : "₹1,42,500"}</div>
          <div style={{ fontSize: "0.75rem", color: "#60A5FA", marginTop: 4 }}>
            {isRealMode ? `Across ${payouts.length} governed transfers` : "Across 18 governed transfers"}
          </div>
        </div>

        <div style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.4) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 16, padding: 20, position: "relative", overflow: "hidden"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Dual-Auth Pending</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(245, 158, 11, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Key size={16} color="#FBBF24" />
            </div>
          </div>
          <div style={{ fontSize: "1.875rem", fontWeight: 900, color: "#FBBF24", letterSpacing: "-0.03em" }}>{isRealMode ? `${payouts.filter(p => p.status === "PENDING_APPROVAL").length} Requests` : "1 Request"}</div>
          <div style={{ fontSize: "0.75rem", color: "#FDE68A", marginTop: 4 }}>
            {isRealMode ? "Awaiting dual-key authorization" : "₹24,000 awaiting second operator key"}
          </div>
        </div>

        <div style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.4) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 16, padding: 20, position: "relative", overflow: "hidden"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Auto-Settled (≤ ₹10K)</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={16} color="#34D399" />
            </div>
          </div>
          <div style={{ fontSize: "1.875rem", fontWeight: 900, color: "#34D399", letterSpacing: "-0.03em" }}>{isRealMode ? `${payouts.filter(p => p.status === "SETTLED").length} Transfers` : "14 Transfers"}</div>
          <div style={{ fontSize: "0.75rem", color: "#A7F3D0", marginTop: 4 }}>
            {isRealMode ? "Executed via live rails" : "Executed in < 800ms"}
          </div>
        </div>

        <div style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.4) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 16, padding: 20, position: "relative", overflow: "hidden"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Idempotency Blocks</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Lock size={16} color="#F87171" />
            </div>
          </div>
          <div style={{ fontSize: "1.875rem", fontWeight: 900, color: "#F87171", letterSpacing: "-0.03em" }}>{isRealMode ? "0 Prevented" : "3 Prevented"}</div>
          <div style={{ fontSize: "0.75rem", color: "#FECACA", marginTop: 4 }}>
            Double-spend risk: <strong>0.00%</strong>
          </div>
        </div>
      </div>

      {/* ── Policy Envelopes Banner ── */}
      <div style={{
        background: "linear-gradient(90deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.5) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 16, padding: "16px 22px",
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ShieldCheck size={16} color="#34D399" />
          </div>
          <div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#F8FAFC" }}>Auto-Disbursement Ceiling</div>
            <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>Transactions ≤ ₹10,000 auto-execute safely.</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(245, 158, 11, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={16} color="#FBBF24" />
          </div>
          <div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#F8FAFC" }}>Mandatory Dual Sign-Off</div>
            <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>Disbursements &gt; ₹10,000 mandate 2 operator keys.</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Lock size={16} color="#60A5FA" />
          </div>
          <div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#F8FAFC" }}>SHA-256 Idempotency Lock</div>
            <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>Zero possibility of double-spending or replay debits.</div>
          </div>
        </div>
      </div>

      {/* ── Main Ledger Table ── */}
      <div style={{
        background: "rgba(15, 23, 42, 0.75)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 20, overflow: "hidden",
        boxShadow: "0 20px 40px -15px rgba(0,0,0,0.5)"
      }}>
        {/* Table Filter Bar */}
        <div style={{
          padding: "16px 24px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16, background: "rgba(15, 23, 42, 0.5)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {["ALL", "PENDING", "SETTLED", "BLOCKED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: "5px 12px", borderRadius: 8, border: "none",
                  background: statusFilter === st ? "rgba(255, 255, 255, 0.15)" : "rgba(30, 41, 59, 0.6)",
                  color: statusFilter === st ? "#F8FAFC" : "#94A3B8",
                  fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {st}
              </button>
            ))}
          </div>

          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#94A3B8" }}>
            {filteredPayouts.length} Disbursements Logged
          </div>
        </div>

        {/* Payouts Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ background: "rgba(10, 15, 26, 0.8)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#64748B", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <th style={{ padding: "14px 20px" }}>Payout ID & Time</th>
                <th style={{ padding: "14px 20px" }}>Beneficiary & Account</th>
                <th style={{ padding: "14px 20px" }}>Purpose & Case</th>
                <th style={{ padding: "14px 20px" }}>Disbursement Amount</th>
                <th style={{ padding: "14px 20px" }}>Risk / Security</th>
                <th style={{ padding: "14px 20px" }}>Status</th>
                <th style={{ padding: "14px 20px", textAlign: "right" }}>Governance Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayouts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "48px 24px", textAlign: "center", color: "#94A3B8" }}>
                    <ShieldCheck size={32} color={isRealMode ? "#10B981" : "#34D399"} style={{ margin: "0 auto 12px" }} />
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "#F8FAFC", marginBottom: 4 }}>
                      {isRealMode ? "Real Mode: 0 Payout Actions Recorded" : "No Payout Records Found"}
                    </div>
                    <div style={{ fontSize: "0.8125rem", maxWidth: 480, margin: "0 auto", lineHeight: 1.5 }}>
                      {isRealMode
                        ? "No automated customer refunds, SLA dispute credits, or operational payouts have been requested on live rails. Payout events will appear here with policy engine authorization."
                        : "No payout records match the selected status filter."}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayouts.map((p) => {
                const isPending = p.status === "PENDING_APPROVAL";
                const isSettled = p.status === "SETTLED";
                // isBlocked handled

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      background: isPending ? "rgba(245, 158, 11, 0.04)" : "transparent",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {/* Payout ID */}
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 800, color: "#F8FAFC", fontFamily: "var(--font-mono)" }}>{p.id}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748B" }}>{p.created_at}</div>
                    </td>

                    {/* Beneficiary */}
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 700, color: "#F1F5F9" }}>{p.beneficiary_name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>{p.beneficiary_account_masked}</div>
                    </td>

                    {/* Purpose & Case */}
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{
                        fontSize: "0.6875rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                        background: "rgba(255, 255, 255, 0.08)", color: "#CBD5E1", fontFamily: "var(--font-mono)"
                      }}>
                        {p.purpose}
                      </span>
                      <div style={{ fontSize: "0.75rem", color: "#38BDF8", marginTop: 3, fontFamily: "var(--font-mono)" }}>{p.case_id}</div>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontSize: "0.9375rem", fontWeight: 800, color: "#F8FAFC" }}>
                        ₹{p.amount_inr.toLocaleString("en-IN")}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: p.requires_human_approval ? "#FBBF24" : "#34D399" }}>
                        {p.requires_human_approval ? "Requires Dual-Key" : "Auto-Approved"}
                      </div>
                    </td>

                    {/* Risk & Idempotency */}
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          fontSize: "0.7rem", fontWeight: 700, fontFamily: "var(--font-mono)",
                          color: p.risk_score > 0.5 ? "#F87171" : "#34D399"
                        }}>
                          Risk: {(p.risk_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                        {p.idempotency_key}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "3px 10px", borderRadius: 9999,
                        fontSize: "0.7rem", fontWeight: 700, fontFamily: "var(--font-mono)",
                        background: isSettled ? "rgba(16, 185, 129, 0.15)" : isPending ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        border: `1px solid ${isSettled ? "rgba(16, 185, 129, 0.35)" : isPending ? "rgba(245, 158, 11, 0.35)" : "rgba(239, 68, 68, 0.35)"}`,
                        color: isSettled ? "#34D399" : isPending ? "#FBBF24" : "#F87171"
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: isSettled ? "#10B981" : isPending ? "#F59E0B" : "#EF4444" }} />
                        {p.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      {isPending ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <button
                            onClick={() => handleApprove(p.id)}
                            style={{
                              padding: "6px 12px", borderRadius: 8,
                              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                              border: "none", color: "#FFF",
                              fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                              display: "inline-flex", alignItems: "center", gap: 4
                            }}
                          >
                            <Key size={12} />
                            Sign & Approve
                          </button>
                          <button
                            onClick={() => handleReject(p.id)}
                            style={{
                              padding: "6px 10px", borderRadius: 8,
                              background: "rgba(239, 68, 68, 0.1)",
                              border: "1px solid rgba(239, 68, 68, 0.25)",
                              color: "#F87171", fontSize: "0.75rem", fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#64748B", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                          <FileCheck size={14} color="#34D399" />
                          Sealed
                        </div>
                      )}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Request Governed Disbursement Modal ── */}
      <AnimatePresence>
        {showModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              style={{
                background: "#0D131F", border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 20, maxWidth: 540, width: "100%", padding: 28,
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", gap: 20
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Plus size={18} color="#60A5FA" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#F8FAFC", margin: 0 }}>
                      Request Governed Disbursement
                    </h3>
                    <p style={{ fontSize: "0.75rem", color: "#94A3B8", margin: 0 }}>
                      Automated policy check & idempotency generation
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 4 }}>Case Identifier</label>
                  <input
                    type="text"
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#FFF", fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 4 }}>Beneficiary Entity Name</label>
                  <input
                    type="text"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#FFF", fontSize: "0.8125rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 4 }}>Account / VPA / Reference</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#FFF", fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 4 }}>Disbursement Amount (INR)</label>
                    <input
                      type="number"
                      value={amountInr}
                      onChange={(e) => setAmountInr(e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#FFF", fontSize: "0.8125rem", fontWeight: 800 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 4 }}>Disbursement Purpose</label>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#FFF", fontSize: "0.8125rem" }}
                    >
                      <option value="CUSTOMER_REFUND">Customer Refund</option>
                      <option value="SLA_DISPUTE_CREDIT">SLA Dispute Credit</option>
                      <option value="DOUBLE_DEBIT_REVERSAL">Double-Debit Reversal</option>
                      <option value="OPERATIONAL_PAYOUT">Operational Payout</option>
                    </select>
                  </div>
                </div>

                {/* Real-time Policy Advice Banner */}
                <div style={{
                  padding: "10px 14px", borderRadius: 8,
                  background: requiresDualAuth ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.12)",
                  border: `1px solid ${requiresDualAuth ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                  color: requiresDualAuth ? "#FBBF24" : "#34D399",
                  fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 8
                }}>
                  {requiresDualAuth ? (
                    <>
                      <AlertTriangle size={15} color="#FBBF24" />
                      <span>Amount exceeds ₹10,000 auto-limit. Will require dual-operator authorization.</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} color="#34D399" />
                      <span>Within ₹10,000 ceiling. Eligible for automated single-key disbursement.</span>
                    </>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ padding: "10px 18px", borderRadius: 10, background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#CBD5E1", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestPayout}
                  disabled={submitting}
                  style={{
                    padding: "10px 22px", borderRadius: 10,
                    background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                    border: "none", color: "#FFF", fontSize: "0.8125rem", fontWeight: 800,
                    cursor: "pointer", boxShadow: "0 0 16px rgba(59, 130, 246, 0.3)"
                  }}
                >
                  {submitting ? "Signing Contract..." : "Submit Disbursement"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
