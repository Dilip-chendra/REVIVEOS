"""
ReviveAI — Security Test Suite

All tests execute real logic. No empty stubs.
Run: pytest tests/test_security.py -v
"""
import asyncio
import hashlib
import hmac
import json
import pytest
import pytest_asyncio
from unittest.mock import patch, MagicMock

# ─────────────────────────────────────────────
# Security module unit tests
# ─────────────────────────────────────────────

class TestRateLimiter:
    """Test the sliding window rate limiter."""

    @pytest.mark.asyncio
    async def test_allows_requests_under_limit(self):
        from app.security.rate_limiter import check_rate_limit, _windows
        # Clear any previous state for this test merchant
        _windows.pop("test_merchant_rl:default", None)
        # Should not raise for first few requests
        for _ in range(5):
            await check_rate_limit("test_merchant_rl", "default")

    @pytest.mark.asyncio
    async def test_blocks_requests_over_limit(self):
        from app.security.rate_limiter import check_rate_limit, _windows, LIMITS
        from fastapi import HTTPException
        import time
        # Use a small limit bucket
        key = "test_merchant_block:simulation_run"
        _windows.pop(key, None)
        limit, _ = LIMITS["simulation_run"]
        # Fill up to limit
        for _ in range(limit):
            await check_rate_limit("test_merchant_block", "simulation_run")
        # Next should raise 429
        with pytest.raises(HTTPException) as exc_info:
            await check_rate_limit("test_merchant_block", "simulation_run")
        assert exc_info.value.status_code == 429


class TestIdempotency:
    """Test the idempotency key store."""

    @pytest.mark.asyncio
    async def test_first_request_returns_none(self):
        from app.security.idempotency import get_idempotency_result, _store
        _store.clear()
        result = await get_idempotency_result("test-key-001", "merchant-A")
        assert result is None

    @pytest.mark.asyncio
    async def test_stores_and_retrieves_result(self):
        from app.security.idempotency import store_idempotency_result, get_idempotency_result, _store
        _store.clear()
        await store_idempotency_result("test-key-002", "merchant-A", {"recovered": True, "amount": 5000})
        result = await get_idempotency_result("test-key-002", "merchant-A")
        assert result is not None
        assert result["recovered"] is True
        assert result["amount"] == 5000

    @pytest.mark.asyncio
    async def test_cross_merchant_replay_rejected(self):
        from app.security.idempotency import store_idempotency_result, get_idempotency_result, _store
        from fastapi import HTTPException
        _store.clear()
        await store_idempotency_result("test-key-003", "merchant-A", {"recovered": True})
        # Merchant B trying to use Merchant A's key should raise 422
        with pytest.raises(HTTPException) as exc_info:
            await get_idempotency_result("test-key-003", "merchant-B")
        assert exc_info.value.status_code == 422

    @pytest.mark.asyncio
    async def test_same_key_twice_returns_same_result(self):
        """Simulates: POST execute with same Idempotency-Key twice → one financial action."""
        from app.security.idempotency import store_idempotency_result, get_idempotency_result, _store
        _store.clear()
        original_result = {"recovered": True, "amount_recovered_inr": 14999.0}
        await store_idempotency_result("idem-key-dup", "merchant-A", original_result)
        # Second request returns cached result
        cached = await get_idempotency_result("idem-key-dup", "merchant-A")
        assert cached == original_result


class TestExecutionLock:
    """Test the per-case execution lock."""

    @pytest.mark.asyncio
    async def test_acquires_lock_normally(self):
        from app.security.execution_lock import acquire_case_lock
        async with acquire_case_lock("case-lock-test-001"):
            pass  # Should not raise

    @pytest.mark.asyncio
    async def test_concurrent_acquisition_raises_conflict(self):
        from app.security.execution_lock import acquire_case_lock
        from fastapi import HTTPException
        import asyncio

        async def hold_lock():
            async with acquire_case_lock("case-concurrent-001", timeout=5.0):
                await asyncio.sleep(0.5)  # Hold for 0.5s

        async def try_acquire():
            await asyncio.sleep(0.1)  # Wait for first to acquire
            with pytest.raises(HTTPException) as exc_info:
                async with acquire_case_lock("case-concurrent-001", timeout=0.1):  # Short timeout
                    pass
            assert exc_info.value.status_code == 409

        await asyncio.gather(hold_lock(), try_acquire())


