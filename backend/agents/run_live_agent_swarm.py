import asyncio
import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


from agents.subscription_agent import run_subscription_agent
from agents.cart_agent import run_cart_agent
from agents.retention_agent import run_retention_agent
from agents.invoice_agent import run_invoice_agent


def run_swarm():
    print("=" * 70)
    print("🚀 LAUNCHING 4 INDEPENDENT AI AGENTS AGAINST REVIVEOS GATEWAY")
    print("=" * 70)

    # In a real async/threaded environment, they run concurrently:
    print("\n--- Agent 1: Subscription Agent ---")
    dec_sub = run_subscription_agent()

    print("\n--- Agent 2: Abandoned Cart Agent ---")
    dec_cart = run_cart_agent()

    print("\n--- Agent 3: Retention Discount Agent ---")
    dec_ret = run_retention_agent()

    print("\n--- Agent 4: B2B Invoice Collection Agent ---")
    dec_inv = run_invoice_agent()

    print("\n" + "=" * 70)
    print("🏁 SWARM ARBITRATION SUMMARY (4-AGENT SWARM):")
    print(f"   • Subscription Agent: {dec_sub.get('status')} (NIC: +₹{dec_sub.get('net_incremental_contribution_inr')})")
    print(f"   • Cart Agent:         {dec_cart.get('status')} (Reason: {dec_cart.get('reason_code')})")
    print(f"   • Retention Agent:    {dec_ret.get('status')} (Reason: {dec_ret.get('reason_code')})")
    print(f"   • Invoice Agent:      {dec_inv.get('status')} (Reason: {dec_inv.get('reason_code')})")
    print("=" * 70)


if __name__ == "__main__":
    run_swarm()
