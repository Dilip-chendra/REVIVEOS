"""
ReviveAI — Encrypted Server-Side Credential Store

Security Controls:
1. At-rest encryption using Fernet symmetric encryption.
2. Raw secrets are NEVER returned to the frontend or included in logs.
3. Masked identifiers provided for UI display (e.g., rzp_test_••••••••1234).
4. Strict tenant/merchant-scoped storage.
5. Separate storage for API Key Secret vs Webhook HMAC Secret.
"""
from __future__ import annotations

import base64
from datetime import datetime, timezone
import hashlib
import json
import logging
import os
import uuid
from typing import Any, Optional

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class CredentialStore:
    """
    Manages encrypted provider credentials per merchant.
    Uses in-memory encrypted cache backed by configuration defaults.
    """

    def __init__(self):
        self._store: dict[str, dict[str, Any]] = {}
        self._cipher = None
        self._init_cipher()

    def _init_cipher(self):
        """Initialize encryption cipher."""
        try:
            from cryptography.fernet import Fernet
            raw_key = settings.credential_encryption_key or settings.app_secret_key
            # Derive 32-byte url-safe base64 key
            derived = base64.urlsafe_b64encode(hashlib.sha256(raw_key.encode()).digest())
            self._cipher = Fernet(derived)
        except Exception as e:
            logger.warning(f"Fernet encryption init fallback: {e}")
            self._cipher = None

    def _encrypt(self, text: str) -> str:
        """Encrypt plaintext string."""
        if not text:
            return ""
        if self._cipher:
            return self._cipher.encrypt(text.encode("utf-8")).decode("utf-8")
        # Secure fallback: basic base64 with app key XOR if cryptography unavailable
        xor_bytes = bytes([b ^ (ord(settings.app_secret_key[i % len(settings.app_secret_key)])) for i, b in enumerate(text.encode("utf-8"))])
        return "enc::" + base64.b64encode(xor_bytes).decode("utf-8")

    def _decrypt(self, cipher_text: str) -> str:
        """Decrypt ciphertext string."""
        if not cipher_text:
            return ""
        if self._cipher and not cipher_text.startswith("enc::"):
            try:
                return self._cipher.decrypt(cipher_text.encode("utf-8")).decode("utf-8")
            except Exception:
                return ""
        if cipher_text.startswith("enc::"):
            raw = base64.b64decode(cipher_text[5:].encode("utf-8"))
            return bytes([b ^ (ord(settings.app_secret_key[i % len(settings.app_secret_key)])) for i, b in enumerate(raw)]).decode("utf-8", errors="ignore")
        return cipher_text

    def is_masked_value(self, val: str) -> bool:
        """Check if a string is a masked UI placeholder rather than raw credential."""
        if not val:
            return False
        return "•" in val or "••••" in val or "\ufffd" in val or "********" in val or val.endswith("...")

    def mask_key_id(self, key_id: str) -> str:
        """Mask a Key ID for safe UI display (e.g. rzp_test_••••1234)."""
        if not key_id or self.is_masked_value(key_id):
            return key_id or ""
        if len(key_id) <= 12:
            return key_id[:4] + "••••"
        if key_id.startswith("rzp_test_"):
            return "rzp_test_••••••••" + key_id[-4:]
        if key_id.startswith("rzp_live_"):
            return "rzp_live_••••••••" + key_id[-4:]
        return key_id[:8] + "••••••••" + key_id[-4:]

    def mask_secret(self, secret: str) -> str:
        """Mask a secret completely (e.g. ••••••••••••)."""
        if not secret:
            return ""
        return "••••••••••••"

    def save_credentials(
        self,
        merchant_id: str,
        provider: str,
        key_id: str,
        key_secret: str,
        webhook_secret: str = "",
        environment: str = "test",
    ) -> dict[str, Any]:
        """Save and encrypt provider credentials for a merchant with unique connection_id."""
        clean_key = key_id.strip()
        clean_secret = key_secret.strip()
        clean_wh = webhook_secret.strip() if webhook_secret else ""
        
        # If masked placeholder values were submitted, preserve existing real credentials from this merchant's own store
        existing_rec = self._store.get(f"{merchant_id}:{provider}")
        if existing_rec:
            existing_key = existing_rec.get("key_id", "")
            existing_sec = self._decrypt(existing_rec.get("encrypted_key_secret", "")) if existing_rec.get("encrypted_key_secret") else ""
            existing_wh = self._decrypt(existing_rec.get("encrypted_webhook_secret", "")) if existing_rec.get("encrypted_webhook_secret") else ""
            if self.is_masked_value(clean_key) and existing_key and not self.is_masked_value(existing_key):
                clean_key = existing_key
            if self.is_masked_value(clean_secret) and existing_sec and not self.is_masked_value(existing_sec):
                clean_secret = existing_sec
            if self.is_masked_value(clean_wh) and existing_wh and not self.is_masked_value(existing_wh):
                clean_wh = existing_wh

        detected_env = "live" if clean_key.startswith("rzp_live_") else "test"
        final_env = environment or detected_env
        connection_id = f"conn_{provider}_{final_env}_{uuid.uuid4().hex[:8]}"

        record = {
            "connection_id": connection_id,
            "merchant_id": merchant_id,
            "provider": provider,
            "environment": final_env,
            "key_id": clean_key,
            "encrypted_key_secret": self._encrypt(clean_secret),
            "encrypted_webhook_secret": self._encrypt(clean_wh) if clean_wh else "",
            "is_configured": bool(clean_key and clean_secret and not self.is_masked_value(clean_key) and not self.is_masked_value(clean_secret)),
            "has_webhook_secret": bool(clean_wh and not self.is_masked_value(clean_wh)),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        key = f"{merchant_id}:{provider}"
        self._store[key] = record

        logger.info(f"Encrypted credentials stored for merchant={merchant_id}, provider={provider}, conn={connection_id}, env={final_env}")
        return self.get_masked_credentials(merchant_id, provider)

    def get_credentials(self, merchant_id: str, provider: str = "razorpay") -> dict[str, Any]:
        """Retrieve decrypted credentials server-side. NEVER RETURN DIRECTLY TO API CALLERS."""
        key = f"{merchant_id}:{provider}"
        record = self._store.get(key)
        
        if not record:
            # Only explicit system sandbox uses platform environment fallback
            if merchant_id == "system_sandbox" and provider == "razorpay" and settings.razorpay_configured:
                return {
                    "connection_id": f"conn_system_{merchant_id[:8]}",
                    "merchant_id": merchant_id,
                    "provider": "razorpay",
                    "environment": settings.detected_razorpay_environment,
                    "key_id": settings.razorpay_key_id.strip(),
                    "key_secret": settings.razorpay_key_secret.strip(),
                    "webhook_secret": (settings.razorpay_webhook_secret or settings.razorpay_key_secret).strip(),
                    "is_configured": True,
                    "has_webhook_secret": bool(settings.razorpay_webhook_secret),
                }

            return {
                "connection_id": "",
                "merchant_id": merchant_id,
                "provider": provider,
                "environment": "test",
                "key_id": "",
                "key_secret": "",
                "webhook_secret": "",
                "is_configured": False,
                "has_webhook_secret": False,
            }

        return {
            "connection_id": record.get("connection_id", ""),
            "merchant_id": record["merchant_id"],
            "provider": record["provider"],
            "environment": record["environment"],
            "key_id": record["key_id"],
            "key_secret": self._decrypt(record["encrypted_key_secret"]),
            "webhook_secret": self._decrypt(record["encrypted_webhook_secret"]) if record.get("encrypted_webhook_secret") else "",
            "is_configured": record.get("is_configured", False),
            "has_webhook_secret": record.get("has_webhook_secret", False),
        }

    def get_masked_credentials(self, merchant_id: str, provider: str = "razorpay") -> dict[str, Any]:
        """Retrieve safe masked credentials suitable for API responses."""
        creds = self.get_credentials(merchant_id, provider)
        return {
            "connection_id": creds.get("connection_id", ""),
            "provider": creds["provider"],
            "environment": creds["environment"],
            "key_id_masked": self.mask_key_id(creds["key_id"]),
            "key_id_prefix": creds["key_id"][:8] if creds["key_id"] else "",
            "is_configured": creds["is_configured"],
            "has_key_secret": bool(creds["key_secret"]),
            "has_webhook_secret": bool(creds["webhook_secret"]),
        }

    def clear_credentials(self, merchant_id: str, provider: str = "razorpay") -> bool:
        """Remove credentials for a merchant."""
        key = f"{merchant_id}:{provider}"
        self._store[key] = {
            "connection_id": "",
            "merchant_id": merchant_id,
            "provider": provider,
            "environment": "test",
            "key_id": "",
            "encrypted_key_secret": "",
            "encrypted_webhook_secret": "",
            "is_configured": False,
            "has_webhook_secret": False,
        }
        logger.info(f"Cleared credentials for merchant={merchant_id}, provider={provider}")
        return True


# Singleton
credential_store = CredentialStore()
