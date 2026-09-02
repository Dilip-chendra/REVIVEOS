import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


from reviveos_sdk.client import ReviveOSAgentClient


def run_cart_agent(base_url: str = "http://127.0.0.1:8000", tenant_id: str = "MERCH-001"):
    client = ReviveOSAgentClient(
        base_url=base_url,
        agent_id=f"cart_agent_{tenant_id[:6].lower()}",
        hmac_secret=f"hmac_cart_secret_{tenant_id}_2026",
        tenant_id=tenant_id,
    )

    print(f"🛒 [Cart Agent] Proposing WhatsApp Payment Link for CUST-9821...")
    decision = client.submit_proposal(
        opportunity_id="OPP-001",
        customer_id="CUST-9821",
        customer_name="Aarav Mehta",
        action_type="SEND_PAYMENT_LINK",
        amount_paise=499900,
        estimated_recovery_probability=0.45,
        estimated_natural_recovery=0.15,
        estimated_cost_paise=250,
        estimated_discount_paise=0,
        estimated_friction=4.0,
        reason="Checkout dropped at OTP step. Proposes WhatsApp payment link.",
    )

    print(f"🛒 [Cart Agent] Decision received from ReviveOS:")
    print(f"   Status: {decision.get('status')}")
    print(f"   Reason Code: {decision.get('reason_code')}")
    print(f"   Reason: {decision.get('plain_language_reason')}")
    return decision


if __name__ == "__main__":
    run_cart_agent()
