import { useState } from "react";
import {
  CheckCircle2, Calculator
} from "lucide-react";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

export default function RoiCalculator() {
  const [monthlyGmv, setMonthlyGmv] = useState(25000000); // ₹2.5 Cr default
  const [failureRate, setFailureRate] = useState(12.5); // 12.5% default
  const [avgTicket, setAvgTicket] = useState(3500); // ₹3,500 default
  const [ltvMonths, setLtvMonths] = useState(14); // 14 months

  // Dynamic Math Computations
  const annualGmv = monthlyGmv * 12;
  const annualRevenueAtRisk = annualGmv * (failureRate / 100);
  const recoveryRate = 0.684; // 68.4% ReviveOS benchmark recovery rate
  const annualRevenueRecovered = annualRevenueAtRisk * recoveryRate;
  
  const recoveredTransactionsCount = Math.round(annualRevenueRecovered / avgTicket);
  const annualLtvSaved = recoveredTransactionsCount * (avgTicket * ltvMonths * 0.45);
  
  const reviveFee = annualRevenueRecovered * 0.015; // 1.5% success fee
  const netMerchantGain = annualRevenueRecovered - reviveFee;
  const roiMultiplier = reviveFee > 0 ? (annualRevenueRecovered / reviveFee).toFixed(1) : "0.0";

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "80px" }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span className="badge badge-green" style={{ fontSize: "0.6875rem", fontWeight: 700 }}>
            UNIT ECONOMICS & VALUE MODEL
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
            Enterprise ROI & Pure Success-Fee Alignment
          </span>
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
          Enterprise Revenue Recovery & ROI Calculator
        </h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", marginTop: "4px", maxWidth: "720px" }}>
          Calculate how much found revenue ReviveOS recovers for your transaction volume with our 1.5% success-only model.
        </p>
      </div>

      {/* Main Grid: Inputs (Left) vs Output Metrics (Right) */}
      <div className="grid-responsive-2" style={{ alignItems: "flex-start" }}>
        
        {/* Left Box: Interactive Sliders */}
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Calculator size={18} color="var(--accent)" /> Adjust Merchant Volume Parameters
          </div>

          {/* Slider 1: Monthly GMV */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Monthly Processed GMV</span>
              <strong style={{ color: "var(--text-primary)" }}>{fmt(monthlyGmv)}/mo</strong>
            </div>
            <input
              type="range"
              min={1000000}
              max={100000000}
              step={1000000}
              value={monthlyGmv}
              onChange={(e) => setMonthlyGmv(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.625rem", color: "var(--text-tertiary)" }}>
              <span>₹10 Lakhs</span>
              <span>₹5 Crores</span>
              <span>₹10 Crores</span>
            </div>
          </div>

          {/* Slider 2: Failure Rate */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Payment Failure Rate</span>
              <strong style={{ color: "var(--error-text)" }}>{failureRate.toFixed(1)}%</strong>
            </div>
            <input
              type="range"
              min={3}
              max={25}
              step={0.5}
              value={failureRate}
              onChange={(e) => setFailureRate(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "var(--error-text)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.625rem", color: "var(--text-tertiary)" }}>
              <span>3% (Low)</span>
              <span>12% (Average India)</span>
              <span>25% (High Drop)</span>
            </div>
          </div>

          {/* Slider 3: Average Ticket Size */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Average Order / Plan Value</span>
              <strong style={{ color: "var(--text-primary)" }}>{fmt(avgTicket)}</strong>
            </div>
            <input
              type="range"
              min={500}
              max={50000}
              step={500}
              value={avgTicket}
              onChange={(e) => setAvgTicket(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>

          {/* Slider 4: Customer Retention Months (LTV) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Average Subscriber Lifespan</span>
              <strong style={{ color: "var(--success-text)" }}>{ltvMonths} Months</strong>
            </div>
            <input
              type="range"
              min={6}
              max={36}
              step={1}
              value={ltvMonths}
              onChange={(e) => setLtvMonths(parseInt(e.target.value))}
              style={{ width: "100%", accentColor: "var(--success-text)" }}
            />
          </div>
        </div>

        {/* Right Box: Real-Time Calculated ROI Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Top Hero ROI Card */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(59,130,246,0.08) 100%)",
              border: "1px solid rgba(16,185,129,0.35)",
              borderRadius: "var(--r-xl)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              boxShadow: "0 20px 40px -15px rgba(16,185,129,0.15)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--success-text)", textTransform: "uppercase" }}>
                Annual Revenue Recovered
              </span>
              <span className="badge badge-green" style={{ fontSize: "0.6875rem", fontWeight: 800 }}>
                {roiMultiplier}x Net ROI
              </span>
            </div>

            <div className="metric-value-responsive" style={{ color: "var(--text-primary)" }}>
              {fmt(annualRevenueRecovered)}
            </div>

            <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Net recovered found cash flow automatically captured back to your bank account with zero manual intervention.
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid-responsive-2" style={{ gap: "12px" }}>
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "16px" }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Total Revenue at Risk</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--error-text)", marginTop: "4px" }}>
                {fmt(annualRevenueAtRisk)}
              </div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "2px" }}>Lost to silent payment drops</div>
            </div>

            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "16px" }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Involuntary Churn Saved</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--success-text)", marginTop: "4px" }}>
                {fmt(annualLtvSaved)}
              </div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "2px" }}>Protected subscriber LTV</div>
            </div>

            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "16px" }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>ReviveOS Success Fee (1.5%)</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent)", marginTop: "4px" }}>
                {fmt(reviveFee)}
              </div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "2px" }}>Paid only on actual success</div>
            </div>

            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "16px" }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Net Merchant Profit</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>
                {fmt(netMerchantGain)}
              </div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "2px" }}>Pure bottom-line margin</div>
            </div>
          </div>

          {/* Pricing Alignment Note */}
          <div style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            <CheckCircle2 size={16} color="var(--success-text)" style={{ flexShrink: 0 }} />
            <div>
              <strong>Pure Alignment:</strong> ReviveOS has ₹0 setup cost, ₹0 monthly platform fee, and operates strictly on a 1.5% success fee on confirmed recovered transactions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
