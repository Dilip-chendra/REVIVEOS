"""
ReviveAI — Onboarding Router

POST /api/onboarding/complete   Complete the onboarding wizard and seed demo data
GET  /api/onboarding/status     Check whether the current user has completed onboarding
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.auth import get_current_user
from app.database import get_db
from app.models.merchant import Merchant, BusinessType
from app.models.user import User
from app.state import get_state, reset_state, add_audit_event

# Import the simulation machinery so we can seed demo data
from app.data.generator import DataGenerator
from app.data.seeds import DEMO_SCENARIOS
from app.services.risk_engine import RiskFeatures, risk_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])

VALID_BUSINESS_TYPES = {e.value for e in BusinessType}


class OnboardingRequest(BaseModel):
    business_name: str = "NovaCart Commerce"
    business_type: str = "ecommerce"          # ecommerce / saas / subscription / b2b / other
    business_size: str = "large"              # small / medium / large / enterprise
    payment_platform: str = "razorpay"        # razorpay / stripe / payu / cashfree / other


# ── GET /status ───────────────────────────────────────────────────────────────

@router.get("/status")
async def get_onboarding_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns whether the current user's merchant has completed onboarding.
    Top MNC standard: Non-blocking, defaults to onboarded so user can access workspace immediately.
    """
    result = await db.execute(
        select(Merchant).where(Merchant.id == current_user.merchant_id)
    )
    merchant: Merchant | None = result.scalars().first()
    if not merchant:
        return {
            "onboarded": True,
            "merchant": {
                "id": current_user.merchant_id,
                "name": "NovaCart Commerce",
                "business_type": "ecommerce",
                "business_size": "large",
                "payment_platform": "razorpay",
            },
        }

    # If not previously completed, automatically mark complete for frictionless MNC access
    if not merchant.onboarding_complete:
        merchant.onboarding_complete = True
        if not merchant.name or merchant.name == "My Business":
            merchant.name = "NovaCart Commerce"
        if not merchant.business_type:
            merchant.business_type = BusinessType.ecommerce
        await db.commit()

    return {
        "onboarded": True,
        "merchant": {
            "id": merchant.id,
            "name": merchant.name,
            "business_type": merchant.business_type.value if merchant.business_type else "ecommerce",
            "business_size": merchant.business_size or "large",
            "payment_platform": merchant.payment_platform or "razorpay",
        },
    }


# ── POST /skip ────────────────────────────────────────────────────────────────

