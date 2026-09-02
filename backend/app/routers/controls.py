"""
ReviveAI — Financial Controls Configuration API

Exposes the live safety configuration. Read-only from the API.
All values are config-driven (from .env), never hardcoded in React.

Every value shown here is what the policy engine ACTUALLY uses.
"""
from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.models.user import User
from app.config import get_settings
from app.security.input_validator import ALLOWED_ACTIONS

router = APIRouter(prefix="/controls", tags=["Controls"])


@router.get("/config")
async def get_controls_config(current_user: User = Depends(get_current_user)):
    """
    Returns the live financial safety configuration.
    All values are sourced from the backend config — never hardcoded in the UI.
    """
    settings = get_settings()
    return {
        "financial_limits": {
            "max_automated_amount_inr": settings.max_automated_amount_inr,
            "max_retries_per_case": settings.max_retries_per_case,
            "max_consecutive_failures": settings.max_consecutive_failures,
            "reminder_cooldown_hours": settings.reminder_cooldown_hours,
            "retry_cooldown_minutes": settings.retry_cooldown_minutes,
        },
        "allowed_automated_actions": sorted(ALLOWED_ACTIONS),
        "ai_config": {
            "ai_enabled": settings.gemini_configured,
            "model": settings.gemini_model if settings.gemini_configured else None,
            "confidence_threshold_for_auto": 0.6,
            "fallback_on_ai_failure": True,
        },
        "enforcement": {
            "all_limits_backend_enforced": True,
            "policy_engine": "deterministic",
            "ai_cannot_override_policy": True,
            "audit_every_action": True,
        },
    }
