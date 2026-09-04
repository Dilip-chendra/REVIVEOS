# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.auth import get_current_user, get_effective_mode
from app.models.user import User
from app.state import get_state
from app.services.communication_orchestrator import communication_orchestrator
from app.services.channel_optimizer import channel_optimizer

router = APIRouter(prefix="/communications", tags=["Omnichannel Communications"])


class SendCommunicationRequest(BaseModel):
    case_id: str
    customer_id: str
    customer_name: str
    channel: str
    recipient: str
    subject_or_preview: str
    message_body: str
    strategy: str = "CUSTOMER_PROMPT"
    expected_nic_inr: float = 0.0
    customer_opt_out: bool = False
    idempotency_key: Optional[str] = None
    signed_contract: Optional[Dict[str, Any]] = None


class PreviewCommunicationRequest(BaseModel):
    case_id: str
    amount_inr: float
    channel: str = "WHATSAPP"
    customer_tenure_months: int = 6
    prior_contacts_24h: int = 0
    customer_opt_out: bool = False


@router.get("")
async def list_communications(
    request: Request,
    channel: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    mode = get_effective_mode(request, current_user)
    is_real = mode == "real"
    return communication_orchestrator.list_communications(
        merchant_id=current_user.merchant_id,
        channel_filter=channel,
        status_filter=status,
        is_real_mode=is_real,
    )


@router.post("/send")
async def send_communication(
    req: SendCommunicationRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    mode = get_effective_mode(request, current_user)
    is_demo = mode == "demo"
    res = communication_orchestrator.dispatch_communication(
        merchant_id=current_user.merchant_id,
        case_id=req.case_id,
        customer_id=req.customer_id,
        customer_name=req.customer_name,
        channel=req.channel,
        recipient=req.recipient,
        subject_or_preview=req.subject_or_preview,
        message_body=req.message_body,
        strategy=req.strategy,
        expected_nic_inr=req.expected_nic_inr,
        customer_opt_out=req.customer_opt_out,
        idempotency_key=req.idempotency_key,
        signed_contract=req.signed_contract,
        is_demo=is_demo,
    )
    return res


@router.post("/preview")
async def preview_communication_channels(
    req: PreviewCommunicationRequest,
    current_user: User = Depends(get_current_user),
):
    res = channel_optimizer.optimize_channel(
        case_id=req.case_id,
        amount_inr=req.amount_inr,
        customer_tenure_months=req.customer_tenure_months,
        prior_contacts_24h=req.prior_contacts_24h,
        customer_opt_out=req.customer_opt_out,
    )
    return res


@router.get("/timeline/{case_id}")
async def get_case_recovery_timeline(
    case_id: str,
    current_user: User = Depends(get_current_user),
):
    return communication_orchestrator.get_case_timeline(case_id=case_id)


@router.post("/webhook/{channel}")
async def receive_channel_webhook(
    channel: str,
    payload: Dict[str, Any],
):
    return {
        "status": "PROCESSED",
        "channel": channel.upper(),
        "received_at": payload.get("timestamp"),
    }
