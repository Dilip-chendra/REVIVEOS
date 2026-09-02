"""
ReviveAI — Per-Case Execution Lock

Prevents two concurrent requests from executing recovery for the same case.
Without this, a race condition allows double-spending:
  - Request A and B arrive simultaneously for case-123
  - Both check: case status = 'open' → both proceed → two financial actions

This lock ensures only ONE execution runs per case at a time.

Note: in-process only. For multi-worker deployment, use Redis-backed distributed lock.
"""
from __future__ import annotations
import asyncio
from typing import AsyncGenerator
from contextlib import asynccontextmanager
from fastapi import HTTPException

_case_locks: dict[str, asyncio.Lock] = {}
_registry_lock = asyncio.Lock()


async def _get_lock(case_id: str) -> asyncio.Lock:
    async with _registry_lock:
        if case_id not in _case_locks:
            _case_locks[case_id] = asyncio.Lock()
        return _case_locks[case_id]


@asynccontextmanager
async def acquire_case_lock(case_id: str, timeout: float = 5.0) -> AsyncGenerator[None, None]:
    """
    Acquire a per-case execution lock.
    Raises HTTP 409 if the lock is already held (another request is executing).
    Times out after `timeout` seconds to prevent deadlocks.
    """
    lock = await _get_lock(case_id)
    try:
        acquired = await asyncio.wait_for(lock.acquire(), timeout=timeout)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=409,
            detail="Recovery execution is already in progress for this case. Please wait and retry.",
        )
    try:
        yield
    finally:
        lock.release()
