import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

export default function RevenueImpactSection() {
  const [stage, setStage] = useState<"risk" | "recovered">("risk");

  useEffect(() => {
    const timer = setTimeout(() => setStage("recovered"), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section id="impact" className="py-28 lg:py-36" style={{ background: "var(--clr-surface)" }}>
      <div className="max-w-6xl mx-auto px-5">

        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: Copy */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              className="section-label mb-4"
            >
              Measurable recovery
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: 0.08 }}
              className="font-bold tracking-tight text-white leading-[1.15] mb-5"
              style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
            >
              Revenue recovered.<br />
              <span style={{ color: "var(--clr-text-secondary)" }}>Precisely attributed.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: 0.14 }}
              className="text-base leading-relaxed mb-8"
              style={{ color: "var(--clr-text-secondary)" }}
            >
              ReviveOS tracks every intervention to the payment. If a transaction succeeds after a ReviveAI-recommended action, it's attributed directly — no fuzzy estimates.
            </motion.p>
            <motion.ul
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: 0.2 }}
              className="flex flex-col gap-3"
            >
              {[
                "Every recovery action is explicitly attributed",
                "No guesswork or estimated impact metrics",
                "Full audit trail for every decision and outcome",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--clr-text-secondary)" }}>
                  <TrendingUp size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--clr-recovery)" }} />
                  {t}
                </li>
              ))}
            </motion.ul>
          </div>

          {/* Right: Animated recovery moment */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div
              className="rounded-2xl p-8 min-h-[280px] flex flex-col items-center justify-center gap-6 relative overflow-hidden"
              style={{ background: "var(--clr-bg)", border: "1px solid var(--clr-border)" }}
            >
              {/* Background glow that changes with stage */}
              <div
                className="absolute inset-0 transition-all duration-1000"
                style={{
                  background:
                    stage === "risk"
                      ? "radial-gradient(ellipse at center, rgba(249,115,22,0.06) 0%, transparent 70%)"
                      : "radial-gradient(ellipse at center, rgba(16,185,129,0.06) 0%, transparent 70%)",
                }}
              />

              <AnimatePresence mode="wait">
                {stage === "risk" ? (
                  <motion.div
                    key="risk"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center gap-3 text-center relative"
                  >
                    <AlertCircle size={32} style={{ color: "var(--clr-at-risk)" }} />
                    <p className="text-sm font-medium" style={{ color: "var(--clr-text-muted)" }}>Revenue at risk</p>
                    <p
                      className="font-black tabular-nums"
                      style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", color: "var(--clr-at-risk)", letterSpacing: "-0.03em" }}
                    >
                      ₹14,999
                    </p>
                    <p className="text-xs" style={{ color: "var(--clr-text-muted)" }}>Card declined · Analyzing…</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="recovered"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center gap-3 text-center relative"
                  >
                    <CheckCircle2 size={32} style={{ color: "var(--clr-recovery)" }} />
                    <p className="text-sm font-medium" style={{ color: "var(--clr-text-muted)" }}>Revenue recovered</p>
                    <p
                      className="font-black tabular-nums"
                      style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", color: "var(--clr-recovery)", letterSpacing: "-0.03em" }}
                    >
                      ₹14,999
                    </p>
                    <p className="text-xs" style={{ color: "var(--clr-text-muted)" }}>Retry succeeded · 8 min later · Attributed</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stage progress */}
              <div className="flex items-center gap-2 relative">
                {["At risk", "Diagnosed", "Checked", "Recovered"].map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-700"
                      style={{
                        background: i <= 1 || stage === "recovered" ? "rgba(16,185,129,0.12)" : "var(--clr-surface-2)",
                        color: i <= 1 || stage === "recovered" ? "var(--clr-recovery)" : "var(--clr-text-muted)",
                        border: `1px solid ${i <= 1 || stage === "recovered" ? "rgba(16,185,129,0.25)" : "var(--clr-border)"}`,
                      }}
                    >
                      {s}
                    </div>
                    {i < 3 && <div className="w-3 h-px" style={{ background: "var(--clr-border)" }} />}
                  </div>
                ))}
              </div>

              {/* Note */}
              <p className="text-[10px] absolute bottom-3 right-4" style={{ color: "var(--clr-text-muted)" }}>
                Illustrative preview
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
