// Centralized Global Business Language Dictionary & Terminology Layer
// Translates technical fintech / ML concepts into plain, business-friendly terms.

export interface TermDefinition {
  displayName: string;
  businessExplanation: string;
  technicalTerm: string;
  technicalDetails?: string;
  iconName?: string;
}

export const BUSINESS_TERMS: Record<string, TermDefinition> = {
  causalUplift: {
    displayName: "Expected Extra Recovery",
    businessExplanation: "How much more likely a payment is to recover because we intervene instead of leaving it alone.",
    technicalTerm: "Causal Uplift (τ)",
    technicalDetails: "τ = P(Recovery | Intervention) - P(Recovery | Control) calculated in percentage points.",
  },
  knapsackOptimizer: {
    displayName: "Recovery Budget Optimizer",
    businessExplanation: "Chooses the highest-yield recovery actions within your available spend and customer contact limits.",
    technicalTerm: "Constrained Knapsack Allocator",
    technicalDetails: "Bounded dynamic programming optimization over dual constraints with 20% intra-day reserve headroom.",
  },
  toctou: {
    displayName: "Last-Second Payment Safety Check",
    businessExplanation: "ReviveOS checks the latest payment status immediately before taking action so it does not act on outdated information or charge a customer twice.",
    technicalTerm: "TOCTOU State Revalidation",
    technicalDetails: "Time-of-Check to Time-of-Use verification against authoritative provider API < 60s pre-dispatch.",
  },
  hmacContract: {
    displayName: "Tamper-Protected Action Approval",
    businessExplanation: "Every sensitive recovery action receives a cryptographic approval that cannot be modified or replayed without detection.",
    technicalTerm: "HMAC-SHA256 Signed Action Contract",
    technicalDetails: "Cryptographic HMAC binding tenant_id, amount_paise, TTL expiry, and idempotency key.",
  },
  customerSovereignty: {
    displayName: "Customer Control",
    businessExplanation: "A customer's explicit cancellation or opt-out immediately halts all automated recovery outreach.",
    technicalTerm: "Customer Sovereignty Invariant",
    technicalDetails: "Irrevocable terminal state transition revoking active signed contracts at the gateway.",
  },
  naturalRecovery: {
    displayName: "Likely to Recover Without Help",
    businessExplanation: "The payment is expected to settle on its own, so ReviveOS avoids sending unnecessary messages or spending merchant fees.",
    technicalTerm: "Natural Settlement Abstention",
    technicalDetails: "Abstention triggered when P(Natural) >= 75%, preserving customer goodwill and messaging costs.",
  },
  intentionalAbstention: {
    displayName: "We Chose Not to Intervene",
    businessExplanation: "ReviveOS decided that acting would cost more, cause customer annoyance, or produce near-zero additional recovery.",
    technicalTerm: "Intentional Abstention",
    technicalDetails: "Suppression based on negative Net Incremental Contribution (NIC <= 0) or extreme natural settlement.",
  },
  recoveryOpportunity: {
    displayName: "Payment Worth Considering",
    businessExplanation: "A failed or at-risk payment that is recent, valid, and eligible for recovery.",
    technicalTerm: "Recovery Opportunity FSM",
    technicalDetails: "14-point deterministic eligibility lifecycle qualified within 24h of original transaction failure.",
  },
  recoveryCapacity: {
    displayName: "Available Recovery Resources",
    businessExplanation: "The remaining daily budget, customer contact slots, or review bandwidth available for recovery.",
    technicalTerm: "Merchant Recovery Capacity",
    technicalDetails: "Bounded capacity vector tracking spend budget, contact frequency, and reserve headroom.",
  },
  holdoutGroup: {
    displayName: "Untouched Comparison Group",
    businessExplanation: "A 5% group of eligible payments left untouched so we can accurately measure what happens without intervention.",
    technicalTerm: "Holdout Control Cohort",
    technicalDetails: "Deterministic 5% synthetic holdout cohort comparing Treatment vs Control recovery rates.",
  },
  decisionReplay: {
    displayName: "Why We Made This Decision",
    businessExplanation: "A chronological timeline showing exactly what ReviveOS knew and why it approved, delayed, or blocked an action.",
    technicalTerm: "Forensic Decision Replay",
    technicalDetails: "Millisecond-level event timeline reconstructed from append-only SHA-256 audit ledger.",
  },
  financialGateway: {
    displayName: "Final Safety Check Before Action",
    businessExplanation: "The last deterministic security checkpoint that must approve an action before reaching the payment provider.",
    technicalTerm: "Financial Action Gateway",
    technicalDetails: "Single non-bypassable execution gateway enforcing constitution articles, HMAC contracts, and policy ceilings.",
  },
  amountTrap: {
    displayName: "The Amount Trap Resolution",
    businessExplanation: "Chasing large low-probability payments wastes resources. ReviveOS prioritizes high-probability smaller renewals that yield far more net profit.",
    technicalTerm: "Yield-Driven Density Ranking",
    technicalDetails: "Inverts naive sorting by amount: ranks opportunities by Net Contribution per unit of scarce capacity.",
  },
  multiAgentArbitration: {
    displayName: "Multi-Agent Decision Arbitration",
    businessExplanation: "When multiple recovery systems target the same customer, ReviveOS chooses the single best action and stops the others from spamming the customer.",
    technicalTerm: "Multi-Agent Collision Arbitrator",
    technicalDetails: "Single-winner arbitration under 1-contact/24h customer attention budget and margin leakage suppression.",
  },
  integerPaisePrecision: {
    displayName: "Exact Rupee & Paisa Accounting",
    businessExplanation: "All calculations use exact whole paise to prevent rounding errors or fractional rupee loss.",
    technicalTerm: "Integer Minor Unit Precision",
    technicalDetails: "All monetary state stored as 64-bit integer paise (1 INR = 100 paise) with zero floating-point drift.",
  },
  netRevenueContribution: {
    displayName: "Net Revenue Contribution",
    businessExplanation: "The true extra profit ReviveOS caused, after subtracting all message fees, discount costs, and customer experience friction.",
    technicalTerm: "Net Incremental Contribution (NIC)",
    technicalDetails: "NIC = (τ × Amount) - DirectCost - DiscountCost - FrictionPenalty.",
  },
  customerExperienceCost: {
    displayName: "Customer Experience Cost",
    businessExplanation: "A calculated penalty representing customer annoyance when receiving messages or popups.",
    technicalTerm: "Friction Penalty (Φ)",
    technicalDetails: "Dynamically escalates with recent contact frequency to prevent customer churn.",
  },
  opportunityGraph: {
    displayName: "Revenue Problem Graph",
    businessExplanation: "Understands hidden links between revenue failures (same customer, same card issuer, or same bank outage) to make smarter coordinated decisions.",
    technicalTerm: "Revenue Opportunity Graph",
    technicalDetails: "In-memory multi-relational graph computing transitive closure clusters across 9 shared dimensions.",
  },
  halfLifeDecay: {
    displayName: "Recovery Window Half-Life",
    businessExplanation: "Urgency drops over time. Carts expire in 30 minutes, while overdue B2B invoices can be worked for 7 days.",
    technicalTerm: "Exponential Opportunity Half-Life",
    technicalDetails: "Decay multiplier = 0.5 ^ (elapsed_seconds / half_life_seconds).",
  },
  decisionQuality: {
    displayName: "Decision Quality Tracking",
    businessExplanation: "ReviveOS checks every past decision against real outcomes to measure whether it acted smartly or wasted effort.",
    technicalTerm: "Post-Hoc Decision Quality Classification",
    technicalDetails: "Classifies outcomes into GOOD_ACTION, GOOD_ABSTENTION, WASTED_ACTION, MISSED_OPPORTUNITY, HARMFUL_ACTION.",
  },
};

