import { motion } from "framer-motion";
import { Search, BrainCircuit, ShieldCheck, TrendingUp, BookOpen } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: Search,
    title: "Detect",
    description: "ReviveOS continuously monitors your payment stream, instantly identifying failed, abandoned, and at-risk transactions across every gateway.",
    visual: "Payment #8821 · ₹14,999 · Card declined",
  },
  {
    num: "02",
    icon: BrainCircuit,
    title: "Understand",
    description: "AI diagnoses the precise cause of each failure — not just the error code, but the recovery probability and the most effective next action.",
    visual: "Expired card · 94% confidence · Retry recommended",
  },
  {
    num: "03",
    icon: ShieldCheck,
    title: "Check",
    description: "Before acting, every recommendation passes through merchant-defined safety rules. Amount limits, retry caps, confidence thresholds — all enforced deterministically.",
    visual: "Amount ✓ · Retry limit ✓ · Confidence ✓ · Cooldown ✓",
  },
  {
    num: "04",
    icon: TrendingUp,
    title: "Recover",
    description: "Approved actions execute automatically or route to human review. Every outcome — success, failure, or stop — is measured and attributed precisely.",
    visual: "₹14,999 recovered · Attributed to retry strategy",
  },
  {
    num: "05",
    icon: BookOpen,
    title: "Learn",
    description: "Every decision, action, and outcome is logged to an immutable audit trail. The system improves its understanding of your payment patterns over time.",
    visual: "Audit event recorded · Decision hash stored",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-28 lg:py-36" style={{ background: "var(--clr-bg)" }}>
      <div className="max-w-6xl mx-auto px-5">
        
        {/* Header */}
        <div className="max-w-xl mb-16 lg:mb-24">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="section-label mb-4"
          >
            How ReviveOS thinks
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: 0.08 }}
            className="font-bold tracking-tight text-white leading-[1.15]"
            style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
          >
            A complete pipeline from<br />
            <span style={{ color: "var(--clr-text-secondary)" }}>failure to recovered revenue.</span>
          </motion.h2>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="group grid md:grid-cols-[auto_1fr_auto] gap-5 items-center rounded-xl p-5 md:p-7 transition-colors cursor-default"
              style={{
                background: "var(--clr-surface)",
                border: "1px solid var(--clr-border)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--clr-border-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--clr-border)"; }}
            >
              {/* Step number + icon */}
              <div className="flex items-center gap-4 md:gap-5 md:w-48">
                <span
                  className="text-3xl font-black tabular-nums leading-none"
                  style={{ color: "var(--clr-surface-3)", fontVariantNumeric: "tabular-nums" }}
                >
                  {step.num}
                </span>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ background: "var(--clr-surface-2)", border: "1px solid var(--clr-border)" }}
                >
                  <step.icon size={18} style={{ color: "var(--clr-accent)" }} />
                </div>
                <p className="text-base font-bold text-white md:hidden">{step.title}</p>
              </div>

              {/* Content */}
              <div>
                <p className="hidden md:block text-base font-bold text-white mb-1.5">{step.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--clr-text-secondary)" }}>
                  {step.description}
                </p>
              </div>

              {/* Visual hint */}
              <div
                className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-lg flex-shrink-0 max-w-[260px]"
                style={{ background: "var(--clr-surface-2)", border: "1px solid var(--clr-border)" }}
              >
                <span className="text-[11px] font-mono" style={{ color: "var(--clr-text-muted)" }}>{step.visual}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
