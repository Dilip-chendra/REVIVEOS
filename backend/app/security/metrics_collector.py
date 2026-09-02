"""
ReviveAI — Real-time Metrics Collector

In-memory counters. Resets on server restart.
Provides actual operational observability (not hardcoded values).
"""
from __future__ import annotations
import time
import asyncio
from collections import defaultdict
from typing import Any

_lock = asyncio.Lock()

_counters: dict[str, int] = defaultdict(int)
_latencies: dict[str, list] = defaultdict(list)
_start_time = time.time()


def increment(metric: str, value: int = 1) -> None:
    """Increment a counter. Thread-safe via GIL for simple int ops."""
    _counters[metric] += value


def record_latency(metric: str, latency_ms: float) -> None:
    """Record a latency sample (ms). Keeps last 1000 samples."""
    samples = _latencies[metric]
    samples.append(latency_ms)
    if len(samples) > 1000:
        samples.pop(0)


def get_avg_latency(metric: str) -> float | None:
    """Get average latency for a metric."""
    samples = _latencies.get(metric, [])
    if not samples:
        return None
    return round(sum(samples) / len(samples), 2)


def get_all() -> dict[str, Any]:
    """Return all current metrics."""
    uptime = time.time() - _start_time
    return {
        "uptime_seconds": round(uptime, 1),
        "counters": dict(_counters),
        "avg_latencies_ms": {
            k: get_avg_latency(k) for k in _latencies
        },
    }
