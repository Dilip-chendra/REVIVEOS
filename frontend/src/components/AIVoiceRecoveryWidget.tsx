import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  PhoneCall, PhoneOff, Mic, Volume2, RefreshCw
} from "lucide-react";

interface VoiceWidgetProps {
  customerName?: string;
  merchantName?: string;
  amountInr?: number;
  invoiceNumber?: string;
  failureReason?: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

export default function AIVoiceRecoveryWidget({
  customerName = "Priya Patel",
  merchantName = "CloudCRM Technologies",
  amountInr = 150000,
  invoiceNumber = "INV-8412",
}: VoiceWidgetProps) {
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "connected" | "completed">("idle");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeSpeechIdx, setActiveSpeechIdx] = useState(0);

  const dialogue = [
    {
      speaker: "AI Concierge",
      text: `Hello ${customerName}, this is Revive Concierge calling on behalf of ${merchantName}.`,
      role: "agent"
    },
    {
      speaker: "AI Concierge",
      text: `We noticed that the scheduled renewal of ${fmt(amountInr)} for invoice ${invoiceNumber} encountered a temporary banking limit over the weekend.`,
      role: "agent"
    },
    {
      speaker: "Customer (Priya)",
      text: `Oh! Yes, our corporate card restricts batch billing on Sundays. Can I settle it right now over UPI or card link?`,
      role: "customer"
    },
    {
      speaker: "AI Concierge",
      text: `Certainly! I have just dispatched a verified 1-tap WhatsApp payment link to your registered mobile number. Your subscription remains completely active.`,
      role: "agent"
    },
    {
      speaker: "Customer (Priya)",
      text: `Just got the WhatsApp link and approved via GPay. Thank you so much!`,
      role: "customer"
    },
    {
      speaker: "AI Concierge",
      text: `Payment confirmed! Receipt ${invoiceNumber}-REC has been emailed. Have a wonderful week ahead!`,
      role: "agent"
    }
  ];

  const handleStartCall = () => {
    setCallStatus("calling");
    setActiveSpeechIdx(0);
    setTimeout(() => {
      setCallStatus("connected");
      setIsPlayingAudio(true);
    }, 1200);
  };

  const handleEndCall = () => {
    setCallStatus("completed");
    setIsPlayingAudio(false);
  };

  useEffect(() => {
    let timer: any;
    if (callStatus === "connected" && isPlayingAudio) {
      if (activeSpeechIdx < dialogue.length - 1) {
        timer = setTimeout(() => {
          setActiveSpeechIdx((prev) => prev + 1);
        }, 2600);
      } else {
        timer = setTimeout(() => {
          setCallStatus("completed");
          setIsPlayingAudio(false);
        }, 2000);
      }
    }
    return () => clearTimeout(timer);
  }, [callStatus, isPlayingAudio, activeSpeechIdx]);

  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "14px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Mic size={18} color="var(--accent)" />
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              AI Voice Concierge Recovery Agent
            </h3>
            <span className="badge badge-purple" style={{ fontSize: "0.5625rem" }}>
              VIP B2B SaaS
            </span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Conversational soft-touch phone recovery for high-value enterprise subscriptions
          </div>
        </div>

        {callStatus !== "idle" && (
          <button
            onClick={() => { setCallStatus("idle"); setActiveSpeechIdx(0); }}
            className="btn btn-ghost btn-sm btn-icon"
            title="Reset Call"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* Main Call Interface */}
      <div style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Call Status & Waveform Indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: callStatus === "connected" ? "rgba(34, 197, 94, 0.15)" : callStatus === "calling" ? "rgba(59, 130, 246, 0.15)" : "var(--bg-overlay)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {callStatus === "connected" ? (
                <Volume2 size={20} color="var(--success-text)" />
              ) : (
                <PhoneCall size={20} color={callStatus === "calling" ? "var(--accent)" : "var(--text-tertiary)"} />
              )}
            </div>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {customerName} · {merchantName}
              </div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                Target: {fmt(amountInr)} · {invoiceNumber}
              </div>
            </div>
          </div>

          {/* Call State Badge */}
          <div>
            {callStatus === "idle" && (
              <button
                onClick={handleStartCall}
                className="btn btn-primary btn-sm"
                style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <PhoneCall size={13} /> Simulate Voice Agent Call
              </button>
            )}
            {callStatus === "calling" && (
              <span className="badge badge-blue" style={{ fontSize: "0.6875rem" }}>
                Dialing VIP Contact (+91 98401...)...
              </span>
            )}
            {callStatus === "connected" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="badge badge-green" style={{ fontSize: "0.6875rem" }}>
                  <div className="status-dot live" style={{ width: "6px", height: "6px" }} /> Connected · 00:34
                </span>
                <button onClick={handleEndCall} className="btn btn-secondary btn-sm" style={{ fontSize: "0.6875rem", color: "var(--error-text)" }}>
                  <PhoneOff size={12} /> End
                </button>
              </div>
            )}
            {callStatus === "completed" && (
              <span className="badge badge-green" style={{ fontSize: "0.6875rem" }}>
                ✓ Call Succeeded · ₹1,50,000 Recovered
              </span>
            )}
          </div>
        </div>

        {/* Audio Waveform Bars Simulation */}
        {callStatus === "connected" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", height: "36px", padding: "4px 0" }}>
            {[18, 32, 24, 12, 28, 36, 20, 14, 30, 26, 16, 34, 22, 10, 25, 30].map((h, i) => (
              <motion.div
                key={i}
                style={{ width: "4px", borderRadius: "2px", background: "var(--accent)" }}
                animate={{ height: [8, h, 8] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.05 }}
              />
            ))}
          </div>
        )}

        {/* Real-time Dialogue Transcript Box */}
        <div
          style={{
            background: "var(--bg-elevated)",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            padding: "14px",
            minHeight: "180px",
            maxHeight: "220px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}
        >
          {callStatus === "idle" ? (
            <div style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.75rem", padding: "40px 0" }}>
              Click <strong>"Simulate Voice Agent Call"</strong> to hear the real-time conversational recovery interaction between ReviveOS Concierge and the client.
            </div>
          ) : (
            dialogue.slice(0, activeSpeechIdx + 1).map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignSelf: msg.role === "agent" ? "flex-start" : "flex-end",
                  maxWidth: "85%",
                  background: msg.role === "agent" ? "rgba(59,130,246,0.08)" : "rgba(37,211,102,0.08)",
                  border: `1px solid ${msg.role === "agent" ? "rgba(59,130,246,0.25)" : "rgba(37,211,102,0.25)"}`,
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "0.75rem"
                }}
              >
                <div style={{ fontSize: "0.625rem", fontWeight: 700, color: msg.role === "agent" ? "var(--accent)" : "#25D366", marginBottom: "2px" }}>
                  {msg.speaker}
                </div>
                <div style={{ color: "var(--text-primary)", lineHeight: 1.45 }}>
                  {msg.text}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
