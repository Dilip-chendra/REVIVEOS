# -*- coding: utf-8 -*-
"""
ReviveOS — TOCTOU (Time-of-Check to Time-of-Use) Security API Router
Simulates atomic pre-flight state checks preventing duplicate payment executions.
"""
from __future__ import annotations
import uuid
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/security/toctou", tags=["TOCTOU Security"])


class ToctouRequest(BaseModel):
    payment_id: str = "pay_DEMO_9821"
    customer_id: str = "CUST-9821"
    amount_inr: float = 5000.0
    inject_race_condition: bool = True


@router.post("/simulate")
async def simulate_toctou_race(
    req: ToctouRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Simulate the TOCTOU concurrency race condition:
    T0: Decision approved
    T1: Customer independently pays via UPI / banking app
    T2: Background worker attempts execution
    T2 preflight: Live Razorpay provider check catches CAPTURED status -> Action REVOKED.
    """
    trace_id = f"trace_{uuid.uuid4().hex[:12]}"

    if req.inject_race_condition:
        steps = [
            {
                "timestamp": "10:00:00.000",
                "phase": "T0_DECISION_LOCKED",
                "event": "Action Contract Signed",
                "detail": f"ReviveOS approves mandate retry for {req.payment_id} (₹{req.amount_inr:,.0f}). Signed with SHA-256 HMAC.",
                "state": "APPROVED",
                "badge_color": "#00FF66",
            },
            {
                "timestamp": "10:00:01.120",
                "phase": "T1_EXTERNAL_STATE_CHANGE",
                "event": "Customer Pays Independently",
                "detail": f"Customer completes payment on HDFC UPI rail outside ReviveOS workflow. Razorpay status changes to 'captured'.",
                "state": "EXTERNAL_CAPTURED",
                "badge_color": "#00F0FF",
            },
            {
                "timestamp": "10:00:02.005",
                "phase": "T2a_PREFLIGHT_DISPATCH",
                "event": "Worker Queue Readies Action",
                "detail": "Background recovery runner dequeues contract and initiates pre-execution guard sequence.",
                "state": "PREFLIGHT",
                "badge_color": "#F59E0B",
            },
            {
                "timestamp": "10:00:02.040",
                "phase": "T2b_LIVE_PROVIDER_CHECK",
                "event": "Live Razorpay State Verification",
                "detail": f"ReviveOS makes synchronous GET /v1/payments/{req.payment_id}. Provider returns: status='captured', captured_at=10:00:01.",
                "state": "STALE_DETECTION",
                "badge_color": "#A5B4FC",
            },
            {
                "timestamp": "10:00:02.052",
                "phase": "T2c_EXECUTION_REVOCATION",
                "event": "Execution Revoked (TOCTOU Invariant)",
                "detail": f"Action contract revoked before dispatching charge call. Duplicate debit prevented. Customer charged exactly once.",
                "state": "ACTION_REVOKED",
                "badge_color": "#00FF66",
            },
        ]
        outcome = "DUPLICATE_DEBIT_PREVENTED"
        message = "🛡️ Live Provider Pre-Flight Check intercepted race condition. ZERO duplicate debits."
    else:
        steps = [
            {
                "timestamp": "10:00:00.000",
                "phase": "T0_DECISION_LOCKED",
                "event": "Action Contract Signed",
                "detail": f"ReviveOS approves mandate retry for {req.payment_id} (₹{req.amount_inr:,.0f}).",
                "state": "APPROVED",
                "badge_color": "#00FF66",
            },
            {
                "timestamp": "10:00:01.000",
                "phase": "T1_NO_EXTERNAL_CHANGE",
                "event": "Customer Unpaid",
                "detail": "Payment remains in 'failed' status on Razorpay.",
                "state": "STILL_FAILED",
                "badge_color": "#64748B",
            },
            {
                "timestamp": "10:00:02.005",
                "phase": "T2a_PREFLIGHT_DISPATCH",
                "event": "Worker Queue Readies Action",
                "detail": "Background recovery runner dequeues contract.",
                "state": "PREFLIGHT",
                "badge_color": "#F59E0B",
            },
            {
                "timestamp": "10:00:02.040",
                "phase": "T2b_LIVE_PROVIDER_CHECK",
                "event": "Live Provider Check Verified",
                "detail": "Razorpay confirms status='failed'. Safe to execute.",
                "state": "VERIFIED_SAFE",
                "badge_color": "#00FF66",
            },
            {
                "timestamp": "10:00:02.180",
                "phase": "T2c_EXECUTION_SUCCESS",
                "event": "Dispatched to Razorpay Rail",
                "detail": f"Payment retry executed successfully on Razorpay. ₹{req.amount_inr:,.0f} captured.",
                "state": "CAPTURED",
                "badge_color": "#00FF66",
            },
        ]
        outcome = "EXECUTION_PROCEEDS_SAFELY"
        message = "Payment successfully recovered on Razorpay after verifying live state."

    return {
        "trace_id": trace_id,
        "payment_id": req.payment_id,
        "customer_id": req.customer_id,
        "amount_inr": req.amount_inr,
        "race_condition_injected": req.inject_race_condition,
        "duplicate_debit_prevented": req.inject_race_condition,
        "outcome": outcome,
        "message": message,
        "steps": steps,
        "data_provenance": "SIMULATION",
    }
