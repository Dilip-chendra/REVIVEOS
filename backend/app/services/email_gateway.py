# -*- coding: utf-8 -*-
"""
ReviveOS — Email Gateway
Protocol Version: REVIVEOS-COMM-1.0

First-class recovery channel with support for:
  - SMTPEmailProvider (standard authenticated SMTP)
  - MockEmailProvider (for Demo Mode / isolated testing)
  - Templated recovery emails and AI-drafted messages
  - Delivery state tracking: DRAFT, QUEUED, SENT, DELIVERED, FAILED, BLOCKED
  - Strict Real Mode boundary: Never fakes successful delivery if SMTP is unconfigured.
"""
from __future__ import annotations

import os
import uuid
import smtplib
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class EmailDeliveryResult:
    message_id: str
    recipient: str
    subject: str
    status: str  # SENT | DELIVERED | FAILED | BLOCKED | SIMULATED
    provider: str
    timestamp: str
    error: Optional[str] = None
    is_simulated: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


class EmailProvider(ABC):
    @abstractmethod
    def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> EmailDeliveryResult:
        pass


class SMTPEmailProvider(EmailProvider):
    def __init__(self):
        self.host = os.environ.get("SMTP_HOST", "")
        self.port = int(os.environ.get("SMTP_PORT", "587"))
        self.user = os.environ.get("SMTP_USER", "")
        self.password = os.environ.get("SMTP_PASSWORD", "")
        self.from_email = os.environ.get("SMTP_FROM", self.user or "recovery@reviveos.ai")
        self.use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")

    @property
    def is_configured(self) -> bool:
        return bool(self.host and self.user and self.password)

    def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> EmailDeliveryResult:
        msg_id = f"MSG-EML-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.now(timezone.utc).isoformat()

        if not self.is_configured:
            return EmailDeliveryResult(
                message_id=msg_id,
                recipient=to_email,
                subject=subject,
                status="FAILED",
                provider="SMTP",
                timestamp=now,
                error="EMAIL PROVIDER NOT CONFIGURED: Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in backend environment.",
                is_simulated=False,
                metadata=metadata or {},
            )

        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to_email
            msg.set_content(body_text)

            if body_html:
                msg.add_alternative(body_html, subtype="html")

            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.user, self.password)
                server.send_message(msg)

            logger.info(f"Email {msg_id} dispatched via SMTP to {to_email}")
            return EmailDeliveryResult(
                message_id=msg_id,
                recipient=to_email,
                subject=subject,
                status="SENT",
                provider="SMTP",
                timestamp=now,
                is_simulated=False,
                metadata=metadata or {},
            )
        except Exception as e:
            logger.error(f"SMTP dispatch failure to {to_email}: {e}")
            return EmailDeliveryResult(
                message_id=msg_id,
                recipient=to_email,
                subject=subject,
                status="FAILED",
                provider="SMTP",
                timestamp=now,
                error=str(e),
                is_simulated=False,
                metadata=metadata or {},
            )


class MockEmailProvider(EmailProvider):
    def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> EmailDeliveryResult:
        msg_id = f"MSG-SIM-EML-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.now(timezone.utc).isoformat()
        logger.info(f"[SIMULATED] Email {msg_id} delivered to {to_email}")
        return EmailDeliveryResult(
            message_id=msg_id,
            recipient=to_email,
            subject=subject,
            status="DELIVERED",
            provider="MOCK_SIMULATION",
            timestamp=now,
            is_simulated=True,
            metadata=metadata or {},
        )


class EmailGateway:
    def __init__(self):
        self._smtp = SMTPEmailProvider()
        self._mock = MockEmailProvider()

    def send(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        is_demo: bool = True,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> EmailDeliveryResult:
        if is_demo:
            return self._mock.send_email(to_email, subject, body_text, body_html, metadata)
        return self._smtp.send_email(to_email, subject, body_text, body_html, metadata)

    def is_real_configured(self) -> bool:
        return self._smtp.is_configured


email_gateway = EmailGateway()
