"""
ReviveAI — Centralized Error Catalog

Every user-facing error in the Razorpay integration flow maps to an entry here.
Each entry answers the three merchant questions:
  1. What happened?
  2. Is my data safe?
  3. What do I do next?

Usage:
    from app.services.error_catalog import error_catalog, make_error

    err = make_error("AUTH_INVALID", detail="Razorpay returned 401.")
    # err.user_message → merchant-facing string
    # err.severity → "error" | "warning" | "info"
    # err.retryable → True/False
    # err.recommended_action → next step for the merchant
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class ErrorEntry:
    code: str
    severity: str                  # "error" | "warning" | "info"
    retryable: bool
    user_message: str              # Shown in UI as primary message
    detail_template: str           # Shown in UI as secondary detail (use {detail} placeholder)
    recommended_action: str        # CTA text for the UI
    developer_note: str            # For logs only — never exposed to frontend
    http_status: int = 200         # Suggested HTTP status for API responses (200 = use application-level error)

    def format_detail(self, detail: str = "") -> str:
        """Fill in {detail} placeholder if present."""
        if "{detail}" in self.detail_template and detail:
            return self.detail_template.format(detail=detail)
        return self.detail_template


# ── Error Catalog ─────────────────────────────────────────────────────────────

CATALOG: dict[str, ErrorEntry] = {

    # ── Authentication Errors ────────────────────────────────────────────────
    "AUTH_INVALID": ErrorEntry(
        code="AUTH_INVALID",
        severity="error",
        retryable=False,
        user_message="Razorpay authentication failed.",
        detail_template=(
            "Your Key ID or Secret was rejected by Razorpay. "
            "Please verify the exact credentials from Razorpay Dashboard → Settings → API Keys. "
            "Your existing data has not been modified."
        ),
        recommended_action="Open Razorpay Dashboard → Settings → API Keys → verify Key ID and Secret.",
        developer_note="Razorpay returned HTTP 401. Invalid key_id/key_secret.",
        http_status=401,
    ),

    "AUTH_MASKED_PLACEHOLDER": ErrorEntry(
        code="AUTH_MASKED_PLACEHOLDER",
        severity="error",
        retryable=False,
        user_message="Masked placeholder values detected.",
        detail_template=(
            "The submitted credentials contain bullet characters (••••) or placeholder text. "
            "Please type or paste your actual raw Razorpay Key ID and Secret directly from Razorpay Dashboard."
        ),
        recommended_action="Clear the fields and paste the raw credentials from Razorpay Dashboard.",
        developer_note="Credential contains masked placeholder characters.",
        http_status=400,
    ),

    "AUTH_NON_ASCII": ErrorEntry(
        code="AUTH_NON_ASCII",
        severity="error",
        retryable=False,
        user_message="Invalid characters in credentials.",
        detail_template=(
            "Your Key ID or Secret contains non-ASCII characters. "
            "Please paste the exact API Key directly from Razorpay Dashboard without reformatting."
        ),
        recommended_action="Clear the fields and paste the exact raw key from Razorpay Dashboard.",
        developer_note="Key ID or Secret failed latin-1 encoding check.",
        http_status=400,
    ),

    "CREDENTIALS_MISSING": ErrorEntry(
        code="CREDENTIALS_MISSING",
        severity="error",
        retryable=False,
        user_message="Credentials not provided.",
        detail_template="Both an API Key and Secret are required to connect Razorpay. Please enter both.",
        recommended_action="Enter your Razorpay API Key and Secret.",
        developer_note="key_id or key_secret was empty.",
        http_status=400,
    ),

    # ── Environment Errors ────────────────────────────────────────────────────
    "ENV_MISMATCH_LIVE_IN_TEST": ErrorEntry(
        code="ENV_MISMATCH_LIVE_IN_TEST",
        severity="warning",
        retryable=False,
        user_message="Live key detected in Test Mode selection.",
        detail_template=(
            "You provided a Razorpay LIVE key (rzp_live_...) but selected Test Mode. "
            "ReviveAI will connect to your LIVE Razorpay account in READ-ONLY mode. "
            "No recovery actions will be executed without explicit production authorization."
        ),
        recommended_action="Confirm you want to connect a Live account, or switch to a test key (rzp_test_...).",
        developer_note="Key prefix is rzp_live_ but environment was set to test.",
    ),

    "ENV_MISMATCH_TEST_IN_LIVE": ErrorEntry(
        code="ENV_MISMATCH_TEST_IN_LIVE",
        severity="warning",
        retryable=False,
        user_message="Test key detected in Live Mode selection.",
        detail_template=(
            "You provided a Razorpay TEST key (rzp_test_...) but selected Live Mode. "
            "ReviveAI will connect to your Test account. "
            "No real transactions will be affected."
        ),
        recommended_action="Use a Live key (rzp_live_...) if you want to connect your production account.",
        developer_note="Key prefix is rzp_test_ but environment was set to live.",
    ),

    # ── Network / Connectivity Errors ─────────────────────────────────────────
    "API_UNAVAILABLE": ErrorEntry(
        code="API_UNAVAILABLE",
        severity="error",
        retryable=True,
        user_message="Razorpay is temporarily unavailable.",
        detail_template=(
            "ReviveAI could not reach Razorpay API. "
            "Your existing data has not been modified. "
            "This is usually resolved within a few minutes."
        ),
        recommended_action="Wait 60 seconds and try again. Check Razorpay Status at https://status.razorpay.com.",
        developer_note="Network connection refused or DNS failure when calling Razorpay.",
    ),

    "NETWORK_TIMEOUT": ErrorEntry(
        code="NETWORK_TIMEOUT",
        severity="error",
        retryable=True,
        user_message="Razorpay request timed out.",
        detail_template=(
            "The connection to Razorpay did not complete within the timeout window. "
            "Your existing data is safe. No action was taken."
        ),
        recommended_action="Click Retry. If this persists, check Razorpay Status at https://status.razorpay.com.",
        developer_note="Request exceeded 15-second timeout threshold.",
    ),

    "RATE_LIMITED": ErrorEntry(
        code="RATE_LIMITED",
        severity="warning",
        retryable=True,
        user_message="Razorpay temporarily limited requests.",
        detail_template=(
            "Too many requests were made to Razorpay in a short period. "
            "ReviveAI will automatically retry after the rate limit window. "
            "No data was lost."
        ),
        recommended_action="Wait 60 seconds and sync again. ReviveAI may retry automatically.",
        developer_note="Razorpay returned HTTP 429. Respect Retry-After header.",
    ),

    "SERVER_ERROR_TRANSIENT": ErrorEntry(
        code="SERVER_ERROR_TRANSIENT",
        severity="error",
        retryable=True,
        user_message="Razorpay returned a temporary server error.",
        detail_template=(
            "Razorpay is experiencing internal issues (HTTP 5xx). "
            "Your data is safe. ReviveAI will not retry automatically."
        ),
        recommended_action="Wait a few minutes and retry. Check https://status.razorpay.com.",
        developer_note="Razorpay returned HTTP 502, 503, or 504.",
    ),

    # ── Sync Errors ───────────────────────────────────────────────────────────
    "SYNC_EMPTY_ACCOUNT": ErrorEntry(
        code="SYNC_EMPTY_ACCOUNT",
        severity="info",
        retryable=True,
        user_message="Connected. No payment data found yet.",
        detail_template=(
            "Your Razorpay account is connected and healthy, but has 0 payment records. "
            "This is normal for new or empty test accounts. "
            "Create test payments in Razorpay Test Mode, then sync again."
        ),
        recommended_action="Create test payments in Razorpay Dashboard, then click Sync Again.",
        developer_note="Razorpay returned 0 items in payment list. Account is empty.",
    ),

    "SYNC_PARTIAL_FAILURE": ErrorEntry(
        code="SYNC_PARTIAL_FAILURE",
        severity="warning",
        retryable=True,
        user_message="Sync partially completed.",
        detail_template=(
            "{detail} "
            "Successfully imported records are available. "
            "Failed records were skipped and not imported."
        ),
        recommended_action="Click Sync Again to retry failed records.",
        developer_note="Some payment records failed normalization or validation.",
    ),

    "SYNC_IN_PROGRESS": ErrorEntry(
        code="SYNC_IN_PROGRESS",
        severity="info",
        retryable=False,
        user_message="Synchronization already in progress.",
        detail_template="A sync operation is currently running. Please wait for it to complete before starting another.",
        recommended_action="Wait for the current sync to finish.",
        developer_note="Concurrent sync attempt blocked by sync lock.",
    ),

    "MALFORMED_PAYMENT_RECORD": ErrorEntry(
        code="MALFORMED_PAYMENT_RECORD",
        severity="warning",
        retryable=False,
        user_message="A payment record was skipped due to incomplete data.",
        detail_template=(
            "Payment {detail} could not be imported because required fields were missing or invalid. "
            "This does not affect other records. Your existing data is safe."
        ),
        recommended_action="The skipped record will appear in sync error count. No action required.",
        developer_note="Payment record missing required field (id, amount, or status).",
    ),

    # ── AI Errors ─────────────────────────────────────────────────────────────
    "AI_UNAVAILABLE": ErrorEntry(
        code="AI_UNAVAILABLE",
        severity="info",
        retryable=False,
        user_message="AI analysis temporarily unavailable.",
        detail_template=(
            "ReviveAI's Gemini AI analysis is not reachable. "
            "Deterministic rule-based analysis is active. "
            "All risk scores, recovery recommendations, and policy decisions remain fully functional."
        ),
        recommended_action="No action required. Deterministic mode is fully operational.",
        developer_note="Gemini API not configured, timed out, or returned quota error.",
    ),

    "AI_QUOTA_EXCEEDED": ErrorEntry(
        code="AI_QUOTA_EXCEEDED",
        severity="warning",
        retryable=True,
        user_message="AI analysis quota reached.",
        detail_template=(
            "Gemini AI quota was exceeded. "
            "Deterministic rule-based analysis is active for all cases. "
            "AI analysis will resume when quota resets."
        ),
        recommended_action="No action required. Deterministic analysis is fully active.",
        developer_note="Gemini API returned HTTP 429 quota exceeded.",
    ),

    # ── Webhook Errors ────────────────────────────────────────────────────────
    "WEBHOOK_MISSING_SIGNATURE": ErrorEntry(
        code="WEBHOOK_MISSING_SIGNATURE",
        severity="error",
        retryable=False,
        user_message="Webhook signature missing.",
        detail_template="The webhook request did not contain a valid X-Razorpay-Signature header.",
        recommended_action="Verify webhook configuration in Razorpay Dashboard.",
        developer_note="X-Razorpay-Signature header absent from incoming webhook.",
        http_status=400,
    ),

    "WEBHOOK_SIGNATURE_INVALID": ErrorEntry(
        code="WEBHOOK_SIGNATURE_INVALID",
        severity="error",
        retryable=False,
        user_message="Webhook signature verification failed.",
        detail_template="The incoming webhook did not pass HMAC-SHA256 verification. The event was rejected.",
        recommended_action="Ensure the Webhook Secret configured in ReviveAI matches Razorpay Dashboard.",
        developer_note="HMAC-SHA256 verification failed. Possible tampering or wrong webhook secret.",
        http_status=400,
    ),

    "WEBHOOK_DUPLICATE": ErrorEntry(
        code="WEBHOOK_DUPLICATE",
        severity="info",
        retryable=False,
        user_message="Duplicate webhook event safely ignored.",
        detail_template="Event {detail} was already processed. ReviveAI safely acknowledged without reprocessing.",
        recommended_action="No action required.",
        developer_note="Event ID already in _processed_events set. Replay protection activated.",
    ),

    # ── Recovery Errors ───────────────────────────────────────────────────────
    "RECOVERY_POLICY_BLOCKED": ErrorEntry(
        code="RECOVERY_POLICY_BLOCKED",
        severity="warning",
        retryable=False,
        user_message="Recovery blocked by policy.",
        detail_template=(
            "This case exceeds the automated recovery threshold. "
            "Reason: {detail}. "
            "It has been placed in the Human Review Queue."
        ),
        recommended_action="Review in Human Queue and approve manually if appropriate.",
        developer_note="Case amount exceeds max_automated_amount_inr or policy violation.",
    ),

    "RECOVERY_ALREADY_RUNNING": ErrorEntry(
        code="RECOVERY_ALREADY_RUNNING",
        severity="info",
        retryable=False,
        user_message="Recovery already in progress.",
        detail_template="A recovery action is already running for this case. Please wait for it to complete.",
        recommended_action="Wait for the current recovery to complete before retrying.",
        developer_note="Recovery concurrency lock active for case_id.",
    ),

    "RECOVERY_FAILED_NO_REVENUE": ErrorEntry(
        code="RECOVERY_FAILED_NO_REVENUE",
        severity="warning",
        retryable=True,
        user_message="Recovery attempt unsuccessful.",
        detail_template=(
            "The recovery action did not succeed. "
            "No revenue has been counted. "
            "Your existing data is safe."
        ),
        recommended_action="Review the failure details and consider escalating to human review.",
        developer_note="Recovery action executed but outcome was FAILED. Revenue not counted.",
    ),

    # ── General / Fallback ─────────────────────────────────────────────────────
    "UNKNOWN_ERROR": ErrorEntry(
        code="UNKNOWN_ERROR",
        severity="error",
        retryable=True,
        user_message="An unexpected error occurred.",
        detail_template=(
            "ReviveAI encountered an unexpected error. "
            "Your data has not been modified. "
            "{detail}"
        ),
        recommended_action="Please try again. If the issue persists, contact support.",
        developer_note="Unclassified exception caught at top-level handler.",
    ),
}


@dataclass
class StructuredError:
    code: str
    severity: str
    retryable: bool
    user_message: str
    detail: str
    recommended_action: str
    http_status: int = 200

    def to_dict(self) -> dict[str, Any]:
        return {
            "error_code": self.code,
            "severity": self.severity,
            "retryable": self.retryable,
            "user_message": self.user_message,
            "detail": self.detail,
            "recommended_action": self.recommended_action,
        }


def make_error(
    code: str,
    detail: str = "",
    override_http_status: Optional[int] = None,
) -> StructuredError:
    """
    Create a StructuredError from the catalog.
    Falls back to UNKNOWN_ERROR if code is not found.
    """
    entry = CATALOG.get(code, CATALOG["UNKNOWN_ERROR"])
    return StructuredError(
        code=entry.code,
        severity=entry.severity,
        retryable=entry.retryable,
        user_message=entry.user_message,
        detail=entry.format_detail(detail),
        recommended_action=entry.recommended_action,
        http_status=override_http_status if override_http_status is not None else entry.http_status,
    )


def classify_razorpay_exception(exc: Exception) -> StructuredError:
    """
    Map any exception from Razorpay SDK or network layer to a StructuredError.
    Never exposes raw tracebacks to callers.
    """
    msg = str(exc).lower()

    if "timeout" in msg or "timed out" in msg:
        return make_error("NETWORK_TIMEOUT", detail=str(exc)[:80])

    if "429" in msg or "rate limit" in msg or "too many requests" in msg:
        return make_error("RATE_LIMITED")

    if "401" in msg or "auth" in msg or "unauthorized" in msg or "invalid auth" in msg:
        return make_error("AUTH_INVALID", detail=str(exc)[:80])

    if "latin-1" in msg or "codec" in msg or "ordinal not in range" in msg:
        return make_error("AUTH_NON_ASCII")

    if "masked" in msg or "placeholder" in msg or "•" in str(exc):
        return make_error("AUTH_MASKED_PLACEHOLDER")

    if any(code in msg for code in ["502", "503", "504", "bad gateway", "service unavailable", "gateway timeout"]):
        return make_error("SERVER_ERROR_TRANSIENT", detail=str(exc)[:80])

    if "connection" in msg or "refused" in msg or "unreachable" in msg or "dns" in msg:
        return make_error("API_UNAVAILABLE", detail=str(exc)[:80])

    return make_error("UNKNOWN_ERROR", detail=str(exc)[:120])