@router.post("/skip")
async def skip_onboarding(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    1-Click Top-MNC Quick Start / Skip:
    Instantly marks onboarding as complete with enterprise defaults so the user
    enters the workspace immediately with zero blocking questionnaires.
    """
    result = await db.execute(
        select(Merchant).where(Merchant.id == current_user.merchant_id)
    )
    merchant: Merchant | None = result.scalars().first()
    if not merchant:
        merchant = Merchant(
            id=current_user.merchant_id,
            name="NovaCart Commerce",
            email=current_user.email or "",
            business_type=BusinessType.ecommerce,
            business_size="large",
            payment_platform="razorpay",
            onboarding_complete=True,
        )
        db.add(merchant)
        await db.flush()
    else:
        merchant.onboarding_complete = True
        if not merchant.name or merchant.name == "My Business":
            merchant.name = "NovaCart Commerce"
        if not merchant.business_type:
            merchant.business_type = BusinessType.ecommerce

    mid = merchant.id
    state = get_state(mid)
    if not state.get("has_run") and not state.get("cases"):
        _seed_demo_for_merchant(mid, state)
        state["has_run"] = True
        state["completed_at"] = datetime.now(timezone.utc).isoformat()

    await db.commit()
    return {"status": "skipped", "onboarded": True, "merchant_id": mid}


# ── POST /complete ─────────────────────────────────────────────────────────────

@router.post("/complete")
async def complete_onboarding(
    body: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Completes the onboarding wizard:
      1. Validates and saves merchant profile.
      2. Seeds a realistic demo simulation into THIS merchant's private state.
      3. Marks onboarding_complete = True.

    After this call the frontend can navigate to the dashboard.
    """
    # ── Validate business type ────────────────────────────────────────────
    btype = body.business_type.lower()
    if btype not in VALID_BUSINESS_TYPES:
        btype = "other"

    # ── Fetch and update Merchant ─────────────────────────────────────────
    result = await db.execute(
        select(Merchant).where(Merchant.id == current_user.merchant_id)
    )
    merchant: Merchant | None = result.scalars().first()
    if not merchant:
        merchant = Merchant(
            id=current_user.merchant_id,
            name=body.business_name.strip() or "My Business",
            email=current_user.email or "",
            business_type=BusinessType(btype),
            business_size=body.business_size,
            payment_platform=body.payment_platform,
            onboarding_complete=True,
        )
        db.add(merchant)
        await db.flush()

    if merchant.onboarding_complete:
        # Idempotent — already done
        return {"status": "already_complete", "merchant_id": merchant.id}

    merchant.name = body.business_name.strip() or "My Business"
    merchant.business_type = BusinessType(btype)
    merchant.business_size = body.business_size
    merchant.payment_platform = body.payment_platform
    merchant.onboarding_complete = True

    # ── Seed demo simulation for this merchant ────────────────────────────
    mid = merchant.id
    state = reset_state(mid)
    state["running"] = True

    _seed_demo_for_merchant(mid, state)

    state["running"] = False
    state["has_run"] = True
    state["completed_at"] = datetime.now(timezone.utc).isoformat()

    add_audit_event(
        merchant_id=mid,
        event_type="ONBOARDING_COMPLETE",
        actor="system",
        correlation_id=f"onboard_{mid}",
        event_data={
            "business_name": merchant.name,
            "business_type": btype,
            "payment_platform": body.payment_platform,
        },
    )

    await db.commit()
    await db.refresh(merchant)

    logger.info(f"Onboarding complete — merchant_id={mid}, name={merchant.name}")

    return {
        "status": "complete",
        "merchant_id": mid,
        "merchant_name": merchant.name,
        "cases_seeded": len(state.get("cases", [])),
    }


# ── Seeding helper ────────────────────────────────────────────────────────────

def _seed_demo_for_merchant(merchant_id: str, state: dict) -> None:
    """
    Load the pre-defined DEMO_SCENARIOS + a small generated dataset and
    score them through the risk engine. All stored into the merchant's
    private state — completely isolated from other merchants.
    """
    cases = []

    # 1. Pre-built demo scenarios (vivid, human-friendly cases)
    scenarios_list = list(DEMO_SCENARIOS.values()) if isinstance(DEMO_SCENARIOS, dict) else list(DEMO_SCENARIOS)
    for d in scenarios_list:
        case = {
            **d,
            "merchant_id": merchant_id,
            "status": "open",
            "is_human_required": False,
            "ai_diagnosis": None,
            "recovery_result": None,
            "last_action_at": None,
            "last_action_type": None,
            "correlation_id": f"demo_{d['id']}",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        cases.append(case)

    # 2. Generate 500 synthetic cases for a realistic dashboard
    try:
        clean_seed = merchant_id.replace("-", "")[:8]
        seed_val = int(clean_seed, 16) % 9999
    except Exception:
        seed_val = 42
    try:
        generator = DataGenerator(scale=500, seed=seed_val)
        dataset = generator.generate()
        records = dataset.all_records
        total_amount = 0
        recoverable_amount = 0
        attempts = 0
        escalations = 0
        category_breakdown: dict = {}
        strategy_breakdown: dict = {}

        for record in records:
            features = RiskFeatures(
                case_id=record.id,
                case_type=record.case_type,
                amount_inr=record.amount_inr,
                total_payments=int(record.customer_success_rate * 10),
                successful_payments=int(record.customer_success_rate * 10),
                customer_lifetime_value_inr=record.customer_lifetime_value_inr,
                days_since_last_success=record.days_since_last_success,
                failure_code=record.failure_code,
                retry_count=record.retry_count,
                consecutive_failures=record.consecutive_failures,
                is_checkout_abandoned=(record.status == "abandoned"),
                gateway=record.gateway,
                gateway_failure_rate_1h=record.gateway_failure_rate_1h,
                gateway_is_degraded=record.gateway_is_degraded,
                hour_of_day=record.hour_of_day,
                day_of_week=record.day_of_week,
                subscription_age_days=record.subscription_age_days,
                subscription_failed_count=record.subscription_failed_count,
                invoice_days_overdue=record.invoice_days_overdue,
            )
            score = risk_engine.score(features)

            case = {
                "id": record.id,
                "merchant_id": merchant_id,
                "customer_id": record.customer_id,
                "case_type": record.case_type,
                "failure_category": record.failure_category,
                "failure_code": record.failure_code,
                "gateway": record.gateway,
                "amount_inr": record.amount_inr,
                "payment_method": record.payment_method,
                "risk_score": score.risk_score,
                "recovery_probability": score.recovery_probability,
                "expected_recovery_value_inr": score.expected_recovery_value_inr,
                "recommended_strategy": score.recommended_strategy,
                "confidence": score.confidence,
                "diagnosis_summary": score.diagnosis_summary,
                "feature_contributions": score.feature_contributions,
                "retry_count": record.retry_count,
                "consecutive_failures": record.consecutive_failures,
                "gateway_is_degraded": record.gateway_is_degraded,
                "gateway_failure_rate_1h": record.gateway_failure_rate_1h,
                "customer_success_rate": record.customer_success_rate,
                "customer_lifetime_value_inr": record.customer_lifetime_value_inr,
                "customer_opted_out": record.customer_opted_out,
                "is_flagged_customer": record.is_flagged_customer,
                "days_since_last_success": record.days_since_last_success,
                "subscription_age_days": record.subscription_age_days,
                "subscription_failed_count": record.subscription_failed_count,
                "invoice_days_overdue": record.invoice_days_overdue,
                "ground_truth_recoverable": record.ground_truth_recoverable,
                "ground_truth_recovered": record.ground_truth_recovered,
                "ground_truth_recovery_method": record.ground_truth_recovery_method,
                "split": record.split,
                "status": "open",
                "is_human_required": score.recommended_strategy == "escalate",
                "ai_diagnosis": None,
                "recovery_result": None,
                "last_action_at": None,
                "last_action_type": None,
                "correlation_id": f"sim_{record.id}",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            cases.append(case)

            total_amount += record.amount_inr
            if score.recovery_probability > 0.3:
                recoverable_amount += record.amount_inr
            if score.recommended_strategy != "stop":
                attempts += 1
            if score.recommended_strategy == "escalate":
                escalations += 1

            category_breakdown[record.failure_category] = (
                category_breakdown.get(record.failure_category, 0) + 1
            )
            strategy_breakdown[score.recommended_strategy] = (
                strategy_breakdown.get(score.recommended_strategy, 0) + 1
            )

        state["metrics"] = {
            "revenue_at_risk_inr": total_amount,
            "recoverable_revenue_inr": recoverable_amount,
            "revenue_recovered_inr": recoverable_amount * 0.62,
            "recovery_rate": 0.62,
            "recovery_attempts": attempts,
            "human_escalations": escalations,
            "blocked_actions": int(attempts * 0.18),
            "open_cases": len(cases),
            "recovered_cases": int(len(cases) * 0.62),
            "failed_cases": int(len(cases) * 0.18),
            "total_cases": len(cases),
            "simulation_scale": 500,
            "razorpay_enriched": False,
            "category_breakdown": category_breakdown,
            "strategy_breakdown": strategy_breakdown,
            "gateway_health": [
                {"gateway": "razorpay", "failure_rate": 0.03, "is_degraded": False},
                {"gateway": "payu",     "failure_rate": 0.34, "is_degraded": True},
                {"gateway": "cashfree", "failure_rate": 0.05, "is_degraded": False},
            ],
        }

    except Exception as exc:
        logger.error(f"Failed to seed synthetic cases: {exc}")
        # Fall back to metrics based on demo scenarios only
        state["metrics"] = {
            "revenue_at_risk_inr": sum(c.get("amount_inr", 0) for c in cases),
            "recoverable_revenue_inr": 0,
            "revenue_recovered_inr": 0,
            "recovery_rate": 0.0,
            "recovery_attempts": 0,
            "human_escalations": 0,
            "blocked_actions": 0,
            "open_cases": len(cases),
            "recovered_cases": 0,
            "failed_cases": 0,
            "total_cases": len(cases),
        }

    state["cases"] = cases
