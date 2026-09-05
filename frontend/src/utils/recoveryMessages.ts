/**
 * ReviveOS 2.5 — Recovery Message Templates & Failure Diagnostic Engine
 * Generates rich, professional, multi-paragraph outreach communications
 * for WhatsApp, Smart Email, and Direct Payment Links.
 */

export interface FailureReasonPreset {
  id: string;
  code: string;
  label: string;
  category: string;
  diagnosticDetail: string;
  suggestedAction: string;
}

export const FAILURE_REASON_PRESETS: FailureReasonPreset[] = [
  {
    id: "bank_timeout",
    code: "GATEWAY_CONNECTION_ERROR",
    label: "Bank Switch Timeout during 2FA",
    category: "temporary_failure",
    diagnosticDetail: "Issuer bank server connection timed out on HDFC/SBI switch during 2-Factor Authentication (OTP verification).",
    suggestedAction: "Retry via UPI fast rails or alternate gateway",
  },
  {
    id: "card_expired",
    code: "CARD_EXPIRED",
    label: "Card Token Expired / Renewal Required",
    category: "expired_payment_method",
    diagnosticDetail: "Card on file has expired; the issuing bank rejected the recurring token authorization.",
    suggestedAction: "Prompt customer to update card details with 1-click tokenization",
  },
  {
    id: "otp_timeout",
    code: "OTP_VERIFICATION_TIMEOUT",
    label: "OTP Verification Window Expired",
    category: "customer_side",
    diagnosticDetail: "Customer did not submit the SMS/WhatsApp OTP within the 5-minute issuer security window.",
    suggestedAction: "Dispatch instant 1-tap UPI payment link with pre-filled amount",
  },
  {
    id: "daily_limit",
    code: "LIMIT_EXCEEDED",
    label: "Daily Card Velocity / Transaction Limit",
    category: "customer_side",
    diagnosticDetail: "Transaction declined by card issuer due to daily online spending velocity limit reached on customer account.",
    suggestedAction: "Provide alternate payment rails (NetBanking, UPI, or Split/EMI)",
  },
  {
    id: "upi_psp_degraded",
    code: "UPI_DEGRADED_PERFORMANCE",
    label: "UPI PSP Server Degraded",
    category: "gateway_degradation",
    diagnosticDetail: "Remitter PSP bank handle timed out on NPCI switch; secondary route recommended.",
    suggestedAction: "Switch customer checkout to direct intent on Razorpay fallback gateway",
  },
  {
    id: "insufficient_funds",
    code: "INSUFFICIENT_FUNDS",
    label: "Insufficient Balance at Scheduled Debit",
    category: "insufficient_funds",
    diagnosticDetail: "Account balance was insufficient when automated recurring mandate was triggered at 04:00 AM.",
    suggestedAction: "Grace period active; send polite conversational reminder for customer self-serve payment",
  },
  {
    id: "checkout_drop",
    code: "CHECKOUT_ABANDONED",
    label: "Session Abandoned at Payment Step",
    category: "checkout_abandonment",
    diagnosticDetail: "Customer closed browser tab at gateway redirect before completing mandate authorization.",
    suggestedAction: "Send cart preservation notification with 48-hour reserved pricing link",
  },
];

export interface MessageParams {
  customerName?: string;
  merchantName?: string;
  amountInr?: number;
  caseId?: string;
  failureReason?: string;
  failureCode?: string;
  paymentLinkUrl?: string;
}

/**
 * Generate rich formatted WhatsApp recovery message with bold formatting,
 * root cause diagnosis, safety assurance, and live payment link.
 */
export function generateWhatsAppRecoveryMessage(params: MessageParams): string {
  const customerName = params.customerName || "Dilip Madagari";
  const merchantName = params.merchantName || "NovaCart Pro";
  const amountInr = params.amountInr ?? 2500;
  const caseId = params.caseId || "OPP-002";
  const failureReason = params.failureReason || "Bank server connection timeout on HDFC switch during 2FA";
  const failureCode = params.failureCode || "GATEWAY_CONNECTION_ERROR";
  const paymentLinkUrl = params.paymentLinkUrl || "https://rzp.io/i/demo_recovery";

  const formattedAmount = `₹${amountInr.toLocaleString("en-IN")}`;

  return [
    `👋 *Hi ${customerName},*`,
    ``,
    `We noticed your recent payment of *${formattedAmount}* for *${merchantName}* could not be processed automatically.`,
    ``,
    `🔍 *Diagnostic Reason for Payment Failure:*`,
    `↳ *${failureReason}* (Error Code: \`${failureCode}\` • Ref: \`${caseId}\`)`,
    ``,
    `🛡️ *Customer Protection & Grace Period:*`,
    `• *No duplicate charge* occurred on your bank account or card.`,
    `• Your account, services, and cart remain *100% active and protected* during our 48-hour grace window.`,
    ``,
    `⚡ *1-Tap Instant Payment Recovery Link:*`,
    `👉 ${paymentLinkUrl}`,
    ``,
    `💳 *Supported Payment Methods on Link:*`,
    `• UPI Intent (Google Pay, PhonePe, Paytm, BHIM)`,
    `• All Major Credit & Debit Cards (Visa, Mastercard, RuPay)`,
    `• 50+ NetBanking Banks & Cardless EMI`,
    ``,
    `🔒 _100% RBI-Compliant & SSL 256-Bit Encrypted by Razorpay Gateway._`,
    `If you have already completed this payment or need assistance, simply reply directly to this message.`,
  ].join("\n");
}

