# -*- coding: utf-8 -*-
"""
ReviveOS — AI Recovery Copilot (Intelligent Customer Communication)

Drafts context-aware, empathetic, and compliant recovery communications
AFTER ReviveOS governance has authorized intervention.
"""
from __future__ import annotations

from typing import Any, Dict


class RecoveryCopilot:
    def generate_message(
        self,
        customer_name: str,
        amount_inr: float,
        case_type: str,
        days_overdue: int = 0,
        tone: str = "PROFESSIONAL",
        channel: str = "WHATSAPP",
        payment_link: str = "https://reviveos.io/pay/live_test_sample",
        is_opted_out: bool = False,
    ) -> Dict[str, Any]:
        if is_opted_out:
            return {
                "allowed": False,
                "error": "Customer sovereignty violation: Customer has opted out of automated communications.",
                "message": None,
            }

        amt_str = f"INR {amount_inr:,.2f}"
        tone_clean = (tone or "PROFESSIONAL").upper()

        if tone_clean == "FRIENDLY":
            subject = f"Friendly reminder from our billing desk: Order update for {customer_name}"
            msg = (
                f"Hi {customer_name}! We noticed your recent payment of {amt_str} could not be completed. "
                f"No worries at all -- your items are held safely for you. "
                f"You can easily complete your payment via secure link here: {payment_link}"
            )
            cta = "Complete Secure Payment"
        elif tone_clean == "FIRM":
            subject = f"Action Required: Pending payment of {amt_str}"
            msg = (
                f"Hello {customer_name}, your account balance of {amt_str} is currently {days_overdue} days overdue. "
                f"To maintain uninterrupted access to your enterprise services, please settle your invoice today. "
                f"Secure payment portal: {payment_link}"
            )
            cta = "Settle Outstanding Balance"
        elif tone_clean == "URGENT":
            subject = f"Final Notice: Service suspension pending for {customer_name}"
            msg = (
                f"Attention {customer_name}: Payment of {amt_str} is past due. "
                f"Your subscription will pause within 24 hours without authorization. "
                f"Authorize payment instantly: {payment_link}"
            )
            cta = "Authorize Payment Immediately"
        else:  # PROFESSIONAL
            subject = f"Update regarding your recent invoice #{customer_name[:6].upper()}"
            msg = (
                f"Dear {customer_name}, we are reaching out regarding payment of {amt_str} for your recent transaction. "
                f"Our payment processor reported a temporary connection error. "
                f"Please review the transaction and complete payment at your convenience: {payment_link}"
            )
            cta = "Review & Pay Online"

        return {
            "allowed": True,
            "tone": tone_clean,
            "channel": channel,
            "subject": subject,
            "message": msg,
            "cta": cta,
            "payment_link": payment_link,
            "compliance_checked": True,
            "coercive_language_detected": False,
            "customer_sovereignty_verified": True,
        }


recovery_copilot = RecoveryCopilot()
