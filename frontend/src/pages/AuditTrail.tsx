import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, User, Search, Activity, FileText } from "lucide-react";
import { getAuditEvents } from "../api/client";

const formatINR = (value: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
};

export default function AuditTrail() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditEvents()
      .then((data) => {
        const arr = Array.isArray(data) ? data : ((data as any).items ?? []);
        setEvents(arr);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", paddingBottom: "64px", maxWidth: "1000px", margin: "0 auto" }}>
      
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
            System Activity Log
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Immutable cryptographic record of all automated and manual financial actions.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-elevated)", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "var(--r-md)" }}>
          <Search size={14} color="var(--text-tertiary)" />
          <input 
            type="text" 
            placeholder="Search by ID..." 
            style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "0.875rem", width: "150px" }}
          />
        </div>
      </motion.div>

      {/* Main List */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
          
          <div className="table-responsive-wrapper" style={{ overflowX: "auto" }}>
            <div style={{ minWidth: "640px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 3fr 1.5fr", padding: "12px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <div>Timestamp</div>
                <div>Actor</div>
                <div>Action Details</div>
                <div style={{ textAlign: "right" }}>Impact</div>
              </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {loading ? (
               <div style={{ padding: "64px", display: "flex", justifyContent: "center" }}><Activity className="spin" color="var(--text-tertiary)" /></div>
            ) : events.length === 0 ? (
              <div style={{ padding: "80px 24px", textAlign: "center", color: "var(--text-tertiary)" }}>
                <FileText size={32} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                <div style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: "4px" }}>No Audit Logs Found</div>
                <div style={{ fontSize: "0.875rem" }}>System has not executed any recovery actions yet.</div>
              </div>
            ) : (
              events.map((e, i) => (
                <div key={e.id || i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 3fr 1.5fr", padding: "16px 24px", alignItems: "center", borderBottom: i < events.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.2s" }} className="card-hover">
                  
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                    {new Date(e.timestamp || e.created_at || Date.now()).toLocaleString()}
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: e.actor === 'human' ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {e.actor === 'human' ? <User size={12} color="#3b82f6" /> : <Bot size={12} color="var(--success-text)" />}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)", textTransform: "capitalize" }}>{e.actor || 'ReviveOS Decision Engine'}</div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontFamily: "monospace", marginTop: "2px" }}>ID: {(e.case_id || e.id || 'N/A').split('-')[0]}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)" }}>{e.action || e.type || 'Automated Recovery'}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "2px", maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.details || e.diagnosis_summary || 'Execution logged cryptographically.'}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                     <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                       {e.amount_inr ? formatINR(e.amount_inr) : '-'}
                     </div>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  </motion.div>

</div>
  );
}
