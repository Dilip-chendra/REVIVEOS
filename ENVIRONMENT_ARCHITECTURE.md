# ReviveAI — Global Environment & Data-Universe Architecture

## 1. Executive Summary & Core Mandate
ReviveAI operates on a strict, non-leaking, multi-universe architecture.

The system enforces three distinct and mutually exclusive operating modes:
1. **DEMO**: Deterministic curated evaluator baseline (7 gold-standard scenarios, ₹11,44,898 total at risk, ₹11,32,398 recoverable, ₹50,000 policy ceilings, PayU degradation drill).
2. **RAZORPAY_TEST**: Real-time connected merchant sandbox. Derived strictly from live Razorpay API synchronization and webhook events (`rzp_test_...`). If 0 test transactions exist in the merchant's sandbox account, every single operational screen reflects truthful zero data with an explicit sandbox readiness banner. Zero silent fallback to demo cases is permitted.
3. **RAZORPAY_LIVE**: Production payment ledger. Read-only observation by default. Real-money automation is hard-locked server-side to prevent accidental recovery execution on production funds without explicit authorization.

---

## 2. Universal Data Flow & Normalization Pipeline

```
                 +--------------------------------------------------------+
                 |                  GLOBAL ENVIRONMENT                    |
                 |          (DEMO | RAZORPAY_TEST | RAZORPAY_LIVE)        |
                 +---------------------------+----------------------------+
                                             |
                       X-Revive-Environment Header & Store
                                             |
             +-------------------------------+-------------------------------+
             |                               |                               |
             v                               v                               v
     [ DEMO SEEDS ]                [ RAZORPAY TEST API ]           [ RAZORPAY LIVE API ]
    (Deterministic 7)              (rzp_test_... sync)             (rzp_live_... read-only)
             |                               |                               |
             +-------------------------------+-------------------------------+
                                             |
                                             v
                             +-------------------------------+
                             |    NORMALIZED PAYMENT EVENT   |
                             |  - environment                |
                             |  - source                     |
                             |  - merchant_id                |
                             |  - payment_id                 |
                             |  - amount_inr                 |
                             |  - failure_code               |
                             |  - recovery_probability       |
                             +---------------+---------------+
                                             |
             +-------------------------------+-------------------------------+
             |                               |                               |
             v                               v                               v
     [ RECOVERY ENGINE ]             [ POLICY FIREWALL ]            [ CRYPTO AUDIT ]
    (Counterfactual EV)              (₹50K hard ceilings)           (SHA-256 ledger)
             |                               |                               |
             +-------------------------------+-------------------------------+
                                             |
                                             v
                               +---------------------------+
                               |     ALL APP SCREENS       |
                               |  - Command Overview       |
                               |  - Revenue Recovery       |
                               |  - Customers              |
                               |  - Failure Intelligence   |
                               |  - Policy Studio          |
                               |  - Human Review Queue     |
                               |  - Copilot Tool Calling   |
                               |  - Financial Impact       |
                               +---------------------------+
```

---

## 3. End-to-End Architectural Enforcement

### A. Frontend Context Store (`EnvironmentContext.tsx`)
- Single canonical React context holding `environment`, `isProviderMode`, `isLiveMode`, and `providerStatus`.
- Persists to `localStorage.getItem("reviveai_active_environment")`.
- Emits global `revive_environment_changed` window events.
- Dispatches environment switch requests to `POST /api/razorpay/environment`.

### B. Universal Request Interceptor (`client.ts`)
- Every outgoing Axios call automatically injects `X-Revive-Environment: <activeEnv>`.
- Guarantees direct URL navigations (e.g. hitting `/risk` or `/customers` directly) send the exact environment state.

### C. Backend Middleware & Authentication (`main.py` + `auth.py`)
- Backend `get_current_user` extracts `X-Revive-Environment` and synchronously aligns merchant state (`state.set_active_environment(user.merchant_id, env)`).
- Merchant data is scoped per-user and per-merchant in `app/state.py`.
- No cross-merchant or cross-universe data leakage is mathematically possible.

### D. Production Safety Guardrails (`RAZORPAY_LIVE`)
- Live environment connects strictly in `READ-ONLY` mode.
- Autonomous recovery execution, retry dispatching, and communication triggers are blocked server-side on live accounts unless multi-party authorization is satisfied.

---

## 4. Summary of Zero-Leakage Guarantees

| Invariant | System Guarantee |
|---|---|
| **No Demo Bleed in Test** | If 0 transactions are in the test sandbox, all cards, customer groups, and opportunity tables show 0 records and honest sandbox banners. |
| **No Test Bleed in Demo** | Demo reset strictly resets the demo state, preserving test and live API sync keys and logs. |
| **AI Copilot Grounding** | All Copilot tools (`get_revenue_leaks`, `get_recovery_opportunities`, etc.) pass the merchant's active environment context. Copilot refuses to answer with demo figures when in Razorpay Test. |
| **Tamper-Evident SHA-256 Ledger** | Each environment maintains its own append-only cryptographic audit chain. |
