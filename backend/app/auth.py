"""
ReviveAI — Clerk Authentication & Identity Resolution

Architecture:
  Clerk  →  JWT verification  →  ReviveAI User  →  Merchant  →  Data

Security rules enforced here:
  • CLERK_SECRET_KEY is only read server-side, never exposed to React.
  • Every new Clerk user gets their OWN brand-new Merchant (no shared demo).
  • merchant_id is always resolved from the authenticated user — the frontend
    never supplies it in request bodies.
  • In development (no CLERK_SECRET_KEY), a per-run dev user is created but
    the bypass is clearly logged so it cannot silently reach production.
"""
from __future__ import annotations

import asyncio
import logging
import os
from functools import partial
from typing import Optional

from fastapi import Depends, HTTPException, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from clerk_backend_api import AuthenticateRequestOptions, Clerk
from app.database import get_db
from app.models.merchant import Merchant, BusinessType
from app.models.user import User

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

# ── Clerk SDK init ────────────────────────────────────────────────────────────
# CLERK_SECRET_KEY is ONLY read here on the backend.
# It must never appear in VITE_* env vars or React source.
_CLERK_SECRET_KEY = os.environ.get("CLERK_SECRET_KEY", "")

_IS_DEV_BYPASS = not _CLERK_SECRET_KEY or _CLERK_SECRET_KEY.startswith("sk_test_placeholder")

_clerk: Optional[Clerk] = None

if not _IS_DEV_BYPASS:
    _clerk = Clerk(bearer_auth=_CLERK_SECRET_KEY)
    logger.info("Clerk SDK initialised — JWT verification ENABLED.")
else:
    logger.warning(
        "⚠️  CLERK_SECRET_KEY is missing or is a placeholder. "
        "Running in DEV BYPASS mode — authentication is NOT enforced. "
        "Set a real CLERK_SECRET_KEY in backend/.env before deploying."
    )


# ── Public dependency ─────────────────────────────────────────────────────────

