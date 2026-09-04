import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Zap, Brain, ShieldCheck, TrendingUp, AlertCircle } from "lucide-react";
import { DynamicHeroText } from "./DynamicHeroText";

interface HeroSectionProps {
  onGetStarted: () => void;
}

// Illustrative preview — not live merchant data
const FLOW_NODES = [
  { icon: AlertCircle, label: "Payment failed", sub: "₹14,999 declined", color: "var(--clr-danger)", delay: 0 },
  { icon: Brain, label: "Pattern detected", sub: "Card expired — 94% confidence", color: "var(--clr-accent)", delay: 0.15 },
  { icon: Zap, label: "AI analysis", sub: "Retry via alternate route", color: "var(--clr-accent)", delay: 0.3 },
  { icon: ShieldCheck, label: "Safety check", sub: "All 4 rules passed", color: "var(--clr-warning)", delay: 0.45 },
  { icon: TrendingUp, label: "Revenue recovered", sub: "₹14,999 · 8 min later", color: "var(--clr-recovery)", delay: 0.6 },
];

export default function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative min-h-[100svh] flex items-center pt-14 overflow-hidden">
      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(59,130,246,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-5 w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center py-20 lg:py-0">

        {/* ── Left: Copy ── */}
        <div className="flex flex-col items-start max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 mb-7 px-3 py-1.5 rounded-full border"
            style={{
              borderColor: "rgba(59,130,246,0.3)",
              background: "rgba(59,130,246,0.07)",
              color: "var(--clr-accent)",
            }}
          >
            <Zap size={11} />
            <span className="text-[11px] font-bold tracking-widest uppercase">AI-Powered Revenue Recovery</span>
          </motion.div>

          <div className="mb-6 w-full text-left" style={{ textAlign: "left" }}>
            <DynamicHeroText style={{ alignItems: "flex-start", textAlign: "left" }} />
          </div>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="text-base leading-relaxed mb-9 max-w-lg"
            style={{ color: "var(--clr-text-secondary)", fontSize: "clamp(0.95rem, 1.5vw, 1.05rem)" }}
          >
            ReviveOS finds failed payments worth recovering, chooses the safest next step, and gives your team control when automation should stop.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mb-10"
          >
            <motion.button
              onClick={onGetStarted}
              whileHover={{ scale: 1.02, boxShadow: "0 8px 24px rgba(59,130,246,0.35)" }}
              whileTap={{ scale: 0.97 }}
              className="btn-primary text-sm px-6 py-3.5 text-white"
              style={{ background: "var(--clr-accent)", borderRadius: "var(--r-md)" }}
            >
              See ReviveOS in action
              <ArrowRight size={15} />
            </motion.button>
            <a
              href="#how-it-works"
              className="btn-ghost text-sm px-6 py-3.5 text-center justify-center"
            >
              How it works ↓
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.42 }}
            className="flex flex-col gap-2.5"
          >
            {[
              "Safety rules constrain every AI action",
              "Human review for high-value or uncertain cases",
              "Tamper-evident audit trail for every decision",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2.5 text-[12.5px]" style={{ color: "var(--clr-text-muted)" }}>
                <CheckCircle2 size={13} style={{ color: "var(--clr-success)", flexShrink: 0 }} />
                {t}
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Right: Flow Diagram ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex flex-col items-center w-full max-w-sm mx-auto lg:mx-0 lg:ml-auto"
        >
          {/* Illustrative label */}
          <div
            className="absolute -top-5 right-0 text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded"
            style={{ color: "var(--clr-text-muted)", background: "var(--clr-surface-2)", border: "1px solid var(--clr-border)" }}
          >
            Illustrative preview
          </div>

          {/* Subtle ambient glow behind panel */}
          <div
            className="absolute -inset-8 rounded-3xl pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 70%)" }}
          />

          <div
            className="relative w-full rounded-2xl p-5"
            style={{ background: "var(--clr-surface)", border: "1px solid var(--clr-border)" }}
          >
            <div className="flex items-center gap-2 mb-5 pb-4" style={{ borderBottom: "1px solid var(--clr-border)" }}>
              <Zap size={14} style={{ color: "var(--clr-accent)" }} />
              <span className="text-sm font-semibold text-white">Revenue Recovery System</span>
            </div>

            <div className="flex flex-col gap-0">
              {FLOW_NODES.map((node, i) => (
                <div key={node.label}>
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + node.delay, duration: 0.4 }}
                    className="flex items-center gap-3 py-3.5 px-3 rounded-xl"
                    style={{
                      background: i === 4 ? "rgba(16,185,129,0.05)" : "var(--clr-surface-2)",
                      border: i === 4 ? "1px solid rgba(16,185,129,0.2)" : "1px solid var(--clr-border)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${node.color}14` }}
                    >
                      <node.icon size={16} style={{ color: node.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{node.label}</p>
                      <p className="text-[11px] truncate" style={{ color: "var(--clr-text-muted)" }}>{node.sub}</p>
                    </div>
                    {i === 4 && (
                      <span
                        className="ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: "rgba(16,185,129,0.15)", color: "var(--clr-recovery)" }}
                      >
                        Done
                      </span>
                    )}
                  </motion.div>

                  {/* Connector line */}
                  {i < FLOW_NODES.length - 1 && (
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.6 + node.delay, duration: 0.2 }}
                      className="mx-7 h-4 flex items-center"
                      style={{ transformOrigin: "top" }}
                    >
                      <div className="w-px h-full mx-auto" style={{ background: "var(--clr-border)" }} />
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
