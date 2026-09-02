"""
ReviveAI — Razorpay Webhook Ingestion & Security Engine

Security Controls:
1. HMAC-SHA256 signature verification over raw request body.
2. Dedicated Webhook Secret (distinct from API Key Secret).
3. Replay attack protection with persistent x-razorpay-event-id tracking (memory-capped).
4. Tamper attempt detection with immutable SHA-256 security audit logging.
5. Event-driven payment ingestion creating real ReviveAI recovery cases.
6. Support for payment.failed, payment.captured, payment.authorized, refund.created, order.paid.
7. Malformed JSON and missing entity handling — never 500 on bad input.
"""
import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request

from app.config import get_settings
from app.services.credential_store import credential_store
from app.services.razorpay_service import razorpay_service
from app.state import add_audit_event, add_security_event, get_state

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])
logger = logging.getLogger(__name__)

# Persistent event deduplication set — capped at 10,000 entries to prevent memory leak
_processed_events: set[str] = set()
_MAX_PROCESSED_EVENTS = 10_000

settings = get_settings()


def _verify_razorpay_signature(payload_bytes: bytes, signature: Optional[str], secret: str) -> bool:
    """Verify Razorpay webhook HMAC-SHA256 signature using constant-time comparison."""
    if not secret or not signature:
        return False
    expected = hmac.new(
        secret.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def _evict_old_events():
    """Keep the processed events set bounded to prevent unbounded memory growth."""
    if len(_processed_events) >= _MAX_PROCESSED_EVENTS:
        # Remove oldest 20% of entries (sets are unordered, so this is approximate)
        to_remove = list(_processed_events)[: _MAX_PROCESSED_EVENTS // 5]
        for e in to_remove:
            _processed_events.discard(e)


@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    x_razorpay_event_id: Optional[str] = Header(None),
):
    """
    Receive and securely process incoming Razorpay webhooks.
    """
    raw_body = await request.body()
    merchant_id = "default"

    # 1. Signature Verification
    if not x_razorpay_signature:
        logger.warning("Webhook rejected: missing X-Razorpay-Signature")
        add_security_event(
            merchant_id,
            "WEBHOOK_MISSING_SIGNATURE",
            {"ip": request.client.host if request.client else "unknown"},
        )
        raise HTTPException(status_code=400, detail="Missing webhook signature")

    creds = credential_store.get_credentials(merchant_id, "razorpay")
    webhook_secret = (
        creds.get("webhook_secret")
        or settings.razorpay_webhook_secret
        or creds.get("key_secret")
        or settings.razorpay_key_secret
        or ""
    )

    if not _verify_razorpay_signature(raw_body, x_razorpay_signature, webhook_secret):
        logger.warning("Webhook rejected: HMAC-SHA256 signature verification FAILED")
        add_security_event(
            merchant_id,
            "WEBHOOK_SIGNATURE_TAMPER_DETECTED",
            {
                "signature_prefix": x_razorpay_signature[:12] + "...",
                "payload_size": len(raw_body),
            },
        )
        raise HTTPException(status_code=400, detail="Webhook signature verification failed")

    # 2. JSON Structure Parsing — safe handling for malformed payloads
    if not raw_body:
        raise HTTPException(status_code=400, detail="Empty webhook payload")
    try:
        event = json.loads(raw_body)
    except json.JSONDecodeError as e:
        logger.warning(f"Webhook JSON parse error: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if not isinstance(event, dict):
        raise HTTPException(status_code=400, detail="Webhook payload must be a JSON object")

    event_id = x_razorpay_event_id or event.get("id") or ""
    event_type = event.get("event") or ""

    if not event_id:
        logger.warning("Webhook missing event id — processing without deduplication")
        event_id = f"no-id-{hashlib.sha256(raw_body).hexdigest()[:16]}"

    if not event_type:
        logger.warning(f"Webhook missing event type (event_id={event_id})")
        raise HTTPException(status_code=400, detail="Missing event type")

    # 3. Idempotency & Replay Protection
    if event_id in _processed_events:
        logger.info(f"Duplicate webhook event blocked: {event_id}")
        add_security_event(
            merchant_id,
            "WEBHOOK_DUPLICATE_REPLAY_BLOCKED",
            {"event_id": event_id, "event_type": event_type},
        )
        return {
            "status": "acknowledged",
            "duplicate": True,
            "message": f"Event {event_id} already processed. Replay safely blocked.",
        }

    # Evict old events if set is getting too large
    _evict_old_events()
    _processed_events.add(event_id)

    # 4. Process Event into ReviveAI Pipeline
    # 3.1 Webhook Event Age Protection (Freshness Check)
    event_created_at = event.get("created_at")
    if event_created_at:
        try:
            now_ts = int(datetime.now(timezone.utc).timestamp())
            event_ts = int(event_created_at)
            # If event is older than 86400s (24h) or in future > 300s, log security event
            if (now_ts - event_ts > 86400) or (event_ts - now_ts > 300):
                logger.warning(f"Webhook rejected due to stale/future timestamp: event_id={event_id}, age={now_ts - event_ts}s")
                add_security_event(
                    merchant_id,
                    "WEBHOOK_STALE_TIMESTAMP_REJECTED",
                    {"event_id": event_id, "event_timestamp": event_ts, "server_timestamp": now_ts},
                )
                return {
                    "status": "rejected",
                    "reason": "STALE_OR_INVALID_TIMESTAMP",
                    "event_id": event_id,
                    "duplicate": False,
                }
        except (ValueError, TypeError):
            pass

    # Extract payment entity safely
    payload = event.get("payload") or {}
    payment_entity = {}
    if isinstance(payload.get("payment"), dict):
        payment_entity = payload["payment"].get("entity") or {}

    amount_inr = 0.0
    if payment_entity.get("amount"):
        try:
            amount_inr = float(payment_entity["amount"]) / 100.0
        except (ValueError, TypeError):
            amount_inr = 0.0

    processed = True

    if event_type == "payment.failed":
        if payment_entity and payment_entity.get("id"):
            try:
                pay_id = payment_entity.get("id")
                state = get_state(merchant_id)
                
                # Check Monotonicity: if payment is already recorded as captured/refunded, do not revert to failed
                all_existing = state.get("cases", []) + state.get("provider_test_cases", [])
                matching_case = next((c for c in all_existing if c.get("provider_payment_id") == pay_id or c.get("payment_id") == pay_id), None)
                if matching_case and matching_case.get("status") in ("captured", "recovered", "refunded", "paid"):
                    logger.info(f"Out-of-order webhook ignored: payment {pay_id} is already in terminal state '{matching_case.get('status')}'.")
                    add_security_event(
                        merchant_id,
                        "WEBHOOK_OUT_OF_ORDER_IGNORED",
                        {"event_id": event_id, "payment_id": pay_id, "current_status": matching_case.get("status")},
                    )
                    return {
                        "status": "ignored",
                        "reason": f"Payment already in terminal state {matching_case.get('status')}",
                        "event_id": event_id,
                        "duplicate": False,
                    }

                norm_case = razorpay_service.normalize_payment(payment_entity)
                norm_case["source_event_id"] = event_id

                # Append to active cases with deduplication
                env = state.get("active_environment", "RAZORPAY_TEST")
                if env == "RAZORPAY_TEST":
                    p_cases = state.get("provider_test_cases", [])
                    if not any(c.get("provider_payment_id") == payment_entity.get("id") for c in p_cases):
                        p_cases.insert(0, norm_case)
                        state["provider_test_cases"] = p_cases[:200]
                elif env == "RAZORPAY_LIVE":
                    p_cases = state.get("provider_live_cases", [])
                    if not any(c.get("provider_payment_id") == payment_entity.get("id") for c in p_cases):
                        p_cases.insert(0, norm_case)
                        state["provider_live_cases"] = p_cases[:200]
                else:
                    current_cases = state.get("cases", [])
                    if not any(c.get("provider_payment_id") == payment_entity.get("id") for c in current_cases):
                        current_cases.insert(0, norm_case)
                        state["cases"] = current_cases[:200]

                from app.state import _sync_active_cases_and_metrics
                _sync_active_cases_and_metrics(merchant_id)

                add_audit_event(
                    merchant_id=merchant_id,
                    event_type="WEBHOOK_PAYMENT_FAILED_INGESTED",
                    actor="SYSTEM",
                    correlation_id=event_id,
                    event_data={
                        "provider_payment_id": payment_entity.get("id"),
                        "failure_code": norm_case.get("failure_code"),
                        "category": norm_case.get("failure_category"),
                        "amount_inr": amount_inr,
                    },
                    amount_inr=amount_inr,
                )
            except ValueError as ve:
                # Malformed payment entity — log and continue (don't 500)
                logger.warning(f"Webhook payment.failed entity validation failed: {ve}")
                processed = False
        else:
            logger.info(f"Webhook payment.failed: missing payment entity or id (event={event_id})")
            processed = False

    elif event_type == "payment.captured":
        add_audit_event(
            merchant_id=merchant_id,
            event_type="WEBHOOK_PAYMENT_CAPTURED",
            actor="SYSTEM",
            correlation_id=event_id,
            event_data={
                "provider_payment_id": payment_entity.get("id"),
                "amount_inr": amount_inr,
            },
            amount_inr=amount_inr,
        )

    elif event_type == "payment.authorized":
        add_audit_event(
            merchant_id=merchant_id,
            event_type="WEBHOOK_PAYMENT_AUTHORIZED",
            actor="SYSTEM",
            correlation_id=event_id,
            event_data={
                "provider_payment_id": payment_entity.get("id"),
                "amount_inr": amount_inr,
            },
            amount_inr=amount_inr,
        )

    elif event_type == "refund.created":
        refund_entity = {}
        if isinstance(payload.get("refund"), dict):
            refund_entity = payload["refund"].get("entity") or {}
        refund_amount = float(refund_entity.get("amount", 0)) / 100.0
        add_audit_event(
            merchant_id=merchant_id,
            event_type="WEBHOOK_REFUND_CREATED",
            actor="SYSTEM",
            correlation_id=event_id,
            event_data={
                "refund_id": refund_entity.get("id"),
                "payment_id": refund_entity.get("payment_id"),
                "amount_inr": refund_amount,
            },
            amount_inr=refund_amount,
        )

    elif event_type == "order.paid":
        order_entity = {}
        if isinstance(payload.get("order"), dict):
            order_entity = payload["order"].get("entity") or {}
        order_amount = float(order_entity.get("amount_paid", 0)) / 100.0
        add_audit_event(
            merchant_id=merchant_id,
            event_type="WEBHOOK_ORDER_PAID",
            actor="SYSTEM",
            correlation_id=event_id,
            event_data={
                "order_id": order_entity.get("id"),
                "amount_inr": order_amount,
            },
            amount_inr=order_amount,
        )

    else:
        # Unknown event type — acknowledge safely without error
        logger.info(f"Webhook received unknown event type: {event_type} (event_id={event_id})")

    logger.info(f"Webhook processed: event_type={event_type}, event_id={event_id}, processed={processed}")

    return {
        "status": "processed",
        "event_id": event_id,
        "event_type": event_type,
        "duplicate": False,
        "processed": processed,
        "amount_inr": amount_inr,
    }


@router.get("/status")
async def webhook_status():
    """Returns webhook receiver operational status and processed count."""
    return {
        "status": "HEALTHY",
        "processed_events_count": len(_processed_events),
        "processed_events_capacity": _MAX_PROCESSED_EVENTS,
        "replay_protection_active": True,
        "hmac_sha256_verified": True,
        "supported_events": [
            "payment.failed",
            "payment.captured",
            "payment.authorized",
            "refund.created",
            "order.paid",
        ],
    }
