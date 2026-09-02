"""
Tests for Razorpay Webhook HMAC Verification & Replay Protection
"""
import hashlib
import hmac
import json
import pytest
from app.routers.webhooks import _verify_razorpay_signature, _processed_events


def test_webhook_hmac_verification():
    secret = "whsec_test_secret_123"
    payload = json.dumps({"event": "payment.failed", "id": "evt_test_1"}).encode("utf-8")
    
    # Generate valid signature
    valid_sig = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    
    # Check valid
    assert _verify_razorpay_signature(payload, valid_sig, secret) is True
    
    # Check invalid signature
    assert _verify_razorpay_signature(payload, "invalid_tampered_sig", secret) is False
    
    # Check wrong secret
    assert _verify_razorpay_signature(payload, valid_sig, "wrong_secret") is False


def test_replay_protection_set():
    event_id = "evt_replay_test_999"
    assert event_id not in _processed_events
    _processed_events.add(event_id)
    assert event_id in _processed_events
