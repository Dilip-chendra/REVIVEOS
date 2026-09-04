"""
ReviveAI — Deterministic Demo Seeds (v2)

7 real-world scenarios that tell a complete product story.
Each scenario includes:
  - strategy_options: AI-generated strategy comparisons (A vs B vs C)
  - policy_checks: deterministic safety gate results
  - feature_contributions: ML signal evidence
  - demo_narrative: step-by-step story for evaluators

Story arc:
  001 — B2B SaaS / Corporate card weekend block → Smart Delay → RECOVERED
  002 — E-Commerce flash sale / Gateway spike → Failover → RECOVERED
  003 — High-value false positive / Luxe Watches → 3DS → HUMAN REVIEW → RECOVERED
  004 — Expired card / Churn prevention → Card update reminder → RECOVERED
  005 — Genuine insufficient funds / Max retries → AUTOMATION STOPPED (correct behavior)
  006 — Anti-fraud false positive / 3DS within limit → RECOVERED automatically
  007 — Gateway spike with strategy comparison / PayU → RECOVERED via routing
"""
from __future__ import annotations
from datetime import datetime, timezone

# ── Failure Code taxonomy ─────────────────────────────────────────────────────

FAILURE_TAXONOMY = {
    "INSUFFICIENT_FUNDS": {
        "label": "Insufficient Funds",
        "explanation": "Customer account balance or credit limit was insufficient at the time of charge.",
        "recoverability": "conditional",
        "safe_strategies": ["smart_delay", "reminder"],
        "forbidden_strategies": ["immediate_retry"],
        "notes": "May be temporary (weekend velocity limit, payday timing) or genuine (customer financial distress). Context determines which."
    },
    "GATEWAY_CONNECTION_ERROR": {
        "label": "Gateway Connection Error",
        "explanation": "The payment gateway experienced a network or infrastructure fault. Customer card and funds are not at fault.",
        "recoverability": "high",
        "safe_strategies": ["route_switch", "smart_delay", "retry"],
        "forbidden_strategies": [],
        "notes": "Gateway faults are almost always temporary. Recovery via alternate gateway or delayed retry is highly effective."
    },
    "GATEWAY_TECHNICAL_ERROR": {
        "label": "Gateway Technical Error",
        "explanation": "Internal gateway processing error. Not customer-facing.",
        "recoverability": "high",
        "safe_strategies": ["route_switch", "smart_delay", "retry"],
        "forbidden_strategies": [],
        "notes": "Functionally identical to CONNECTION_ERROR. Route-switch is often optimal."
    },
    "DO_NOT_HONOR": {
        "label": "Do Not Honor",
        "explanation": "Bank issued a blanket decline. Can be triggered by anti-fraud algorithms, velocity limits, or international restrictions.",
        "recoverability": "conditional",
        "safe_strategies": ["3ds_authentication", "smart_delay"],
        "forbidden_strategies": ["immediate_retry"],
        "notes": "Clean customer history + recognized device = likely false positive. 3D-Secure can resolve. Stolen card = non-recoverable."
    },
    "FRAUD_SUSPECTED": {
        "label": "Suspected Fraud",
        "explanation": "Bank's anti-fraud algorithm flagged this transaction as potentially fraudulent.",
        "recoverability": "conditional",
        "safe_strategies": ["3ds_authentication"],
        "forbidden_strategies": ["immediate_retry", "route_switch"],
        "notes": "3D-Secure authentication proves customer identity to the bank and typically resolves false positives."
    },
    "CARD_EXPIRED": {
        "label": "Card Expired",
        "explanation": "The payment card on file has passed its expiration date. The card number may still be valid but the expiry date is rejected.",
        "recoverability": "conditional",
        "safe_strategies": ["reminder", "account_updater"],
        "forbidden_strategies": ["immediate_retry", "route_switch"],
        "notes": "CRITICAL: Retrying an expired card will ALWAYS fail and generates gateway penalty signals. Only action: request card update. DO NOT cancel subscription — this is involuntary churn."
    },
    "SUBSCRIPTION_PENDING": {
        "label": "Subscription Processing Pending",
        "explanation": "NACH/ECS mandate processing is pending bank confirmation.",
        "recoverability": "high",
        "safe_strategies": ["smart_delay", "retry"],
        "forbidden_strategies": [],
        "notes": "Usually resolves within 1-4 hours."
    },
    "NETWORK_ERROR": {
        "label": "Network Timeout",
        "explanation": "Transaction timed out in transit between gateway and bank.",
        "recoverability": "high",
        "safe_strategies": ["retry", "route_switch"],
        "forbidden_strategies": [],
        "notes": "Transient infrastructure fault. Simple retry is usually sufficient."
    },
}

# ── Demo Scenarios ─────────────────────────────────────────────────────────────