/**
 * Generate professional Subject Line for Smart Email Outreach.
 */
export function generateEmailSubject(params: MessageParams): string {
  const merchantName = params.merchantName || "NovaCart Pro";
  const amountInr = params.amountInr ?? 2500;
  const caseId = params.caseId || "OPP-002";
  return `Action Required: Complete your ${merchantName} payment of ₹${amountInr.toLocaleString("en-IN")} [Ref: #${caseId}]`;
}

/**
 * Generate comprehensive, institutional-grade HTML/Plain-text email body.
 */
export function generateEmailRecoveryMessage(params: MessageParams): string {
  const customerName = params.customerName || "Dilip Madagari";
  const merchantName = params.merchantName || "NovaCart Pro";
  const amountInr = params.amountInr ?? 2500;
  const caseId = params.caseId || "OPP-002";
  const failureReason = params.failureReason || "Bank server connection timeout on HDFC switch during 2FA";
  const failureCode = params.failureCode || "GATEWAY_CONNECTION_ERROR";
  const paymentLinkUrl = params.paymentLinkUrl || "https://rzp.io/i/demo_recovery";

  const formattedAmount = `₹${amountInr.toLocaleString("en-IN")}`;

  return [
    `Dear ${customerName},`,
    ``,
    `We are writing to inform you regarding a recent billing attempt for your account with ${merchantName}. Your scheduled payment of ${formattedAmount} was declined by the banking network and could not be completed.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `TRANSACTION DIAGNOSTIC DETAILS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `• Reference / Case ID : ${caseId}`,
    `• Amount Due          : ${formattedAmount}`,
    `• Merchant            : ${merchantName}`,
    `• Failure Category    : Payment Authorization Declined`,
    `• Reason of Failure   : ${failureReason}`,
    `• Technical Code      : ${failureCode}`,
    `• Account Status      : Active (48-Hour Involuntary Churn Protection Active)`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `WHY DID THIS HAPPEN?`,
    `Our payment monitoring telemetry indicates that your transaction was interrupted due to: ${failureReason}. Please be assured that no duplicate amount was debited from your bank account.`,
    ``,
    `HOW TO COMPLETE YOUR PAYMENT:`,
    `To ensure uninterrupted service access and prevent subscription lapse, please use our secure single-use payment link below to complete payment with any preferred method (UPI, Debit/Credit Card, or NetBanking):`,
    ``,
    `👉 COMPLETE PAYMENT NOW: ${paymentLinkUrl}`,
    ``,
    `SECURITY & COMPLIANCE GUARANTEE:`,
    `This payment link is generated over encrypted rails via Razorpay and governed under ReviveOS Financial Safety Protocol v1. All transactions are RBI compliant, tokenized, and protected by end-to-end 256-bit SSL encryption.`,
    ``,
    `If you have already settled this balance or believe this notification reached you in error, you may safely disregard this message. For any questions, reply to this email or contact support.`,
    ``,
    `Warm regards,`,
    `Billing & Customer Operations Team`,
    `${merchantName} in partnership with ReviveOS Recovery Gateway`,
  ].join("\n");
}

/**
 * Generate Direct Link context message.
 */
export function generateDirectLinkMessage(params: MessageParams): string {
  const customerName = params.customerName || "Dilip Madagari";
  const merchantName = params.merchantName || "NovaCart Pro";
  const amountInr = params.amountInr ?? 2500;
  const caseId = params.caseId || "OPP-002";
  const failureReason = params.failureReason || "Bank server connection timeout on HDFC switch during 2FA";
  const paymentLinkUrl = params.paymentLinkUrl || "https://rzp.io/i/demo_recovery";

  return [
    `🔗 Direct Razorpay Recovery Link for ${customerName}`,
    ``,
    `• Merchant      : ${merchantName}`,
    `• Case Ref      : ${caseId}`,
    `• Amount        : ₹${amountInr.toLocaleString("en-IN")}`,
    `• Failure Cause : ${failureReason}`,
    `• Recovery URL  : ${paymentLinkUrl}`,
    ``,
    `Single-use, RBI-compliant payment link powered by Razorpay. Valid for 48 hours.`,
  ].join("\n");
}