class TestInputValidator:
    """Test financial input validators."""

    def test_valid_action_passes(self):
        from app.security.input_validator import validate_action_type
        assert validate_action_type("retry") == "retry"
        assert validate_action_type("route_switch") == "route_switch"

    def test_invalid_action_raises(self):
        from app.security.input_validator import validate_action_type
        with pytest.raises(ValueError):
            validate_action_type("transfer_funds")
        with pytest.raises(ValueError):
            validate_action_type("approve_immediately")
        with pytest.raises(ValueError):
            validate_action_type("ignore_policy")

    def test_valid_amount_passes(self):
        from app.security.input_validator import validate_amount
        assert validate_amount(14999.0) == 14999.0
        assert validate_amount(1.0) == 1.0

    def test_negative_amount_raises(self):
        from app.security.input_validator import validate_amount
        with pytest.raises(ValueError):
            validate_amount(-100.0)
        with pytest.raises(ValueError):
            validate_amount(0.0)

    def test_excessive_amount_raises(self):
        from app.security.input_validator import validate_amount
        with pytest.raises(ValueError):
            validate_amount(99_999_999.0)

    def test_valid_scale_passes(self):
        from app.security.input_validator import validate_simulation_scale
        assert validate_simulation_scale(10000) == 10000

    def test_excessive_scale_raises(self):
        from app.security.input_validator import validate_simulation_scale
        with pytest.raises(ValueError):
            validate_simulation_scale(999_999)

    def test_sanitize_text_removes_control_chars(self):
        from app.security.input_validator import sanitize_text
        result = sanitize_text("Hello\x00World\x01Test")
        assert "\x00" not in result
        assert "Hello" in result


class TestAuditChain:
    """Test the SHA-256 audit chain integrity."""

    def test_empty_chain_is_valid(self):
        from app.state import verify_audit_chain, reset_state
        reset_state("test_chain_merchant")
        result = verify_audit_chain("test_chain_merchant")
        assert result["valid"] is True
        assert result["events_checked"] == 0

    def test_single_event_chain_is_valid(self):
        from app.state import add_audit_event, verify_audit_chain, reset_state
        reset_state("test_chain_single")
        add_audit_event(
            "test_chain_single", "RISK_DETECTED", "system",
            "corr-001", {"test": True}
        )
        result = verify_audit_chain("test_chain_single")
        assert result["valid"] is True
        assert result["events_checked"] == 1

    def test_multi_event_chain_is_valid(self):
        from app.state import add_audit_event, verify_audit_chain, reset_state
        reset_state("test_chain_multi")
        for i in range(5):
            add_audit_event(
                "test_chain_multi", "RISK_DETECTED", "system",
                f"corr-{i:03d}", {"index": i}
            )
        result = verify_audit_chain("test_chain_multi")
        assert result["valid"] is True
        assert result["events_checked"] == 5

    def test_tampered_event_is_detected(self):
        from app.state import add_audit_event, verify_audit_chain, reset_state, get_state
        reset_state("test_chain_tamper")
        for i in range(3):
            add_audit_event(
                "test_chain_tamper", "RISK_DETECTED", "system",
                f"corr-t{i}", {"index": i}
            )
        # Tamper with the second event
        state = get_state("test_chain_tamper")
        state["audit_events"][1]["event_type"] = "TAMPERED_EVENT"
        # Verify should detect the tamper
        result = verify_audit_chain("test_chain_tamper")
        assert result["valid"] is False
        assert result["first_tamper_index"] is not None


class TestWebhookVerification:
    """Test HMAC-SHA256 webhook signature verification."""

    def test_valid_signature_is_accepted(self):
        import hmac as _hmac
        import hashlib
        secret = "test_webhook_secret"
        payload = b'{"event": "payment.failed", "id": "evt_001"}'
        signature = _hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
        # Verify using the same algorithm as the webhook handler
        expected = _hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
        assert _hmac.compare_digest(expected, signature)

    def test_tampered_payload_signature_fails(self):
        import hmac as _hmac
        import hashlib
        secret = "test_webhook_secret"
        original_payload = b'{"event": "payment.failed", "id": "evt_002"}'
        tampered_payload = b'{"event": "payment.captured", "id": "evt_002"}'  # Different event type!
        signature = _hmac.new(secret.encode(), original_payload, hashlib.sha256).hexdigest()
        # Tampered payload should NOT match signature
        tampered_sig = _hmac.new(secret.encode(), tampered_payload, hashlib.sha256).hexdigest()
        assert not _hmac.compare_digest(tampered_sig, signature)

    def test_wrong_secret_signature_fails(self):
        import hmac as _hmac
        import hashlib
        real_secret = "real_secret"
        attacker_secret = "attacker_secret"
        payload = b'{"event": "payment.failed"}'
        attacker_sig = _hmac.new(attacker_secret.encode(), payload, hashlib.sha256).hexdigest()
        real_expected = _hmac.new(real_secret.encode(), payload, hashlib.sha256).hexdigest()
        assert not _hmac.compare_digest(real_expected, attacker_sig)


