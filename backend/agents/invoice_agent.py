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


def run_invoice_agent(base_url: str = "http://127.0.0.1:8000", tenant_id: str = "MERCH-001"):
    client = ReviveOSAgentClient(
        base_url=base_url,
        agent_id=f"invoice_agent_{tenant_id[:6].lower()}",
        hmac_secret=f"hmac_inv_secret_{tenant_id}_2026",
        tenant_id=tenant_id,
    )

    print(f"📄 [Invoice Agent] Proposing B2B Invoice Reminder for CUST-9821...")
    decision = client.submit_proposal(
        opportunity_id="OPP-001",
        customer_id="CUST-9821",
        customer_name="Aarav Mehta",
        action_type="SEND_INVOICE_REMINDER",
        amount_paise=499900,
        estimated_recovery_probability=0.72,
        estimated_natural_recovery=0.20,
        estimated_cost_paise=150,
        estimated_discount_paise=0,
        estimated_friction=2.0,
        reason="Overdue corporate invoice 14 days past terms. Proposes structured email invoice reminder.",
    )

    print(f"📄 [Invoice Agent] Decision received from ReviveOS:")
    print(f"   Status: {decision.get('status')}")
    print(f"   Reason Code: {decision.get('reason_code')}")
    print(f"   Reason: {decision.get('plain_language_reason')}")
    if decision.get("action_contract"):
        print(f"   Action Contract ID: {decision['action_contract'].get('contract_id')}")
        print(f"   Contract TTL: {decision['action_contract'].get('ttl_remaining_seconds')}s")

    return decision


if __name__ == "__main__":
    run_invoice_agent()
