"""
ReviveAI — Recovery Abuse Monitor (Rule-Based)

Deterministic rules, not ML. Detects suspicious recovery patterns.
Statuses: NORMAL, WATCH, REVIEW

This is not a fraud detection system. It is a simple operational
monitor that flags unusual patterns for human review.
"""
from __future__ import annotations
import time
from collections import defaultdict
from typing import Literal

AbuseStatus = Literal["NORMAL", "WATCH", "REVIEW"]

# Per merchant: list of (timestamp, event_type, customer_id, case_id, amount)
_events: dict[str, list] = defaultdict(list)

WATCH_THRESHOLDS = {
    "recovery_attempts_per_hour": 15,
    "failed_payments_same_customer_24h": 5,
    "same_case_retries": 3,
}

REVIEW_THRESHOLDS = {
    "recovery_attempts_per_hour": 30,
    "failed_payments_same_customer_24h": 10,
    "same_case_retries": 5,
}


def record_event(
    merchant_id: str,
    event_type: str,
    customer_id: str = "",
    case_id: str = "",
    amount_inr: float = 0.0,
) -> None:
    """Record an event for abuse monitoring."""
    _events[merchant_id].append({
        "ts": time.monotonic(),
        "wall_ts": time.time(),
        "event_type": event_type,
        "customer_id": customer_id,
        "case_id": case_id,
        "amount_inr": amount_inr,
    })
    # Trim old events (>24h)
    cutoff = time.monotonic() - 86400
    _events[merchant_id] = [e for e in _events[merchant_id] if e["ts"] >= cutoff]


def get_merchant_status(merchant_id: str) -> dict:
    """Evaluate abuse status for a merchant. Returns status + reasons."""
    now = time.monotonic()
    events = _events.get(merchant_id, [])
    
    hour_ago = now - 3600
    day_ago = now - 86400
    
    recent_hour = [e for e in events if e["ts"] >= hour_ago]
    recent_day = [e for e in events if e["ts"] >= day_ago]
    
    # Count recovery attempts in last hour
    attempts_1h = sum(1 for e in recent_hour if e["event_type"] == "recovery_attempt")
    
    # Count by customer in last 24h
    customer_counts: dict[str, int] = defaultdict(int)
    for e in recent_day:
        if e["event_type"] in ("recovery_attempt", "payment_failed") and e["customer_id"]:
            customer_counts[e["customer_id"]] += 1
    max_customer_count = max(customer_counts.values(), default=0)
    
    # Count retries per case
    case_counts: dict[str, int] = defaultdict(int)
    for e in recent_day:
        if e["event_type"] == "recovery_attempt" and e["case_id"]:
            case_counts[e["case_id"]] += 1
    max_case_retries = max(case_counts.values(), default=0)
    
    reasons = []
    
    # Check REVIEW thresholds first
    status: AbuseStatus = "NORMAL"
    if attempts_1h >= REVIEW_THRESHOLDS["recovery_attempts_per_hour"]:
        status = "REVIEW"
        reasons.append(f"{attempts_1h} recovery attempts in last hour (threshold: {REVIEW_THRESHOLDS['recovery_attempts_per_hour']})")
    elif attempts_1h >= WATCH_THRESHOLDS["recovery_attempts_per_hour"]:
        status = "WATCH"
        reasons.append(f"{attempts_1h} recovery attempts in last hour (threshold: {WATCH_THRESHOLDS['recovery_attempts_per_hour']})")
    
    if max_customer_count >= REVIEW_THRESHOLDS["failed_payments_same_customer_24h"]:
        status = "REVIEW"
        reasons.append(f"Single customer has {max_customer_count} failed attempts in 24h")
    elif max_customer_count >= WATCH_THRESHOLDS["failed_payments_same_customer_24h"] and status == "NORMAL":
        status = "WATCH"
        reasons.append(f"Single customer has {max_customer_count} failed attempts in 24h")
    
    if max_case_retries >= REVIEW_THRESHOLDS["same_case_retries"]:
        status = "REVIEW"
        reasons.append(f"Single case has been retried {max_case_retries} times")
    elif max_case_retries >= WATCH_THRESHOLDS["same_case_retries"] and status == "NORMAL":
        status = "WATCH"
        reasons.append(f"Single case has been retried {max_case_retries} times")
    
    return {
        "status": status,
        "reasons": reasons,
        "metrics": {
            "recovery_attempts_last_hour": attempts_1h,
            "max_customer_attempts_24h": max_customer_count,
            "max_case_retries_24h": max_case_retries,
        },
        "note": "Rule-based monitor. Not ML-based.",
    }
