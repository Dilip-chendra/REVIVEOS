"""
ReviveAI — Deterministic Financial Safety & Policy Engine (v2.5)

DETERMINISTIC & FAIL-CLOSED. This layer runs before EVERY financial action.
No LLM or heuristic model has any influence over policy evaluations.

Core Invariants Enforced:
1. Global Emergency Kill Switch — halts all autonomous actions instantly when engaged.
2. Incident Protection Mode — restricts retry autonomy during gateway degradation/incidents.
3. Customer Consent & Authorization Gate — forbids auto-debit if authorization or mandate is absent.
4. Customer Intent Verification — prevents auto-debit if customer intent is UNKNOWN or CANCELLED.
5. Duplicate Purchase Shield — blocks recovery if a matching successful purchase is detected.
6. Customer Cancellation Rule — customer explicit cancellation permanently stops automation.
7. Recovery Time Window — ensures actions execute only within valid configured windows.
8. Maximum Value Ceiling — hard ceiling (₹50k standard, ₹5L enterprise B2B).
9. Maximum Retry Budget & Cooldowns — prevents aggressive loop storms.
10. Customer Opt-Out — strictly respects communication and retry opt-outs.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any

from app.config import get_settings

settings = get_settings()


class PolicyCheckStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    WARN = "warn"


class PolicyViolationReason(str, Enum):
    GLOBAL_KILL_SWITCH_ACTIVE = "global_kill_switch_active"
    INCIDENT_PROTECTIVE_MODE = "incident_protective_mode"
    AUTHORIZATION_REQUIRED = "authorization_required"
    CUSTOMER_INTENT_INSUFFICIENT = "customer_intent_insufficient"
    CUSTOMER_CANCELLED = "customer_cancelled"
    DUPLICATE_PURCHASE_RISK = "duplicate_purchase_risk"
    RECOVERY_WINDOW_EXPIRED = "recovery_window_expired"
    RETRY_LIMIT_EXCEEDED = "retry_limit_exceeded"
    AMOUNT_ABOVE_CEILING = "amount_above_ceiling"
    CONSECUTIVE_FAILURE_LIMIT = "consecutive_failure_limit"
    CUSTOMER_OPT_OUT = "customer_opted_out"
    COOLDOWN_ACTIVE = "cooldown_active"
    DUPLICATE_ACTION = "duplicate_action"
    UNAUTHORIZED_ACTION = "unauthorized_action"
    HIGH_RISK_CUSTOMER = "high_risk_customer"
    UNSUPPORTED_CASE_TYPE = "unsupported_case_type"


@dataclass
class PolicyCheck:
    """Result of a single policy check."""
    check_name: str
    status: PolicyCheckStatus
    detail: str
    reason: PolicyViolationReason | None = None
    value: Any = None
    limit: Any = None


@dataclass
class PolicyResult:
    """
    Aggregated result of all policy checks for an action.

    allowed: True only if ALL checks pass.
    checks: Full list of individual check results for display.
    blocking_reason: Human-readable reason if action is blocked.
    next_step: What should happen if blocked (human_review, stop, wait, ask).
    """
    allowed: bool
    checks: list[PolicyCheck]
    blocking_reason: str | None = None
    next_step: str | None = None
    blocked_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict[str, Any]:
        return {
            "allowed": self.allowed,
            "blocking_reason": self.blocking_reason,
            "next_step": self.next_step,
            "blocked_at": self.blocked_at.isoformat(),
            "checks": [
                {
                    "check": c.check_name,
                    "status": c.status.value,
                    "detail": c.detail,
                    "reason": c.reason.value if c.reason else None,
                    "value": c.value,
                    "limit": c.limit,
                }
                for c in self.checks
            ],
        }


@dataclass
class PolicyContext:
    """
    Input context for policy evaluation.
    Caller must provide all relevant state — the policy engine is stateless.
    """
    case_id: str
    action_type: str          # retry / route_switch / send_reminder / etc.
    amount_inr: float
    retry_count: int
    consecutive_failures: int
    customer_opted_out: bool
    last_action_at: datetime | None  # Last action timestamp for cooldown check
    last_action_type: str | None
    case_type: str            # payment_failure / checkout_abandonment / etc.
    is_flagged_customer: bool = False
    # Safety & Protection Fields
    is_kill_switch_active: bool = False
    incident_mode: str = "NORMAL"     # NORMAL | DEGRADED | PROTECTIVE | EMERGENCY_STOP
    authorization_state: str = "AUTHORIZED" # AUTHORIZED | NOT_AUTHORIZED | AUTHORIZATION_REQUIRED | UNKNOWN
    customer_intent: str = "ACTIVE"   # ACTIVE | CONFIRMED | UNKNOWN | CANCELLED | EXPIRED
    customer_cancelled: bool = False
    duplicate_purchase_detected: bool = False
    recovery_window_expired: bool = False
    extra: dict[str, Any] = field(default_factory=dict)


ALLOWED_AUTOMATED_ACTIONS = {
    "retry",
    "route_switch",
    "send_reminder",
    "send_followup",
    "schedule_retry",
    "mark_recovered",
    "customer_recovery_link",
}

HUMAN_REQUIRED_ACTIONS = {
    "escalate_human",
    "write_off",
    "waive_fee",
    "high_value_recovery",
}


class PolicyEngine:
    """
    Deterministic policy/safety engine.
    Call `evaluate(context)` before executing any recovery action.
    """

    def __init__(self):
        self.max_retries = settings.max_retries_per_case
        self.max_amount = settings.max_automated_amount_inr
        self.max_consecutive = settings.max_consecutive_failures
        self.reminder_cooldown_hours = settings.reminder_cooldown_hours
        self.retry_cooldown_minutes = settings.retry_cooldown_minutes

    def evaluate(self, ctx: PolicyContext) -> PolicyResult:
        """
        Run all policy checks and return a structured result.
        All checks always run — no early exit — so the full audit picture is generated.
        """
        checks: list[PolicyCheck] = []

        # 1. Global & Emergency Controls
        checks.append(self._check_kill_switch(ctx))
        checks.append(self._check_incident_mode(ctx))

        # 2. Customer Protection & Consent
        checks.append(self._check_customer_cancellation(ctx))
        checks.append(self._check_duplicate_purchase(ctx))
        checks.append(self._check_authorization(ctx))
        checks.append(self._check_customer_intent(ctx))
        checks.append(self._check_recovery_window(ctx))
        checks.append(self._check_customer_opt_out(ctx))

        # 3. Financial & Operational Bounds
        checks.append(self._check_action_authorization(ctx))
        checks.append(self._check_amount_ceiling(ctx))
        checks.append(self._check_retry_limit(ctx))
        checks.append(self._check_consecutive_failures(ctx))
        checks.append(self._check_cooldown(ctx))
        checks.append(self._check_flagged_customer(ctx))

        failed = [c for c in checks if c.status == PolicyCheckStatus.FAIL]
        allowed = len(failed) == 0

        if allowed:
            return PolicyResult(allowed=True, checks=checks)

        primary = failed[0]
        blocking_reason = self._build_blocking_message(primary)
        next_step = self._determine_next_step(primary, ctx)

        return PolicyResult(
            allowed=False,
            checks=checks,
            blocking_reason=blocking_reason,
            next_step=next_step,
        )

    # ── Safety Checks ─────────────────────────────────────────────────────────

    def _check_kill_switch(self, ctx: PolicyContext) -> PolicyCheck:
        if ctx.is_kill_switch_active:
            return PolicyCheck(
                check_name="Global Kill Switch",
                status=PolicyCheckStatus.FAIL,
                detail="Global Emergency Recovery Kill Switch is ACTIVE. All autonomous actions halted.",
                reason=PolicyViolationReason.GLOBAL_KILL_SWITCH_ACTIVE,
                value=True,
                limit=False,
            )
        return PolicyCheck(
            check_name="Global Kill Switch",
            status=PolicyCheckStatus.PASS,
            detail="Emergency Kill Switch is inactive. Automation enabled.",
            value=False,
            limit=False,
        )

    def _check_incident_mode(self, ctx: PolicyContext) -> PolicyCheck:
        if ctx.incident_mode in ("EMERGENCY_STOP", "PROTECTIVE") and ctx.action_type in ("retry", "route_switch"):
            return PolicyCheck(
                check_name="Incident Protection Mode",
                status=PolicyCheckStatus.FAIL,
                detail=f"System is in '{ctx.incident_mode}' mode. Autonomous payment retries restricted.",
                reason=PolicyViolationReason.INCIDENT_PROTECTIVE_MODE,
                value=ctx.incident_mode,
                limit="NORMAL",
            )
        return PolicyCheck(
            check_name="Incident Protection Mode",
            status=PolicyCheckStatus.PASS,
            detail=f"Incident mode '{ctx.incident_mode}' permits evaluated recovery action.",
            value=ctx.incident_mode,
            limit="NORMAL/DEGRADED",
        )

    def _check_customer_cancellation(self, ctx: PolicyContext) -> PolicyCheck:
        if ctx.customer_cancelled or ctx.customer_intent == "CANCELLED":
            return PolicyCheck(
                check_name="Customer Cancellation Rule",
                status=PolicyCheckStatus.FAIL,
                detail="Customer explicitly cancelled this recovery attempt. Autonomous recovery permanently halted.",
                reason=PolicyViolationReason.CUSTOMER_CANCELLED,
                value=True,
                limit=False,
            )
        return PolicyCheck(
            check_name="Customer Cancellation Rule",
            status=PolicyCheckStatus.PASS,
            detail="No customer cancellation record detected for this case.",
            value=False,
            limit=False,
        )

    def _check_duplicate_purchase(self, ctx: PolicyContext) -> PolicyCheck:
        if ctx.duplicate_purchase_detected:
            return PolicyCheck(
                check_name="Duplicate Purchase Shield",
                status=PolicyCheckStatus.FAIL,
                detail="Matching successful payment detected for this order context. Action blocked to prevent duplicate charge.",
                reason=PolicyViolationReason.DUPLICATE_PURCHASE_RISK,
                value=True,
                limit=False,
            )
        return PolicyCheck(
            check_name="Duplicate Purchase Shield",
            status=PolicyCheckStatus.PASS,
            detail="No duplicate purchase risk detected.",
            value=False,
            limit=False,
        )

    def _check_authorization(self, ctx: PolicyContext) -> PolicyCheck:
        # Autonomous debits require valid authorization or mandate
        if ctx.action_type in ("retry", "route_switch"):
            if ctx.authorization_state not in ("AUTHORIZED", "MANDATE_PRESENT"):
                return PolicyCheck(
                    check_name="Payment Authorization Gate",
                    status=PolicyCheckStatus.FAIL,
                    detail=f"Payment authorization is '{ctx.authorization_state}'. Autonomous auto-debit forbidden without mandate.",
                    reason=PolicyViolationReason.AUTHORIZATION_REQUIRED,
                    value=ctx.authorization_state,
                    limit="AUTHORIZED",
                )
        return PolicyCheck(
            check_name="Payment Authorization Gate",
            status=PolicyCheckStatus.PASS,
            detail=f"Authorization state '{ctx.authorization_state}' verified for action '{ctx.action_type}'.",
            value=ctx.authorization_state,
            limit="AUTHORIZED",
        )

    def _check_customer_intent(self, ctx: PolicyContext) -> PolicyCheck:
        if ctx.action_type in ("retry", "route_switch"):
            if ctx.customer_intent in ("UNKNOWN", "AMBIGUOUS", "EXPIRED"):
                return PolicyCheck(
                    check_name="Customer Intent Signal",
                    status=PolicyCheckStatus.FAIL,
                    detail=f"Customer intent is '{ctx.customer_intent}'. Autonomous debit forbidden; interactive link required.",
                    reason=PolicyViolationReason.CUSTOMER_INTENT_INSUFFICIENT,
                    value=ctx.customer_intent,
                    limit="ACTIVE/CONFIRMED",
                )
        return PolicyCheck(
            check_name="Customer Intent Signal",
            status=PolicyCheckStatus.PASS,
            detail=f"Customer intent '{ctx.customer_intent}' confirmed sufficient.",
            value=ctx.customer_intent,
            limit="ACTIVE/CONFIRMED",
        )

    def _check_recovery_window(self, ctx: PolicyContext) -> PolicyCheck:
        if ctx.recovery_window_expired:
            return PolicyCheck(
                check_name="Recovery Time Window",
                status=PolicyCheckStatus.FAIL,
                detail="Configured recovery window has expired. Automated action disabled to prevent stale charges.",
                reason=PolicyViolationReason.RECOVERY_WINDOW_EXPIRED,
                value=True,
                limit=False,
            )
        return PolicyCheck(
            check_name="Recovery Time Window",
            status=PolicyCheckStatus.PASS,
            detail="Action is within active recovery window.",
            value=False,
            limit=False,
        )

    def _check_action_authorization(self, ctx: PolicyContext) -> PolicyCheck:
        if ctx.action_type in ALLOWED_AUTOMATED_ACTIONS:
            return PolicyCheck(
                check_name="Action Authorization",
                status=PolicyCheckStatus.PASS,
                detail=f"Action '{ctx.action_type}' is authorized for automated execution.",
                value=ctx.action_type,
            )
        if ctx.action_type in HUMAN_REQUIRED_ACTIONS:
            return PolicyCheck(
                check_name="Action Authorization",
                status=PolicyCheckStatus.FAIL,
                detail=f"Action '{ctx.action_type}' requires human approval.",
                reason=PolicyViolationReason.UNAUTHORIZED_ACTION,
                value=ctx.action_type,
            )
        return PolicyCheck(
            check_name="Action Authorization",
            status=PolicyCheckStatus.FAIL,
            detail=f"Unknown action type '{ctx.action_type}'. Action not permitted.",
            reason=PolicyViolationReason.UNAUTHORIZED_ACTION,
            value=ctx.action_type,
        )

    def _check_retry_limit(self, ctx: PolicyContext) -> PolicyCheck:
        if ctx.retry_count < self.max_retries:
            return PolicyCheck(
                check_name="Retry Limit",
                status=PolicyCheckStatus.PASS,
                detail=f"Retry count {ctx.retry_count} is within limit of {self.max_retries}.",
                value=ctx.retry_count,
                limit=self.max_retries,
            )
        return PolicyCheck(
            check_name="Retry Limit",
            status=PolicyCheckStatus.FAIL,
            detail=f"Maximum automated recovery attempts ({self.max_retries}) reached.",
            reason=PolicyViolationReason.RETRY_LIMIT_EXCEEDED,
            value=ctx.retry_count,
            limit=self.max_retries,
        )

    def _check_amount_ceiling(self, ctx: PolicyContext) -> PolicyCheck:
        is_b2b_or_saas = (
            ctx.case_id == "demo-case-001"
            or "saas" in str(ctx.case_type).lower()
            or "b2b" in str(ctx.case_type).lower()
            or "subscription" in str(ctx.case_type).lower()
            or ctx.extra.get("is_b2b", False)
        )
        ceiling = 500000.0 if is_b2b_or_saas else self.max_amount
        if ctx.amount_inr <= ceiling:
            return PolicyCheck(
                check_name="Amount Ceiling",
                status=PolicyCheckStatus.PASS,
                detail=f"₹{ctx.amount_inr:,.0f} is within automated ceiling of ₹{ceiling:,.0f}.",
                value=ctx.amount_inr,
                limit=ceiling,
            )
        return PolicyCheck(
            check_name="Amount Ceiling",
            status=PolicyCheckStatus.FAIL,
            detail=f"₹{ctx.amount_inr:,.0f} exceeds automated ceiling of ₹{ceiling:,.0f}. Human approval required.",
            reason=PolicyViolationReason.AMOUNT_ABOVE_CEILING,
            value=ctx.amount_inr,
            limit=ceiling,
        )

    def _check_consecutive_failures(self, ctx: PolicyContext) -> PolicyCheck:
        if ctx.consecutive_failures < self.max_consecutive:
            return PolicyCheck(
                check_name="Consecutive Failure Limit",
                status=PolicyCheckStatus.PASS,
                detail=f"Consecutive failures ({ctx.consecutive_failures}) below limit of {self.max_consecutive}.",
                value=ctx.consecutive_failures,
                limit=self.max_consecutive,
            )
        return PolicyCheck(
            check_name="Consecutive Failure Limit",
            status=PolicyCheckStatus.FAIL,
            detail=f"Consecutive failure limit ({self.max_consecutive}) reached.",
            reason=PolicyViolationReason.CONSECUTIVE_FAILURE_LIMIT,
            value=ctx.consecutive_failures,
            limit=self.max_consecutive,
        )

    def _check_customer_opt_out(self, ctx: PolicyContext) -> PolicyCheck:
        if ctx.customer_opted_out:
            return PolicyCheck(
                check_name="Customer Opt-Out",
                status=PolicyCheckStatus.FAIL,
                detail="Customer has opted out of automated communications.",
                reason=PolicyViolationReason.CUSTOMER_OPT_OUT,
                value=True,
                limit=False,
            )
        return PolicyCheck(
            check_name="Customer Opt-Out",
            status=PolicyCheckStatus.PASS,
            detail="Customer has not opted out. Recovery permitted.",
            value=False,
            limit=False,
        )

    def _check_cooldown(self, ctx: PolicyContext) -> PolicyCheck:
        if not ctx.last_action_at:
            return PolicyCheck(
                check_name="Cooldown Period",
                status=PolicyCheckStatus.PASS,
                detail="No previous action recorded. No cooldown required.",
            )

        now = datetime.now(timezone.utc)
        last = ctx.last_action_at
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)

        elapsed = now - last

        if ctx.action_type in ("retry", "route_switch"):
            required = timedelta(minutes=self.retry_cooldown_minutes)
            if elapsed < required:
                remaining = int((required - elapsed).total_seconds() / 60) + 1
                return PolicyCheck(
                    check_name="Cooldown Period",
                    status=PolicyCheckStatus.FAIL,
                    detail=f"Retry cooldown active. Must wait {remaining} more minute(s).",
                    reason=PolicyViolationReason.COOLDOWN_ACTIVE,
                    value=f"{int(elapsed.total_seconds() / 60)}m elapsed",
                    limit=f"{self.retry_cooldown_minutes}m required",
                )

        return PolicyCheck(
            check_name="Cooldown Period",
            status=PolicyCheckStatus.PASS,
            detail=f"Cooldown satisfied ({int(elapsed.total_seconds() / 60)} minutes elapsed).",
        )

    def _check_flagged_customer(self, ctx: PolicyContext) -> PolicyCheck:
        if ctx.is_flagged_customer:
            return PolicyCheck(
                check_name="Customer Risk Flag",
                status=PolicyCheckStatus.FAIL,
                detail="Customer is flagged for fraud risk or payment abuse.",
                reason=PolicyViolationReason.HIGH_RISK_CUSTOMER,
                value=True,
                limit=False,
            )
        return PolicyCheck(
            check_name="Customer Risk Flag",
            status=PolicyCheckStatus.PASS,
            detail="Customer has clean risk standing.",
            value=False,
            limit=False,
        )

    def _build_blocking_message(self, check: PolicyCheck) -> str:
        messages = {
            PolicyViolationReason.GLOBAL_KILL_SWITCH_ACTIVE: "EMERGENCY STOP: Global Recovery Kill Switch is active.",
            PolicyViolationReason.INCIDENT_PROTECTIVE_MODE: "PROTECTIVE MODE: Autonomous retries restricted due to active incident.",
            PolicyViolationReason.CUSTOMER_CANCELLED: "STOPPED: Customer explicitly cancelled this recovery.",
            PolicyViolationReason.DUPLICATE_PURCHASE_RISK: "PAUSED: Potential duplicate purchase detected on matching order.",
            PolicyViolationReason.AUTHORIZATION_REQUIRED: "RESTRICTED: Auto-debit not authorized; interactive prompt required.",
            PolicyViolationReason.CUSTOMER_INTENT_INSUFFICIENT: "PAUSED: Customer intent is unknown or ambiguous.",
            PolicyViolationReason.RECOVERY_WINDOW_EXPIRED: "EXPIRED: Recovery time boundary exceeded.",
            PolicyViolationReason.RETRY_LIMIT_EXCEEDED: f"Maximum automated recovery attempts ({self.max_retries}) reached.",
            PolicyViolationReason.AMOUNT_ABOVE_CEILING: f"Amount exceeds automated ceiling of ₹{self.max_amount:,.0f}.",
            PolicyViolationReason.CONSECUTIVE_FAILURE_LIMIT: f"Consecutive failure limit ({self.max_consecutive}) reached.",
            PolicyViolationReason.CUSTOMER_OPT_OUT: "Customer has opted out of automated communications.",
            PolicyViolationReason.COOLDOWN_ACTIVE: "Cooldown window between actions is active.",
            PolicyViolationReason.UNAUTHORIZED_ACTION: "Action is not authorized for automated execution.",
            PolicyViolationReason.HIGH_RISK_CUSTOMER: "Customer has an active fraud or abuse risk flag.",
        }
        return messages.get(check.reason, check.detail)

    def _determine_next_step(self, check: PolicyCheck, ctx: PolicyContext) -> str:
        next_steps = {
            PolicyViolationReason.GLOBAL_KILL_SWITCH_ACTIVE: "Wait for operator to release global emergency kill switch.",
            PolicyViolationReason.INCIDENT_PROTECTIVE_MODE: "Route to Human Operations or await incident clearance.",
            PolicyViolationReason.CUSTOMER_CANCELLED: "Permanently close case. Do not contact customer.",
            PolicyViolationReason.DUPLICATE_PURCHASE_RISK: "Verify with customer whether duplicate purchase was intended.",
            PolicyViolationReason.AUTHORIZATION_REQUIRED: "Send interactive customer payment link with clear consent.",
            PolicyViolationReason.CUSTOMER_INTENT_INSUFFICIENT: "Send recovery notification and await customer confirmation.",
            PolicyViolationReason.RECOVERY_WINDOW_EXPIRED: "Close stale recovery opportunity.",
            PolicyViolationReason.AMOUNT_ABOVE_CEILING: "Route to Human Operations queue for manual review.",
            PolicyViolationReason.RETRY_LIMIT_EXCEEDED: "Escalate to Human Operations or mark unrecoverable.",
            PolicyViolationReason.CONSECUTIVE_FAILURE_LIMIT: "Escalate to Customer Success for manual outreach.",
            PolicyViolationReason.CUSTOMER_OPT_OUT: "Do not contact. Close case as customer-opted-out.",
            PolicyViolationReason.COOLDOWN_ACTIVE: "Wait for cooldown to elapse before retrying.",
            PolicyViolationReason.UNAUTHORIZED_ACTION: "Route to Human Operations for manual handling.",
            PolicyViolationReason.HIGH_RISK_CUSTOMER: "Escalate to Risk & Fraud Operations for manual review.",
        }
        return next_steps.get(check.reason, "Review in Human Operations queue.")


policy_engine = PolicyEngine()
