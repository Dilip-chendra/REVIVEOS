"""
ReviveAI — Financial Input Validators

Pydantic validators for all financial inputs.
Rejects invalid, out-of-range, or potentially dangerous values.
"""
from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, field_validator, model_validator

ALLOWED_ACTIONS: frozenset[str] = frozenset({
    "retry",
    "route_switch",
    "send_reminder",
    "send_followup",
    "escalate_human",
    "stop",
    "mark_recovered",
})

MAX_PAYLOAD_CHARS = 65536  # 64KB
MAX_NOTE_CHARS = 2048
MAX_SIMULATION_SCALE = 100_000
MIN_AMOUNT_INR = 1.0
MAX_AMOUNT_INR = 10_000_000.0  # ₹1 crore hard ceiling


def validate_action_type(action: str) -> str:
    """Validate that an action type is in the explicit allowlist."""
    if action not in ALLOWED_ACTIONS:
        raise ValueError(
            f"Action '{action}' is not permitted. Allowed actions: {sorted(ALLOWED_ACTIONS)}"
        )
    return action


def validate_amount(amount: float) -> float:
    """Validate that a financial amount is within acceptable bounds."""
    if amount < MIN_AMOUNT_INR:
        raise ValueError(f"Amount ₹{amount} is below the minimum of ₹{MIN_AMOUNT_INR}")
    if amount > MAX_AMOUNT_INR:
        raise ValueError(f"Amount ₹{amount:,.0f} exceeds the maximum input ceiling of ₹{MAX_AMOUNT_INR:,.0f}")
    return round(amount, 2)


def validate_simulation_scale(scale: int) -> int:
    """Validate simulation scale is within safe range."""
    if scale < 1:
        raise ValueError("Scale must be at least 1")
    if scale > MAX_SIMULATION_SCALE:
        raise ValueError(f"Scale {scale:,} exceeds maximum of {MAX_SIMULATION_SCALE:,}")
    return scale


def sanitize_text(text: str, max_length: int = MAX_NOTE_CHARS) -> str:
    """Sanitize and truncate user-provided text. Strip control characters."""
    # Remove null bytes and control characters (except newline/tab)
    cleaned = "".join(
        c for c in text
        if c in ("\n", "\t") or (ord(c) >= 32 and ord(c) != 127)
    )
    return cleaned[:max_length].strip()
