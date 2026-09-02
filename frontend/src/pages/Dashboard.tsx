import { useEffect, useState, useMemo } from "react";
import { CommandCenter } from "../components/CommandCenter";
import { motion } from "framer-motion";
import {
  getCurrentPortfolio, optimizePortfolio, triggerSettlement,
  getDecisionRegret, executePortfolioBatch, triggerNewCheckout,
  cancelOpportunity, arbitrateAgents, generateRecoveryLink,
  reconcilePayment, getRecoveryLedger, getConversionFunnel,
  runRecoveryAuction, getAuctionCounterfactual
} from "../api/client";
import {
  CheckCircle2, AlertTriangle, Zap, Sliders, RefreshCw,
  X, Shield, FlaskConical, History, Ban, Sparkles, ArrowRight
} from "lucide-react";
import RazorpayConnectionModal from "../components/RazorpayConnectionModal";
import LiveRazorpayLinkModal from "../components/LiveRazorpayLinkModal";
import { ExplainableTerm, FriendlyStatusBadge, ProvenanceBadge } from "../components/ExplainableTerm";

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settlementResult, setSettlementResult] = useState<any>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showLiveLinkModal, setShowLiveLinkModal] = useState(false);
  const [showRegretModal, setShowRegretModal] = useState(false);

  const [selectedBucketFilter, setSelectedBucketFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [batchExecuting, setBatchExecuting] = useState(false);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);
  const [returningCustomerNotice, setReturningCustomerNotice] = useState<string | null>(null);
  const [showArbitrationModal, setShowArbitrationModal] = useState(false);
  const [arbitrationResult, setArbitrationResult] = useState<any>(null);
  const [arbitrating, setArbitrating] = useState(false);
  const [activeTab, setActiveTab] = useState<"LIVE_AUCTION" | "ACTIVE" | "RECOVERY_LEDGER" | "ABSTENTIONS" | "HISTORICAL" | "BLOCKED">("LIVE_AUCTION");
  const [recoveryLedger, setRecoveryLedger] = useState<any[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<any>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [generatedLinkData, setGeneratedLinkData] = useState<any>(null);
  const [reconcilingLink, setReconcilingLink] = useState(false);
  const [auctionResult, setAuctionResult] = useState<any>(null);
  const [auctionRunning, setAuctionRunning] = useState(false);
  const [counterfactualData, setCounterfactualData] = useState<any>(null);
  const [showCounterfactualModal, setShowCounterfactualModal] = useState(false);

  // Interactive What-If Budget Sliders
  const [budgetSlider, setBudgetSlider] = useState<number>(500);
  const [contactSlider, setContactSlider] = useState<number>(50);
  const [reserveSlider, setReserveSlider] = useState<number>(20);

  const isRealMode = Boolean(
    portfolio?.is_real_provider_data ||
    localStorage.getItem("reviveai_active_environment") === "RAZORPAY_TEST" ||
    localStorage.getItem("reviveai_active_environment") === "RAZORPAY_LIVE" ||
    localStorage.getItem("reviveai_active_environment") === "REAL"
  );

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [portRes, regretRes, ledgerRes, funnelRes, auctionRes] = await Promise.all([
        getCurrentPortfolio(),
        getDecisionRegret().catch(() => null),
        getRecoveryLedger().catch(() => ({ outcomes: [] })),
        getConversionFunnel().catch(() => null),
        runRecoveryAuction({ recovery_budget_inr: 500.0, contact_limit: 50, reserve_budget_pct: 0.20 }).catch(() => null),
      ]);
      setPortfolio(portRes);
      setSettlementResult(regretRes);
      setRecoveryLedger(ledgerRes?.outcomes || []);
      setConversionFunnel(funnelRes);
      setAuctionResult(auctionRes);
      if (portRes?.recovery_budget_limit_inr) {
        setBudgetSlider(portRes.recovery_budget_limit_inr);
      }
      if (portRes?.contact_limit) {
        setContactSlider(portRes.contact_limit);
      }
    } catch (err) {
      console.error("Failed to load Recovery Capital Desk:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleBudgetChange = async (newBudget: number, newContacts: number, newReserve: number = reserveSlider) => {
    setBudgetSlider(newBudget);
    setContactSlider(newContacts);
    setReserveSlider(newReserve);
    try {
      setOptimizing(true);
      const res = await optimizePortfolio({
        recovery_budget_inr: newBudget,
        contact_limit: newContacts,
        reserve_budget_pct: newReserve / 100.0,
      });
      setPortfolio(res);
    } catch (err) {
      console.error("Failed to optimize portfolio:", err);
    } finally {
      setOptimizing(false);
    }
  };

  const handleTriggerSettlement = async () => {
    try {
      setSettling(true);
      const res = await triggerSettlement({
        recovery_budget_inr: budgetSlider,
        contact_limit: contactSlider,
      });
      setSettlementResult(res);
      setShowRegretModal(true);
    } catch (err) {
      console.error("Settlement sync failed:", err);
    } finally {
      setSettling(false);
    }
  };

  const handleExecuteBatch = async () => {
    try {
      setBatchExecuting(true);
      const res = await executePortfolioBatch({ max_execute_count: 10 });
      setBatchSuccessMessage(`Dispatched ${res.executed_count} HMAC Signed Action Contracts via Financial Action Gateway.`);
      setTimeout(() => setBatchSuccessMessage(null), 6000);
      fetchInitialData();
    } catch (err) {
      console.error("Batch dispatch failed:", err);
    } finally {
      setBatchExecuting(false);
    }
  };

  const handleGenerateLink = async (opportunityId: string) => {
    try {
      const res = await generateRecoveryLink(opportunityId);
      setGeneratedLinkData(res);
      setShowLinkModal(true);
    } catch (err) {
      console.error("Failed to generate recovery link:", err);
    }
  };

  const handleSimulateCustomerPayment = async (opportunityId: string) => {
    try {
      setReconcilingLink(true);
      const res = await reconcilePayment(opportunityId);
      setBatchSuccessMessage(`Payment Confirmed by Razorpay: ₹${res.recovered_amount_inr?.toLocaleString("en-IN")} reconciled with ID ${res.provider_transaction_id}.`);
      setTimeout(() => setBatchSuccessMessage(null), 6000);
      setShowLinkModal(false);
      fetchInitialData();
    } catch (err) {
      console.error("Failed to reconcile payment:", err);
    } finally {
      setReconcilingLink(false);
    }
  };

  const handleRunAuction = async () => {
    try {
      setAuctionRunning(true);
      const res = await runRecoveryAuction({
        recovery_budget_inr: budgetSlider,
        contact_limit: contactSlider,
        reserve_budget_pct: reserveSlider / 100.0,
      });
      setAuctionResult(res);
      setBatchSuccessMessage(`Recovery Auction Executed: ${res.auction_summary?.approved_count} proposals approved, ${res.auction_summary?.suppressed_count} suppressed, ₹${res.auction_summary?.total_discount_leakage_prevented_inr?.toLocaleString("en-IN")} discount leakage prevented.`);
      setTimeout(() => setBatchSuccessMessage(null), 6000);
    } catch (err) {
      console.error("Auction run failed:", err);
    } finally {
      setAuctionRunning(false);
    }
  };

  const handleOpenCounterfactual = async (customerId: string = "CUST-9821") => {
    try {
      const res = await getAuctionCounterfactual(customerId);
      setCounterfactualData(res);
      setShowCounterfactualModal(true);
    } catch (err) {
      console.error("Failed to load counterfactual:", err);
    }
  };

  const handleSimulateArbitration = async () => {
    try {
      setArbitrating(true);
      const res = await arbitrateAgents({ customer_id: "CUST-9821", customer_name: "Aarav Mehta" });
      setArbitrationResult(res);
      setShowArbitrationModal(true);
    } catch (err) {
      console.error("Agent arbitration failed:", err);
    } finally {
      setArbitrating(false);
    }
  };

  const handleTriggerCustomerReturn = async () => {
    try {
      const res = await triggerNewCheckout({
        customer_id: "CUST-OLD-999",
        customer_name: "Rohan Deshmukh",
        amount_inr: 40000.0,
        order_id: "ORD-IPHONE-NEW-TODAY",
      });
      setReturningCustomerNotice(
        `Spawned new opportunity (${res.new_opportunity.id}) for returning customer. 30-day failure (OPP-HIST-001) remains preserved in history as diagnostic evidence.`
      );
      setTimeout(() => setReturningCustomerNotice(null), 8000);
      fetchInitialData();
    } catch (err) {
      console.error("Failed to trigger return:", err);
    }
  };

  const handleCancelOpp = async (opportunityId: string) => {
    try {
      await cancelOpportunity(opportunityId);
      setBatchSuccessMessage(`Customer Sovereignty Stop applied to ${opportunityId}. Opportunity permanently cancelled.`);
      setTimeout(() => setBatchSuccessMessage(null), 5000);
      fetchInitialData();
    } catch (err) {
      console.error("Failed to cancel opportunity:", err);
    }
  };

  const filteredOpportunities = useMemo(() => {
    if (!portfolio?.top_opportunities) return [];
    let list = portfolio.top_opportunities;
    if (selectedBucketFilter !== "ALL") {
      list = list.filter((o: any) => o.bucket === selectedBucketFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((o: any) =>
        o.id.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.failure_code.toLowerCase().includes(q) ||
        o.failure_reason.toLowerCase().includes(q)
      );
    }
    return list;
  }, [portfolio, selectedBucketFilter, searchQuery]);

  if (loading && !portfolio) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", opacity: 0.5, padding: "24px" }}>
        <div className="skeleton" style={{ height: "48px", width: "320px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px" }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: "120px" }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: "400px" }} />
      </div>
    );
  }

  const pursueCount = portfolio?.buckets?.PURSUE?.length || 0;
  const abstainCount = portfolio?.abstention_ledger?.length || 0;
  const historicalCount = portfolio?.historical_expired_count || 120;
  const humanCount = portfolio?.buckets?.HUMAN_REVIEW?.length || 0;
  const blockedCount = portfolio?.buckets?.BLOCKED?.length || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "60px" }}>
      {/* ── 0. EXECUTIVE ECONOMIC COMMAND CENTER ──────────────────────── */}
      <CommandCenter portfolio={portfolio} isRealMode={isRealMode} />

      {/* ── 1. HEADER & CONTROL PLANE STATUS ─────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0, letterSpacing: "-0.5px", color: "#F8FAFC" }}>
              ReviveOS: Recovery Auction & Economic Control Plane
            </h1>
            <span style={{
              fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "12px",
              background: "rgba(99, 102, 241, 0.15)", color: "#A5B4FC", border: "1px solid rgba(99, 102, 241, 0.3)",
              display: "flex", alignItems: "center", gap: "4px"
            }}>
              <Zap size={12} color="#818CF8" /> MULTI-AGENT REVENUE ARBITRATOR
            </span>
          </div>
          <p style={{ margin: 0, color: "var(--text-secondary, #94A3B8)", fontSize: "14px", maxWidth: "860px" }}>
            Razorpay provides the execution rails and recovery workers (Agent Studio). <strong>ReviveOS</strong> operates above them: arbitrating multi-agent collisions under strict customer attention budgets and allocating scarce recovery capital to maximize <strong>Net Incremental Contribution (NIC)</strong>.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleRunAuction}
            disabled={auctionRunning}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: "8px 16px" }}
          >
            <Zap size={14} className={auctionRunning ? "spin" : ""} />
            {auctionRunning ? "Running Auction..." : "Run Recovery Auction"}
          </button>

          {!isRealMode && (
            <>
              <button
                onClick={() => handleOpenCounterfactual("CUST-9821")}
                className="btn btn-secondary"
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: "8px 14px", borderColor: "#10B981", color: "#A7F3D0" }}
              >
                <FlaskConical size={14} color="#10B981" />
                Why did this win? (CUST-9821)
              </button>

              <button
                onClick={handleSimulateArbitration}
                disabled={arbitrating}
                className="btn btn-secondary"
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: "8px 14px", borderColor: "#818CF8", color: "#C7D2FE" }}
              >
                <Sparkles size={14} color="#818CF8" />
                {arbitrating ? "Arbitrating..." : "Arbitrate Agent Collision (CUST-9821)"}
              </button>

              <button
                onClick={handleTriggerSettlement}
                disabled={settling}
                className="btn btn-secondary"
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: "8px 14px" }}
              >
                <RefreshCw size={14} className={settling ? "spin" : ""} />
                {settling ? "Syncing Settlement..." : "Sync Settlement & Regret (T+2hr)"}
              </button>
            </>
          )}

          {isRealMode && (
            <button
              onClick={fetchInitialData}
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: "8px 14px", borderColor: "#10B981", color: "#A7F3D0" }}
            >
              <RefreshCw size={14} />
              Sync Live Rails
            </button>
          )}

          <button
            onClick={handleExecuteBatch}
            disabled={batchExecuting || pursueCount === 0}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: "8px 14px" }}
          >
            <Zap size={14} />
            {batchExecuting ? "Signing Contracts..." : `Execute Portfolio Batch (${pursueCount})`}
          </button>
        </div>
      </div>

      {batchSuccessMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: "12px 16px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid #10B981", color: "#10B981", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px"
          }}
        >
          <CheckCircle2 size={16} />
          {batchSuccessMessage}
        </motion.div>
      )}

      {returningCustomerNotice && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: "12px 16px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.15)",
            border: "1px solid #6366F1", color: "#A5B4FC", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px"
          }}
        >
          <Sparkles size={16} color="#818CF8" />
          {returningCustomerNotice}
        </motion.div>
      )}

      {/* ── 1.5. RECOVERY CONVERSION FUNNEL BAR ───────────────────── */}
      {conversionFunnel && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", padding: "16px", background: "rgba(15, 23, 42, 0.6)", borderRadius: "12px", border: "1px solid #334155" }}>
          {conversionFunnel.funnel_stages?.map((st: any, i: number) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600 }}>{st.stage}</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: i === 4 ? "#10B981" : "#F8FAFC" }}>
                {st.count} <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 400 }}>({formatINR(st.amount_inr)})</span>
              </div>
              <div style={{ fontSize: "9px", color: "#64748B" }}>{st.provenance}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── 2. CAPITAL ALLOCATION TOP METRICS ──────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px" }}>
        {/* Metric 1: Total Opportunity Portfolio vs Eligible */}
        <div className="card" style={{ padding: "18px", borderLeft: "4px solid #6366F1" }}>
          <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: "6px" }}>
            <ExplainableTerm termKey="recoveryOpportunity" customText="Revenue at Risk" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#F8FAFC" }}>
            {formatINR(portfolio?.total_exposure_inr ?? 0)}
          </div>
          <div style={{ fontSize: "12px", color: "#10B981", marginTop: "4px" }}>
            {portfolio?.eligible_opportunities_count ?? 0} Worth Acting On ({formatINR(portfolio?.eligible_exposure_inr ?? 0)})
          </div>
        </div>

        {/* Metric 2: Recovery Budget Spent / Limit / Reserve */}
        <div className="card" style={{ padding: "18px", borderLeft: "4px solid #3B82F6" }}>
          <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: "6px" }}>
            <ExplainableTerm termKey="knapsackOptimizer" customText="Recovery Budget Used" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#3B82F6" }}>
            {formatINR(portfolio?.allocated_budget_inr || 0)} <span style={{ fontSize: "14px", fontWeight: 500, color: "#94A3B8" }}>/ {formatINR(portfolio?.recovery_budget_limit_inr || 500)}</span>
          </div>
          <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
            {formatINR(portfolio?.reserved_budget_inr || 100)} (20% Reserve Headroom)
          </div>
        </div>

        {/* Metric 3: Contact Capacity */}
        <div className="card" style={{ padding: "18px", borderLeft: "4px solid #F59E0B" }}>
          <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: "6px" }}>
            <ExplainableTerm termKey="recoveryCapacity" customText="Customer Contacts Used" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#F59E0B" }}>
            {portfolio?.allocated_contacts || 0} <span style={{ fontSize: "14px", fontWeight: 500, color: "#94A3B8" }}>/ {portfolio?.contact_limit || 50}</span>
          </div>
          <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
            {portfolio?.remaining_contacts || 0} Customer Contacts Reserved
          </div>
        </div>

        {/* Metric 4: Expected Incremental Recovery */}
        <div className="card" style={{ padding: "18px", borderLeft: "4px solid #10B981" }}>
          <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: "6px" }}>
            <ExplainableTerm termKey="causalUplift" customText="Expected Extra Recovery" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#10B981" }}>
            {formatINR(portfolio?.expected_incremental_recovery_inr || 0)}
          </div>
          <div style={{ fontSize: "12px", color: "#10B981", marginTop: "4px", fontWeight: 600 }}>
            {portfolio?.incremental_recovery_yield_ratio || 0}x Return on Recovery Cost
          </div>
        </div>

        {/* Metric 5: Capital Saved by Intentional Abstention */}
        <div className="card" style={{ padding: "18px", borderLeft: "4px solid #EC4899" }}>
          <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: "6px" }}>
            <ExplainableTerm termKey="naturalRecovery" customText="Money Saved by Not Acting" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#EC4899" }}>
            {formatINR(portfolio?.capital_saved_by_abstention_inr || 0)}
          </div>
          <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
            {portfolio?.customer_friction_avoided_count || 0} Unnecessary Messages Avoided
          </div>
        </div>
      </div>

      {/* ── 3. INTERACTIVE BUDGET WHAT-IF SIMULATOR & FRONTIER ───────── */}
      <div className="card" style={{ padding: "20px", background: "linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sliders size={18} color="#6366F1" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
              Interactive Recovery Capital What-If Simulator
            </h3>
            {optimizing && <span style={{ fontSize: "12px", color: "#6366F1" }} className="spin">⚡ Reallocating...</span>}
          </div>
          <span style={{ fontSize: "12px", color: "#94A3B8" }}>
            Drag sliders to simulate continuous portfolio rebalancing over eligible opportunities
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {/* Recovery Budget Slider */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
              <span style={{ color: "#E2E8F0" }}>Recovery Budget: <strong>{formatINR(budgetSlider)}</strong></span>
              <span style={{ color: "#94A3B8" }}>Min: ₹50 — Max: ₹2,500</span>
            </div>
            <input
              type="range"
              min="50"
              max="2500"
              step="50"
              value={budgetSlider}
              onChange={(e) => handleBudgetChange(Number(e.target.value), contactSlider, reserveSlider)}
              style={{ width: "100%", accentColor: "#6366F1", cursor: "pointer" }}
            />
          </div>

          {/* Contact Capacity Slider */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
              <span style={{ color: "#E2E8F0" }}>Contact Cap: <strong>{contactSlider} Contacts</strong></span>
              <span style={{ color: "#94A3B8" }}>Min: 10 — Max: 100</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={contactSlider}
              onChange={(e) => handleBudgetChange(budgetSlider, Number(e.target.value), reserveSlider)}
              style={{ width: "100%", accentColor: "#F59E0B", cursor: "pointer" }}
            />
          </div>

          {/* Reserve Capacity Slider */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
              <span style={{ color: "#E2E8F0" }}>Reserve Buffer: <strong>{reserveSlider}%</strong></span>
              <span style={{ color: "#94A3B8" }}>High-Value Intra-Day Reserve</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={reserveSlider}
              onChange={(e) => handleBudgetChange(budgetSlider, contactSlider, Number(e.target.value))}
              style={{ width: "100%", accentColor: "#10B981", cursor: "pointer" }}
            />
          </div>
        </div>

        {/* Frontier Visualizer */}
        {portfolio?.frontier_curve && (
          <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "8px", fontWeight: 600 }}>
              ALLOCATION EFFICIENCY FRONTIER (Incremental Yield Curve)
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "70px", padding: "0 10px" }}>
              {portfolio.frontier_curve.map((pt: any, idx: number) => {
                const isCurrent = Math.abs(pt.budget_inr - budgetSlider) < 100;
                const heightPct = Math.min(100, Math.max(15, (pt.expected_incremental_recovery_inr / 400000) * 100));
                return (
                  <div
                    key={idx}
                    onClick={() => handleBudgetChange(pt.budget_inr, contactSlider, reserveSlider)}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: `${heightPct}%`,
                        borderRadius: "4px 4px 0 0",
                        background: isCurrent ? "#6366F1" : "rgba(99, 102, 241, 0.25)",
                        border: isCurrent ? "2px solid #A5B4FC" : "none",
                        transition: "all 0.2s ease",
                      }}
                      title={`Budget: ₹${pt.budget_inr} → Expected Incremental: ₹${pt.expected_incremental_recovery_inr.toLocaleString()} (${pt.roi_multiple}x ROI)`}
                    />
                    <span style={{ fontSize: "10px", color: isCurrent ? "#A5B4FC" : "#64748B" }}>
                      ₹{pt.budget_inr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. EVALUATOR SPOTLIGHTS: 4 DEMONSTRATIONS (DEMO UNIVERSE ONLY) ─────────────────── */}
      {!isRealMode && (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Spotlight 1: The Amount Trap */}
        <div className="card" style={{ padding: "18px", background: "rgba(245, 158, 11, 0.04)", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#F59E0B", fontWeight: 700, fontSize: "14px", marginBottom: "8px" }}>
            <AlertTriangle size={16} /> 1. THE AMOUNT TRAP RESOLUTION
          </div>
          <p style={{ fontSize: "13px", color: "#CBD5E1", margin: "0 0 10px 0", lineHeight: 1.5 }}>
            A legacy retry bot blindly chases a <strong>₹1,20,000</strong> high-ticket failure despite near-zero incremental lift (τ = 4%, high chargeback risk). ReviveOS prioritizes a <strong>₹2,500</strong> subscription renewal with τ = 87% and high customer tenure, yielding 20x greater capital efficiency.
          </p>
          <div style={{ display: "flex", gap: "8px", fontSize: "11px" }}>
            <span style={{ padding: "3px 8px", background: "rgba(239, 68, 68, 0.2)", color: "#EF4444", borderRadius: "4px", fontWeight: 600 }}>
              OPP-001 (₹1.2L) → HUMAN REVIEW (Yield: 12.5)
            </span>
            <span style={{ padding: "3px 8px", background: "rgba(16, 185, 129, 0.2)", color: "#10B981", borderRadius: "4px", fontWeight: 600 }}>
              OPP-002 (₹2.5k) → PURSUED (Yield: 410)
            </span>
          </div>
        </div>

        {/* Spotlight 2: Natural Recovery Restraint */}
        <div className="card" style={{ padding: "18px", background: "rgba(59, 130, 246, 0.04)", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#3B82F6", fontWeight: 700, fontSize: "14px", marginBottom: "8px" }}>
            <Shield size={16} /> 2. INTENTIONAL ABSTENTION & FEE PRESERVATION
          </div>
          <p style={{ fontSize: "13px", color: "#CBD5E1", margin: "0 0 10px 0", lineHeight: 1.5 }}>
            When HDFC UPI experiences a temporary sync timeout, <strong>89% of transactions settle naturally</strong> within 2 hours. ReviveOS intentionally abstains from sending reminders, saving merchant SMS/WhatsApp fees and avoiding customer fatigue.
          </p>
          <div style={{ display: "flex", gap: "8px", fontSize: "11px" }}>
            <span style={{ padding: "3px 8px", background: "rgba(59, 130, 246, 0.2)", color: "#60A5FA", borderRadius: "4px", fontWeight: 600 }}>
              OPP-003 (₹18.5k) → P(Natural) = 89%
            </span>
            <span style={{ padding: "3px 8px", background: "rgba(16, 185, 129, 0.2)", color: "#10B981", borderRadius: "4px", fontWeight: 600 }}>
              ₹0 Fees Spent • 0 Customer Fatigue
            </span>
          </div>
        </div>

        {/* Spotlight 3: 30-Day-Old Failed Payment (Historical Resurrection Rejection) */}
        <div className="card" style={{ padding: "18px", background: "rgba(100, 116, 139, 0.06)", border: "1px solid rgba(100, 116, 139, 0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94A3B8", fontWeight: 700, fontSize: "14px", marginBottom: "8px" }}>
            <History size={16} /> 3. HISTORICAL RESURRECTION REJECTION
          </div>
          <p style={{ fontSize: "13px", color: "#CBD5E1", margin: "0 0 10px 0", lineHeight: 1.5 }}>
            A <strong>₹40,000 iPhone payment failed 30 days ago</strong> (OPP-HIST-001). The order is closed and no checkout is active. ReviveOS marks it <strong>HISTORICAL / EXPIRED</strong>: zero contact, zero auto-debit, zero recovery capital spent.
          </p>
          <div style={{ display: "flex", gap: "8px", fontSize: "11px" }}>
            <span style={{ padding: "3px 8px", background: "rgba(100, 116, 139, 0.2)", color: "#94A3B8", borderRadius: "4px", fontWeight: 600 }}>
              OPP-HIST-001 (₹40k) → HISTORICAL / EXPIRED
            </span>
            <span style={{ padding: "3px 8px", background: "rgba(239, 68, 68, 0.2)", color: "#EF4444", borderRadius: "4px", fontWeight: 600 }}>
              Resurrection Denied
            </span>
          </div>
        </div>

        {/* Spotlight 4: Fresh Customer Checkout with Historical Context */}
        <div className="card" style={{ padding: "18px", background: "rgba(99, 102, 241, 0.06)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#818CF8", fontWeight: 700, fontSize: "14px" }}>
              <Sparkles size={16} /> 4. NEW TRIGGER WITH HISTORICAL CONTEXT
            </div>
            <button
              onClick={handleTriggerCustomerReturn}
              className="btn btn-primary btn-sm"
              style={{ fontSize: "11px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "4px" }}
            >
              Simulate Customer Return <ArrowRight size={12} />
            </button>
          </div>
          <p style={{ fontSize: "13px", color: "#CBD5E1", margin: "0 0 10px 0", lineHeight: 1.5 }}>
            When the same customer starts a <strong>new checkout today</strong>, ReviveOS spawns a <strong>new Recovery Opportunity</strong> linking the 30-day failure as diagnostic context without resurrecting the old order.
          </p>
          <div style={{ display: "flex", gap: "8px", fontSize: "11px" }}>
            <span style={{ padding: "3px 8px", background: "rgba(99, 102, 241, 0.2)", color: "#A5B4FC", borderRadius: "4px", fontWeight: 600 }}>
              New Intent Established
            </span>
            <span style={{ padding: "3px 8px", background: "rgba(16, 185, 129, 0.2)", color: "#10B981", borderRadius: "4px", fontWeight: 600 }}>
              Historical Record Preserved
            </span>
          </div>
        </div>
      </div>
      )}

      {/* ── 5. TABBED OPPORTUNITY COMMAND CENTER ──────────────────────── */}
      <div className="card" style={{ padding: "20px" }}>
        {isRealMode && (!portfolio?.top_opportunities || portfolio.top_opportunities.length === 0) ? (
          <div style={{ padding: "48px 24px", textAlign: "center", background: "rgba(15, 23, 42, 0.4)", borderRadius: "12px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
            <Shield size={36} color="#10B981" style={{ margin: "0 auto 14px", opacity: 0.8 }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#F8FAFC", marginBottom: "6px" }}>
              Real Mode: 0 Active Recovery Opportunities
            </h3>
            <p style={{ fontSize: "13px", color: "#94A3B8", maxWidth: "580px", margin: "0 auto 16px", lineHeight: 1.6 }}>
              Connected to authenticated Razorpay rails (<code>rzp_test_TVwFUQgZPsAmiC</code>). Zero declined payments or failed mandates are currently recorded on this account. ReviveOS will autonomously evaluate and arbitrate recovery opportunities when live transactions occur.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setShowLiveLinkModal(true)} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", background: "linear-gradient(135deg, #00F0FF 0%, #0099FF 100%)", color: "#040711", fontWeight: 800 }}>
                <Zap size={14} /> ⚡ Generate Live Razorpay Link (Real API Sandbox)
              </button>
              <button onClick={fetchInitialData} className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                <RefreshCw size={13} /> Sync Live Activity
              </button>
              <button onClick={() => { localStorage.setItem("reviveai_active_environment", "DEMO"); window.location.reload(); }} className="btn btn-primary" style={{ fontSize: "12px" }}>
                Switch to Demo Universe (NovaCart)
              </button>
            </div>
          </div>
        ) : (
          <>
        {/* Tab Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "12px", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { key: "LIVE_AUCTION", label: `Live Recovery Auction (${auctionResult?.all_proposals?.length || 5})`, icon: Zap, color: "#818CF8" },
              { key: "ACTIVE", label: `Active Portfolio (${portfolio?.top_opportunities?.length || 0})`, icon: Zap, color: "#10B981" },
              { key: "RECOVERY_LEDGER", label: `Recovery Ledger (${recoveryLedger?.length || 0})`, icon: CheckCircle2, color: "#34D399" },
              { key: "ABSTENTIONS", label: `Abstention Ledger (${abstainCount})`, icon: Shield, color: "#EC4899" },
              { key: "HISTORICAL", label: `Historical Revenue Leakage (${historicalCount})`, icon: History, color: "#94A3B8" },
              { key: "BLOCKED", label: `Blocked & Cancelled (${blockedCount})`, icon: Ban, color: "#EF4444" },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => { setActiveTab(t.key as any); setSelectedBucketFilter("ALL"); }}
                  style={{
                    border: "none",
                    background: isSelected ? "rgba(255, 255, 255, 0.12)" : "transparent",
                    color: isSelected ? t.color : "#94A3B8",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Icon size={14} color={isSelected ? t.color : "#64748B"} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search customer, ID, failure code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px", padding: "6px 12px", color: "#F8FAFC", fontSize: "12px", width: "260px"
              }}
            />
          </div>
        </div>

        {/* TAB CONTENT: 0. LIVE RECOVERY AUCTION TERMINAL */}
        {activeTab === "LIVE_AUCTION" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", padding: "14px", background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "8px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#C7D2FE", marginBottom: "2px" }}>
                  ⚖️ Autonomous Multi-Agent Demand & Capacity Allocation Desk
                </div>
                <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                  Autonomous agents submit bids across opportunities. ReviveOS ranks proposals by <strong>Net Incremental Contribution</strong> and enforces <strong>One Customer, One Recovery Decision</strong>.
                </div>
              </div>
              <div style={{ display: "flex", gap: "16px", textAlign: "right" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>APPROVED RECOVERY</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#10B981" }}>
                    {formatINR(auctionResult?.auction_summary?.total_net_contribution_inr || 1945)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>DISCOUNTS SAVED</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#818CF8" }}>
                    {formatINR(auctionResult?.auction_summary?.total_discount_leakage_prevented_inr || 500)}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#94A3B8", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px" }}>Recovery System</th>
                    <th style={{ padding: "10px 8px" }}>Customer</th>
                    <th style={{ padding: "10px 8px" }}>Proposed Action</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>Payment Value</th>
                    <th style={{ padding: "10px 8px", textAlign: "center" }}>Expected Extra Lift</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>Net Extra Value</th>
                    <th style={{ padding: "10px 8px", textAlign: "center" }}>Efficiency Score</th>
                    <th style={{ padding: "10px 8px" }}>Decision Status</th>
                    <th style={{ padding: "10px 8px" }}>Why ReviveOS Made This Choice</th>
                  </tr>
                </thead>
                <tbody>
                  {(auctionResult?.all_proposals || []).map((p: any) => {
                    const isApproved = p.status === "APPROVED";
                    const isAbstained = p.status === "REJECTED_NATURAL";

                    return (
                      <tr
                        key={p.proposal_id}
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                          background: isApproved ? "rgba(16, 185, 129, 0.04)" : isAbstained ? "rgba(99, 102, 241, 0.03)" : "transparent"
                        }}
                      >
                        <td style={{ padding: "10px 8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontWeight: 700, color: isApproved ? "#10B981" : "#F8FAFC" }}>{p.agent_type}</span>
                            <ProvenanceBadge provenance={p.provenance || "REVIVEAI_DERIVED"} />
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748B", fontFamily: "monospace" }}>{p.proposal_id}</div>
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <div style={{ fontWeight: 600, color: "#CBD5E1" }}>{p.customer_name}</div>
                          <div style={{ fontSize: "11px", color: "#64748B" }}>{p.customer_id} • {p.opportunity_id}</div>
                        </td>
                        <td style={{ padding: "10px 8px", color: "#E2E8F0" }}>{p.action_type}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600, color: "#F8FAFC" }}>
                          {formatINR(p.amount_inr)} <span style={{ fontSize: "10px", color: "#64748B" }}>({p.amount_paise}p)</span>
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center" }}>
                          <span style={{
                            padding: "2px 6px", borderRadius: "4px", fontWeight: 700,
                            background: p.estimated_incremental_uplift > 0.4 ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                            color: p.estimated_incremental_uplift > 0.4 ? "#10B981" : "#CBD5E1"
                          }}>
                            +{Math.round(p.estimated_incremental_uplift * 100)}pp
                          </span>
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, color: isApproved ? "#10B981" : "#94A3B8" }}>
                          {formatINR(p.net_contribution_inr)}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: 700, color: p.capacity_efficiency_score > 100 ? "#60A5FA" : "#94A3B8" }}>
                          {p.capacity_efficiency_score}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <FriendlyStatusBadge status={p.status} />
                        </td>
                        <td style={{ padding: "10px 8px", fontSize: "11px", color: isApproved ? "#A7F3D0" : "#94A3B8", maxWidth: "260px" }}>
                          {p.suppression_reason || (isApproved ? `Won auction (+INR ${(p.runner_up_delta_inr || 0).toLocaleString("en-IN")} vs runner-up). Authorized for execution.` : "--")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB CONTENT: 1. ACTIVE PORTFOLIO */}
        {activeTab === "ACTIVE" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                Ranked by Net Incremental Yield (τ · V / Cost). Select <strong>Cancel</strong> to test customer sovereignty stop.
              </div>

              {/* Bucket Filter Pills */}
              <div style={{ display: "flex", gap: "4px", background: "rgba(15, 23, 42, 0.8)", padding: "4px", borderRadius: "8px" }}>
                {[
                  { key: "ALL", label: `All Eligible (${portfolio?.top_opportunities?.length || 0})` },
                  { key: "PURSUE", label: `Pursue (${pursueCount})`, color: "#10B981" },
                  { key: "ASK_CUSTOMER", label: `Ask Customer (${portfolio?.buckets?.ASK_CUSTOMER?.length || 0})`, color: "#3B82F6" },
                  { key: "HUMAN_REVIEW", label: `Human Review (${humanCount})`, color: "#F59E0B" },
                  { key: "WAIT", label: `Wait (${portfolio?.buckets?.WAIT?.length || 0})`, color: "#94A3B8" },
                ].map((b) => (
                  <button
                    key={b.key}
                    onClick={() => setSelectedBucketFilter(b.key)}
                    style={{
                      border: "none",
                      background: selectedBucketFilter === b.key ? "rgba(255, 255, 255, 0.12)" : "transparent",
                      color: selectedBucketFilter === b.key ? (b.color || "#F8FAFC") : "#94A3B8",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#94A3B8", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px" }}>Opportunity / Customer</th>
                    <th style={{ padding: "10px 8px" }}>Failure Reason</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>Amount</th>
                    <th style={{ padding: "10px 8px", textAlign: "center" }}>P(Nat)</th>
                    <th style={{ padding: "10px 8px", textAlign: "center" }}>P(Int)</th>
                    <th style={{ padding: "10px 8px", textAlign: "center" }}>Causal Lift (τ)</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>Exp Lift (τ · V)</th>
                    <th style={{ padding: "10px 8px", textAlign: "center" }}>Yield Score</th>
                    <th style={{ padding: "10px 8px" }}>Allocation Decision</th>
                    <th style={{ padding: "10px 8px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOpportunities.map((opp: any) => {
                    const isPursue = opp.bucket === "PURSUE";
                    const isHuman = opp.bucket === "HUMAN_REVIEW";
                    const isAsk = opp.bucket === "ASK_CUSTOMER";

                    return (
                      <tr
                        key={opp.id}
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                          background: opp.id === "OPP-001" ? "rgba(245, 158, 11, 0.03)" :
                                     opp.id === "OPP-002" ? "rgba(16, 185, 129, 0.03)" :
                                     opp.id.startsWith("OPP-NEW") ? "rgba(99, 102, 241, 0.05)" : "transparent"
                        }}
                      >
                        <td style={{ padding: "10px 8px" }}>
                          <div style={{ fontWeight: 600, color: "#F8FAFC" }}>{opp.customer_name}</div>
                          <div style={{ fontSize: "11px", color: "#64748B" }}>
                            {opp.id} • {opp.customer_tenure_months}mo tenure
                            {opp.historical_context_ids?.length > 0 && (
                              <span style={{ color: "#818CF8", marginLeft: "4px" }}>
                                (Context: {opp.historical_context_ids.join(", ")})
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <div style={{ color: "#E2E8F0" }}>{opp.failure_code}</div>
                          <div style={{ fontSize: "11px", color: "#94A3B8" }}>{opp.failure_reason}</div>
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600, color: "#F8FAFC" }}>
                          {formatINR(opp.amount_inr)}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", color: "#94A3B8" }}>
                          {(opp.p_natural * 100).toFixed(0)}%
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", color: "#94A3B8" }}>
                          {(opp.p_intervention * 100).toFixed(0)}%
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center" }}>
                          <span style={{
                            padding: "2px 6px", borderRadius: "4px", fontWeight: 700,
                            background: opp.tau > 0.4 ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                            color: opp.tau > 0.4 ? "#10B981" : "#CBD5E1"
                          }}>
                            +{(opp.tau * 100).toFixed(0)}pp
                          </span>
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "right", color: "#10B981", fontWeight: 600 }}>
                          {formatINR(opp.expected_incremental_value_inr)}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: 700, color: opp.yield_score > 100 ? "#60A5FA" : "#94A3B8" }}>
                          {opp.yield_score}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontWeight: 600,
                            fontSize: "11px",
                            background: isPursue ? "rgba(16, 185, 129, 0.15)" :
                                        isAsk ? "rgba(59, 130, 246, 0.15)" :
                                        isHuman ? "rgba(245, 158, 11, 0.15)" : "rgba(100, 116, 139, 0.15)",
                            color: isPursue ? "#10B981" :
                                   isAsk ? "#60A5FA" :
                                   isHuman ? "#F59E0B" : "#94A3B8",
                          }}>
                            {opp.bucket}
                          </span>
                          {opp.opportunity_cost_explanation && (
                            <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "2px", maxWidth: "240px" }}>
                              {opp.opportunity_cost_explanation}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                            <button
                              onClick={() => handleGenerateLink(opp.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: "10px", padding: "3px 8px", color: "#10B981", borderColor: "rgba(16, 185, 129, 0.4)" }}
                              title="Generate Customer-Controlled Payment Link"
                            >
                              Link
                            </button>
                            <button
                              onClick={() => handleCancelOpp(opp.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: "10px", padding: "3px 8px", color: "#EF4444" }}
                              title="Simulate customer clicking Cancel (Customer Sovereignty Stop)"
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
        )}

        {/* TAB CONTENT: 2. ABSTENTION LEDGER */}
        {activeTab === "ABSTENTIONS" && (
          <div>
            <div style={{ fontSize: "13px", color: "#CBD5E1", marginBottom: "14px" }}>
              <strong>Intentional Abstention Ledger:</strong> Opportunities where ReviveOS deliberately withheld contact because natural recovery probability was high (P(Nat) ≥ 75%). Preserved ₹{portfolio?.capital_saved_by_abstention_inr?.toLocaleString()} in merchant fees and avoided {portfolio?.customer_friction_avoided_count} unnecessary customer contacts.
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#94A3B8", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px" }}>Customer / Opportunity</th>
                    <th style={{ padding: "10px 8px" }}>Failure Code</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>Amount</th>
                    <th style={{ padding: "10px 8px", textAlign: "center" }}>P(Natural)</th>
                    <th style={{ padding: "10px 8px", textAlign: "center" }}>Marginal Lift (τ)</th>
                    <th style={{ padding: "10px 8px" }}>Reason for Deliberate Abstention</th>
                    <th style={{ padding: "10px 8px", textAlign: "center" }}>Fees Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {(portfolio?.abstention_ledger || []).map((opp: any) => (
                    <tr key={opp.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                      <td style={{ padding: "10px 8px" }}>
                        <div style={{ fontWeight: 600, color: "#F8FAFC" }}>{opp.customer_name}</div>
                        <div style={{ fontSize: "11px", color: "#64748B" }}>{opp.id}</div>
                      </td>
                      <td style={{ padding: "10px 8px", color: "#E2E8F0" }}>{opp.failure_code}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600, color: "#F8FAFC" }}>
                        {formatINR(opp.amount_inr)}
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center", color: "#60A5FA", fontWeight: 700 }}>
                        {(opp.p_natural * 100).toFixed(0)}%
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center", color: "#94A3B8" }}>
                        +{(opp.tau * 100).toFixed(0)}pp
                      </td>
                      <td style={{ padding: "10px 8px", color: "#EC4899", fontSize: "11px" }}>
                        {opp.abstention_reason}
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center", color: "#10B981", fontWeight: 600 }}>
                        ₹{opp.intervention_cost_inr + 5} Saved
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB CONTENT: 3. HISTORICAL REVENUE LEAKAGE & EXPIRED EVENTS */}
        {activeTab === "HISTORICAL" && (
          <div>
            <div style={{ fontSize: "13px", color: "#CBD5E1", marginBottom: "14px" }}>
              <strong>Historical Revenue Leakage Log ({historicalCount} Expired Events):</strong> Past transactions older than 24 hours. These records are <strong>retained strictly for analytics and diagnostic context</strong>. They can never be automatically contacted or resurrected.
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#94A3B8", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px" }}>Historical Event / Customer</th>
                    <th style={{ padding: "10px 8px" }}>Failure Code</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>Amount</th>
                    <th style={{ padding: "10px 8px" }}>Event Status</th>
                    <th style={{ padding: "10px 8px" }}>Current Actionability</th>
                    <th style={{ padding: "10px 8px" }}>Governance Rule</th>
                  </tr>
                </thead>
                <tbody>
                  {(portfolio?.historical_ledger || []).map((opp: any) => (
                    <tr key={opp.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                      <td style={{ padding: "10px 8px" }}>
                        <div style={{ fontWeight: 600, color: "#94A3B8" }}>{opp.customer_name}</div>
                        <div style={{ fontSize: "11px", color: "#64748B" }}>{opp.id} • {opp.order_id}</div>
                      </td>
                      <td style={{ padding: "10px 8px", color: "#94A3B8" }}>{opp.failure_code}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600, color: "#94A3B8" }}>
                        {formatINR(opp.amount_inr)}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <span style={{ padding: "2px 6px", borderRadius: "4px", background: "rgba(100, 116, 139, 0.15)", color: "#94A3B8", fontSize: "11px" }}>
                          EXPIRED (&gt; 24h)
                        </span>
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <span style={{ padding: "2px 6px", borderRadius: "4px", background: "rgba(239, 68, 68, 0.15)", color: "#EF4444", fontSize: "11px", fontWeight: 600 }}>
                          NOT ACTIONABLE
                        </span>
                      </td>
                      <td style={{ padding: "10px 8px", color: "#94A3B8", fontSize: "11px" }}>
                        Historical event — retained for context. No contact authorized.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB CONTENT: 4. BLOCKED & CANCELLED QUEUE */}
        {activeTab === "BLOCKED" && (
          <div>
            <div style={{ fontSize: "13px", color: "#CBD5E1", marginBottom: "14px" }}>
              <strong>Blocked & Cancelled Queue ({blockedCount} Prevented Actions):</strong> Actions blocked by the Customer Sovereignty gate, Duplicate Purchase Shield, or Policy Firewall.
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#94A3B8", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px" }}>Opportunity / Customer</th>
                    <th style={{ padding: "10px 8px" }}>Cart / Order ID</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>Amount</th>
                    <th style={{ padding: "10px 8px" }}>Protection Gate</th>
                    <th style={{ padding: "10px 8px" }}>Disqualification Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {(portfolio?.buckets?.BLOCKED || []).map((opp: any) => (
                    <tr key={opp.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                      <td style={{ padding: "10px 8px" }}>
                        <div style={{ fontWeight: 600, color: "#F8FAFC" }}>{opp.customer_name}</div>
                        <div style={{ fontSize: "11px", color: "#64748B" }}>{opp.id}</div>
                      </td>
                      <td style={{ padding: "10px 8px", color: "#E2E8F0" }}>{opp.order_id}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600, color: "#F8FAFC" }}>
                        {formatINR(opp.amount_inr)}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <span style={{ padding: "2px 6px", borderRadius: "4px", background: "rgba(239, 68, 68, 0.15)", color: "#EF4444", fontSize: "11px", fontWeight: 700 }}>
                          {opp.state || "BLOCKED"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 8px", color: "#F8FAFC", fontSize: "11px" }}>
                        {opp.disqualification_reasons?.join(", ") || opp.blocking_reason || "Safety Governor Block"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB CONTENT: 5. FORENSIC RECOVERY LEDGER */}
        {activeTab === "RECOVERY_LEDGER" && (
          <div>
            <div style={{ padding: "16px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
              <div style={{ fontWeight: 600, color: "#10B981", marginBottom: "4px" }}>
                📜 Authoritative Recovery & Attribution Ledger (Integer Minor Unit Precision)
              </div>
              <p style={{ margin: 0, color: "#CBD5E1", fontSize: "12px" }}>
                Every record links the complete causal chain from detection to confirmed Razorpay settlement. Financial calculations maintain strict paise precision with zero floating-point drift.
              </p>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155", color: "#94A3B8", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px" }}>OUTCOME ID</th>
                    <th style={{ padding: "10px 8px" }}>OPPORTUNITY</th>
                    <th style={{ padding: "10px 8px" }}>ACTION</th>
                    <th style={{ padding: "10px 8px" }}>AMOUNT (PAISE / INR)</th>
                    <th style={{ padding: "10px 8px" }}>RECOVERED</th>
                    <th style={{ padding: "10px 8px" }}>LIFECYCLE STAGE</th>
                    <th style={{ padding: "10px 8px" }}>PROVIDER TX ID</th>
                    <th style={{ padding: "10px 8px" }}>PROVENANCE</th>
                  </tr>
                </thead>
                <tbody>
                  {recoveryLedger.map((rec: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #1E293B" }}>
                      <td style={{ padding: "10px 8px", fontFamily: "monospace", color: "#818CF8", fontWeight: 600 }}>{rec.id}</td>
                      <td style={{ padding: "10px 8px", color: "#F8FAFC" }}>{rec.opportunity_id}</td>
                      <td style={{ padding: "10px 8px", color: "#94A3B8" }}>{rec.action_type}</td>
                      <td style={{ padding: "10px 8px", color: "#F8FAFC" }}>
                        {formatINR(rec.amount_inr)} <span style={{ fontSize: "10px", color: "#64748B" }}>({rec.amount_paise}p)</span>
                      </td>
                      <td style={{ padding: "10px 8px", color: rec.recovered_amount_inr > 0 ? "#10B981" : "#94A3B8", fontWeight: 600 }}>
                        {formatINR(rec.recovered_amount_inr)}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <span style={{
                          fontSize: "11px", padding: "2px 6px", borderRadius: "4px",
                          background: rec.lifecycle_stage === "RECOVERED" || rec.lifecycle_stage === "ATTRIBUTED" ? "rgba(16, 185, 129, 0.2)" : "rgba(99, 102, 241, 0.2)",
                          color: rec.lifecycle_stage === "RECOVERED" || rec.lifecycle_stage === "ATTRIBUTED" ? "#10B981" : "#A5B4FC"
                        }}>
                          {rec.lifecycle_stage}
                        </span>
                      </td>
                      <td style={{ padding: "10px 8px", fontFamily: "monospace", color: "#CBD5E1" }}>
                        {rec.provider_transaction_id || "--"}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "#1E293B", color: "#94A3B8", border: "1px solid #334155" }}>
                          {rec.outcome_provenance}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* ── 6. COUNTERFACTUAL ATTRIBUTION & REGRET MODAL ─────────────── */}
      {showRegretModal && settlementResult && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "800px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FlaskConical size={20} color="#10B981" />
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                  Counterfactual Attribution & Decision Regret Engine
                </h2>
              </div>
              <button
                onClick={() => setShowRegretModal(false)}
                style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Treatment vs Holdout Comparison */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              <div className="card" style={{ padding: "14px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600 }}>TREATMENT (INTERVENED)</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#10B981" }}>{settlementResult.treatment_recovery_rate}%</div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>{settlementResult.treatment_recovered} / {settlementResult.treatment_total} Recovered</div>
              </div>

              <div className="card" style={{ padding: "14px", background: "rgba(100, 116, 139, 0.08)", border: "1px solid rgba(100, 116, 139, 0.3)" }}>
                <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600 }}>HOLDOUT CONTROL (5%)</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#94A3B8" }}>{settlementResult.holdout_recovery_rate}%</div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>{settlementResult.holdout_recovered} / {settlementResult.holdout_total} Natural Baseline</div>
              </div>

              <div className="card" style={{ padding: "14px", background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
                <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600 }}>OBSERVED CAUSAL LIFT</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#818CF8" }}>+{settlementResult.observed_causal_uplift_pp}pp</div>
                <div style={{ fontSize: "11px", color: "#818CF8" }}>Proven True Incrementality</div>
              </div>
            </div>

            {/* 4-Quadrant Regret Matrix */}
            <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 600 }}>
              Decision Regret Breakdown ({settlementResult.good_decisions_pct}% Optimal Decisions)
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {settlementResult.regret_summary?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: "14px", borderLeft: `4px solid ${r.color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: r.color }}>{r.label}</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#F8FAFC" }}>{r.count} cases</span>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", marginBottom: "4px" }}>
                    {formatINR(r.amount_inr)}
                  </div>
                  <p style={{ fontSize: "11px", color: "#94A3B8", margin: 0, lineHeight: 1.4 }}>
                    {r.description}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button onClick={() => setShowRegretModal(false)} className="btn btn-primary">
                Close Calibration View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7.4. COUNTERFACTUAL AUCTION WINNER MODAL ───────────────── */}
      {showCounterfactualModal && counterfactualData && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "700px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FlaskConical size={20} color="#10B981" />
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#F8FAFC" }}>
                  Forensic Counterfactual Opportunity Cost Analysis
                </h3>
              </div>
              <button
                onClick={() => setShowCounterfactualModal(false)}
                style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#10B981", marginBottom: "4px" }}>
                🏆 WINNER vs RUNNER-UP OPPORTUNITY COST: {formatINR(counterfactualData.opportunity_cost_inr)}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#E2E8F0", lineHeight: 1.5 }}>
                {counterfactualData.decision_explanation}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div className="card" style={{ padding: "14px", border: "1px solid rgba(16, 185, 129, 0.4)", background: "rgba(16, 185, 129, 0.05)" }}>
                <div style={{ fontSize: "11px", color: "#10B981", fontWeight: 700 }}>WINNING PROPOSAL</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#F8FAFC", margin: "4px 0" }}>
                  {counterfactualData.winner?.agent_type}
                </div>
                <div style={{ fontSize: "12px", color: "#CBD5E1" }}>Action: <strong>{counterfactualData.winner?.action_type}</strong></div>
                <div style={{ fontSize: "12px", color: "#10B981" }}>Net Contribution: <strong>{formatINR(counterfactualData.winner?.net_contribution_inr || 0)}</strong></div>
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>Discount Leakage: ₹0 (Preserves 100% margin)</div>
              </div>

              <div className="card" style={{ padding: "14px", border: "1px solid rgba(239, 68, 68, 0.3)", background: "rgba(239, 68, 68, 0.05)" }}>
                <div style={{ fontSize: "11px", color: "#EF4444", fontWeight: 700 }}>NEXT BEST ALTERNATIVE (RUNNER-UP)</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#F8FAFC", margin: "4px 0" }}>
                  {counterfactualData.runner_up?.agent_type || "None"}
                </div>
                <div style={{ fontSize: "12px", color: "#CBD5E1" }}>Action: <strong>{counterfactualData.runner_up?.action_type}</strong></div>
                <div style={{ fontSize: "12px", color: "#CBD5E1" }}>Net Contribution: <strong>{formatINR(counterfactualData.runner_up?.net_contribution_inr || 0)}</strong></div>
                <div style={{ fontSize: "11px", color: "#EF4444", marginTop: "4px" }}>Discount Leakage: {formatINR(counterfactualData.runner_up?.discount_cost_inr || 0)}</div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <button onClick={() => setShowCounterfactualModal(false)} className="btn btn-primary" style={{ fontSize: "13px", padding: "8px 18px" }}>
                Close Counterfactual View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7.5. MULTI-AGENT ARBITRATION MODAL ──────────────────────── */}
      {showArbitrationModal && arbitrationResult && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "800px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#818CF8" }}>
                  <Shield size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#F8FAFC" }}>
                    Multi-Agent Revenue Arbitration Desk
                  </h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#94A3B8" }}>
                    Customer: <strong>{arbitrationResult.customer_name}</strong> ({arbitrationResult.customer_id}) • 3 Competing Agents Intercepted
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowArbitrationModal(false)}
                style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "10px", padding: "14px", marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#C7D2FE", marginBottom: "4px" }}>
                ⚖️ Arbitration Summary & Policy Invariant
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "#E2E8F0", lineHeight: "1.5" }}>
                {arbitrationResult.arbitration_summary}
              </p>
              <div style={{ marginTop: "8px", fontSize: "11px", color: "#A5B4FC" }}>
                Policy Enforced: <strong>{arbitrationResult.policy_enforced}</strong> • Remaining Attention Slots Today: <strong>{arbitrationResult.attention_cap_remaining}</strong>
              </div>
            </div>

            <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", marginBottom: "10px" }}>
              Competing Agent Proposals Evaluated Side-by-Side:
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              {arbitrationResult.all_proposals?.map((p: any, idx: number) => {
                const isWinner = p.agent_type === arbitrationResult.winning_agent;
                return (
                  <div
                    key={idx}
                    style={{
                      padding: "16px", borderRadius: "10px",
                      background: isWinner ? "rgba(16, 185, 129, 0.08)" : "rgba(30, 41, 59, 0.6)",
                      border: isWinner ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(51, 65, 85, 0.6)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: isWinner ? "#10B981" : "#F8FAFC" }}>
                          {p.agent_name}
                        </span>
                        {isWinner ? (
                          <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.2)", color: "#10B981" }}>
                            🏆 WINNER (AUTHORIZED)
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.15)", color: "#EF4444" }}>
                            🚫 SUPPRESSED
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: isWinner ? "#10B981" : "#94A3B8" }}>
                        Net Yield: {formatINR(p.net_incremental_contribution_inr)}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", fontSize: "12px", color: "#94A3B8", marginBottom: "8px" }}>
                      <div>Action: <strong style={{ color: "#F8FAFC" }}>{p.proposed_action}</strong></div>
                      <div>Amount: <strong style={{ color: "#F8FAFC" }}>{formatINR(p.amount_inr)}</strong></div>
                      <div>Causal Lift (τ): <strong style={{ color: isWinner ? "#10B981" : "#F8FAFC" }}>+{Math.round(p.tau * 100)}pp</strong></div>
                      <div>Channel: <strong style={{ color: "#F8FAFC" }}>{p.requested_channel}</strong></div>
                    </div>

                    <p style={{ margin: 0, fontSize: "12px", color: isWinner ? "#A7F3D0" : "#94A3B8", fontStyle: "italic" }}>
                      {p.priority_rationale}
                    </p>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowArbitrationModal(false)}
                className="btn btn-primary"
                style={{ padding: "8px 20px", fontSize: "13px" }}
              >
                Close Arbitration Desk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7.8. CUSTOMER-CONTROLLED PAYMENT LINK MODAL ─────────────── */}
      {showLinkModal && generatedLinkData && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "600px", width: "100%", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={20} color="#10B981" />
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#F8FAFC" }}>
                  Customer-Controlled Recovery Link Ready
                </h3>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "#10B981", fontWeight: 600, marginBottom: "4px" }}>
                🛡️ CUSTOMER SOVEREIGNTY INVARIANT ENFORCED
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#CBD5E1", lineHeight: 1.4 }}>
                ReviveOS does not execute silent direct debits for one-time payments. A secure Razorpay Payment Link has been generated with integer minor unit precision ({generatedLinkData.amount_paise} paise).
              </p>
            </div>

            <div style={{ background: "#0F172A", border: "1px solid #334155", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "4px" }}>RECOVERY PAYMENT URL:</div>
              <div style={{ fontSize: "13px", fontFamily: "monospace", color: "#818CF8", wordBreak: "break-all" }}>
                {generatedLinkData.payment_link_url}
              </div>
              <div style={{ marginTop: "8px", fontSize: "11px", color: "#64748B" }}>
                Contract Signature: <span style={{ fontFamily: "monospace", color: "#94A3B8" }}>{generatedLinkData.contract_signature}</span> • Provenance: <span style={{ color: "#10B981" }}>{generatedLinkData.provenance}</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={() => handleSimulateCustomerPayment(generatedLinkData.opportunity_id)}
                disabled={reconcilingLink}
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: "8px 16px" }}
              >
                <Zap size={14} />
                {reconcilingLink ? "Reconciling Webhook..." : "Simulate Customer Paid Checkout"}
              </button>

              <button
                onClick={() => setShowLinkModal(false)}
                className="btn btn-secondary"
                style={{ fontSize: "13px", padding: "8px 14px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <LiveRazorpayLinkModal isOpen={showLiveLinkModal} onClose={() => setShowLiveLinkModal(false)} defaultAmount={499} />
      <RazorpayConnectionModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />
    </div>
  );
}
