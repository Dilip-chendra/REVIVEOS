import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Shield, RefreshCw, Copy, Check, Zap
} from "lucide-react";
import LiveRazorpayLinkModal from "../components/LiveRazorpayLinkModal";
import { simulateAgentCollisionLive } from "../api/client";


interface AgentProposalData {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  action_type: string;
  amount_inr: number;
  estimated_p_recovery: number;
  estimated_natural_recovery: number;
  tau: number;
  intervention_cost_inr: number;
  discount_cost_inr: number;
  customer_friction_penalty_inr: number;
  nic_inr: number;
  color: string;
  rationale: string;
}

interface ScenarioData {
  id: string;
  name: string;
  customer: string;
  amount: string;
  description: string;
  proposals: AgentProposalData[];
  winnerIndex: number;
  isDoNothing?: boolean;
  isOptOut?: boolean;
}

export const CollisionLab: React.FC = () => {
  const [activeScenarioIdx, setActiveScenarioIdx] = useState<number>(0);
  const [isArbitrating, setIsArbitrating] = useState<boolean>(false);
  const [arbitrationDone, setArbitrationDone] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [showLiveModal, setShowLiveModal] = useState<boolean>(false);

  const scenarios: ScenarioData[] = [
    {
      id: "scen_3way",
      name: "Scenario A: 3-Way Swarm Collision",
      customer: "Aarav Mehta (CUST-9821)",
      amount: "₹4,999",
      description: "Subscription Agent (Mandate), Cart Agent (WhatsApp Link), and Retention Agent (15% Coupon) all target customer within 5 minutes.",
      winnerIndex: 0,
      proposals: [
        {
          agent_id: "sub_agent",
          agent_name: "AI Subscription Agent",
          agent_type: "MANDATE_RETRY",
          action_type: "SCHEDULE_MANDATE_RETRY",
          amount_inr: 2499,
          estimated_p_recovery: 0.88,
          estimated_natural_recovery: 0.10,
          tau: 0.78,
          intervention_cost_inr: 4.0,
          discount_cost_inr: 0.0,
          customer_friction_penalty_inr: 1.0,
          nic_inr: 1944.22,
          color: "#00FF66",
          rationale: "Active recurring mandate token on file. Zero-friction S2S debit.",
        },
        {
          agent_id: "cart_agent",
          agent_name: "AI Cart Recovery Agent",
          agent_type: "PAYMENT_LINK",
          action_type: "SEND_PAYMENT_LINK",
          amount_inr: 4999,
          estimated_p_recovery: 0.45,
          estimated_natural_recovery: 0.15,
          tau: 0.30,
          intervention_cost_inr: 2.50,
          discount_cost_inr: 0.0,
          customer_friction_penalty_inr: 4.0,
          nic_inr: 1493.20,
          color: "#00F0FF",
          rationale: "Checkout dropped at OTP step. Proposes WhatsApp payment link.",
        },
        {
          agent_id: "retention_agent",
          agent_name: "AI Retention Agent",
          agent_type: "DISCOUNT_OFFER",
          action_type: "OFFER_10PCT_DISCOUNT",
          amount_inr: 4999,
          estimated_p_recovery: 0.60,
          estimated_natural_recovery: 0.15,
          tau: 0.45,
          intervention_cost_inr: 3.0,
          discount_cost_inr: 500.0,
          customer_friction_penalty_inr: 3.0,
          nic_inr: 1743.55,
          color: "#F59E0B",
          rationale: "Offers 10% coupon to avoid churn (destroys ₹500 margin).",
        },
      ],
    },
    {
      id: "scen_4way",
      name: "Scenario B: 4-Way Autonomous Collision",
      customer: "Kavita Nair (CUST-4821)",
      amount: "₹8,500",
      description: "4 specialized agents submit competing recovery proposals. ReviveOS locks single winner and suppresses 3 others.",
      winnerIndex: 0,
      proposals: [
        {
          agent_id: "sub_agent",
          agent_name: "AI Subscription Agent",
          agent_type: "MANDATE_RETRY",
          action_type: "SCHEDULE_MANDATE_RETRY",
          amount_inr: 5000,
          estimated_p_recovery: 0.85,
          estimated_natural_recovery: 0.08,
          tau: 0.77,
          intervention_cost_inr: 4.0,
          discount_cost_inr: 0.0,
          customer_friction_penalty_inr: 0.0,
          nic_inr: 3846.0,
          color: "#00FF66",
          rationale: "Autopay retry window at HDFC bank opening.",
        },
        {
          agent_id: "cart_agent",
          agent_name: "AI Cart Agent",
          agent_type: "PAYMENT_LINK",
          action_type: "SEND_PAYMENT_LINK",
          amount_inr: 8500,
          estimated_p_recovery: 0.42,
          estimated_natural_recovery: 0.14,
          tau: 0.28,
          intervention_cost_inr: 5.50,
          discount_cost_inr: 0.0,
          customer_friction_penalty_inr: 3.0,
          nic_inr: 2374.50,
          color: "#00F0FF",
          rationale: "WhatsApp dynamic link with pre-selected UPI intent.",
        },
        {
          agent_id: "retention_agent",
          agent_name: "AI Retention Agent",
          agent_type: "DISCOUNT_OFFER",
          action_type: "OFFER_10PCT_DISCOUNT",
          amount_inr: 5000,
          estimated_p_recovery: 0.62,
          estimated_natural_recovery: 0.17,
          tau: 0.45,
          intervention_cost_inr: 4.0,
          discount_cost_inr: 750.0,
          customer_friction_penalty_inr: 4.0,
          nic_inr: 1492.0,
          color: "#F59E0B",
          rationale: "15% discount coupon offered to avoid churn.",
        },
        {
          agent_id: "collections_agent",
          agent_name: "AI Collections Agent",
          agent_type: "HUMAN_ESCALATION",
          action_type: "SEND_INVOICE_REMINDER",
          amount_inr: 5000,
          estimated_p_recovery: 0.35,
          estimated_natural_recovery: 0.15,
          tau: 0.20,
          intervention_cost_inr: 50.0,
          discount_cost_inr: 0.0,
          customer_friction_penalty_inr: 15.0,
          nic_inr: 935.0,
          color: "#A5B4FC",
          rationale: "Escalate to phone agent support queue.",
        },
      ],
    },
    {
      id: "scen_donothing",
      name: "Scenario C: DO NOTHING is Optimal",
      customer: "Vikram Seth (CUST-1044)",
      amount: "₹18,500",
      description: "Transient UPI socket timeout where P(Natural Recovery) is 89%. ReviveOS deliberately abstains to save fees.",
      winnerIndex: -1,
      isDoNothing: true,
      proposals: [
        {
          agent_id: "cart_agent",
          agent_name: "AI Cart Agent",
          agent_type: "PAYMENT_LINK",
          action_type: "SEND_PAYMENT_LINK",
          amount_inr: 18500,
          estimated_p_recovery: 0.91,
          estimated_natural_recovery: 0.89,
          tau: 0.02,
          intervention_cost_inr: 5.0,
          discount_cost_inr: 0.0,
          customer_friction_penalty_inr: 8.0,
          nic_inr: 357.0,
          color: "#00F0FF",
          rationale: "Send SMS payment link immediately after bank timeout.",
        },
      ],
    },
    {
      id: "scen_optout",
      name: "Scenario D: Customer Sovereignty (DND)",
      customer: "Priya Sharma (CUST-OPTOUT-99)",
      amount: "₹3,499",
      description: "Customer requested DND. ReviveOS enforces Article 6 (Customer Sovereignty) and blocks all outbound communication.",
      winnerIndex: -1,
      isOptOut: true,
      proposals: [
        {
          agent_id: "sub_agent",
          agent_name: "AI Subscription Agent",
          agent_type: "MANDATE_RETRY",
          action_type: "SCHEDULE_MANDATE_RETRY",
          amount_inr: 3499,
          estimated_p_recovery: 0.75,
          estimated_natural_recovery: 0.10,
          tau: 0.65,
          intervention_cost_inr: 4.0,
          discount_cost_inr: 0.0,
          customer_friction_penalty_inr: 0.0,
          nic_inr: 2270.35,
          color: "#00FF66",
          rationale: "Scheduled mandate retry attempt.",
        },
      ],
    },
  ];

  const currentScen = scenarios[activeScenarioIdx];
  const [liveArbitrationData, setLiveArbitrationData] = useState<any>(null);

  const runArbitration = async () => {
    setIsArbitrating(true);
    setArbitrationDone(false);
    try {
      const liveRes = await simulateAgentCollisionLive();
      setLiveArbitrationData(liveRes);
    } catch (e) {
      console.warn("Live arbitration API fallback to scenario:", e);
    } finally {
      setIsArbitrating(false);
      setArbitrationDone(true);
    }
  };

  const copyReceiptHash = () => {
    const hash = liveArbitrationData?.winning_decision?.decision_receipt_hash || "8f2a1c4e9b7d3f6a2e5c8b1d4f7a0e3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1";
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };


  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#00F0FF", letterSpacing: "0.15em" }}>
              AGENT COLLISION LAB
            </span>
            <span style={{ fontSize: "9px", padding: "2px 8px", borderRadius: "4px", background: "rgba(245,158,11,0.18)", color: "#F59E0B", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
              [SIMULATION]
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--font-section-heading)", fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 800, color: "#FFF", margin: 0 }}>
            When Every Agent Acts, Who Decides?
          </h1>
          <p style={{ fontSize: "14px", color: "#8E9BB0", maxWidth: "780px", margin: "6px 0 0 0", lineHeight: 1.6 }}>
            Submit competing recovery proposals from multiple autonomous agents. ReviveOS conducts a Knapsack Auction to select the single highest-NIC action and issues cryptographic suppression contracts to all others.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowLiveModal(true)}
            style={{
              padding: "12px 18px",
              borderRadius: "10px",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              color: "#10B981",
              fontFamily: "var(--font-section-heading)",
              fontSize: "12px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Zap size={15} color="#10B981" />
            <span>TEST REAL RAZORPAY LINK</span>
          </button>

          <button
            onClick={runArbitration}
            disabled={isArbitrating}
            style={{
              padding: "12px 24px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #00F0FF 0%, #0099FF 100%)",
              color: "#040711",
              fontFamily: "var(--font-section-heading)",
              fontSize: "13px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 6px 20px rgba(0, 240, 255, 0.3)",
            }}
          >
            {isArbitrating ? <RefreshCw size={15} className="spin" /> : <Play size={15} />}
            <span>{isArbitrating ? "ARBITRATING..." : "RUN ARBITRATION KERNEL"}</span>
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
        {scenarios.map((scen, idx) => {
          const isActive = activeScenarioIdx === idx;
          return (
            <button
              key={scen.id}
              onClick={() => {
                setActiveScenarioIdx(idx);
                setArbitrationDone(false);
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
              <div style={{ fontFamily: "var(--font-section-heading)", fontSize: "12px", fontWeight: 700, color: isActive ? "#FFF" : "#94A3B8" }}>
                {scen.name}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: isActive ? "#00F0FF" : "#64748B" }}>
                Target: {scen.customer}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "16px", padding: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#94A3B8", letterSpacing: "0.1em" }}>
              INGESTED PROPOSALS ({currentScen.proposals.length} AGENTS)
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#64748B" }}>
              Target Amount: {currentScen.amount}
            </span>
          </div>

          <p style={{ fontSize: "12px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>
            {currentScen.description}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {currentScen.proposals.map((prop, pIdx) => (
              <div
                key={pIdx}
                style={{
                  background: "#0F1117",
                  border: `1px solid ${prop.color}40`,
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: prop.color }} />
                    <span style={{ fontFamily: "var(--font-section-heading)", fontSize: "13px", fontWeight: 700, color: "#FFF" }}>
                      {prop.agent_name}
                    </span>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: `${prop.color}20`, color: prop.color, fontWeight: 700 }}>
                    {prop.action_type}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", background: "#08090C", padding: "10px", borderRadius: "8px" }}>
                  <div>
                    <div style={{ fontSize: "9px", color: "#64748B" }}>Causal Lift (τ)</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 800, color: "#FFF" }}>
                      +{Math.round(prop.tau * 100)}pp
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "#64748B" }}>Cost + Margin Loss</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 800, color: prop.discount_cost_inr > 0 ? "#FF3B30" : "#FFF" }}>
                      ₹{(prop.intervention_cost_inr + prop.discount_cost_inr).toFixed(0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "#64748B" }}>NIC Net Yield</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 800, color: prop.nic_inr > 0 ? "#00FF66" : "#FF3B30" }}>
                      ₹{prop.nic_inr.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "11px", color: "#8E9BB0", fontStyle: "italic" }}>
                  "{prop.rationale}"
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "16px", padding: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#00F0FF", letterSpacing: "0.1em" }}>
              ARBITRATION KERNEL VERDICT
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: arbitrationDone ? "#00FF66" : "#64748B" }}>
              {arbitrationDone ? "● ARBITRATION RESOLVED" : "AWAITING EXECUTION"}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {!arbitrationDone && (
              <div style={{ minHeight: "360px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px", color: "#64748B", textAlign: "center", padding: "40px" }}>
                <Shield size={42} color="#1E2230" />
                <div style={{ fontSize: "13px" }}>Click <strong>"RUN ARBITRATION KERNEL"</strong> to evaluate competing bids under customer attention constraints and Knapsack yield optimization.</div>
              </div>
            )}

            {arbitrationDone && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}
              >
                {currentScen.isDoNothing && (
                  <div style={{ background: "#0F1117", border: "1.5px solid #64748B", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#64748B" }}>DECISION: INTENTIONAL ABSTENTION</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "rgba(100,116,139,0.2)", color: "#94A3B8" }}>INVARIANT #02</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-hero-display)", fontSize: "2rem", fontWeight: 800, color: "#FFF" }}>
                      DO NOTHING
                    </div>
                    <p style={{ fontSize: "12px", color: "#8E9BB0", lineHeight: 1.5, margin: 0 }}>
                      P(Natural Settle) is <strong>89%</strong>. 9 out of 10 customers complete payment independently within 2 hours. Sending WhatsApp/SMS spam creates customer friction and burns gateway quota for a marginal 2pp lift.
                    </p>
                  </div>
                )}

                {currentScen.isOptOut && (
                  <div style={{ background: "#0F1117", border: "1.5px solid #FF3B30", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#FF3B30" }}>DECISION: HARD SUPPRESSION</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "rgba(255,59,48,0.2)", color: "#FF3B30" }}>ARTICLE 6</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-hero-display)", fontSize: "1.6rem", fontWeight: 800, color: "#FFF" }}>
                      CUSTOMER SOVEREIGNTY ENFORCED
                    </div>
                    <p style={{ fontSize: "12px", color: "#FF8A80", lineHeight: 1.5, margin: 0 }}>
                      Customer explicitly opted out of recovery communications. All autonomous agent actions suppressed before reaching execution rails. Zero unauthorized contact.
                    </p>
                  </div>
                )}

                {!currentScen.isDoNothing && !currentScen.isOptOut && (
                  <>
                    <div style={{ background: "#0F1117", border: "1.5px solid #00FF66", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "0 0 30px rgba(0,255,102,0.12)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 800, color: "#00FF66" }}>🏆 AUTHORIZED ACTION (WINNER)</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#00FF66", fontWeight: 700 }}>ONE CUSTOMER → ONE DECISION</span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div>
                          <div style={{ fontFamily: "var(--font-section-heading)", fontSize: "16px", fontWeight: 800, color: "#FFF" }}>
                            {currentScen.proposals[0].agent_name}
                          </div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#8E9BB0", marginTop: "2px" }}>
                            Action: {currentScen.proposals[0].action_type}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "10px", color: "#64748B" }}>Net Yield (NIC)</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 900, color: "#00FF66" }}>
                            +₹{currentScen.proposals[0].nic_inr.toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 800, color: "#64748B" }}>
                        SUPPRESSION CONTRACTS ISSUED ({currentScen.proposals.length - 1} AGENTS)
                      </span>
                      {currentScen.proposals.slice(1).map((sup, sIdx) => (
                        <div
                          key={sIdx}
                          style={{
                            background: "#08090C",
                            border: "1px solid #1E2230",
                            borderRadius: "10px",
                            padding: "12px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "12px", fontWeight: 700, color: "#FFF" }}>{sup.agent_name}</div>
                            <div style={{ fontSize: "10px", color: "#64748B" }}>Reason: Lower Net Contribution (NIC) • Customer fatigue cap (1/24h)</div>
                          </div>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,59,48,0.15)", color: "#FF3B30", fontWeight: 800 }}>
                            SUPPRESSED
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div style={{ background: "#08090C", border: "1px solid #1E2230", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#00F0FF", fontWeight: 700 }}>
                      HMAC SHA-256 DECISION RECEIPT
                    </span>
                    <button
                      onClick={copyReceiptHash}
                      style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontFamily: "var(--font-mono)" }}
                    >
                      {copiedHash ? <Check size={12} color="#00FF66" /> : <Copy size={12} />}
                      {copiedHash ? "Copied" : "Copy Hash"}
                    </button>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#64748B", wordBreak: "break-all" }}>
                    8f2a1c4e9b7d3f6a2e5c8b1d4f7a0e3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <LiveRazorpayLinkModal isOpen={showLiveModal} onClose={() => setShowLiveModal(false)} defaultAmount={2499} />
    </div>
  );
};
