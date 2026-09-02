import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


from reviveos_sdk.client import ReviveOSAgentClient


def run_retention_agent(base_url: str = "http://127.0.0.1:8000", tenant_id: str = "MERCH-001"):
    client = ReviveOSAgentClient(
        base_url=base_url,
        agent_id=f"retention_agent_{tenant_id[:6].lower()}",
        hmac_secret=f"hmac_ret_secret_{tenant_id}_2026",
        tenant_id=tenant_id,
    )

    print(f"🎁 [Retention Agent] Proposing 10% Discount Coupon for CUST-9821...")
    decision = client.submit_proposal(
        opportunity_id="OPP-001",
        customer_id="CUST-9821",
        customer_name="Aarav Mehta",
        action_type="OFFER_10PCT_DISCOUNT",
        amount_paise=499900,
        estimated_recovery_probability=0.60,
        estimated_natural_recovery=0.15,
        estimated_cost_paise=300,
        estimated_discount_paise=50000,  # ₹500 discount
        estimated_friction=3.0,
        reason="Offers 10% coupon to avoid churn (destroys ₹500 margin).",
    )

    print(f"🎁 [Retention Agent] Decision received from ReviveOS:")
    print(f"   Status: {decision.get('status')}")
    print(f"   Reason Code: {decision.get('reason_code')}")
    print(f"   Reason: {decision.get('plain_language_reason')}")
    return decision


if __name__ == "__main__":
    run_retention_agent()