DEMO_SCENARIOS: dict[str, dict] = {

    # ─── Scenario 001: B2B SaaS — Corporate Card Weekend Block ────────────────
    "b2b_saas": {
        "id": "demo-case-001",
        "name": "B2B SaaS — Corporate Card Weekend Block → Smart Delay",
        "scenario_type": "b2b_saas",
        "merchant_name": "CloudCRM Inc.",
        "description": (
            "Corporate card hit weekend velocity limit at 2:00 AM Sunday. "
            "AI identifies payday retry pattern: 12/13 prior payments succeeded on this same account. "
            "Recommended: Smart Delay until Monday 9 AM business hours — when corporate card limits reset automatically."
        ),
        "amount_inr": 150000.0,
        "failure_category": "temporary_failure",
        "failure_code": "INSUFFICIENT_FUNDS",
        "failure_label": "Weekend Corporate Card Velocity Limit",
        "gateway": "razorpay",
        "payment_method": "card",
        "case_type": "subscription_failure",
        "customer_success_rate": 0.923,
        "customer_lifetime_value_inr": 5400000.0,
        "retry_count": 0,
        "consecutive_failures": 0,
        "gateway_is_degraded": False,
        "gateway_failure_rate_1h": 0.04,
        "days_since_last_success": 0,
        "subscription_age_days": 390,
        "subscription_failed_count": 0,
        "invoice_days_overdue": 0,
        "customer_opted_out": False,
        "is_flagged_customer": False,
        "recovery_probability": 0.91,
        "risk_score": 0.28,
        "recommended_strategy": "retry",
        "confidence": 0.91,
        "expected_outcome": "RECOVERED",
        "expected_amount_recovered": 150000.0,
        "customer_context": {
            "name": "CloudCRM Inc.",
            "type": "B2B Enterprise",
            "tenure_months": 13,
            "successful_payments": 12,
            "failed_payments": 1,
            "chargebacks": 0,
            "subscription_status": "active",
            "payment_timeline": [
                {"month": "Jan", "amount": 150000, "status": "success"},
                {"month": "Feb", "amount": 150000, "status": "success"},
                {"month": "Mar", "amount": 150000, "status": "success"},
                {"month": "Apr", "amount": 150000, "status": "success"},
                {"month": "May", "amount": 150000, "status": "success"},
                {"month": "Jun", "amount": 150000, "status": "success"},
                {"month": "Jul", "amount": 150000, "status": "success"},
                {"month": "Aug", "amount": 150000, "status": "success"},
                {"month": "Sep", "amount": 150000, "status": "success"},
                {"month": "Oct", "amount": 150000, "status": "success"},
                {"month": "Nov", "amount": 150000, "status": "success"},
                {"month": "Dec", "amount": 150000, "status": "success"},
                {"month": "Jan", "amount": 150000, "status": "failed"},
            ]
        },
        "device_context": {
            "device_type": "Desktop / Chrome",
            "region": "Bengaluru, India",
            "billing_region": "Bengaluru, India",
            "location_match": True,
            "device_previously_seen": True,
            "device_consistency": "HIGH",
            "suspicious_velocity": False,
        },
        "what_we_will_not_do": [
            "Cancel the subscription — this is a temporary payment barrier, not churn",
            "Send a threatening payment-failed email — customer has 12/13 clean history",
            "Retry immediately — weekend velocity limit will reject the same card again",
            "Flag customer as high-risk — this is a banking system constraint, not customer behavior",
        ],
        "what_happens_next": "Smart Delay scheduled for Monday 9:05 AM IST. No customer contact required. Silent recovery.",
        "strategy_options": [
            {
                "id": "A",
                "label": "Strategy A: Smart Delay",
                "description": "Wait until Monday 9:00 AM (business hours). Corporate card velocity limits reset at 00:00 IST Monday. Customer has 12 consecutive successful payments — no reason to doubt.",
                "probability": 0.91,
                "risk": "Low",
                "chosen": True,
                "reason_chosen": "Highest probability. Customer history is excellent. No gateway fault — pure timing issue.",
            },
            {
                "id": "B",
                "label": "Strategy B: Send Payment Reminder",
                "description": "Notify customer to update card. Risk: 40% of B2B customers churn when asked to re-enter corporate card details — this creates unnecessary friction.",
                "probability": 0.52,
                "risk": "Medium",
                "chosen": False,
                "reason_rejected": "Unnecessary churn risk. The card is fine. Only the timing is wrong.",
            },
        ],
        "policy_checks": [
            {"rule": "Amount below automated ceiling", "passed": True, "detail": "₹1,50,000 within merchant-configured B2B limit of ₹5,00,000"},
            {"rule": "Retry count within limit", "passed": True, "detail": "0 of 3 max retries used"},
            {"rule": "Customer not opted out", "passed": True, "detail": "Customer consent verified — active subscription"},
            {"rule": "Customer not flagged for fraud", "passed": True, "detail": "No fraud signals. 12/13 clean payment history."},
            {"rule": "Gateway healthy for retry", "passed": True, "detail": "Razorpay failure rate: 4% (healthy baseline)"},
            {"rule": "Failure code is recoverable", "passed": True, "detail": "INSUFFICIENT_FUNDS at 2 AM Sunday — weekend corporate velocity limit, not a hard decline"},
        ],
        "policy_decision": "APPROVED",
        "policy_outcome": "Smart Delay scheduled for Monday 9:05 AM",
        "feature_contributions": [
            {"feature": "Customer Payment History", "value": "12/13 successful payments (92.3%)", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Failure Timing", "value": "2:00 AM Sunday — corporate card cycle reset", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Failure Code", "value": "INSUFFICIENT_FUNDS — weekend velocity limit (not hard decline)", "impact": "medium", "direction": "increases_recovery"},
            {"feature": "Subscription Age", "value": "390 days — loyal enterprise customer", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Gateway Health", "value": "Razorpay: 4% failure rate (healthy)", "impact": "low", "direction": "neutral"},
            {"feature": "Customer LTV", "value": "₹54,00,000 lifetime value — priority account", "impact": "high", "direction": "increases_recovery"},
        ],
        "demo_narrative": [
            "Risk detected: ₹1,50,000 B2B subscription failure at 2:00 AM Sunday",
            "AI diagnosis: Weekend corporate card velocity limit — NOT a hard decline",
            "Customer profile: 12/13 payments successful (₹54L LTV enterprise account)",
            "Strategy A selected: Smart Delay until Mon 9:00 AM — probability 91%",
            "Policy Gate: All 6 rules passed ✓",
            "Action scheduled: Monday 9:05 AM automated retry",
            "✓ ₹1,50,000 RECOVERED — Silent recovery, no customer contacted",
        ],
    },

    # ─── Scenario 002: E-Commerce Flash Sale — Gateway Spike ──────────────────
    "ecommerce_flashsale": {
        "id": "demo-case-002",
        "name": "E-Commerce Flash Sale — Gateway Spike → Failover Routing",
        "scenario_type": "ecommerce_flashsale",
        "merchant_name": "Aura Cosmetics",
        "description": (
            "Black Friday flash sale causing Stripe gateway overload — 38% failure rate spike detected. "
            "AI recommends immediate failover to PayU backup gateway while customer waits on loading spinner. "
            "Completely transparent to the customer. No checkout disruption."
        ),
        "amount_inr": 14999.0,
        "failure_category": "gateway_degradation",
        "failure_code": "GATEWAY_CONNECTION_ERROR",
        "failure_label": "Gateway Infrastructure Overload",
        "gateway": "stripe",
        "payment_method": "card",
        "case_type": "payment_failure",
        "customer_success_rate": 0.8,
        "customer_lifetime_value_inr": 32000.0,
        "retry_count": 0,
        "consecutive_failures": 0,
        "gateway_is_degraded": True,
        "gateway_failure_rate_1h": 0.38,
        "days_since_last_success": 0,
        "subscription_age_days": 0,
        "subscription_failed_count": 0,
        "invoice_days_overdue": 0,
        "customer_opted_out": False,
        "is_flagged_customer": False,
        "recovery_probability": 0.94,
        "risk_score": 0.22,
        "recommended_strategy": "route_switch",
        "confidence": 0.94,
        "expected_outcome": "RECOVERED",
        "expected_amount_recovered": 14999.0,
        "customer_context": {
            "name": "Priya M.",
            "type": "D2C Consumer",
            "tenure_months": 8,
            "successful_payments": 4,
            "failed_payments": 1,
            "chargebacks": 0,
            "subscription_status": "N/A",
            "payment_timeline": [
                {"month": "Apr", "amount": 3200, "status": "success"},
                {"month": "Jun", "amount": 5400, "status": "success"},
                {"month": "Aug", "amount": 8900, "status": "success"},
                {"month": "Oct", "amount": 6700, "status": "success"},
                {"month": "Nov", "amount": 14999, "status": "failed"},
            ]
        },
        "device_context": {
            "device_type": "iPhone / Safari",
            "region": "Mumbai, India",
            "billing_region": "Mumbai, India",
            "location_match": True,
            "device_previously_seen": True,
            "device_consistency": "HIGH",
            "suspicious_velocity": False,
        },
        "what_we_will_not_do": [
            "Show the customer an error screen — this is not their fault",
            "Retry on the same degraded Stripe gateway — it will fail again",
            "Cancel the order — gateway infrastructure is at fault, not the customer",
            "Flag customer for fraud — this is a pure infrastructure failure",
        ],
        "what_happens_next": "Transaction routed to PayU backup gateway within 1.8 seconds. Customer sees normal checkout success.",
        "gateway_intelligence": {
            "primary": {"name": "Stripe", "status": "DEGRADED", "failure_rate": 0.38, "baseline": 0.012, "latency_ms": 1240},
            "backup": {"name": "PayU", "status": "HEALTHY", "failure_rate": 0.029, "baseline": 0.025, "latency_ms": 195},
        },
        "strategy_options": [
            {
                "id": "A",
                "label": "Strategy A: Gateway Failover to PayU",
                "description": "Route transaction through PayU backup. Customer sees normal loading spinner — no disruption. PayU failure rate: 2.9% (healthy).",
                "probability": 0.94,
                "risk": "Low",
                "chosen": True,
                "reason_chosen": "Highest probability. Stripe is clearly overloaded. PayU is healthy. Seamless to customer.",
            },
            {
                "id": "B",
                "label": "Strategy B: Retry on Stripe after 30s",
                "description": "Wait 30 seconds and retry the same gateway. Problem: Stripe failure rate is 38% — still degraded. Customer has already left the checkout screen.",
                "probability": 0.28,
                "risk": "High",
                "chosen": False,
                "reason_rejected": "Stripe is still degraded. 72% chance of another failure. Customer will leave.",
            },
        ],
        "policy_checks": [
            {"rule": "Amount below automated ceiling", "passed": True, "detail": "₹14,999 under ₹50,000 automated limit"},
            {"rule": "Retry count within limit", "passed": True, "detail": "0 of 3 retries used"},
            {"rule": "Customer not opted out", "passed": True, "detail": "Consent verified"},
            {"rule": "Customer not flagged for fraud", "passed": True, "detail": "Clean customer record — 4/4 prior successful purchases"},
            {"rule": "Gateway degradation confirmed", "passed": True, "detail": "Stripe failure rate: 38% (baseline: 1.2%) — DEGRADED"},
            {"rule": "Backup gateway healthy", "passed": True, "detail": "PayU failure rate: 2.9% — HEALTHY. Routing approved."},
        ],
        "policy_decision": "APPROVED",
        "policy_outcome": "Route switch to PayU approved. Executing.",
        "feature_contributions": [
            {"feature": "Gateway Failure Rate", "value": "Stripe: 38% failure rate (baseline 1.2%) — critical spike", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Failure Code", "value": "GATEWAY_CONNECTION_ERROR — infrastructure fault, not customer fault", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Customer History", "value": "4/5 prior payments successful", "impact": "medium", "direction": "increases_recovery"},
            {"feature": "Backup Gateway Health", "value": "PayU: 2.9% failure rate — optimal for routing", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Transaction Type", "value": "One-time checkout — high urgency, customer is still on page", "impact": "medium", "direction": "increases_recovery"},
            {"feature": "Device Trust", "value": "Recognized device — same as prior 4 transactions", "impact": "medium", "direction": "increases_recovery"},
        ],
        "demo_narrative": [
            "Risk detected: ₹14,999 checkout failure on Stripe (Black Friday)",
            "AI diagnoses gateway degradation: Stripe failure rate at 38% (baseline: 1.2%)",
            "This is NOT a customer fault — infrastructure overload",
            "Strategy A: Failover to PayU — probability 94%",
            "Policy Gate: All 6 rules passed ✓",
            "Transaction re-routed to PayU within 1.8 seconds",
            "Customer sees normal loading spinner → Payment Successful",
            "✓ ₹14,999 RECOVERED — Customer experience preserved",
        ],
    },

    # ─── Scenario 003: High-Value False Positive — Luxe Watches ───────────────
    "high_value_human": {
        "id": "demo-case-003",
        "name": "High-Value Transaction — Anti-Fraud False Positive → 3D-Secure → Human Review",
        "scenario_type": "high_value_false_positive",
        "merchant_name": "Luxe Watches",
        "description": (
            "Bank anti-fraud algorithm triggered DO_NOT_HONOR on ₹8,75,000 luxury purchase. "
            "AI detects this is a false positive: IP matches billing address, customer has 19/20 successful prior payments and ₹42L LTV. "
            "Recommends 3D-Secure authentication but amount exceeds ₹5,00,000 policy ceiling — escalated to human review."
        ),
        "amount_inr": 875000.0,
        "failure_category": "suspicious_pattern",
        "failure_code": "DO_NOT_HONOR",
        "failure_label": "Anti-Fraud Algorithm Triggered (False Positive)",
        "gateway": "razorpay",
        "payment_method": "card",
        "case_type": "payment_failure",
        "customer_success_rate": 0.95,
        "customer_lifetime_value_inr": 4200000.0,
        "retry_count": 0,
        "consecutive_failures": 0,
        "gateway_is_degraded": False,
        "gateway_failure_rate_1h": 0.03,
        "days_since_last_success": 3,
        "subscription_age_days": 0,
        "subscription_failed_count": 0,
        "invoice_days_overdue": 0,
        "customer_opted_out": False,
        "is_flagged_customer": False,
        "recovery_probability": 0.82,
        "risk_score": 0.38,
        "recommended_strategy": "escalate",
        "confidence": 0.82,
        "expected_outcome": "HUMAN_REVIEW",
        "expected_amount_recovered": 875000.0,
        "customer_context": {
            "name": "Rajesh Khanna",
            "type": "HNI Consumer",
            "tenure_months": 24,
            "successful_payments": 19,
            "failed_payments": 1,
            "chargebacks": 0,
            "subscription_status": "N/A",
            "payment_timeline": [
                {"month": "Jan 2023", "amount": 125000, "status": "success"},
                {"month": "Mar 2023", "amount": 85000, "status": "success"},
                {"month": "Jun 2023", "amount": 220000, "status": "success"},
                {"month": "Sep 2023", "amount": 175000, "status": "success"},
                {"month": "Dec 2023", "amount": 310000, "status": "success"},
                {"month": "Mar 2024", "amount": 450000, "status": "success"},
                {"month": "Aug 2024", "amount": 875000, "status": "failed"},
            ]
        },
        "device_context": {
            "device_type": "MacBook Pro / Safari",
            "region": "New Delhi, India",
            "billing_region": "New Delhi, India",
            "location_match": True,
            "device_previously_seen": True,
            "device_consistency": "HIGH",
            "suspicious_velocity": False,
        },
        "what_we_will_not_do": [
            "Automatically execute 3D-Secure — amount exceeds automated limit (₹5,00,000)",
            "Retry the card without authentication — DO_NOT_HONOR will be returned again",
            "Flag customer as fraudulent — 19/20 clean payment history contradicts this",
            "Cancel the transaction silently — this is an ₹8,75,000 sale worth saving",
        ],
        "what_happens_next": "Routed to Human Review queue. Operator reviews AI evidence and clicks Approve. 3D-Secure OTP sent to customer. Payment captured.",
        "strategy_options": [
            {
                "id": "A",
                "label": "Strategy A: Force 3D-Secure Authentication",
                "description": "Send OTP to customer's banking app. Bank confirms customer identity. DO_NOT_HONOR lifted as false positive. High probability for this customer profile.",
                "probability": 0.82,
                "risk": "Low",
                "chosen": True,
                "reason_chosen": "82% confidence it is a false positive. 3D-Secure resolves DO_NOT_HONOR when customer identity is verified. Human approval required for this amount.",
            },
            {
                "id": "B",
                "label": "Strategy B: Accept the Decline",
                "description": "Accept the bank refusal. ₹8,75,000 and ₹42L LTV permanently lost.",
                "probability": 0.0,
                "risk": "Extreme",
                "chosen": False,
                "reason_rejected": "Unacceptable. The evidence strongly suggests a false positive. Abandoning ₹8,75,000 without investigation is not defensible.",
            },
        ],
        "policy_checks": [
            {"rule": "Amount below automated ceiling", "passed": False, "detail": "₹8,75,000 exceeds ₹5,00,000 high-value threshold — HUMAN APPROVAL REQUIRED"},
            {"rule": "Retry count within limit", "passed": True, "detail": "0 of 3 retries used"},
            {"rule": "Customer not opted out", "passed": True, "detail": "Consent verified"},
            {"rule": "Customer not flagged for confirmed fraud", "passed": True, "detail": "No confirmed fraud signals. 19/20 clean history."},
            {"rule": "Failure code recoverability", "passed": True, "detail": "DO_NOT_HONOR with clean customer history — likely false positive. 3D-Secure path available."},
            {"rule": "Anti-fraud confidence threshold", "passed": True, "detail": "AI confidence 82% — above 70% threshold for 3D-Secure recommendation"},
        ],
        "policy_decision": "HUMAN_REVIEW",
        "policy_outcome": "Automation blocked — amount exceeds ceiling. Routed to human queue.",
        "feature_contributions": [
            {"feature": "Customer Payment History", "value": "19/20 successful payments — excellent track record (95%)", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Failure Code", "value": "DO_NOT_HONOR — typically bank anti-fraud false positive for clean accounts", "impact": "high", "direction": "increases_recovery"},
            {"feature": "IP vs Billing Match", "value": "IP geolocation matches billing city (New Delhi) — not suspicious", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Transaction Amount", "value": "₹8,75,000 — triggers bank anti-fraud algorithm automatically", "impact": "medium", "direction": "decreases_recovery"},
            {"feature": "Customer LTV", "value": "₹42,00,000 lifetime value — VIP account", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Device Fingerprint", "value": "Recognized device — same as prior 7 transactions over 24 months", "impact": "medium", "direction": "increases_recovery"},
        ],
        "demo_narrative": [
            "Risk detected: ₹8,75,000 premium purchase declined — DO_NOT_HONOR",
            "AI analysis: 82% confidence this is a false positive",
            "Evidence: 19/20 clean history, IP matches billing, recognized device for 24 months",
            "Recommended: 3D-Secure force authentication",
            "Policy Gate: BLOCKED — ₹8,75,000 exceeds ₹5,00,000 human-required ceiling",
            "Case routed to Human Operations queue",
            "Human operator reviews AI evidence and clicks APPROVE",
            "3D-Secure OTP sent to customer banking app — customer verifies in 45 seconds",
            "✓ ₹8,75,000 RECOVERED — False positive resolved",
        ],
    },

    # ─── Scenario 004: Expired Card — Involuntary Churn Prevention ────────────
    "expired_card": {
        "id": "demo-case-004",
        "name": "Expired Card — Involuntary Churn Prevention → Card Update Reminder",
        "scenario_type": "expired_card_churn",
        "merchant_name": "SaaSFlow (B2B)",
        "description": (
            "Subscription renewal failed because the customer's bank issued a new card (fraud protection replacement). "
            "AI correctly identifies this as involuntary churn risk — NOT fraud. "
            "DO NOT cancel the subscription. DO NOT retry (retrying expired cards triggers gateway penalties). "
            "Instead: send a targeted card-update reminder."
        ),
        "amount_inr": 49900.0,
        "failure_category": "expired_payment_method",
        "failure_code": "CARD_EXPIRED",
        "failure_label": "Card Expired (Bank Replacement — Not Fraud)",
        "gateway": "razorpay",
        "payment_method": "card",
        "case_type": "subscription_failure",
        "customer_success_rate": 0.875,
        "customer_lifetime_value_inr": 598800.0,
        "retry_count": 0,
        "consecutive_failures": 0,
        "gateway_is_degraded": False,
        "gateway_failure_rate_1h": 0.03,
        "days_since_last_success": 0,
        "subscription_age_days": 730,
        "subscription_failed_count": 0,
        "invoice_days_overdue": 0,
        "customer_opted_out": False,
        "is_flagged_customer": False,
        "recovery_probability": 0.73,
        "risk_score": 0.45,
        "recommended_strategy": "reminder",
        "confidence": 0.87,
        "expected_outcome": "RECOVERED",
        "expected_amount_recovered": 49900.0,
        "customer_context": {
            "name": "Mehta & Associates",
            "type": "B2B SME",
            "tenure_months": 24,
            "successful_payments": 23,
            "failed_payments": 1,
            "chargebacks": 0,
            "subscription_status": "active",
            "payment_timeline": [
                {"month": "Jan 2023", "amount": 49900, "status": "success"},
                {"month": "Feb 2023", "amount": 49900, "status": "success"},
                {"month": "Mar 2023", "amount": 49900, "status": "success"},
                {"month": "Apr 2023", "amount": 49900, "status": "success"},
                {"month": "May 2023", "amount": 49900, "status": "success"},
                {"month": "Jun 2023", "amount": 49900, "status": "success"},
                {"month": "Jul 2023", "amount": 49900, "status": "success"},
                {"month": "Aug 2023", "amount": 49900, "status": "success"},
                {"month": "Sep 2023", "amount": 49900, "status": "success"},
                {"month": "Oct 2023", "amount": 49900, "status": "success"},
                {"month": "Nov 2023", "amount": 49900, "status": "success"},
                {"month": "Dec 2023", "amount": 49900, "status": "success"},
                {"month": "Jan 2024", "amount": 49900, "status": "success"},
                {"month": "Feb 2024", "amount": 49900, "status": "success"},
                {"month": "Mar 2024", "amount": 49900, "status": "success"},
                {"month": "Apr 2024", "amount": 49900, "status": "success"},
                {"month": "May 2024", "amount": 49900, "status": "success"},
                {"month": "Jun 2024", "amount": 49900, "status": "success"},
                {"month": "Jul 2024", "amount": 49900, "status": "success"},
                {"month": "Aug 2024", "amount": 49900, "status": "success"},
                {"month": "Sep 2024", "amount": 49900, "status": "success"},
                {"month": "Oct 2024", "amount": 49900, "status": "success"},
                {"month": "Nov 2024", "amount": 49900, "status": "success"},
                {"month": "Dec 2024", "amount": 49900, "status": "failed"},
            ]
        },
        "device_context": {
            "device_type": "Windows / Edge",
            "region": "Ahmedabad, India",
            "billing_region": "Ahmedabad, India",
            "location_match": True,
            "device_previously_seen": True,
            "device_consistency": "HIGH",
            "suspicious_velocity": False,
        },
        "what_we_will_not_do": [
            "Retry the same expired card — it will ALWAYS fail and generates gateway penalty signals",
            "Cancel the subscription — 2-year loyal customer experiencing involuntary churn",
            "Flag customer as high risk — they have 23 consecutive successful payments",
            "Send threatening 'payment failed' email — this damages customer relationship",
        ],
        "what_happens_next": "Secure card-update link sent via email. 73% of loyal customers update within 24 hours. Zero gateway penalties incurred.",
        "strategy_options": [
            {
                "id": "A",
                "label": "Strategy A: Send Card Update Reminder (Correct)",
                "description": "Send secure card-update link via email/SMS. 73% of loyal 2-year customers update within 24 hours. Zero gateway API fees. Zero penalty risk.",
                "probability": 0.73,
                "risk": "Low",
                "chosen": True,
                "reason_chosen": "Only valid strategy for CARD_EXPIRED. The card number has changed — retrying is impossible. Customer loyalty (24 months, 23 payments) indicates high update probability.",
            },
            {
                "id": "B",
                "label": "Strategy B: Retry Same Card (Policy Blocked — Card Fatigue Prevention)",
                "description": "Blindly retry the expired card. This WILL fail every time and triggers Visa/Mastercard penalty flags for the merchant. DO NOT DO THIS.",
                "probability": 0.0,
                "risk": "Extreme",
                "chosen": False,
                "reason_rejected": "CARD_EXPIRED is a permanent hard failure for that card number. Retrying generates gateway penalty signals and API fees with zero chance of success.",
            },
            {
                "id": "C",
                "label": "Strategy C: Cancel Subscription (Catastrophic)",
                "description": "Send cancellation email and suspend service. ₹5,98,800 estimated LTV permanently lost. 24-month loyal customer gone.",
                "probability": 0.0,
                "risk": "Catastrophic",
                "chosen": False,
                "reason_rejected": "This is involuntary churn — the customer wants to keep paying. Cancelling destroys ₹5.99L LTV unnecessarily.",
            },
        ],
        "policy_checks": [
            {"rule": "Card expiry verified — retry blocked", "passed": True, "detail": "CARD_EXPIRED detected. Policy blocks retrying — prevents gateway penalty flags"},
            {"rule": "Amount below automated ceiling", "passed": True, "detail": "₹49,900 within ₹50,000 automated limit"},
            {"rule": "Customer not opted out", "passed": True, "detail": "Consent verified for communications"},
            {"rule": "Customer not flagged for fraud", "passed": True, "detail": "2-year subscriber, 23 consecutive payments — no fraud signals"},
            {"rule": "Subscription protection active", "passed": True, "detail": "730-day customer — churn protection tier. Smart reminder preferred over cancellation."},
            {"rule": "Communication channel available", "passed": True, "detail": "Email and SMS on file — reminder can be sent immediately"},
        ],
        "policy_decision": "APPROVED",
        "policy_outcome": "Card update reminder approved. Retry on this card permanently blocked.",
        "feature_contributions": [
            {"feature": "Failure Code", "value": "CARD_EXPIRED — bank issued new card. Customer account still active.", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Subscription Age", "value": "730 days (24 months) — highly loyal subscriber", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Customer LTV", "value": "₹5,98,800 estimated lifetime value at risk of involuntary churn", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Payment History", "value": "23/24 payments successful — only failure is due to card expiry", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Consecutive Failures", "value": "0 consecutive failures historically — isolated event", "impact": "medium", "direction": "increases_recovery"},
            {"feature": "Churn Risk", "value": "Without action: 40% chance of permanent cancellation within 7 days", "impact": "high", "direction": "increases_recovery"},
        ],
        "demo_narrative": [
            "Risk detected: ₹49,900 subscription renewal failed — CARD_EXPIRED",
            "AI identifies: Card replaced by bank (fraud protection), NOT customer cancellation",
            "CRITICAL: Do NOT retry — card number has changed. Retrying triggers gateway penalties.",
            "CRITICAL: Do NOT cancel — customer has 24-month loyalty, ₹5.99L LTV at risk",
            "Strategy A: Send secure card-update reminder email/SMS",
            "Policy Gate: Retry BLOCKED for CARD_EXPIRED. All 6 rules passed ✓",
            "Reminder sent — customer clicks link and updates card in 3 hours",
            "✓ ₹49,900 RECOVERED — ₹5.99L LTV preserved. Zero gateway penalties.",
        ],
    },

    # ─── Scenario 005: Genuine Insufficient Funds — Automation Stopped ────────
    "insufficient_funds_stop": {
        "id": "demo-case-005",
        "name": "Genuine Insufficient Funds — Max Retries Reached → Automation Stopped",
        "scenario_type": "insufficient_funds_stop",
        "merchant_name": "QuickPay Loans",
        "description": (
            "Genuine insufficient funds — 3 retries already exhausted over 14 days. "
            "Unlike the weekend velocity limit case (001), this customer has had 3 consecutive failures. "
            "Policy engine stops automation to prevent gateway penalties and preserve customer relationship. "
            "This is ReviveAI's RESTRAINT in action — knowing when NOT to act is a feature."
        ),
        "amount_inr": 12500.0,
        "failure_category": "insufficient_funds",
        "failure_code": "INSUFFICIENT_FUNDS",
        "failure_label": "Genuine Insufficient Funds — 3 Consecutive Failures",
        "gateway": "razorpay",
        "payment_method": "upi",
        "case_type": "payment_failure",
        "customer_success_rate": 0.571,
        "customer_lifetime_value_inr": 8500.0,
        "retry_count": 3,
        "consecutive_failures": 3,
        "gateway_is_degraded": False,
        "gateway_failure_rate_1h": 0.03,
        "days_since_last_success": 14,
        "subscription_age_days": 0,
        "subscription_failed_count": 0,
        "invoice_days_overdue": 7,
        "customer_opted_out": False,
        "is_flagged_customer": False,
        "recovery_probability": 0.06,
        "risk_score": 0.94,
        "recommended_strategy": "stop",
        "confidence": 0.95,
        "expected_outcome": "STOPPED",
        "expected_amount_recovered": 0.0,
        "customer_context": {
            "name": "Arjun V.",
            "type": "Consumer",
            "tenure_months": 3,
            "successful_payments": 4,
            "failed_payments": 3,
            "chargebacks": 0,
            "subscription_status": "at_risk",
            "payment_timeline": [
                {"month": "Sep", "amount": 12500, "status": "success"},
                {"month": "Oct", "amount": 12500, "status": "success"},
                {"month": "Nov", "amount": 12500, "status": "success"},
                {"month": "Nov W2", "amount": 12500, "status": "success"},
                {"month": "Dec W1", "amount": 12500, "status": "failed"},
                {"month": "Dec W2", "amount": 12500, "status": "failed"},
                {"month": "Dec W3", "amount": 12500, "status": "failed"},
            ]
        },
        "device_context": {
            "device_type": "Android / Chrome",
            "region": "Pune, India",
            "billing_region": "Pune, India",
            "location_match": True,
            "device_previously_seen": True,
            "device_consistency": "HIGH",
            "suspicious_velocity": False,
        },
        "what_we_will_not_do": [
            "Retry again — 3 retries already exhausted. 4th retry triggers Visa/Mastercard merchant penalty",
            "Execute automated recovery — policy engine correctly blocks this",
        ],
        "what_happens_next": "Case escalated to human team for soft-touch collections outreach. No automated retries will be attempted.",
        "strategy_options": [
            {
                "id": "A",
                "label": "Strategy A: Stop Automation (Safe — CHOSEN)",
                "description": "Halt all retries. Prevent Visa/Mastercard merchant penalty flags. Escalate to human team for soft-touch collections outreach.",
                "probability": 0.0,
                "risk": "None — this is the safe path",
                "chosen": True,
                "reason_chosen": "Max retries exceeded. 14 days of consecutive failures indicates genuine payment barrier. Further automation causes merchant penalty, not recovery.",
            },
            {
                "id": "B",
                "label": "Strategy B: Retry Again (Policy Blocked — Safety Ceiling Enforced)",
                "description": "Attempt a 4th retry. This will: (1) fail with 94% certainty, (2) incur API fees, (3) trigger Visa/Mastercard merchant penalty flags affecting ALL future transactions.",
                "probability": 0.06,
                "risk": "Extreme — triggers merchant penalty",
                "chosen": False,
                "reason_rejected": "Policy Gate blocks this. Retry limit is 3. Exceeding it exposes merchant to network fines.",
            },
        ],
        "policy_checks": [
            {"rule": "Retry count within limit", "passed": False, "detail": "3/3 max retries exhausted — STOP required by policy"},
            {"rule": "Consecutive failures within limit", "passed": False, "detail": "3 consecutive failures — pattern indicates genuine inability to pay"},
            {"rule": "Days since last success", "passed": False, "detail": "14 days without success — financial distress signal"},
            {"rule": "Invoice overdue check", "passed": False, "detail": "7 days overdue — escalation required"},
            {"rule": "Customer not opted out", "passed": True, "detail": "Consent still valid"},
            {"rule": "Gateway health", "passed": True, "detail": "Razorpay healthy (3%) — failure is customer-side, not infrastructure"},
        ],
        "policy_decision": "STOPPED",
        "policy_outcome": "Automation stopped. 4 of 6 rules failed. Case escalated to human operations.",
        "feature_contributions": [
            {"feature": "Retry Count", "value": "3/3 maximum retries exhausted", "impact": "high", "direction": "decreases_recovery"},
            {"feature": "Consecutive Failures", "value": "3 consecutive failures over 14 days — genuine inability to pay", "impact": "high", "direction": "decreases_recovery"},
            {"feature": "Days Since Last Success", "value": "14 days — prolonged financial distress signal", "impact": "high", "direction": "decreases_recovery"},
            {"feature": "Invoice Overdue", "value": "7 days overdue — requires human collections approach", "impact": "medium", "direction": "decreases_recovery"},
            {"feature": "Customer Success Rate", "value": "4/7 prior payments (57%) — below acceptable threshold", "impact": "medium", "direction": "decreases_recovery"},
            {"feature": "Gateway Health", "value": "Gateway healthy (3%) — failure is 100% customer-side", "impact": "high", "direction": "decreases_recovery"},
        ],
        "demo_narrative": [
            "Risk detected: ₹12,500 — 3rd consecutive UPI failure over 14 days",
            "AI diagnosis: Genuine insufficient funds — NOT a temporary gateway issue",
            "Compare with Case 001 (weekend velocity limit): that was timing. This is financial distress.",
            "Policy Gate: 4 of 6 rules FAILED — Automation STOPPED",
            "Reason: Max retries exhausted, 14-day failure pattern, overdue invoice",
            "No more automated retries — prevents Visa penalty flags on merchant account",
            "Case escalated to human team for soft-touch collections outreach",
        ],
    },

    # ─── Scenario 006: Anti-Fraud False Positive — 3DS within limit ───────────
    "fraud_false_positive": {
        "id": "demo-case-006",
        "name": "Anti-Fraud False Positive — 3D-Secure Authentication → Automated Recovery",
        "scenario_type": "fraud_false_positive",
        "merchant_name": "TechMart Electronics",
        "description": (
            "Bank anti-fraud algorithm triggered FRAUD_SUSPECTED on ₹35,000 electronics purchase. "
            "Customer enabled international transactions this morning — bank flagged behavioral change. "
            "AI detects false positive: same device, IP matches home location, 9/10 clean history. "
            "Amount is within automated limit — 3D-Secure OTP authentication executed automatically."
        ),
        "amount_inr": 35000.0,
        "failure_category": "suspicious_pattern",
        "failure_code": "FRAUD_SUSPECTED",
        "failure_label": "Anti-Fraud False Positive — Behavioral Trigger",
        "gateway": "cashfree",
        "payment_method": "card",
        "case_type": "payment_failure",
        "customer_success_rate": 0.9,
        "customer_lifetime_value_inr": 185000.0,
        "retry_count": 0,
        "consecutive_failures": 0,
        "gateway_is_degraded": False,
        "gateway_failure_rate_1h": 0.04,
        "days_since_last_success": 2,
        "subscription_age_days": 0,
        "subscription_failed_count": 0,
        "invoice_days_overdue": 0,
        "customer_opted_out": False,
        "is_flagged_customer": False,
        "recovery_probability": 0.78,
        "risk_score": 0.42,
        "recommended_strategy": "route_switch",
        "confidence": 0.78,
        "expected_outcome": "RECOVERED",
        "expected_amount_recovered": 35000.0,
        "customer_context": {
            "name": "Sneha Reddy",
            "type": "Consumer",
            "tenure_months": 14,
            "successful_payments": 9,
            "failed_payments": 1,
            "chargebacks": 0,
            "subscription_status": "N/A",
        },
        "device_context": {
            "device_type": "OnePlus / Chrome",
            "region": "Hyderabad, India",
            "billing_region": "Hyderabad, India",
            "location_match": True,
            "device_previously_seen": True,
            "device_consistency": "HIGH",
            "suspicious_velocity": False,
            "behavioral_anomaly": "International transactions enabled today — bank algorithm triggered",
        },
        "what_we_will_not_do": [
            "Accept the decline permanently — this is a clear false positive",
            "Flag customer for fraud — 9/10 clean history and same recognized device",
            "Require human review — amount is within automated limit for 3DS authentication",
        ],
        "what_happens_next": "3D-Secure OTP sent to customer. Customer verifies in banking app. Anti-fraud flag lifted. Payment captured.",
        "strategy_options": [
            {
                "id": "A",
                "label": "Strategy A: Force 3D-Secure OTP (Correct)",
                "description": "Trigger 3D-Secure authentication. Customer confirms via bank OTP/biometric. Anti-fraud flag lifted. Payment succeeds.",
                "probability": 0.78,
                "risk": "Low",
                "chosen": True,
                "reason_chosen": "78% false positive confidence. Amount within automated limit (₹35K < ₹50K). 3DS is the correct resolution for behavioral anti-fraud triggers.",
            },
            {
                "id": "B",
                "label": "Strategy B: Accept Decline",
                "description": "Accept the bank refusal. ₹35,000 and ₹1.85L LTV permanently lost.",
                "probability": 0.0,
                "risk": "Extreme",
                "chosen": False,
                "reason_rejected": "Evidence strongly supports false positive. No justification for accepting the loss.",
            },
        ],
        "policy_checks": [
            {"rule": "Amount below automated ceiling", "passed": True, "detail": "₹35,000 within ₹50,000 automated limit — 3DS can execute without human approval"},
            {"rule": "Retry count within limit", "passed": True, "detail": "0 of 3 retries used"},
            {"rule": "Customer not opted out", "passed": True, "detail": "Consent verified"},
            {"rule": "Customer not flagged for confirmed fraud", "passed": True, "detail": "9/10 clean payment history — behavioral trigger, not confirmed fraud"},
            {"rule": "Anti-fraud false positive confidence", "passed": True, "detail": "AI confidence 78% — above 70% threshold for automated 3D-Secure attempt"},
            {"rule": "Gateway supports 3D-Secure", "passed": True, "detail": "Cashfree supports 3DS v2 — authentication path available"},
        ],
        "policy_decision": "APPROVED",
        "policy_outcome": "3D-Secure authentication approved for automated execution.",
        "feature_contributions": [
            {"feature": "Failure Code", "value": "FRAUD_SUSPECTED — behavioral trigger, not confirmed fraud", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Customer History", "value": "9/10 prior payments successful — clean record", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Device Fingerprint", "value": "Same recognized device as 8 prior successful transactions", "impact": "high", "direction": "increases_recovery"},
            {"feature": "IP Location", "value": "IP matches registered billing city (Hyderabad) — not suspicious", "impact": "medium", "direction": "increases_recovery"},
            {"feature": "Behavioral Change", "value": "International transactions enabled today — triggered bank algorithm", "impact": "medium", "direction": "decreases_recovery"},
            {"feature": "3D-Secure Availability", "value": "Gateway supports OTP authentication — resolution path available", "impact": "high", "direction": "increases_recovery"},
        ],
        "demo_narrative": [
            "Risk detected: ₹35,000 declined — FRAUD_SUSPECTED",
            "AI analysis: 78% confidence this is a false positive",
            "Evidence: Same device, IP matches home (Hyderabad), 9/10 clean history",
            "Root cause: Customer enabled international transactions this morning — behavioral change triggered bank algorithm",
            "Strategy: Force 3D-Secure OTP authentication (automated — amount within ₹50K limit)",
            "Policy Gate: All 6 rules passed ✓",
            "OTP sent to customer — verified via banking app in 45 seconds",
            "✓ ₹35,000 RECOVERED — Anti-fraud flag lifted by 3D-Secure verification",
        ],
    },

    # ─── Scenario 007: Gateway Spike — Strategy Comparison ────────────────────
    "gateway_spike_comparison": {
        "id": "demo-case-007",
        "name": "Gateway Spike — Strategy A (88%) vs Strategy B (92%) Comparison",
        "scenario_type": "gateway_spike_delay",
        "merchant_name": "FlowSub SaaS",
        "description": (
            "PayU experiencing 34% failure spike on 1st of month. "
            "Customer has 11/15 payment history and is a 14-month subscriber. "
            "AI generates two competing strategies: Smart Delay (88%) vs Gateway Routing to Razorpay (92%). "
            "This case demonstrates the AI's strategy optimization — not just 'retry yes or no' but which approach wins."
        ),
        "amount_inr": 7499.0,
        "failure_category": "gateway_degradation",
        "failure_code": "GATEWAY_TECHNICAL_ERROR",
        "failure_label": "1st-of-Month Gateway Overload — Payday Spike",
        "gateway": "payu",
        "payment_method": "nach",
        "case_type": "subscription_failure",
        "customer_success_rate": 0.733,
        "customer_lifetime_value_inr": 42000.0,
        "retry_count": 1,
        "consecutive_failures": 1,
        "gateway_is_degraded": True,
        "gateway_failure_rate_1h": 0.34,
        "days_since_last_success": 1,
        "subscription_age_days": 420,
        "subscription_failed_count": 2,
        "invoice_days_overdue": 0,
        "customer_opted_out": False,
        "is_flagged_customer": False,
        "recovery_probability": 0.92,
        "risk_score": 0.28,
        "recommended_strategy": "route_switch",
        "confidence": 0.92,
        "expected_outcome": "RECOVERED",
        "expected_amount_recovered": 7499.0,
        "customer_context": {
            "name": "Vishal Enterprises",
            "type": "B2B SME",
            "tenure_months": 14,
            "successful_payments": 11,
            "failed_payments": 4,
            "chargebacks": 0,
            "subscription_status": "active",
        },
        "device_context": {
            "device_type": "Corporate / API (NACH mandate)",
            "region": "Chennai, India",
            "billing_region": "Chennai, India",
            "location_match": True,
            "device_previously_seen": True,
            "device_consistency": "HIGH",
            "suspicious_velocity": False,
        },
        "gateway_intelligence": {
            "primary": {"name": "PayU", "status": "DEGRADED", "failure_rate": 0.34, "baseline": 0.03, "latency_ms": 2400, "note": "1st-of-month payday spike"},
            "backup": {"name": "Razorpay", "status": "HEALTHY", "failure_rate": 0.04, "baseline": 0.03, "latency_ms": 210, "note": "NACH mandate active"},
        },
        "what_we_will_not_do": [
            "Retry on the same degraded PayU gateway (34% failure rate)",
            "Cancel subscription — gateway is at fault, not the customer",
        ],
        "what_happens_next": "Transaction routed to Razorpay via existing NACH mandate. Recovery probability: 92%.",
        "strategy_options": [
            {
                "id": "A",
                "label": "Strategy A: Smart Delay (4 hours)",
                "description": "Wait 4 hours until PayU gateway stabilizes. Historical data shows PayU payday spikes resolve within 2-6 hours. NACH mandate retried on PayU when healthy.",
                "probability": 0.88,
                "risk": "Low",
                "chosen": False,
                "reason_rejected": "Valid strategy but 88% vs 92%. Gateway routing is better — faster recovery, no waiting.",
            },
            {
                "id": "B",
                "label": "Strategy B: Route to Razorpay (Chosen — 92%)",
                "description": "Switch to Razorpay which is healthy (4% failure rate). Customer has active NACH mandate on Razorpay too. Immediate execution.",
                "probability": 0.92,
                "risk": "Low",
                "chosen": True,
                "reason_chosen": "92% vs 88% — marginally better. NACH mandate active on both gateways. Razorpay is healthy. Immediate recovery without waiting.",
            },
        ],
        "policy_checks": [
            {"rule": "Amount below automated ceiling", "passed": True, "detail": "₹7,499 within ₹50,000 limit"},
            {"rule": "Retry count within limit", "passed": True, "detail": "1 of 3 retries — within limit"},
            {"rule": "Customer not opted out", "passed": True, "detail": "Consent verified"},
            {"rule": "Customer not flagged", "passed": True, "detail": "Clean customer record — gateway at fault"},
            {"rule": "Gateway degradation confirmed", "passed": True, "detail": "PayU: 34% failure rate (baseline 3%) — confirmed degraded"},
            {"rule": "Backup gateway healthy with active mandate", "passed": True, "detail": "Razorpay: 4% failure rate. NACH mandate active — route permitted."},
        ],
        "policy_decision": "APPROVED",
        "policy_outcome": "Gateway route switch to Razorpay approved.",
        "feature_contributions": [
            {"feature": "Gateway Failure Rate", "value": "PayU: 34% failure rate (baseline 3%) — major 1st-of-month spike", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Payment Timing", "value": "1st of month — payday for most customers. Gateway overload expected.", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Customer History", "value": "11/15 successful payments — solid history", "impact": "medium", "direction": "increases_recovery"},
            {"feature": "Subscription Age", "value": "420 days (14 months) — long-term subscriber", "impact": "medium", "direction": "increases_recovery"},
            {"feature": "Backup Route Available", "value": "Razorpay healthy (4%), NACH mandate active on both gateways", "impact": "high", "direction": "increases_recovery"},
            {"feature": "Retry Count", "value": "1 prior retry — 2 attempts remaining", "impact": "low", "direction": "neutral"},
        ],
        "demo_narrative": [
            "Risk detected: ₹7,499 NACH subscription failure on PayU",
            "AI analysis: PayU failure rate 34% — gateway spike on 1st of month (payday)",
            "Customer has 11/15 payment history — reliable payer. Gateway is at fault.",
            "Strategy comparison: Smart Delay (88%) vs Gateway Routing to Razorpay (92%)",
            "Optimal choice: Route to Razorpay — higher probability, NACH mandate active, immediate",
            "Policy Gate: All 6 rules passed ✓",
            "✓ ₹7,499 RECOVERED via Razorpay routing",
        ],
    },
}


# ── Helper functions ─────────────────────────────────────────────────────────

_EXTRA_KEYS = {
    "name", "description", "demo_narrative", "expected_outcome", "expected_amount_recovered",
    "scenario_type", "merchant_name", "strategy_options", "policy_checks",
    "customer_context", "device_context", "gateway_intelligence",
    "what_we_will_not_do", "what_happens_next", "failure_label",
    "policy_decision", "policy_outcome",
}


def get_scenario(key: str) -> dict:
    """Get a specific scenario by key."""
    return DEMO_SCENARIOS.get(key, DEMO_SCENARIOS["b2b_saas"])


def get_all_scenarios() -> list[dict]:
    """Get all scenarios in presentation order (ordered for evaluator story arc)."""
    return [
        DEMO_SCENARIOS["b2b_saas"],
        DEMO_SCENARIOS["ecommerce_flashsale"],
        DEMO_SCENARIOS["high_value_human"],
        DEMO_SCENARIOS["expired_card"],
        DEMO_SCENARIOS["insufficient_funds_stop"],
        DEMO_SCENARIOS["fraud_false_positive"],
        DEMO_SCENARIOS["gateway_spike_comparison"],
    ]


def get_scenario_full_metadata(key: str) -> dict:
    """Return the FULL scenario including metadata fields (for /demo/scenarios endpoint)."""
    return DEMO_SCENARIOS.get(key, DEMO_SCENARIOS["b2b_saas"])


def get_all_scenarios_full_metadata() -> list[dict]:
    """Return ALL scenarios with full metadata."""
    return get_all_scenarios()


def strip_seed_extras(scenario: dict) -> dict:
    """Strip extra metadata keys to return a case-schema-compatible dict."""
    return {k: v for k, v in scenario.items() if k not in _EXTRA_KEYS}


# ── Demo Batch Config ─────────────────────────────────────────────────────────

DEMO_BATCH_CONFIG = {
    "scale": 10_000,
    "seed": 42,
    "description": "10,000-record simulation — deterministic, reproducible demo dataset",
    "expected_metrics": {
        "revenue_at_risk_approx": "₹32-36L",
        "recoverable_approx": "₹24-28L",
        "recovery_rate_approx": "54-62%",
        "human_escalations_approx": "150-200",
    },
}

FAILURE_CODE_TAXONOMY = FAILURE_TAXONOMY
