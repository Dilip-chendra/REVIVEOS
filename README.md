# ReviveAI — Autonomous Revenue Recovery Agent
**Razorpay AI Buildathon 2026 — Track 03: AI Revenue Recovery**

ReviveAI is an autonomous agent that stops revenue leakage by finding, diagnosing, and safely recovering failed payments, abandoned checkouts, and overdue invoices.

It does not just generate dashboards. It executes **measured, bounded, and audited recovery actions** at scale.

## 🚀 The Demo Story

The system includes a deterministic, reproducible demo designed to evaluate the 4 core claims of the product:

1. **Measured Money Recovered**: A counterfactual impact simulator processes 10,000 cases to show exactly how much incremental revenue ReviveAI recovers vs a traditional retry system.
2. **AI Reasonableness**: Gemini 2.0 Flash diagnoses failures and recommends specific strategies, with a deterministic fallback to ensure absolute reliability.
3. **Safety & Stopping Rules**: A deterministic Policy Engine enforces strict limits. It automatically stops automated recovery after 3 consecutive failures, and routes high-value transactions (≥ ₹50,000) to a human operations queue. *The LLM cannot bypass this.*
4. **Audit Trail**: Every decision, AI generation, policy check, and human action is logged to an immutable timeline.

### How to Evaluate
1. **Reset Demo**: Click "Razorpay Test Mode" in the top bar and click "Reset Evaluator Demo". This resets the state and loads 4 specific cases:
   - **Case 001** (Gateway Degradation) - Demonstrates Route Switching.
   - **Case 002** (Subscription Failure) - Demonstrates multi-step sequences.
   - **Case 003** (High Value) - Hits the Policy Engine ceiling (≥ ₹50,000) and is safely routed to the human queue.
   - **Case 004** (Repeated Failure) - Hits the stopping rule (3 retries) and halts automation.
2. **Execute Cases**: Open a case, watch the AI Analysis, wait for the Safety Check, and hit "Proceed" to watch execution.
3. **Human Review**: Go to the "Needs Attention" tab to manually approve or reject Case 003.
4. **Impact Analysis**: Go to the "Impact" tab to see the counterfactual simulation on a 10,000-record batch.
5. **Diagnostics**: Go to "Settings" to view the hidden health check verifying API keys, Auth, and AI status.

## 🏗️ Architecture

ReviveAI enforces a strict boundary between AI reasoning and financial execution.

```text
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│   AI Agent      ├─────►│  Policy Engine  ├─────►│ Recovery Engine │
│ (Gemini Flash)  │      │ (Safety Gates)  │      │ (Execution)     │
│                 │      │                 │      │                 │
└─────────────────┘      └────────┬────────┘      └────────┬────────┘
                                  │                        │
                                  ▼                        ▼
                         ┌──────────────────────────────────────────┐
                         │              Audit Trail                 │
                         └──────────────────────────────────────────┘
```

1. **Risk Engine:** Extracts features from payments and scores them deterministically.
2. **AI Agent (Gemini):** Takes the structured context and generates a human-readable diagnosis + structured strategy recommendation.
3. **Policy Engine (The Safety Gate):** Deterministically evaluates the requested action against 7 safety rules (retry limits, amount ceilings, cooldowns).
4. **Recovery Engine:** Executes the bounded workflow (Retry, Route Switch, Reminder, Sequence).
5. **Audit Service:** Appends an immutable record of every decision.
6. **Multi-Tenant State:** Enforces strict Merchant ID isolation.

## 🛠️ Tech Stack

- **Backend:** Python, FastAPI, SQLAlchemy (async), SQLite (PostgreSQL-ready)
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Recharts
- **Auth:** Clerk (JWT verification)
- **AI / ML:** Google Gemini 2.0 Flash
- **Integration:** Razorpay Python SDK (Test-Mode)

## 🏃‍♂️ How to Run Locally

### Prerequisites
- Python 3.10+
- Node.js 20+

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Start the application
uvicorn app.main:app --reload --port 8000
```
*Note: We have pre-configured `.env` for the evaluator with test keys, dev auth bypass, and the Gemini API key.*

### 2. Frontend Setup
```bash
cd frontend
npm install

# Start the dashboard
npm run dev
```

Navigate to `http://localhost:5173` to view the dashboard.

## 🛡️ Evaluator Guarantees
- **No Secrets Exposed**: Frontend `.env` only contains a Publishable Key.
- **No Raw AI Output**: The UI strictly structures all outputs. You will not see raw JSON or model hallucination wrappers.
- **Reliable Fallback**: If Gemini rate limits or fails, the system instantly falls back to the deterministic engine without breaking the UI.
- **True Counterfactuals**: The Impact page runs two parallel realities on the exact same records. It does not use fake multipliers.