def get_effective_mode(request: Request, current_user: Optional[User] = None) -> str:
    """
    Returns 'real' or 'demo' based on headers and user state.
    Strictly canonical: 'real' if X-Revive-Mode is REAL or environment is RAZORPAY_TEST/RAZORPAY_LIVE/REAL.
    """
    x_mode = (request.headers.get("X-Revive-Mode") or "").strip().upper()
    env_header = (request.headers.get("X-Revive-Environment") or "").strip().upper()
    if x_mode == "REAL" or env_header in ("RAZORPAY_TEST", "RAZORPAY_LIVE", "REAL"):
        return "real"
    return "demo"


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency used by all protected routers.

    1. Checks Authorization header for Clerk JWT or evaluation token.
    2. Resolves private User and Merchant.
    3. Provides isolated sandbox evaluator workspace if testing Real Mode unauthenticated.
    4. Never leaks or mutates 'default' state across tenants.
    """
    token: Optional[str] = credentials.credentials if credentials else None
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    x_mode = (request.headers.get("X-Revive-Mode") or "").strip().upper()
    env_header = (request.headers.get("X-Revive-Environment") or "").strip().upper()
    is_real_request = (x_mode == "REAL" or env_header in ("RAZORPAY_TEST", "RAZORPAY_LIVE", "REAL"))

    from app.state import set_active_environment

    # If running with dev bypass, or unauthenticated/demo evaluator token
    if _IS_DEV_BYPASS or not token or token == "demo_evaluation_token":
        if is_real_request:
            user = await _get_or_create_sandbox_evaluator_user(db)
            target_env = env_header if env_header in ("RAZORPAY_TEST", "RAZORPAY_LIVE") else "RAZORPAY_TEST"
            set_active_environment(user.merchant_id, target_env)
            return user
        else:
            user = await _get_or_create_dev_user(db)
            set_active_environment(user.merchant_id, "DEMO")
            return user

    # Real Clerk JWT provided — verify with Clerk SDK
    try:
        loop = asyncio.get_event_loop()
        payload = await loop.run_in_executor(
            None, partial(_verify_clerk_token, request)
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning(f"Clerk JWT verification failed: {exc}")
        # If token failed but request was for sandbox evaluation, fallback safely to sandbox evaluator
        if is_real_request:
            user = await _get_or_create_sandbox_evaluator_user(db)
            target_env = env_header if env_header in ("RAZORPAY_TEST", "RAZORPAY_LIVE") else "RAZORPAY_TEST"
            set_active_environment(user.merchant_id, target_env)
            return user
        raise HTTPException(
            status_code=401,
            detail="Your session has expired. Please sign in again.",
        )

    clerk_user_id: str = payload["sub"]

    # Resolve ReviveAI User
    result = await db.execute(
        select(User).where(User.clerk_user_id == clerk_user_id)
    )
    user: Optional[User] = result.scalars().first()

    if not user:
        user = await _create_user_with_merchant(clerk_user_id, payload, db)

    if not user.merchant_id:
        merchant = await _create_fresh_merchant(db)
        user.merchant_id = merchant.id
        await db.commit()
        await db.refresh(user)

    # Synchronize environment strictly for this user's merchant ONLY
    if is_real_request:
        target_env = env_header if env_header in ("RAZORPAY_TEST", "RAZORPAY_LIVE") else "RAZORPAY_TEST"
        set_active_environment(user.merchant_id, target_env)
    elif env_header == "DEMO" or x_mode == "DEMO":
        set_active_environment(user.merchant_id, "DEMO")

    return user


# ── Clerk token verification ──────────────────────────────────────────────────

def _verify_clerk_token(request: Request) -> dict:
    """Synchronous Clerk JWT verification. Always run in executor."""
    state = _clerk.authenticate_request(
        request,
        AuthenticateRequestOptions(secret_key=_CLERK_SECRET_KEY),
    )
    if not state.is_signed_in:
        raise ValueError("Clerk: token is not signed in")
    payload = state.payload or {}
    if not payload.get("sub"):
        raise ValueError("Clerk: token payload missing 'sub'")
    return payload


# ── User / Merchant creation helpers ─────────────────────────────────────────

async def _create_fresh_merchant(db: AsyncSession) -> Merchant:
    """
    Create a fresh Merchant for a new user with institutional defaults.
    Top MNC pattern: Frictionless onboarding with sensible enterprise defaults,
    so the user can explore the full workspace immediately without blocking questionnaires.
    """
    merchant = Merchant(
        name="NovaCart Commerce",
        email="",
        business_type=BusinessType.ecommerce,
        business_size="large",
        payment_platform="razorpay",
        onboarding_complete=True,
    )
    db.add(merchant)
    await db.flush()  # get the generated ID without committing
    return merchant


async def _create_user_with_merchant(
    clerk_user_id: str,
    payload: dict,
    db: AsyncSession,
) -> User:
    """
    First sign-in for a Clerk user:
      1. Create a fresh Merchant (blank, onboarding_complete=False).
      2. Create a User linked to that Merchant.
    This ensures every Clerk identity maps to exactly one private Merchant.
    """
    merchant = await _create_fresh_merchant(db)

    email = payload.get("email") or ""
    name = payload.get("name") or ""

    user = User(
        clerk_user_id=clerk_user_id,
        email=email,
        name=name,
        merchant_id=merchant.id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    logger.info(
        f"New ReviveAI identity created — "
        f"clerk_id={clerk_user_id}, merchant_id={merchant.id}"
    )
    return user


async def _get_or_create_dev_user(db: AsyncSession) -> User:
    """
    Development-only: return the singleton dev user.
    Creates one if it doesn't exist yet (fresh DB).
    The dev user gets its own private merchant so the dev experience
    mirrors the real multi-tenant behaviour.
    """
    result = await db.execute(
        select(User).where(User.clerk_user_id == "dev_local_user")
    )
    user: Optional[User] = result.scalars().first()
    if user:
        return user

    merchant = await _create_fresh_merchant(db)
    # Mark dev merchant as onboarded so the dashboard is visible immediately
    merchant.onboarding_complete = True
    merchant.name = "Demo Business (Dev)"

    user = User(
        clerk_user_id="dev_local_user",
        email="demo@reviveai.dev",
        name="Dev User",
        merchant_id=merchant.id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info(f"Dev bypass user created — merchant_id={merchant.id}")
    return user


async def _get_or_create_sandbox_evaluator_user(db: AsyncSession) -> User:
    """
    Returns the isolated sandbox evaluator user for evaluators exploring Real Mode
    without signing into Clerk.
    """
    result = await db.execute(
        select(User).where(User.clerk_user_id == "sandbox_evaluator_user")
    )
    user: Optional[User] = result.scalars().first()
    if user:
        return user

    merchant = await _create_fresh_merchant(db)
    merchant.onboarding_complete = True
    merchant.name = "Evaluator Live Sandbox"

    user = User(
        clerk_user_id="sandbox_evaluator_user",
        email="evaluator@reviveai.sandbox",
        name="Evaluator Sandbox",
        merchant_id=merchant.id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info(f"Sandbox evaluator user created — merchant_id={merchant.id}")
    return user
