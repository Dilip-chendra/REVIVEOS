# ReviveAI — Razorpay Test & Live Provider Integration Architecture

## 1. Executive Summary & Zero-Contamination Core

ReviveAI provides a **unified autonomous payment recovery and risk intelligence pipeline** capable of ingesting:
1. **Curated Demo Scenarios** (demo_seed): 7 golden evaluator scenarios (CloudCRM, Aura Cosmetics, Luxe Watches, SaaSFlow, QuickPay, TechGadgets, FreshFoods) representing complex enterprise recovery challenges.
2. **Real Razorpay Test Mode** (
azorpay_test_api, 
azorpay_test_webhook): Real payment attempts, failures, customer contacts, and orders fetched from the merchant\'s active Razorpay sandbox (
zp_test_...).
3. **Controlled Sandbox Scenarios** (controlled_simulation): Synthetic failure injections (e.g. PayU 34% gateway outage, card expiry, prompt injection attacks) to test policy ceilings and failover models under test-mode isolation.
4. **Razorpay Live Mode** (
azorpay_live_api): Production merchant observation, hard-locked server-side to **READ-ONLY** by default.

---

## 2. Universal Data Pipeline Flow

`
                      +-------------------------------------------------------+
                      |                 ACTIVE DATA UNIVERSE                  |
                      |        [ DEMO ]   |   [ RAZORPAY TEST ]   |  [ LIVE ]     |
                      +---------------------------+---------------------------+
                                                  |
                                X-Revive-Environment Header
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
                                  |  - source (api/webhook/sim)   |
                                  |  - merchant_id                |
                                  |  - payment_id                 |
                                  |  - amount_inr                 |
                                  |  - failure_code               |
                                  |  - recovery_probability       |
                                  +---------------+---------------+
                                                  |
                                                  v
                                  +-------------------------------+
                                  |    REVIVEAI SIGNAL ENGINE     |
                                  |  - customer history           |
                                  |  - gateway latency/outage     |
                                  |  - risk score calculations    |
                                  +---------------+---------------+
                                                  |
                  +-------------------------------+-------------------------------+
                  |                               |                               |
                  v                               v                               v
          [ AI DIAGNOSIS ]               [ STRATEGY ENGINE ]             [ POLICY FIREWALL ]
          (Gemini 2.0 Flash)             (Counterfactual EV)             (Rs 50K hard ceilings)
                  |                               |                               |
                  +-------------------------------+-------------------------------+
                                                  |
                                                  v
                                  +-------------------------------+
                                  |    SAFE EXECUTION / HUMAN     |
                                  |  - test retry / route switch  |
                                  |  - high-value review queue    |
                                  +---------------+---------------+
                                                  |
                                                  v
                                  +-------------------------------+
                                  |     APPEND-ONLY AUDIT LOG     |
                                  |  - SHA-256 rolling chain      |
                                  |  - cryptographic verification |
                                  +-------------------------------+
`

---

## 3. Server-Side Credential Protection & Zero-Leak Guarantee

- **Key ID & Secret Storage**: Credentials are encrypted using 256-bit Fernet encryption in CredentialStore (ackend/app/services/credential_store.py).
- **Never In Frontend**: Neither key_secret nor raw auth tokens are returned to Vite, React state, or browser localStorage.
- **Header Scoping**: X-Revive-Environment propagates the active universe on every API request.
