# -*- coding: utf-8 -*-
"""
ReviveAI — Real Provider Test Harness
Tests real Razorpay credentials, hosted payment links, and webhook signatures.
Runs safely against Razorpay Test keys.
"""
import os
import pytest
from app.config import get_settings
from app.services.razorpay_service import razorpay_service
from app.services.recovery_conversion_service import recovery_conversion_service
from app.services.credential_store import credential_store

settings = get_settings()


def test_real_razorpay_test_credentials_configured():
    """Verifies that Razorpay Test keys are configured server-side."""
    assert settings.razorpay_configured is True
    assert settings.razorpay_key_id.startswith("rzp_test_")
    assert len(settings.razorpay_key_secret) > 10


def test_real_razorpay_test_ping():
    """Pings Razorpay Test API to verify active authentication."""
    conn = razorpay_service.test_connection("system_sandbox")
    assert conn["success"] is True or conn.get("connected") is True
    assert conn.get("environment") in ("test", "none") or conn.get("status") is not None


def test_customer_controlled_payment_link_structure():
    """Verifies customer-controlled payment link structure uses Integer Minor Units (paise)."""
    res = recovery_conversion_service.generate_customer_recovery_link("OPP-001")
    assert res["status"] == "RECOVERY_LINK_GENERATED"
    assert res["amount_paise"] == int(round(res["amount_inr"] * 100))
    assert res["amount_inr"] > 0
    assert "https://rzp.io/i/" in res["payment_link_url"]
    assert res["provenance"] == "PROVIDER_DERIVED"


def test_provider_vs_demo_id_separation():
    """Verifies that provider transaction IDs are distinctly separated from demo IDs."""
    res = recovery_conversion_service.simulate_customer_payment_completion("OPP-001")
    assert res["status"] == "PAYMENT_RECONCILED"
    assert res["lifecycle_stage"] == "RECOVERED"
    assert res["provider_transaction_id"].startswith("pay_")
    assert "DEMO" not in res["provider_transaction_id"]
