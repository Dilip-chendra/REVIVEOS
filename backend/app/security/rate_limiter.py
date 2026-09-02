"""
ReviveAI — Rate Limiter

Sliding window rate limiter, enforced per authenticated merchant.
Protects:
  - recovery execution: 20/minute
  - AI diagnosis: 30/minute  
  - simulation run: 5/minute (expensive)
  - default endpoints: 100/minute

Not a security boundary by itself (auth handles that), but prevents abuse
and runaway AI API costs.
"""
from __future__ import annotations
import time
import asyncio
from collections import defaultdict, deque
from typing import Optional
from fastapi import HTTPException, Request

# Deque of request timestamps per (merchant_id, bucket) key
_windows: dict[str, deque] = defaultdict(deque)
_lock = asyncio.Lock()

LIMITS: dict[str, tuple[int, int]] = {
    "recovery_execute": (20, 60),    # 20 per 60 seconds
    "ai_diagnose": (30, 60),          # 30 per 60 seconds
    "simulation_run": (5, 60),        # 5 per 60 seconds
    "default": (100, 60),             # 100 per 60 seconds
}

async def check_rate_limit(merchant_id: str, bucket: str = "default") -> None:
    """Raise HTTP 429 if rate limit is exceeded. Call from route handlers."""
    max_calls, window_seconds = LIMITS.get(bucket, LIMITS["default"])
    key = f"{merchant_id}:{bucket}"
    now = time.monotonic()
    cutoff = now - window_seconds
    
    async with _lock:
        dq = _windows[key]
        # Remove timestamps outside the window
        while dq and dq[0] < cutoff:
            dq.popleft()
        
        if len(dq) >= max_calls:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Maximum {max_calls} requests per {window_seconds}s for this operation.",
                headers={"Retry-After": str(window_seconds)},
            )
        
        dq.append(now)


def get_rate_limit_status(merchant_id: str, bucket: str = "default") -> dict:
    """Return current rate limit usage for display purposes."""
    max_calls, window_seconds = LIMITS.get(bucket, LIMITS["default"])
    key = f"{merchant_id}:{bucket}"
    now = time.monotonic()
    cutoff = now - window_seconds
    dq = _windows.get(key, deque())
    recent = sum(1 for t in dq if t >= cutoff)
    return {
        "bucket": bucket,
        "limit": max_calls,
        "window_seconds": window_seconds,
        "current_count": recent,
        "remaining": max(0, max_calls - recent),
    }
