# ReviveAI — Razorpay Test & Scenario Matrix

| Case ID | Source | Failure / Scenario Input | Normalized Category | AI Diagnosis Summary | Recommended Strategy | Policy Check | Execution Outcome | Status |
|---|---|---|---|---|---|---|---|---|
| **SCEN-001** | demo_seed | Rs 4,500 Sub failure (Expired Card) | expired_payment_method | Card expired; do not blindly retry | Payment method update link | PASSED (Under Rs 50K) | Customer notification sent | **VERIFIED** |
| **SCEN-002** | demo_seed | Rs 32,000 Corporate Weekend Decline | 	emporary_failure | Corporate card weekend limit | Smart Delay (Monday 09:30 AM) | PASSED (Under Rs 50K) | Scheduled for Monday retry | **VERIFIED** |
| **SCEN-003** | demo_seed | Rs 8,75,000 Luxe Watches Decline | customer_side | High-value order requiring verification | Human Review & Concierge | BLOCKED (Exceeds Rs 50K) | Escalated to Human Review | **VERIFIED** |
| **SCEN-004** | demo_seed | Rs 1,84,500 PayU Gateway Outage | gateway_degradation | PayU 34% error anomaly detected | Dynamic Failover to Razorpay | PASSED (Failover allowed) | Routed to Razorpay sandbox | **VERIFIED** |
| **SCEN-005** | demo_seed | Rs 12,500 3DS Abandonment | checkout_abandonment | 3DS session timed out on mobile | Contextual WhatsApp nudge | PASSED (1st attempt) | 3DS re-trigger sent | **VERIFIED** |
| **SCEN-006** | demo_seed | Rs 6,400 Recurring Sub (3 Retries) | 
epeated_retry_failure | Max retries reached on card | Stop Automation | PASSED (Safety Stop) | Automation stopped | **VERIFIED** |
| **SCEN-007** | demo_seed | Rs 29,998 High-Risk Fraud Signal | suspicious_pattern | Velocity mismatch & IP mismatch | Step-up 3DS / Hold | PASSED (Hold action) | Placed on compliance hold | **VERIFIED** |
| **RZP-TEST-01**| 
azorpay_test_api | Real Sandbox Payment Fetch | live_test_record | Real-time payload evaluation | Dynamic strategy based on code | Evaluated against active policy | Normalized into ReviveAI ledger | **VERIFIED** |
| **RZP-WH-01**  | 
azorpay_test_webhook | payment.failed Webhook Event | webhook_ingested | Webhook signature verified | Automated triage pipeline | Verified with SHA-256 HMAC | Added to audit ledger | **VERIFIED** |
