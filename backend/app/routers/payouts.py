# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.auth import get_current_user, get_effective_mode
from app.models.user import User
from app.state import get_state
from app.services.payout_gateway import payout_gateway

router = APIRouter(prefix="/payouts", tags=["Governed Payouts & Disbursements"])


class RequestPayoutRequest(BaseModel):
    case_id: str
    beneficiary_name: str
    beneficiary_account: str
    amount_inr: float
    purpose: str = "CUSTOMER_REFUND"
    risk_score: float = 0.10
    idempotency_key: Optional[str] = None
    signed_contract: Optional[Dict[str, Any]] = None


class RejectPayoutRequest(BaseModel):
    reason: str


@router.get("")
async def list_payouts(request: Request, current_user: User = Depends(get_current_user)):
    mode = get_effective_mode(request, current_user)
    is_real = mode == "real"
    return payout_gateway.list_payouts(
        merchant_id=current_user.merchant_id,
        is_real_mode=is_real,
    )


@router.post("/request")
async def request_payout(
    req: RequestPayoutRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    mode = get_effective_mode(request, current_user)
    is_demo = mode == "demo"
    return payout_gateway.request_payout(
        merchant_id=current_user.merchant_id,
        case_id=req.case_id,
        beneficiary_name=req.beneficiary_name,
        beneficiary_account=req.beneficiary_account,
        amount_inr=req.amount_inr,
        purpose=req.purpose,
        actor=current_user.email or "OPERATOR",
        risk_score=req.risk_score,
        idempotency_key=req.idempotency_key,
        signed_contract=req.signed_contract,
        is_demo=is_demo,
    )


@router.post("/{payout_id}/approve")
async def approve_payout(
    payout_id: str,
    current_user: User = Depends(get_current_user),
):
    return payout_gateway.approve_payout(
        payout_id=payout_id,
        operator_email=current_user.email or "admin@reviveos.ai",
        merchant_id=current_user.merchant_id,
    )


@router.post("/{payout_id}/reject")
async def reject_payout(
    payout_id: str,
    req: RejectPayoutRequest,
    current_user: User = Depends(get_current_user),
):
    return payout_gateway.reject_payout(
        payout_id=payout_id,
        reason=req.reason,
        operator_email=current_user.email or "admin@reviveos.ai",
        merchant_id=current_user.merchant_id,
    )
