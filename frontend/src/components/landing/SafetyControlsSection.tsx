import { motion } from "framer-motion";
import { PauseCircle, StopCircle, UserCheck } from "lucide-react";

const SCENARIOS = [
  {
    icon: PauseCircle,
    badge: "AUTOMATION PAUSED",
    badgeColor: "var(--clr-warning)",
    badgeBg: "rgba(245,158,11,0.1)",
    title: "High-value case",
    description: "When a recovery involves an amount above your configured automatic limit, ReviveOS pauses and routes it to human review — even if confidence is high.",
    example: "₹75,000 · Confidence 89% · Awaiting approval",
  },
  {
    icon: StopCircle,
    badge: "RECOVERY STOPPED",
    badgeColor: "var(--clr-danger)",
    badgeBg: "rgba(239,68,68,0.1)",
    title: "Retry limit reached",
    description: "After a configured number of retry attempts, ReviveOS stops automatically — protecting the customer relationship and preventing gateway penalties.",
    example: "3 retries attempted · Maximum reached · Case closed",
  },
  {
    icon: UserCheck,
    badge: "HUMAN REVIEW",
    badgeColor: "var(--clr-accent)",
    badgeBg: "rgba(59,130,246,0.1)",
    title: "Low AI confidence",
    description: "When the AI's diagnosis confidence falls below your threshold, it escalates immediately. It will never act on uncertain analysis without a human check.",
    example: "Confidence 54% · Below threshold · Needs review",
  },
];

export default function SafetyControlsSection() {
  return (
    <section id="safety" className="py-28 lg:py-36" style={{ background: "var(--clr-bg)" }}>
      <div className="max-w-6xl mx-auto px-5">

        {/* Header */}
        <div className="max-w-xl mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="section-label mb-4"
          >
            Restraint by design
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: 0.08 }}
            className="font-bold tracking-tight text-white leading-[1.15] mb-5"
            style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
          >
            Sometimes the smartest<br />
            <span style={{ color: "var(--clr-text-secondary)" }}>action is no action.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: 0.14 }}
            className="text-base leading-relaxed"
            style={{ color: "var(--clr-text-secondary)" }}
          >
            ReviveOS doesn't optimize purely for recovery attempts. It's designed to know when stopping is the right call — protecting your customers, your gateway reputation, and your brand.
          </motion.p>
        </div>

        {/* Scenario cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {SCENARIOS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl p-7 flex flex-col gap-5"
              style={{ background: "var(--clr-surface)", border: "1px solid var(--clr-border)" }}
            >
              <div>
                <div
                  className="flex items-center gap-2 mb-5 px-2.5 py-1.5 rounded-lg w-fit text-[11px] font-bold tracking-widest uppercase"
                  style={{ background: s.badgeBg, color: s.badgeColor }}
                >
                  <s.icon size={12} />
                  {s.badge}
                </div>
                <h3 className="text-base font-bold text-white mb-3">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--clr-text-secondary)" }}>
                  {s.description}
                </p>
              </div>
              <div
                className="px-4 py-3 rounded-lg text-xs font-mono"
                style={{
                  background: "var(--clr-surface-2)",
                  color: "var(--clr-text-muted)",
                  border: "1px solid var(--clr-border)",
                }}
              >
                {s.example}
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
