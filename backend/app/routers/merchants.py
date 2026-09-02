"""
ReviveAI — Merchant Profile Router

GET   /api/merchant/me    Current merchant details
PATCH /api/merchant/me    Update merchant profile
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.auth import get_current_user
from app.database import get_db
from app.models.merchant import Merchant, BusinessType
from app.models.user import User

router = APIRouter(prefix="/merchant", tags=["Merchant"])


class MerchantUpdateRequest(BaseModel):
    business_name: str | None = None
    business_type: str | None = None
    business_size: str | None = None
    payment_platform: str | None = None


@router.get("/me")
async def get_my_merchant(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Merchant).where(Merchant.id == current_user.merchant_id)
    )
    merchant: Merchant | None = result.scalars().first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    return {
        "id": merchant.id,
        "name": merchant.name,
        "email": merchant.email,
        "business_type": merchant.business_type.value if merchant.business_type else None,
        "business_size": merchant.business_size,
        "payment_platform": merchant.payment_platform,
        "monthly_gmv_inr": merchant.monthly_gmv_inr,
        "risk_tier": merchant.risk_tier.value if merchant.risk_tier else None,
        "onboarding_complete": merchant.onboarding_complete,
        "created_at": merchant.created_at.isoformat() if merchant.created_at else None,
    }


@router.patch("/me")
async def update_my_merchant(
    body: MerchantUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Merchant).where(Merchant.id == current_user.merchant_id)
    )
    merchant: Merchant | None = result.scalars().first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    if body.business_name is not None:
        merchant.name = body.business_name.strip() or merchant.name
    if body.business_type is not None:
        try:
            merchant.business_type = BusinessType(body.business_type.lower())
        except ValueError:
            pass
    if body.business_size is not None:
        merchant.business_size = body.business_size
    if body.payment_platform is not None:
        merchant.payment_platform = body.payment_platform

    await db.commit()
    await db.refresh(merchant)
    return {"status": "updated", "merchant_id": merchant.id}
