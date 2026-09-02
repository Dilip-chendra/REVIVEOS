"""
ReviveAI — Idempotency Key Store

Prevents duplicate financial actions.

Usage:
    key = request.headers.get("Idempotency-Key")
    if key:
        cached = await get_idempotency_result(key, merchant_id)
        if cached:
            return JSONResponse(cached, headers={"X-Idempotency-Replay": "true"})
        # ... do work ...
        await store_idempotency_result(key, merchant_id, result)

Stores results for 24 hours. After expiry, the key is treated as new.
One key maps to one merchant — cross-merchant replay is rejected.
"""
from __future__ import annotations
import json
import time
import asyncio
from typing import Any, Optional

# In-memory store: {key: {merchant_id, result, stored_at}}
# For production this would be Redis or a DB table. SQLite in async is tricky
# for arbitrary tables, so we use a well-locked in-memory store that persists
# for the server lifetime (acceptable for demo/hackathon).
_store: dict[str, dict] = {}
_lock = asyncio.Lock()
TTL_SECONDS = 86400  # 24 hours


async def get_idempotency_result(key: str, merchant_id: str) -> Optional[dict]:
    """Return cached result if key exists and belongs to this merchant."""
    async with _lock:
        entry = _store.get(key)
        if not entry:
            return None
        if entry["merchant_id"] != merchant_id:
            # Key exists but belongs to different merchant — reject
            from fastapi import HTTPException
            raise HTTPException(
                status_code=422,
                detail="Idempotency key conflict: this key was used by a different account.",
            )
        if time.monotonic() - entry["stored_at"] > TTL_SECONDS:
            del _store[key]
            return None
        return entry["result"]


async def store_idempotency_result(key: str, merchant_id: str, result: Any) -> None:
    """Store the result for a given idempotency key."""
    async with _lock:
        _store[key] = {
            "merchant_id": merchant_id,
            "result": result,
            "stored_at": time.monotonic(),
        }


async def clear_expired() -> int:
    """Remove expired entries. Call periodically."""
    now = time.monotonic()
    async with _lock:
        expired = [k for k, v in _store.items() if now - v["stored_at"] > TTL_SECONDS]
        for k in expired:
            del _store[k]
        return len(expired)


def get_store_stats() -> dict:
    """Return stats about the idempotency store."""
    now = time.monotonic()
    active = sum(1 for v in _store.values() if now - v["stored_at"] <= TTL_SECONDS)
    return {"active_keys": active, "total_keys": len(_store), "ttl_seconds": TTL_SECONDS}
