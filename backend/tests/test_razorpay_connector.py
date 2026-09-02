"""
Tests for Razorpay Connector & Credential Store
"""
import pytest
from app.services.credential_store import credential_store
from app.services.razorpay_service import razorpay_service


def test_credential_encryption_and_masking():
    merchant_id = "test_merchant_1"
    key_id = "rzp_test_1234567890abcdef"
    key_secret = "secret_xyz9876543210"
    webhook_secret = "whsec_secure_token_123"

    # Save credentials
    masked = credential_store.save_credentials(
        merchant_id=merchant_id,
        provider="razorpay",
        key_id=key_id,
        key_secret=key_secret,
        webhook_secret=webhook_secret,
        environment="test",
    )

    # Verify masking
    assert masked["is_configured"] is True
    assert masked["has_key_secret"] is True
    assert masked["has_webhook_secret"] is True
    assert "secret_xyz" not in masked["key_id_masked"]
    assert "rzp_test_" in masked["key_id_masked"]
    assert masked["key_id_masked"].endswith("cdef")

    # Verify decrypted server-side retrieval
    decrypted = credential_store.get_credentials(merchant_id, "razorpay")
    assert decrypted["key_id"] == key_id
    assert decrypted["key_secret"] == key_secret
    assert decrypted["webhook_secret"] == webhook_secret

    # Verify connection_id was generated
    assert masked["connection_id"].startswith("conn_razorpay_test_")

    # Verify clear credentials
    credential_store.clear_credentials(merchant_id, "razorpay")
    after_clear = credential_store.get_credentials(merchant_id, "razorpay")
    assert after_clear["is_configured"] is False


def test_credential_replacement_and_connection_id_rotation():
    merchant_id = "test_merchant_rotate"
    
    # Connect Account A
    masked_a = credential_store.save_credentials(
        merchant_id=merchant_id,
        provider="razorpay",
        key_id="rzp_test_AccountAAAAAA",
        key_secret="secret_aaaaaa",
        environment="test",
    )
    conn_a = masked_a["connection_id"]
    assert "rzp_test_" in masked_a["key_id_masked"]

    # Connect Account B (replace)
    masked_b = credential_store.save_credentials(
        merchant_id=merchant_id,
        provider="razorpay",
        key_id="rzp_test_AccountBBBBBB",
        key_secret="secret_bbbbbb",
        environment="test",
    )
    conn_b = masked_b["connection_id"]

    # Must be distinct connections
    assert conn_a != conn_b
    assert masked_b["key_id_masked"].endswith("BBBB")

    # Decrypted credentials must match Account B
    decrypted = credential_store.get_credentials(merchant_id, "razorpay")
    assert decrypted["key_id"] == "rzp_test_AccountBBBBBB"
    assert decrypted["key_secret"] == "secret_bbbbbb"


def test_error_category_mapping():
    assert razorpay_service.map_error_to_category("GATEWAY_TIMEOUT", "Gateway timed out", "") == "gateway_degradation"
    assert razorpay_service.map_error_to_category("INSUFFICIENT_FUNDS", "Low balance", "") == "insufficient_funds"
    assert razorpay_service.map_error_to_category("CARD_EXPIRED", "Card has expired", "") == "card_expired"
    assert razorpay_service.map_error_to_category("FRAUD_DETECTED", "High risk score", "") == "suspicious_pattern"
    assert razorpay_service.map_error_to_category("UNKNOWN_RANDOM_CODE", "Something weird", "") == "unknown"


def test_canonical_normalization_provenance():
    raw_rzp_payment = {
        "id": "pay_test_001",
        "amount": 250000,  # ₹2,500.00
        "currency": "INR",
        "status": "failed",
        "method": "card",
        "error_code": "INSUFFICIENT_FUNDS",
        "error_description": "The card has insufficient balance.",
        "created_at": 1700000000,
        "email": "sarah@acme.com",
    }

    norm = razorpay_service.normalize_payment(raw_rzp_payment)

    assert norm["amount_inr"] == 2500.0
    assert norm["provider_payment_id"] == "pay_test_001"
    assert norm["failure_category"] == "insufficient_funds"
    assert norm["is_real_provider_data"] is True
    
    # Verify provenance
    assert norm["provenance"]["amount_inr"]["source"] == "PROVIDER_DERIVED"
    assert norm["provenance"]["customer_tenure_months"]["source"] == "UNAVAILABLE"
    assert norm["provenance"]["customer_ltv_inr"]["source"] == "UNAVAILABLE"
    assert norm["data_completeness_pct"] > 0
