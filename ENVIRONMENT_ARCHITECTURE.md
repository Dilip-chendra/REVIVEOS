# 🌐 ReviveOS — Global Environment & Multi-Universe Architecture
> **Architectural Specification for Strict Multi-Universe Environment Isolation**

---

## 1. Executive Summary

ReviveOS enforces a strict, non-leaking, multi-universe architecture. The platform operates across three mutually exclusive operating modes:

```
                  ┌────────────────────────────────────────────────────────┐
                  │                  GLOBAL ENVIRONMENT                    │
                  │          (DEMO | RAZORPAY_TEST | RAZORPAY_LIVE)        │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                        X-Revive-Environment Header & Store
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
              │                               │                               │
              ▼                               ▼                               ▼
      [ DEMO UNIVERSE ]             [ RAZORPAY TEST API ]           [ RAZORPAY LIVE API ]
     (Deterministic 7)              (rzp_test_... sync)             (rzp_live_... read-only)
              │                               │                               │
              └───────────────────────────────┼───────────────────────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │    NORMALIZED PAYMENT EVENT   │
                              │  - environment                │
                              │  - merchant_id                │
                              │  - amount_inr                 │
                              │  - failure_code               │
                              │  - recovery_probability       │
                              └───────────────┬───────────────┘
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
              │                               │                               │
              ▼                               ▼                               ▼
      [ RECOVERY ENGINE ]             [ POLICY FIREWALL ]            [ CRYPTO AUDIT ]
     (Counterfactual EV)              (₹50K hard ceilings)           (SHA-256 ledger)
```

---

## 2. Operating Modes Breakdown

### 1. DEMO Universe
- **Purpose**: Curated baseline for hackathon judges and evaluators.
- **Dataset**: Coherent 500-case NovaCart Commerce dataset with 7 gold-standard failure scenarios:
  - Scenario 01: Gateway Degradation (PayU failover)
  - Scenario 02: Subscription e-Mandate Failure
  - Scenario 03: High-Value Transaction (>₹50,000 policy ceiling -> Human Queue)
  - Scenario 04: Repeated Retry Limit Reached (3-retry cap rule)
  - Scenario 05: TOCTOU Double-Debit Race
  - Scenario 06: Customer Disengagement Opt-Out
  - Scenario 07: High Natural Recovery (Deliberate WAIT)

### 2. RAZORPAY_TEST Mode (Real Connected Merchant Sandbox)
- **Purpose**: Live developer integration via `rzp_test_...` credentials.
- **Honest Zero-State Guarantee**: If 0 transactions exist in the connected sandbox account, the UI displays an honest zero-data state with a sandbox readiness banner. **Zero synthetic data is ever leaked into Test Mode.**

### 3. RAZORPAY_LIVE Mode (Production Payment Ledger)
- **Purpose**: Live enterprise telemetry observation.
- **Hard-Locked Safety**: Autonomous execution on real funds is hard-locked server-side by default, requiring multi-party cryptographic approval.

---

## 3. End-to-End Architectural Guarantees

| Invariant | System Guarantee |
|---|---|
| **No Demo Bleed in Test** | If 0 test transactions exist in the sandbox, all opportunity tables show 0 records with honest sandbox setup guides. |
| **No Test Bleed in Demo** | Demo reset strictly resets the demo partition, preserving live API keys and real-mode webhook logs. |
| **AI Copilot Grounding** | Copilot tool calling strictly passes the active environment context, refusing to hallucinate demo figures in real mode. |
| **Cryptographic Partitioning** | Each environment maintains its own append-only SHA-256 audit ledger. |