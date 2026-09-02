/**
 * ReviveOS Motion Primitives
 * Reusable animation components — the backbone of the cinematic UX.
 */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { motion, useInView, useMotionValue, useSpring, animate } from "framer-motion";
import type { Variants } from "framer-motion";

// ─── Variants ────────────────────────────────────────────────────────────────

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay: i * 0.06 },
  }),
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] },
  }),
};

// ─── RevealOnScroll ───────────────────────────────────────────────────────────

interface RevealProps {
  children: ReactNode;
  delay?: number;
  variant?: "fadeUp" | "fadeIn" | "slideLeft" | "scaleIn";
  className?: string;
}

export function RevealOnScroll({ children, delay = 0, variant = "fadeUp", className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const variants = { fadeUp, fadeIn, slideLeft: slideInLeft, scaleIn };
  const chosen = variants[variant];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      custom={delay}
      variants={chosen}
    >
      {children}
    </motion.div>
  );
}

// ─── AnimatedNumber ───────────────────────────────────────────────────────────

interface AnimatedNumberProps {
  value: number;
  formatter?: (n: number) => string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  formatter = (n) => n.toLocaleString("en-IN"),
  duration = 1200,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { damping: 30, stiffness: 100 });
  const [displayed, setDisplayed] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(motionVal, value, {
      duration: duration / 1000,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsub = spring.on("change", (v) => {
      setDisplayed(formatter(Math.round(v)));
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [isInView, value]);

  return (
    <span ref={ref} className={className}>
      {displayed}
    </span>
  );
}

// ─── LakhsNumber ─────────────────────────────────────────────────────────────

export function LakhsNumber({ value, className }: { value: number; className?: string }) {
  return (
    <AnimatedNumber
      value={value / 100000}
      formatter={(n) => `₹${n.toFixed(2)} L`}
      className={className}
    />
  );
}

// ─── StaggerChildren ─────────────────────────────────────────────────────────

export function StaggerChildren({
  children,
  className,
  staggerDelay = 0.08,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

// ─── MetricCard ───────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  formatter?: (n: number) => string;
  sublabel?: string;
  trend?: "up" | "down" | "neutral";
  accentColor?: string;
  delay?: number;
  className?: string;
}

export function MetricCard({
  label,
  value,
  formatter,
  sublabel,
  accentColor = "var(--clr-accent)",
  delay = 0,
  className = "",
}: MetricCardProps) {
  return (
    <RevealOnScroll delay={delay} variant="scaleIn" className={`h-full ${className}`}>
      <motion.div
        className="card h-full p-5 flex flex-col gap-3 cursor-default"
        whileHover={{ borderColor: "rgba(255,255,255,0.12)", y: -2 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="section-label">{label}</p>
        <p className="metric-lg" style={{ color: accentColor }}>
          <AnimatedNumber value={value} formatter={formatter} />
        </p>
        {sublabel && <p className="text-xs text-[var(--clr-text-muted)]">{sublabel}</p>}
      </motion.div>
    </RevealOnScroll>
  );
}

// ─── DecisionStep ─────────────────────────────────────────────────────────────

interface DecisionStepProps {
  steps: { label: string; status: "pending" | "active" | "done" | "blocked" }[];
}

export function DecisionFlow({ steps }: DecisionStepProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.15, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className={`flex flex-col items-center`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                step.status === "done"
                  ? "bg-[var(--clr-success)] border-[var(--clr-success)] text-black"
                  : step.status === "active"
                  ? "bg-[var(--clr-accent)] border-[var(--clr-accent)] text-white animate-pulse"
                  : step.status === "blocked"
                  ? "bg-[var(--clr-danger)] border-[var(--clr-danger)] text-white"
                  : "bg-transparent border-[var(--clr-border)] text-[var(--clr-text-muted)]"
              }`}
            >
              {step.status === "done" ? "✓" : step.status === "blocked" ? "✕" : i + 1}
            </div>
            <span className="text-[10px] text-[var(--clr-text-muted)] mt-1 whitespace-nowrap max-w-16 text-center leading-tight">
              {step.label}
            </span>
          </motion.div>
          {i < steps.length - 1 && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: step.status === "done" ? 1 : 0 }}
              transition={{ delay: i * 0.15 + 0.3, duration: 0.4 }}
              style={{ transformOrigin: "left" }}
              className={`w-8 h-[2px] mb-5 ${
                step.status === "done" ? "bg-[var(--clr-success)]" : "bg-[var(--clr-border)]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── PolicyGateAnimation ──────────────────────────────────────────────────────

interface PolicyCheck {
  label: string;
  passed: boolean | null; // null = pending
}

export function PolicyGateAnimation({
  checks,
  finalResult,
}: {
  checks: PolicyCheck[];
  finalResult: "approved" | "blocked" | null;
}) {
  return (
    <div className="space-y-1.5">
      {checks.map((check, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2.5 text-sm"
        >
          <span
            className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
              check.passed === true
                ? "bg-[var(--clr-success-dim)] text-[var(--clr-success)]"
                : check.passed === false
                ? "bg-[var(--clr-danger-dim)] text-[var(--clr-danger)]"
                : "bg-[var(--clr-surface-3)] text-[var(--clr-text-muted)]"
            }`}
          >
            {check.passed === true ? "✓" : check.passed === false ? "✕" : "·"}
          </span>
          <span
            className={
              check.passed === true
                ? "text-[var(--clr-text-secondary)]"
                : check.passed === false
                ? "text-[var(--clr-danger)]"
                : "text-[var(--clr-text-muted)]"
            }
          >
            {check.label}
          </span>
        </motion.div>
      ))}

      {finalResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: checks.length * 0.1 + 0.1, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          className={`mt-3 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${
            finalResult === "approved"
              ? "bg-[var(--clr-success-dim)] text-[var(--clr-success)] border border-[var(--clr-success)]/20"
              : "bg-[var(--clr-danger-dim)] text-[var(--clr-danger)] border border-[var(--clr-danger)]/20"
          }`}
        >
          {finalResult === "approved" ? "⚡ Policy Approved — Executing" : "⛔ Policy Blocked — Human Review"}
        </motion.div>
      )}
    </div>
  );
}

// ─── TimelineNode ─────────────────────────────────────────────────────────────

export function TimelineNode({
  label,
  detail,
  status,
  delay = 0,
  isLast = false,
}: {
  label: string;
  detail?: string;
  status: "done" | "active" | "pending" | "blocked";
  delay?: number;
  isLast?: boolean;
}) {
  const colors = {
    done: "bg-[var(--clr-success)] border-[var(--clr-success)]",
    active: "bg-[var(--clr-accent)] border-[var(--clr-accent)] animate-pulse",
    pending: "bg-transparent border-[var(--clr-border)]",
    blocked: "bg-[var(--clr-danger)] border-[var(--clr-danger)]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-4"
    >
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 mt-1 ${colors[status]}`} />
        {!isLast && <div className="w-px flex-1 bg-[var(--clr-border)] mt-1" />}
      </div>
      <div className={`pb-5 ${isLast ? "" : ""}`}>
        <p
          className={`text-sm font-medium ${
            status === "active" ? "text-[var(--clr-text-primary)]" : "text-[var(--clr-text-secondary)]"
          }`}
        >
          {label}
        </p>
        {detail && <p className="text-xs text-[var(--clr-text-muted)] mt-0.5">{detail}</p>}
      </div>
    </motion.div>
  );
}