export const STATUS_TRANSLATIONS: Record<string, { label: string; tone: "success" | "warning" | "neutral" | "danger"; explanation: string }> = {
  ACTIONABLE: { label: "Ready to Consider", tone: "success", explanation: "Fresh, eligible payment ready for recovery evaluation." },
  ALLOCATED: { label: "Selected for Recovery", tone: "success", explanation: "Approved by optimizer to receive recovery action." },
  PURSUE: { label: "Selected to Pursue", tone: "success", explanation: "High expected return; authorized for recovery action." },
  APPROVED: { label: "Approved by Optimizer", tone: "success", explanation: "Passed economic arbitration and assigned execution rights." },
  SUPPRESSED: { label: "Quietly Suppressed", tone: "neutral", explanation: "Stopped to prevent customer fatigue or discount margin leakage." },
  WAIT: { label: "Waiting for Better Time", tone: "warning", explanation: "Temporary bank issue; observing before spending resources." },
  INTENTIONALLY_ABSTAIN: { label: "No Action Needed", tone: "neutral", explanation: "Payment likely to settle naturally without intervention." },
  ABSTAINED: { label: "No Action Needed", tone: "neutral", explanation: "Left untouched to save fees and avoid customer annoyance." },
  REJECTED_NATURAL: { label: "Natural Settlement", tone: "neutral", explanation: "85%+ chance of settling on its own; 0 fees spent." },
  REJECTED_CAPACITY: { label: "Budget Reserved", tone: "warning", explanation: "Lower yield than higher-priority opportunities in this cycle." },
  HUMAN_REVIEW: { label: "Needs Human Approval", tone: "warning", explanation: "High value or ambiguous; quarantined for operator review." },
  BLOCKED: { label: "Safely Blocked", tone: "danger", explanation: "Blocked by safety rules (e.g. amount ceiling or duplicate)." },
  CANCELLED: { label: "Customer Cancelled", tone: "danger", explanation: "Customer explicitly cancelled or opted out; permanently halted." },
  HISTORICAL: { label: "Too Old to Pursue", tone: "neutral", explanation: "Payment failed > 24 hours ago; preserved as historical context only." },
  EXPIRED: { label: "Window Closed", tone: "neutral", explanation: "Recovery time limit elapsed; no action will be taken." },
  RECOVERED: { label: "Payment Recovered", tone: "success", explanation: "Confirmed recovered by Razorpay payment event." },
  PAYMENT_RECONCILED: { label: "Settlement Confirmed", tone: "success", explanation: "Reconciled with Razorpay live settlement records." },
  NATURALLY_RECOVERED: { label: "Paid Without Help", tone: "success", explanation: "Customer paid independently without merchant intervention." },
};

export function getFriendlyStatus(rawStatus: string) {
  const upper = (rawStatus || "").toUpperCase();
  return STATUS_TRANSLATIONS[upper] || { label: rawStatus, tone: "neutral", explanation: "System status record." };
}

export function getTerm(key: string): TermDefinition {
  return BUSINESS_TERMS[key] || {
    displayName: key,
    businessExplanation: "Business concept in ReviveOS.",
    technicalTerm: key,
  };
}
