import { motion } from "framer-motion";
import { BrainCircuit, ShieldCheck, AlertTriangle, XCircle, CheckCircle2, ArrowRight } from "lucide-react";

const EXAMPLES = [
  {
    amount: "₹14,999",
    label: "Within automatic limit",
    status: "Auto-recovered",
    statusColor: "var(--clr-recovery)",
    statusBg: "rgba(16,185,129,0.08)",
    borderColor: "rgba(16,185,129,0.2)",
    icon: CheckCircle2,
    detail: "Confidence 94% · Retry limit not reached · Cooldown satisfied",
  },
  {
    amount: "₹75,000",
    label: "Exceeds automatic limit",
    status: "Human review",
    statusColor: "var(--clr-warning)",
    statusBg: "rgba(245,158,11,0.08)",
    borderColor: "rgba(245,158,11,0.2)",
    icon: AlertTriangle,
    detail: "Amount above ₹50,000 threshold · Merchant approval required",
  },
  {
    amount: "4th retry",
    label: "Retry limit reached",
    status: "Recovery stopped",
    statusColor: "var(--clr-danger)",
    statusBg: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.2)",
    icon: XCircle,
    detail: "Max 3 retries exceeded · Customer relationship protected",
  },
];

export default function AIDiagnosisSection() {
  return (
    <section id="intelligence" className="py-28 lg:py-36" style={{ background: "var(--clr-surface)" }}>
      <div className="max-w-6xl mx-auto px-5">

        {/* Header */}
        <div className="max-w-xl mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="section-label mb-4"
          >
            Bounded AI
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: 0.08 }}
            className="font-bold tracking-tight text-white leading-[1.15] mb-5"
            style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
          >
            AI can recommend.<br />
            <span style={{ color: "var(--clr-text-secondary)" }}>Rules decide what is allowed.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: 0.14 }}
            className="text-base leading-relaxed"
            style={{ color: "var(--clr-text-secondary)" }}
          >
            ReviveOS's AI engine and safety rules are completely separate layers. The AI can only recommend — your merchant-defined rules have the final say over every action.
          </motion.p>
        </div>

        {/* Pipeline visual */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="flex flex-wrap items-center gap-2 mb-14"
        >
          {[
            { label: "AI Diagnosis", icon: BrainCircuit, color: "var(--clr-accent)" },
            null,
            { label: "Recommendation", icon: ArrowRight, color: "var(--clr-text-secondary)" },
            null,
            { label: "Safety Rules", icon: ShieldCheck, color: "var(--clr-warning)" },
            null,
            { label: "Allowed / Blocked", icon: CheckCircle2, color: "var(--clr-recovery)" },
            null,
            { label: "Execution", icon: ArrowRight, color: "var(--clr-recovery)" },
          ].map((item, i) =>
            item === null ? (
              <div key={i} className="text-lg" style={{ color: "var(--clr-border-hover)" }}>→</div>
            ) : (
              <div
                key={item.label}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: "var(--clr-surface-2)",
                  border: "1px solid var(--clr-border)",
                  color: item.color,
                }}
              >
                <item.icon size={14} />
                {item.label}
              </div>
            )
          )}
        </motion.div>

        {/* Example cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {EXAMPLES.map((ex, i) => (
            <motion.div
              key={ex.amount}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="rounded-xl p-6 flex flex-col gap-4"
              style={{
                background: ex.statusBg,
                border: `1px solid ${ex.borderColor}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-bold text-white mb-0.5">{ex.amount}</p>
                  <p className="text-xs" style={{ color: "var(--clr-text-muted)" }}>{ex.label}</p>
                </div>
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                  style={{ background: ex.statusBg, color: ex.statusColor, border: `1px solid ${ex.borderColor}` }}
                >
                  <ex.icon size={12} />
                  {ex.status}
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--clr-text-secondary)" }}>
                {ex.detail}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
