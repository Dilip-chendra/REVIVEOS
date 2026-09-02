import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale, Users, Ban, RefreshCw, Clock, Lock
} from "lucide-react";

export const InvariantsInteractive: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);

  // Tab 2 Natural Settle Simulator state
  const [simStep, setSimStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Tab 4 Resurrection Simulator state
  const [resurrectState, setResurrectState] = useState<"IDLE" | "CHECKING" | "BLOCKED">("IDLE");

  const tabs = [
    { id: 0, title: "01 AMOUNT ≠ OPPORTUNITY", icon: Scale, subtitle: "Causal Lift vs Gross Rupee Size" },
    { id: 1, title: "02 DOING NOTHING CAN BE OPTIMAL", icon: Clock, subtitle: "Natural Recovery Restraint" },
    { id: 2, title: "03 ONE CUSTOMER → ONE DECISION", icon: Users, subtitle: "Multi-Agent Collision Auction" },
    { id: 3, title: "04 DEAD TRANSACTIONS STAY DEAD", icon: Ban, subtitle: "Resurrection Denial & Policy Gate" },
    { id: 4, title: "05 DECISION ≠ EXECUTION", icon: Lock, subtitle: "TOCTOU Atomic Pre-Check" },
  ];

  const runNaturalSettleSim = () => {
    setIsSimulating(true);
    setSimStep(1);
    setTimeout(() => {
      setSimStep(2);
      setTimeout(() => {
        setSimStep(3);
        setIsSimulating(false);
      }, 1200);
    }, 1200);
  };

  const runResurrectionCheck = () => {
    setResurrectState("CHECKING");
    setTimeout(() => {
      setResurrectState("BLOCKED");
    }, 900);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
      
      {/* Tab Navigation Header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSimStep(0);
                setResurrectState("IDLE");
              }}
              style={{
                textAlign: "left",
                padding: "14px 16px",
                borderRadius: "12px",
                background: isActive ? "#0F1117" : "#0A0C10",
                border: isActive ? "1.5px solid #00F0FF" : "1px solid #1E2230",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                boxShadow: isActive ? "0 0 20px rgba(0, 240, 255, 0.15)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon size={14} color={isActive ? "#00F0FF" : "#64748B"} />
                <span style={{ fontSize: "11px", fontWeight: 800, color: isActive ? "#FFF" : "#8E9BB0", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
                  {tab.title}
                </span>
              </div>
              <span style={{ fontSize: "10px", color: isActive ? "#00F0FF" : "#64748B", fontWeight: 600 }}>
                {tab.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Interactive Content Card */}
      <div style={{ background: "#0F1117", border: "1px solid #1E2230", borderRadius: "18px", padding: "28px", minHeight: "360px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
        <AnimatePresence mode="wait">
          
          {/* TAB 1: AMOUNT TRAP */}
          {activeTab === 0 && (
            <motion.div
              key="tab-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative" }}
            >
              {/* Giant Outlined Watermark Number */}
              <div style={{ position: "absolute", right: "-10px", top: "-20px", fontFamily: "var(--font-hero-display)", fontSize: "5.5rem", fontWeight: 900, WebkitTextStroke: "1.5px rgba(255, 255, 255, 0.08)", color: "transparent", userSelect: "none", lineHeight: 1, pointerEvents: "none" }}>
                01
              </div>

              <div>
                <div style={{ fontSize: "0.8125rem", color: "#00F0FF", fontWeight: 800, fontFamily: "var(--font-mono)", letterSpacing: "0.12em" }}>
                  INVARIANT 01: CAUSAL INCREMENTAL LIFT (τ)
                </div>
                <h3 style={{ fontFamily: "var(--font-section-heading)", fontSize: "1.4rem", fontWeight: 700, color: "#FFF", marginTop: "4px" }}>
                  Why ReviveOS prioritizes ₹2,500 over ₹1,50,000
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#8E9BB0", lineHeight: 1.6, marginTop: "6px" }}>
                  Legacy dunning bots blindly chase the highest gross transaction amount, burning gateway fees on unrecoverable hard declines. ReviveOS calculates marginal causal lift:
                  <code style={{ background: "rgba(0, 240, 255, 0.1)", color: "#00F0FF", padding: "2px 6px", borderRadius: "4px", marginLeft: "6px", fontFamily: "var(--font-mono)" }}>
                    τ = P(Recovery | Intervention) - P(Recovery | Natural)
                  </code>
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Opp A */}
                <div style={{ background: "#0A0C10", border: "1px solid rgba(255, 59, 48, 0.3)", borderRadius: "14px", padding: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#FF3B30", fontFamily: "var(--font-mono)" }}>OPPORTUNITY A (THE TRAP)</span>
                    <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(255, 59, 48, 0.2)", color: "#FF3B30", fontWeight: 800, fontFamily: "var(--font-mono)" }}>HARD DECLINE</span>
                  </div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#FFF", marginTop: "8px", fontFamily: "var(--font-mono)" }}>₹1,50,000</div>
                  <div style={{ fontSize: "11px", color: "#8E9BB0", marginTop: "4px" }}>Luxury E-Commerce High Ticket</div>
                  
                  <div style={{ marginTop: "14px", borderTop: "1px solid #1E2230", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Causal Lift (τ):</span>
                      <strong style={{ color: "#FF3B30", fontFamily: "var(--font-mono)" }}>4% (Near-Zero)</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Chargeback Risk:</span>
                      <strong style={{ color: "#FF3B30" }}>High (Penalty risk)</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>ReviveOS Action:</span>
                      <strong style={{ color: "#F59E0B" }}>Route to Human Review</strong>
                    </div>
                  </div>
                </div>

                {/* Opp B */}
                <div style={{ background: "#0A0C10", border: "1.5px solid #00FF66", borderRadius: "14px", padding: "18px", boxShadow: "0 0 20px rgba(0, 255, 102, 0.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#00FF66", fontFamily: "var(--font-mono)" }}>OPPORTUNITY B (HIGH YIELD)</span>
                    <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(0, 255, 102, 0.2)", color: "#00FF66", fontWeight: 800, fontFamily: "var(--font-mono)" }}>PRIORITY #1</span>
                  </div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#FFF", marginTop: "8px", fontFamily: "var(--font-mono)" }}>₹2,500</div>
                  <div style={{ fontSize: "11px", color: "#8E9BB0", marginTop: "4px" }}>High-Tenure SaaS Subscription</div>
                  
                  <div style={{ marginTop: "14px", borderTop: "1px solid #1E2230", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Causal Lift (τ):</span>
                      <strong style={{ color: "#00FF66", fontFamily: "var(--font-mono)" }}>87% (High Efficacy)</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Intervention Fee:</span>
                      <strong style={{ color: "#00FF66", fontFamily: "var(--font-mono)" }}>₹2.00 (Low Cost)</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Capital Efficiency:</span>
                      <strong style={{ color: "#00F0FF", fontFamily: "var(--font-mono)" }}>20x Greater Yield</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: "10px 16px", background: "rgba(0, 240, 255, 0.08)", border: "1px solid rgba(0, 240, 255, 0.25)", borderRadius: "10px", fontSize: "12px", color: "#00F0FF", fontWeight: 700 }}>
                💡 Conclusion: Gross revenue at risk ≠ revenue worth pursuing with capital.
              </div>
            </motion.div>
          )}

          {/* TAB 2: NATURAL RECOVERY RESTRAINT */}
          {activeTab === 1 && (
            <motion.div
              key="tab-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative" }}
            >
              {/* Giant Outlined Watermark Number */}
              <div style={{ position: "absolute", right: "-10px", top: "-20px", fontFamily: "var(--font-hero-display)", fontSize: "5.5rem", fontWeight: 900, WebkitTextStroke: "1.5px rgba(255, 255, 255, 0.08)", color: "transparent", userSelect: "none", lineHeight: 1, pointerEvents: "none" }}>
                02
              </div>

              <div>
                <div style={{ fontSize: "0.8125rem", color: "#00F0FF", fontWeight: 800, fontFamily: "var(--font-mono)", letterSpacing: "0.12em" }}>
                  INVARIANT 02: INTENTIONAL ABSTENTION & FEE PRESERVATION
                </div>
                <h3 style={{ fontFamily: "var(--font-section-heading)", fontSize: "1.4rem", fontWeight: 700, color: "#FFF", marginTop: "4px" }}>
                  Saving merchant capital by knowing when NOT to act
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#8E9BB0", lineHeight: 1.6, marginTop: "6px" }}>
                  When banking or UPI networks experience transient 2-minute sync timeouts, 89% of transactions settle naturally within 2 hours. ReviveOS calculates <code style={{ color: "#00F0FF", fontFamily: "var(--font-mono)" }}>P(Natural Settle) = 89%</code> and abstains from sending premature notifications.
                </p>
              </div>

              <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, fontFamily: "var(--font-mono)" }}>LIVE SCENARIO:</span>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#FFF" }}>HDFC UPI Timeout (₹18,500 Payment)</div>
                  </div>
                  <button
                    onClick={runNaturalSettleSim}
                    disabled={isSimulating}
                    style={{
                      padding: "8px 16px",
                      background: "rgba(0, 240, 255, 0.15)",
                      border: "1px solid rgba(0, 240, 255, 0.4)",
                      color: "#00F0FF",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <RefreshCw size={12} className={isSimulating ? "spin" : ""} />
                    {isSimulating ? "Simulating Window..." : "Simulate T+2hr Abstention"}
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", textAlign: "center" }}>
                  <div style={{ background: "#0F1117", padding: "14px", borderRadius: "10px", border: "1px solid #1E2230" }}>
                    <span style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>SIGNAL AT T+0</span>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#FF3B30", marginTop: "4px", fontFamily: "var(--font-mono)" }}>GATEWAY TIMEOUT</div>
                    <span style={{ fontSize: "10px", color: "#00F0FF", fontFamily: "var(--font-mono)" }}>P(Natural) = 89%</span>
                  </div>

                  <div style={{ background: "#0F1117", padding: "14px", borderRadius: "10px", border: "1px solid #1E2230" }}>
                    <span style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>DECISION (T+10m)</span>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#F59E0B", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
                      {simStep >= 1 ? "ABSTAIN ACTIVE" : "EVALUATING..."}
                    </div>
                    <span style={{ fontSize: "10px", color: "#8E9BB0" }}>0 SMS / WhatsApp Sent</span>
                  </div>

                  <div style={{ background: "#0F1117", padding: "14px", borderRadius: "10px", border: "1px solid #1E2230" }}>
                    <span style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>OUTCOME AT T+2h</span>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: simStep >= 2 ? "#00FF66" : "#64748B", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
                      {simStep >= 2 ? "NATURAL SETTLE" : "AWAITING WEBHOOK"}
                    </div>
                    <span style={{ fontSize: "10px", color: simStep >= 2 ? "#00FF66" : "#64748B", fontFamily: "var(--font-mono)" }}>
                      {simStep >= 2 ? "₹0 Spent • 0 Fatigue" : "--"}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: MULTI-AGENT ARBITRATION */}
          {activeTab === 2 && (
            <motion.div
              key="tab-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative" }}
            >
              {/* Giant Outlined Watermark Number */}
              <div style={{ position: "absolute", right: "-10px", top: "-20px", fontFamily: "var(--font-hero-display)", fontSize: "5.5rem", fontWeight: 900, WebkitTextStroke: "1.5px rgba(255, 255, 255, 0.08)", color: "transparent", userSelect: "none", lineHeight: 1, pointerEvents: "none" }}>
                03
              </div>

              <div>
                <div style={{ fontSize: "0.8125rem", color: "#00F0FF", fontWeight: 800, fontFamily: "var(--font-mono)", letterSpacing: "0.12em" }}>
                  INVARIANT 03: ONE CUSTOMER → ONE DECISION
                </div>
                <h3 style={{ fontFamily: "var(--font-section-heading)", fontSize: "1.4rem", fontWeight: 700, color: "#FFF", marginTop: "4px" }}>
                  Autonomous Combinatorial Knapsack Auction
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#8E9BB0", lineHeight: 1.6, marginTop: "6px" }}>
                  When 3 independent agents propose recovery actions for customer <code style={{ color: "#00F0FF", fontFamily: "var(--font-mono)" }}>Aarav Mehta</code>, ReviveOS conducts a single-winner auction to prevent discount cannibalization and spam.
                </p>
              </div>

              <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { agent: "Subscription Agent", action: "Smart Retry Autopay", lift: "+78pp", cost: "₹2 fees", margin: "₹0 loss", nic: "+₹1,947", status: "AUTHORIZED", win: true },
                  { agent: "Abandoned Cart Agent", action: "WhatsApp Payment Link", lift: "+30pp", cost: "₹5 fees", margin: "₹0 loss", nic: "+₹1,494", status: "SUPPRESSED (LOWER NIC)", win: false },
                  { agent: "Retention / Churn Agent", action: "15% Coupon Code", lift: "+45pp", cost: "₹5 fees", margin: "₹750 margin loss", nic: "+₹1,494 - ₹750", status: "SUPPRESSED (MARGIN LEAKAGE)", win: false },
                ].map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      background: row.win ? "rgba(0, 255, 102, 0.1)" : "#0F1117",
                      border: row.win ? "1.5px solid #00FF66" : "1px solid #1E2230",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 800, color: row.win ? "#00FF66" : "#FFF" }}>{row.agent}</div>
                      <div style={{ fontSize: "11px", color: "#8E9BB0" }}>{row.action} • Lift: {row.lift}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "11px", fontWeight: 800, color: row.win ? "#00FF66" : "#FF3B30", fontFamily: "var(--font-mono)" }}>
                        {row.status}
                      </div>
                      <div style={{ fontSize: "10px", color: "#00F0FF", fontFamily: "var(--font-mono)" }}>NIC: {row.nic}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 4: RESURRECTION PREVENTION */}
          {activeTab === 3 && (
            <motion.div
              key="tab-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative" }}
            >
              {/* Giant Outlined Watermark Number */}
              <div style={{ position: "absolute", right: "-10px", top: "-20px", fontFamily: "var(--font-hero-display)", fontSize: "5.5rem", fontWeight: 900, WebkitTextStroke: "1.5px rgba(255, 255, 255, 0.08)", color: "transparent", userSelect: "none", lineHeight: 1, pointerEvents: "none" }}>
                04
              </div>

              <div>
                <div style={{ fontSize: "0.8125rem", color: "#00F0FF", fontWeight: 800, fontFamily: "var(--font-mono)", letterSpacing: "0.12em" }}>
                  INVARIANT 04: DEAD TRANSACTIONS STAY DEAD
                </div>
                <h3 style={{ fontFamily: "var(--font-section-heading)", fontSize: "1.4rem", fontWeight: 700, color: "#FFF", marginTop: "4px" }}>
                  14-Point Financial Eligibility & Resurrection Denial
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#8E9BB0", lineHeight: 1.6, marginTop: "6px" }}>
                  If a user cancelled an order 3 days ago, an automated retry bot attempting to debit their card violates RBI regulations and creates severe chargeback liability. ReviveOS blocks illegal resurrection.
                </p>
              </div>

              <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, fontFamily: "var(--font-mono)" }}>INCOMING ATTEMPT:</span>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#FFF" }}>Retry on Order #ORD-9912 (State: CANCELLED)</div>
                  </div>
                  <button
                    onClick={runResurrectionCheck}
                    disabled={resurrectState !== "IDLE"}
                    style={{
                      padding: "8px 16px",
                      background: "rgba(255, 59, 48, 0.15)",
                      border: "1px solid rgba(255, 59, 48, 0.4)",
                      color: "#FF3B30",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {resurrectState === "IDLE" ? "Run Eligibility Firewall Check" : "Enforcing Rule #7..."}
                  </button>
                </div>

                <div style={{ padding: "16px", background: "#0F1117", borderRadius: "10px", border: resurrectState === "BLOCKED" ? "1.5px solid #FF3B30" : "1px solid #1E2230" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#8E9BB0" }}>POLICY FIREWALL EVALUATION:</span>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: resurrectState === "BLOCKED" ? "#FF3B30" : "#64748B", fontFamily: "var(--font-mono)" }}>
                      {resurrectState === "BLOCKED" ? "HARD_DENY (RULE_ELIGIBILITY_07_EXPIRED)" : "PENDING TRIGGER"}
                    </span>
                  </div>
                  {resurrectState === "BLOCKED" && (
                    <div style={{ marginTop: "10px", fontSize: "11px", color: "#FF8A80", lineHeight: 1.5 }}>
                      🛑 Execution blocked before reaching Razorpay rail: Order marked CANCELLED in merchant upstream database. Zero unauthorized debit risk.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: TOCTOU TIMELINE */}
          {activeTab === 4 && (
            <motion.div
              key="tab-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative" }}
            >
              {/* Giant Outlined Watermark Number */}
              <div style={{ position: "absolute", right: "-10px", top: "-20px", fontFamily: "var(--font-hero-display)", fontSize: "5.5rem", fontWeight: 900, WebkitTextStroke: "1.5px rgba(255, 255, 255, 0.08)", color: "transparent", userSelect: "none", lineHeight: 1, pointerEvents: "none" }}>
                05
              </div>

              <div>
                <div style={{ fontSize: "0.8125rem", color: "#00F0FF", fontWeight: 800, fontFamily: "var(--font-mono)", letterSpacing: "0.12em" }}>
                  INVARIANT 05: DECISION ≠ EXECUTION (TOCTOU PROTECTION)
                </div>
                <h3 style={{ fontFamily: "var(--font-section-heading)", fontSize: "1.4rem", fontWeight: 700, color: "#FFF", marginTop: "4px" }}>
                  Live Pre-Execution Verification Stops Double-Debits
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#8E9BB0", lineHeight: 1.6, marginTop: "6px" }}>
                  The world changes between decision and execution. If a customer independently opens their banking app and pays, ReviveOS performs an atomic live provider check right before dispatching the recovery action.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                {[
                  { t: "T0", title: "Failure Ingested", desc: "Signed HMAC Action Contract created for payment retry.", state: "CONTRACT_SIGNED", color: "#8E9BB0" },
                  { t: "T1", title: "Customer Pays", desc: "Customer completes payment independently on UPI.", state: "LIVE_CAPTURED", color: "#00F0FF" },
                  { t: "T2", title: "Worker Prepares", desc: "Background queue prepares to fire payment link.", state: "PREFLIGHT", color: "#F59E0B" },
                  { t: "T3", title: "Live Pre-Check", desc: "ReviveOS checks live Razorpay API. Captured found.", state: "EXECUTION_ABORTED", color: "#00FF66" },
                ].map((s, idx) => (
                  <div key={idx} style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "1.1rem", fontWeight: 900, color: s.color, fontFamily: "var(--font-mono)" }}>{s.t}</span>
                      <span style={{ fontSize: "8px", fontWeight: 800, padding: "1px 5px", borderRadius: "3px", background: `${s.color}20`, color: s.color, fontFamily: "var(--font-mono)" }}>
                        {s.state}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#FFF" }}>{s.title}</div>
                    <p style={{ fontSize: "10px", color: "#8E9BB0", margin: 0, lineHeight: 1.4 }}>{s.desc}</p>
                  </div>
                ))}
              </div>

              <div style={{ padding: "10px 16px", background: "rgba(0, 255, 102, 0.08)", border: "1px solid rgba(0, 255, 102, 0.3)", borderRadius: "10px", fontSize: "12px", color: "#00FF66", fontWeight: 700 }}>
                🛡️ Result: Action contract invalidated immediately. The duplicate retry never reached the payment rail.
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};
