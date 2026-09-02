import React, { useState } from "react";
import { Check, Copy, Download, ShieldCheck, Terminal } from "lucide-react";

export const DecisionReceiptView: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);

  const sampleReceipt = {
    decision_id: "RV-8F92A1-K89",
    timestamp: "2026-08-31T10:00:02.040Z",
    target_customer: {
      customer_id: "CUST-9821",
      name: "Aarav Mehta",
      attention_budget_used: "1 of 1 / 24h",
    },
    recovery_opportunity: {
      order_id: "ord_K9912092",
      amount_inr: 2499.0,
      amount_minor_paise: 249900,
      opportunity_type: "SUBSCRIPTION_MANDATE_FAILURE",
      gateway: "razorpay",
    },
    arbitration_verdict: {
      winning_agent: "AI_SUBSCRIPTION_AGENT",
      authorized_action: "SCHEDULE_MANDATE_RETRY",
      causal_treatment_lift_tau: 0.784,
      natural_recovery_baseline: 0.102,
      intervention_cost_inr: 4.0,
      margin_leakage_inr: 0.0,
      net_incremental_contribution_inr: 1944.22,
    },
    suppressed_proposals: [
      { agent: "AI_CART_RECOVERY_AGENT", action: "SEND_WHATSAPP_LINK", nic: 1493.20, suppression_reason: "LOWER_NET_YIELD" },
      { agent: "AI_RETENTION_AGENT", action: "OFFER_10PCT_DISCOUNT", nic: 1243.55, suppression_reason: "MARGIN_CANNIBALIZATION_PREVENTED" },
    ],
    governance_verification: {
      constitution_article_01_max_retries: "PASS (1 of 3)",
      constitution_article_03_cooldown: "PASS (>2h window)",
      constitution_article_06_customer_consent: "PASS (Opted-in)",
      constitution_article_07_resurrection_denial: "PASS (Active order)",
      toctou_preflight_provider_state: "VERIFIED_FAILED_STABLE",
      idempotency_key: "idem_9f821092a01",
    },
    cryptographic_seal: {
      algorithm: "HMAC-SHA256",
      key_id: "k_rzp_live_control_sec",
      signature: "8f2a1c4e9b7d3f6a2e5c8b1d4f7a0e3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1",
    },
  };

  const receiptJsonString = JSON.stringify(sampleReceipt, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([receiptJsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ReviveOS_DecisionReceipt_${sampleReceipt.decision_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ background: "#0A0C10", border: "1px solid #1E2230", borderRadius: "20px", overflow: "hidden", width: "100%" }}>
      {/* Receipt Top Action Bar */}
      <div style={{ background: "#0F1117", borderBottom: "1px solid #1E2230", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Terminal size={16} color="#00F0FF" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800, color: "#FFF", letterSpacing: "0.08em" }}>
            DECISION RECEIPT: {sampleReceipt.decision_id}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: "rgba(0, 255, 102, 0.15)", color: "#00FF66", fontWeight: 700 }}>
            SHA-256 SEALED
          </span>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleCopy}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              background: "#0A0C10",
              border: "1px solid #1E2230",
              color: "#CBD5E1",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {copied ? <Check size={13} color="#00FF66" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy JSON"}
          </button>

          <button
            onClick={handleDownload}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(0, 240, 255, 0.15)",
              border: "1px solid rgba(0, 240, 255, 0.35)",
              color: "#00F0FF",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Download size={13} />
            Export Receipt
          </button>
        </div>
      </div>

      {/* JSON Payload Viewer */}
      <pre style={{
        margin: 0,
        padding: "24px",
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        color: "#94A3B8",
        lineHeight: 1.6,
        background: "#08090C",
        overflowX: "auto",
        maxHeight: "440px",
      }}>
        <code>{receiptJsonString}</code>
      </pre>

      {/* Footer Audit Bar */}
      <div style={{ background: "#0F1117", borderTop: "1px solid #1E2230", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", fontSize: "11px", color: "#64748B" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <ShieldCheck size={14} color="#00FF66" />
          <span>Tamper-evident audit receipt generated for every financial decision.</span>
        </span>
        <span style={{ fontFamily: "var(--font-mono)", color: "#00F0FF" }}>
          Integer Minor Units: 249,900 Paise
        </span>
      </div>
    </div>
  );
};
