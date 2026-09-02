import sys
import requests
import json

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass



def attempt_financial_bypass(base_url: str = "http://127.0.0.1:8000"):
    print("🚨 [Rogue Agent] Attempting unauthenticated direct execution on Financial Gateway...")

    # Attempts to call the internal financial execution endpoint without an Action Contract
    # In ReviveOS, all financial execution requires a signed Action Contract.
    payload = {
        "merchant_id": "MERCH-001",
        "case_id": "OPP-ROGUE-01",
        "action_type": "SEND_PAYMENT_LINK",
        "actor": "UNREGISTERED_ROGUE_AGENT",
        "signed_contract": None,  # No contract!
    }

    resp = requests.post(f"{base_url}/api/agents/simulate-bypass", json=payload)
    data = resp.json()

    print("🛡️ [ReviveOS Gateway Response]:")
    print(json.dumps(data["bypass_test"], indent=2))
    print(f"\nVerdict: {'BLOCKED (Secure)' if data['bypass_test']['execution_blocked'] else 'LEAKED'}")
    return data


if __name__ == "__main__":
    attempt_financial_bypass()
