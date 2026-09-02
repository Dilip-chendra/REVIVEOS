# ReviveAI — Environment Selection & Data Guide

## Environments Overview

### 1. DEMO SCENARIOS
- **Target Audience**: Evaluators, Judges, Leadership walkthroughs.
- **Data State**: Fully populated with 7 rich, curated scenarios (Rs 11,44,898 total at risk, Rs 11,32,398 recoverable opportunity).
- **Features**: Complete failure intelligence, counterfactual lab, policy studio what-if simulations, security chaos lab, and audit ledger.

### 2. RAZORPAY TEST
- **Target Audience**: Developers, QA Engineers, Sandbox integration testing.
- **Data State**: Real test transactions retrieved via 
zp_test_... credentials.
- **Empty State**: Truthful Rs 0 metrics and clear sandbox readiness banners when 0 test payments exist.
- **Safety**: Fully isolated from demo records and live production ledgers.

### 3. RAZORPAY LIVE
- **Target Audience**: Production operations and executive revenue teams.
- **Data State**: Live transaction observation.
- **Safety**: Hard-locked to **READ ONLY** by default. No money movement without cryptographic authorization.