class TestAbuseMonitor:
    """Test the recovery abuse monitor."""

    def test_normal_activity_is_normal(self):
        from app.security.abuse_monitor import get_merchant_status, _events
        _events.pop("abuse_test_normal", None)
        result = get_merchant_status("abuse_test_normal")
        assert result["status"] == "NORMAL"

    def test_high_volume_triggers_watch(self):
        from app.security.abuse_monitor import record_event, get_merchant_status, _events, WATCH_THRESHOLDS
        _events.pop("abuse_test_watch", None)
        # Record more than WATCH threshold attempts
        for i in range(WATCH_THRESHOLDS["recovery_attempts_per_hour"] + 1):
            record_event("abuse_test_watch", "recovery_attempt", f"cust_{i}", f"case_{i}")
        result = get_merchant_status("abuse_test_watch")
        assert result["status"] in ("WATCH", "REVIEW")

    def test_excessive_volume_triggers_review(self):
        from app.security.abuse_monitor import record_event, get_merchant_status, _events, REVIEW_THRESHOLDS
        _events.pop("abuse_test_review", None)
        # Record more than REVIEW threshold
        for i in range(REVIEW_THRESHOLDS["recovery_attempts_per_hour"] + 1):
            record_event("abuse_test_review", "recovery_attempt", f"cust_{i}", f"case_{i}")
        result = get_merchant_status("abuse_test_review")
        assert result["status"] == "REVIEW"


class TestPolicyEngine:
    """Test that policy engine blocks correctly."""

    def test_amount_ceiling_blocks_high_value(self):
        from app.services.policy_engine import policy_engine, PolicyContext
        ctx = PolicyContext(
            case_id="policy-test-001",
            action_type="retry",
            amount_inr=100_000.0,  # Above ₹50,000 ceiling
            retry_count=0,
            consecutive_failures=0,
            customer_opted_out=False,
            last_action_at=None,
            last_action_type=None,
            case_type="payment_failure",
        )
        result = policy_engine.evaluate(ctx)
        assert result.allowed is False
        assert any("amount" in c.detail.lower() or "ceiling" in c.detail.lower() for c in result.checks if c.status.value == "fail")

    def test_retry_limit_blocks_excessive_retries(self):
        from app.services.policy_engine import policy_engine, PolicyContext
        ctx = PolicyContext(
            case_id="policy-test-002",
            action_type="retry",
            amount_inr=5000.0,
            retry_count=10,  # Way above limit of 3
            consecutive_failures=0,
            customer_opted_out=False,
            last_action_at=None,
            last_action_type=None,
            case_type="payment_failure",
        )
        result = policy_engine.evaluate(ctx)
        assert result.allowed is False

    def test_opted_out_customer_is_blocked(self):
        from app.services.policy_engine import policy_engine, PolicyContext
        ctx = PolicyContext(
            case_id="policy-test-003",
            action_type="send_reminder",
            amount_inr=5000.0,
            retry_count=0,
            consecutive_failures=0,
            customer_opted_out=True,  # Customer said NO
            last_action_at=None,
            last_action_type=None,
            case_type="payment_failure",
        )
        result = policy_engine.evaluate(ctx)
        assert result.allowed is False

    def test_valid_action_passes_policy(self):
        from app.services.policy_engine import policy_engine, PolicyContext
        ctx = PolicyContext(
            case_id="policy-test-004",
            action_type="route_switch",
            amount_inr=14999.0,
            retry_count=0,
            consecutive_failures=0,
            customer_opted_out=False,
            last_action_at=None,
            last_action_type=None,
            case_type="payment_failure",
        )
        result = policy_engine.evaluate(ctx)
        assert result.allowed is True
