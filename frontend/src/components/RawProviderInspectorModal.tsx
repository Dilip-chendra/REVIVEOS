import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, RefreshCw, Code2, Copy, Check, Database } from "lucide-react";
import { getRazorpayRawRecords } from "../api/client";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function RawProviderInspectorModal({ isOpen, onClose }: Props) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRecords();
    }
  }, [isOpen]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await getRazorpayRawRecords(50);
      setRecords(res.records || []);
    } catch (e) {
      console.error("Failed to load raw records:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(records, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 110,
      background: "rgba(3, 7, 18, 0.85)",
      backdropFilter: "blur(16px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          width: "100%",
          maxWidth: "840px",
          maxHeight: "85vh",
          background: "#090E17",
          border: "1px solid #1E293B",
          borderRadius: "20px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "#F8FAFC",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #1E293B",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#060A14",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: "10px",
              background: "rgba(56, 189, 248, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#38BDF8",
            }}>
              <Code2 size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#FFF", letterSpacing: "-0.01em" }}>
                Raw Provider Data Inspector
              </h2>
              <p style={{ fontSize: "0.75rem", color: "#94A3B8" }}>
                Safely redacted telemetry directly from the active Razorpay client • Zero credentials exposed
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={loadRecords}
              disabled={loading}
              style={{
                background: "#1E293B",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "6px 12px",
                color: "#CBD5E1",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleCopy}
              disabled={records.length === 0}
              style={{
                background: "#1E293B",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "6px 12px",
                color: "#CBD5E1",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
              <span>{copied ? "Copied" : "Copy JSON"}</span>
            </button>

            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "240px", gap: 12 }}>
              <RefreshCw size={24} className="animate-spin" color="#38BDF8" />
              <div style={{ fontSize: "0.8125rem", color: "#94A3B8" }}>Querying Razorpay payments API...</div>
            </div>
          ) : records.length === 0 ? (
            <div style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px dashed #334155",
              borderRadius: "14px",
              padding: "48px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}>
              <Database size={32} color="#64748B" />
              <div style={{ fontWeight: 700, color: "#F1F5F9", fontSize: "0.9375rem" }}>
                No Raw Payments Found on Connected Account
              </div>
              <p style={{ fontSize: "0.8125rem", color: "#94A3B8", maxWidth: 450, lineHeight: 1.5 }}>
                Your connected Razorpay test account currently has 0 payment records. Trigger a test checkout in Razorpay Sandbox, then click Refresh to inspect the live payload.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "#94A3B8" }}>
                <span>Showing <strong>{records.length}</strong> raw payment entities</span>
                <span className="badge badge-blue">PROVENANCE: RAZORPAY TEST API</span>
              </div>
              <pre style={{
                background: "#030712",
                border: "1px solid #1E293B",
                borderRadius: "12px",
                padding: "16px",
                color: "#38BDF8",
                fontSize: "0.75rem",
                fontFamily: "monospace",
                overflowX: "auto",
                lineHeight: 1.5,
              }}>
                {JSON.stringify(records, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
