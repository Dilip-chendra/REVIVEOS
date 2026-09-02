import { motion } from "framer-motion";

const METRICS = [
  { value: "$2.4M+", label: "Revenue identified", sub: "Across analyzed payment failures" },
  { value: "18.7%", label: "Recovery opportunity", sub: "Average across merchant categories" },
  { value: "1.8M+", label: "Payments analyzed", sub: "In benchmark evaluation" },
  { value: "99.9%", label: "Action safety", sub: "Bounded by deterministic rules" },
];

export default function MetricStrip() {
  return (
    <section
      className="border-y"
      style={{ background: "var(--clr-surface)", borderColor: "var(--clr-border)" }}
    >
      <div className="max-w-6xl mx-auto px-5 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="flex flex-col lg:border-r last:border-r-0 lg:pr-8"
              style={{ borderColor: "var(--clr-border)" }}
            >
              <p
                className="font-extrabold tabular-nums mb-1"
                style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: "white", letterSpacing: "-0.03em" }}
              >
                {m.value}
              </p>
              <p className="text-sm font-semibold mb-1 text-white">{m.label}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--clr-text-muted)" }}>{m.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
