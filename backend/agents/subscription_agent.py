import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


from reviveos_sdk.client import ReviveOSAgentClient


def run_subscription_agent(base_url: str = "http://127.0.0.1:8000", tenant_id: str = "MERCH-001"):
    client = ReviveOSAgentClient(
        base_url=base_url,
        agent_id=f"sub_agent_{tenant_id[:6].lower()}",
        hmac_secret=f"hmac_sub_secret_{tenant_id}_2026",
        tenant_id=tenant_id,
    )

    print(f"🤖 [Subscription Agent] Fetching opportunity context for OPP-001...")
    context = client.get_opportunity_context("OPP-001")
    print(f"   Context: Amount ₹{context.get('amount_inr')}, Code: {context.get('failure_code')}")

    print(f"🤖 [Subscription Agent] Submitting Mandate Retry proposal...")
    decision = client.submit_proposal(
        opportunity_id="OPP-001",
        customer_id=context.get("customer_id", "CUST-9821"),
        customer_name="Aarav Mehta",
        action_type="SCHEDULE_MANDATE_RETRY",
        amount_paise=context.get("amount_paise", 249900),
        estimated_recovery_probability=0.88,
        estimated_natural_recovery=0.10,
        estimated_cost_paise=400,
        estimated_discount_paise=0,
        estimated_friction=1.0,
        reason="Active recurring mandate token on file. Zero-friction S2S debit.",
    )

    print(f"🤖 [Subscription Agent] Decision received from ReviveOS:")
    print(f"   Status: {decision.get('status')}")
    print(f"   Reason: {decision.get('plain_language_reason')}")
    if decision.get("action_contract"):
        print(f"   Action Contract ID: {decision['action_contract'].get('contract_id')}")
        print(f"   Contract TTL: {decision['action_contract'].get('ttl_remaining_seconds')}s")

    return decision


if __name__ == "__main__":
    run_subscription_agent()
