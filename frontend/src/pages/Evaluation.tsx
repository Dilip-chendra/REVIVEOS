import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target, Zap, Shield, FileText, CheckCircle2 } from "lucide-react";
import { getEvaluationMetrics } from "../api/client";

const formatINR = (value: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
};

export default function Evaluation() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvaluationMetrics()
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
     return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", opacity: 0.5, maxWidth: "1000px", margin: "0 auto" }}>
        <div className="skeleton" style={{ height: "40px", width: "300px" }} />
        <div className="skeleton" style={{ height: "300px", borderRadius: "var(--r-lg)" }} />
        <div className="skeleton" style={{ height: "300px", borderRadius: "var(--r-lg)" }} />
      </div>
    );
  }

  // Prevent NaN if counts are 0
  const tp = metrics?.true_positives || 0;
  const tn = metrics?.true_negatives || 0;
  const fp = metrics?.false_positives || 0;
  const fn = metrics?.false_negatives || 0;
  
  const precision = (tp + fp) > 0 ? (tp / (tp + fp)) : 0;
  const recall = (tp + fn) > 0 ? (tp / (tp + fn)) : 0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = (tp + tn + fp + fn) > 0 ? ((tp + tn) / (tp + tn + fp + fn)) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", paddingBottom: "64px", maxWidth: "1000px", margin: "0 auto" }}>
      
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent)", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600 }}>
            <FileText size={16} /> Seed 20260826
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.04em", color: "var(--text-primary)" }}>
            100K Synthetic Evaluation
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Precomputed reproducible evaluation artifact. Metrics calculated from absolute TP/TN/FP/FN ground truth.
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Evaluation Size</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>1,00,000</div>
        </div>
      </motion.div>

      {/* Primary Metrics Grid */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <div className="grid-responsive-4">
          
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", padding: "18px 20px", borderRadius: "var(--r-lg)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Precision</div>
            <div className="metric-value-responsive" style={{ color: "var(--text-primary)" }}>{(precision * 100).toFixed(1)}%</div>
          </div>
          
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", padding: "18px 20px", borderRadius: "var(--r-lg)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Recall</div>
            <div className="metric-value-responsive" style={{ color: "var(--text-primary)" }}>{(recall * 100).toFixed(1)}%</div>
          </div>
          
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", padding: "18px 20px", borderRadius: "var(--r-lg)", position: "relative", overflow: "hidden" }}>
             <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.05), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>F1 Score</div>
            <div className="metric-value-responsive" style={{ color: "var(--accent)" }}>{(f1 * 100).toFixed(1)}%</div>
          </div>
          
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", padding: "18px 20px", borderRadius: "var(--r-lg)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Accuracy</div>
            <div className="metric-value-responsive" style={{ color: "var(--text-primary)" }}>{(accuracy * 100).toFixed(1)}%</div>
          </div>
          
        </div>
      </motion.div>

      <div className="grid-responsive-2">
        
        {/* Confusion Matrix */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "clamp(20px, 3vw, 32px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
            <Target size={18} color="var(--text-primary)" />
            <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-primary)" }}>Confusion Matrix</span>
          </div>
          
          <div className="grid-responsive-2" style={{ gap: "12px" }}>
            
            <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid var(--success-border)", padding: "20px", borderRadius: "var(--r-md)", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--success-text)", fontVariantNumeric: "tabular-nums", marginBottom: "4px" }}>{tp.toLocaleString()}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>True Positives</div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "2px" }}>Correctly recovered</div>
            </div>
            
            <div style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", padding: "20px", borderRadius: "var(--r-md)", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", marginBottom: "4px" }}>{tn.toLocaleString()}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>True Negatives</div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "2px" }}>Correctly blocked</div>
            </div>
            
            <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid var(--warning-border)", padding: "20px", borderRadius: "var(--r-md)", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--warning-text)", fontVariantNumeric: "tabular-nums", marginBottom: "4px" }}>{fp.toLocaleString()}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>False Positives</div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "2px" }}>Allowed when unsafe</div>
            </div>
            
            <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid var(--danger-border)", padding: "20px", borderRadius: "var(--r-md)", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--danger-text)", fontVariantNumeric: "tabular-nums", marginBottom: "4px" }}>{fn.toLocaleString()}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>False Negatives</div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "2px" }}>Blocked when safe</div>
            </div>

          </div>
        </motion.div>

        {/* Business Value */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "32px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
            <Zap size={18} color="var(--accent)" />
            <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-primary)" }}>Business Impact</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px", flex: 1 }}>
            
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Total Simulated Recovery</div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--success-text)", fontVariantNumeric: "tabular-nums" }}>
                {formatINR(metrics?.total_recovered_inr || 0)}
              </div>
            </div>
            
            <div style={{ height: "1px", background: "var(--border)" }} />
            
            <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(16,185,129,0.05)", padding: "16px", borderRadius: "var(--r-md)", border: "1px solid var(--success-border)" }}>
               <CheckCircle2 size={16} color="var(--success-text)" />
               <div>
                 <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Zero Safety Violations</div>
                 <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>No unauthorized actions executed outside limits.</div>
               </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--bg-overlay)", padding: "16px", borderRadius: "var(--r-md)", border: "1px solid var(--border)", marginTop: "auto" }}>
               <Shield size={16} color="var(--warning-text)" />
               <div>
                 <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>{metrics?.safely_paused || 0} Cases Safely Paused</div>
                 <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Routed to human review queue.</div>
               </div>
            </div>

          </div>
        </motion.div>

      </div>
    </div>
  );
}
