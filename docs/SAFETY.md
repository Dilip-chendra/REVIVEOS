# ReviveAI Safety & Trust

In financial operations, an AI agent cannot be a black box. 
ReviveAI establishes trust through two core mechanisms: **The Policy Engine** and **The Audit Trail**.

## The Policy Engine (Safety Gates)

The Policy Engine (`app/services/policy_engine.py`) sits between the AI's recommendation and the actual execution of a financial action. It evaluates a strict set of deterministic rules.

If **any** rule fails, the automation is immediately blocked and the case is routed to human review.

### Enforced Rules

1. **Amount Ceiling:** Any transaction over `MAX_AUTOMATED_AMOUNT_INR` (₹50,000) is automatically blocked from automation and escalated.
2. **Retry Limits:** The system will never retry a payment more than `MAX_RETRIES_PER_CASE` (3) times.
3. **Consecutive Failures:** If a case fails `MAX_CONSECUTIVE_FAILURES` (2) times in a row, automation stops. This prevents hammering gateways and incurring penalty fees.
4. **Cooldown Periods:** Actions are rate-limited. Retries require a 60-minute cooldown; reminders require a 24-hour cooldown.
5. **Customer Consent:** Customers marked as opted-out of communications will never receive automated reminders or SMS sequences.
6. **Risk Flags:** If a customer account has fraud or suspicious activity flags, no automated recovery is permitted.

## The Audit Trail

ReviveAI implements an append-only audit ledger (`app/services/audit_service.py`). 

- **Immutable:** Events are only inserted. There is no `UPDATE` or `DELETE` functionality.
- **Traceable:** Every event is tied to a `correlation_id`, mapping the entire lifecycle of a single recovery case from risk detection to final recovery.
- **Transparent:** The exact JSON result of every Policy Engine check is recorded. If an action is allowed, the audit trail proves *why* it was allowed.

## AI Graceful Degradation

If the Gemini API is down, rate-limited, or returns an invalid schema, ReviveAI does not crash. It automatically falls back to a deterministic, rule-based explainer. This guarantees uptime for revenue-critical batch processes.
