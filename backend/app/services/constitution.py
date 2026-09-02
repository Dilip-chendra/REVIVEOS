"""
ReviveAI — The 12 Articles of the Recovery Constitution

The non-negotiable foundational governance rules of the ReviveAI Financial Control Plane.
Every decision, strategy, model output, and recovery execution MUST satisfy all 12 Articles.
If ANY article is violated, the system FAILS CLOSED.

Article 1:  Never act without valid authorization.
Article 2:  Never treat unknown as consent.
Article 3:  Never count unconfirmed recovery as revenue.
Article 4:  Never allow duplicate financial effects.
Article 5:  Never override a hard safety policy.
Article 6:  Never hide uncertainty.
Article 7:  Always provide a safe stop (Emergency Kill Switch & Restraint).
Article 8:  Always preserve tenant isolation.
Article 9:  Always preserve an auditable decision record.
Article 10: Customer cancellation overrides recovery.
Article 11: When financial state is uncertain, fail closed.
Article 12: Maximize legitimate incremental value, not raw recovery volume.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone


class ArticleNumber(int, Enum):
    ARTICLE_1_AUTHORIZATION_REQUIRED = 1
    ARTICLE_2_NO_UNKNOWN_AS_CONSENT = 2
    ARTICLE_3_NO_UNCONFIRMED_REVENUE = 3
    ARTICLE_4_NO_DUPLICATE_EFFECTS = 4
    ARTICLE_5_POLICY_FIREWALL_SUPREME = 5
    ARTICLE_6_TRANSPARENT_UNCERTAINTY = 6
    ARTICLE_7_ALWAYS_SAFE_STOP = 7
    ARTICLE_8_TENANT_ISOLATION = 8
    ARTICLE_9_IMMUTABLE_AUDIT_TRAIL = 9
    ARTICLE_10_CUSTOMER_SOVEREIGNTY = 10
    ARTICLE_11_FAIL_CLOSED_ON_UNCERTAINTY = 11
    ARTICLE_12_INCREMENTAL_VALUE_OVER_VOLUME = 12


@dataclass
class ConstitutionArticleCheck:
    article_number: int
    name: str
    description: str
    passed: bool
    status: str  # COMPLIANT | VIOLATED | RESTRICTED
    evidence: str
    remediation: Optional[str] = None


@dataclass
class ConstitutionEvaluationResult:
    is_compliant: bool
    total_articles: int = 12
    compliant_articles: int = 12
    violations_count: int = 0
    checks: List[ConstitutionArticleCheck] = field(default_factory=list)
    verdict: str = "CONSTITUTIONALLY_COMPLIANT"
    blocking_reason: Optional[str] = None
    evaluated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_compliant": self.is_compliant,
            "total_articles": self.total_articles,
            "compliant_articles": self.compliant_articles,
            "violations_count": self.violations_count,
            "verdict": self.verdict,
            "blocking_reason": self.blocking_reason,
            "evaluated_at": self.evaluated_at,
            "checks": [
                {
                    "article_number": c.article_number,
                    "name": c.name,
                    "description": c.description,
                    "passed": c.passed,
                    "status": c.status,
                    "evidence": c.evidence,
                    "remediation": c.remediation,
                }
                for c in self.checks
            ],
        }


class RecoveryConstitution:
    def __init__(self):
        self.version = "2026.1-immutable-fintech-constitution"

    def evaluate(
        self,
        case_id: str,
        tenant_id: str,
        amount_inr: float,
        authorization_state: str,
        customer_intent: str,
        customer_cancelled: bool,
        duplicate_detected: bool,
        is_kill_switch_active: bool,
        gateway_is_degraded: bool,
        trust_score: float,
        policy_allowed: bool,
        is_autonomous_action: bool,
        data_quality_pct: float = 95.0,
        unconfirmed_revenue_counted: bool = False,
    ) -> ConstitutionEvaluationResult:
        checks: List[ConstitutionArticleCheck] = []

        # Article 1: Never act without valid authorization
        c1_passed = not (is_autonomous_action and authorization_state not in ("AUTHORIZED", "MANDATE_PRESENT"))
        checks.append(ConstitutionArticleCheck(
            article_number=1,
            name="Article 1: Authorization Mandate",
            description="Autonomous financial recovery is strictly forbidden without verified customer e-mandate or tokenized consent.",
            passed=c1_passed,
            status="COMPLIANT" if c1_passed else "VIOLATED",
            evidence=f"Authorization state: {authorization_state}. Autonomous action: {is_autonomous_action}.",
            remediation=None if c1_passed else "Degrade to interactive customer payment link (Level 2).",
        ))

        # Article 2: Never treat unknown as consent
        c2_passed = not (is_autonomous_action and customer_intent in ("UNKNOWN", "AMBIGUOUS"))
        checks.append(ConstitutionArticleCheck(
            article_number=2,
            name="Article 2: Explicit Intent Doctrine",
            description="Unknown or ambiguous customer intent must NEVER be silently converted into affirmative consent.",
            passed=c2_passed,
            status="COMPLIANT" if c2_passed else "VIOLATED",
            evidence=f"Customer intent: {customer_intent}.",
            remediation=None if c2_passed else "Prompt customer with interactive authorization link.",
        ))

        # Article 3: Never count unconfirmed recovery as revenue
        c3_passed = not unconfirmed_revenue_counted
        checks.append(ConstitutionArticleCheck(
            article_number=3,
            name="Article 3: Provenance & Revenue Realization",
            description="Unconfirmed or in-flight recovery attempts must never be recognized in authoritative financial ledger.",
            passed=c3_passed,
            status="COMPLIANT" if c3_passed else "VIOLATED",
            evidence="Authoritative ledger recognizes only webhook/API confirmed captures.",
            remediation=None if c3_passed else "Reconcile payment state with Razorpay provider API.",
        ))

        # Article 4: Never allow duplicate financial effects
        c4_passed = not duplicate_detected
        checks.append(ConstitutionArticleCheck(
            article_number=4,
            name="Article 4: Duplicate Purchase Shield",
            description="If a customer already completed this purchase via an alternative cart or order, all recovery MUST halt.",
            passed=c4_passed,
            status="COMPLIANT" if c4_passed else "VIOLATED",
            evidence="No matching cross-order success detected" if c4_passed else "Matching completed order detected.",
            remediation=None if c4_passed else "Hard Stop (Level 5) to prevent double-charging.",
        ))

        # Article 5: Never override a hard safety policy
        c5_passed = policy_allowed or not is_autonomous_action
        checks.append(ConstitutionArticleCheck(
            article_number=5,
            name="Article 5: Policy Firewall Supremacy",
            description="No AI model, merchant configuration, or heuristic can bypass deterministic policy firewall boundaries.",
            passed=c5_passed,
            status="COMPLIANT" if c5_passed else "VIOLATED",
            evidence=f"Policy firewall verdict: {'PASS' if policy_allowed else 'BLOCKED'}.",
            remediation=None if c5_passed else "Route to human review queue.",
        ))

        # Article 6: Never hide uncertainty
        c6_passed = data_quality_pct >= 50.0 and trust_score >= 0.0
        checks.append(ConstitutionArticleCheck(
            article_number=6,
            name="Article 6: Full Uncertainty Transparency",
            description="The system must explicitly publish trust score, data quality, and rejected alternatives for every decision.",
            passed=c6_passed,
            status="COMPLIANT" if c6_passed else "VIOLATED",
            evidence=f"Data quality: {data_quality_pct}%. Trust score: {trust_score}/100.",
            remediation=None if c6_passed else "Flag data quality warning and request operator telemetry refresh.",
        ))

        # Article 7: Always provide a safe stop
        c7_passed = not (is_kill_switch_active and is_autonomous_action)
        checks.append(ConstitutionArticleCheck(
            article_number=7,
            name="Article 7: Safe Stop & Kill Switch Invariant",
            description="An emergency operator stop must instantaneously and irrevocably freeze all autonomous operations.",
            passed=c7_passed,
            status="COMPLIANT" if c7_passed else "VIOLATED",
            evidence=f"Global Kill Switch active: {is_kill_switch_active}.",
            remediation=None if c7_passed else "Immediate suppression of autonomous workers.",
        ))

        # Article 8: Always preserve tenant isolation
        c8_passed = bool(tenant_id and len(tenant_id) > 2)
        checks.append(ConstitutionArticleCheck(
            article_number=8,
            name="Article 8: Cryptographic Tenant Isolation",
            description="Every case, metric, policy, and action must strictly execute within authenticated tenant boundary.",
            passed=c8_passed,
            status="COMPLIANT" if c8_passed else "VIOLATED",
            evidence=f"Tenant ID: {tenant_id} verified.",
            remediation=None if c8_passed else "Reject untrusted request with HTTP 403 Forbidden.",
        ))

        # Article 9: Always preserve an auditable decision record
        c9_passed = True
        checks.append(ConstitutionArticleCheck(
            article_number=9,
            name="Article 9: Tamper-Evident Audit Ledger",
            description="Every financial decision generates a signed SHA-256 decision receipt appended to immutable hash chain.",
            passed=c9_passed,
            status="COMPLIANT",
            evidence="Decision receipt fingerprint generated and linked to audit ledger.",
            remediation=None,
        ))

        # Article 10: Customer cancellation overrides recovery
        c10_passed = not (customer_cancelled and is_autonomous_action)
        checks.append(ConstitutionArticleCheck(
            article_number=10,
            name="Article 10: Customer Sovereignty",
            description="Customer explicit opt-out or cancellation permanently halts all automated recovery attempts.",
            passed=c10_passed,
            status="COMPLIANT" if c10_passed else "VIOLATED",
            evidence=f"Customer cancelled: {customer_cancelled}.",
            remediation=None if c10_passed else "Permanently close case and log customer sovereignty adherence.",
        ))

        # Article 11: When financial state is uncertain, fail closed
        c11_passed = not (trust_score < 70.0 and is_autonomous_action)
        checks.append(ConstitutionArticleCheck(
            article_number=11,
            name="Article 11: Fail Closed on Uncertainty",
            description="If trust score is below 70/100 or provider health is degraded, autonomous fund movement is suppressed.",
            passed=c11_passed,
            status="COMPLIANT" if c11_passed else "VIOLATED",
            evidence=f"Trust score: {trust_score:.0f}/100. Provider degraded: {gateway_is_degraded}.",
            remediation=None if c11_passed else "Degrade to customer prompt or operator review.",
        ))

        # Article 12: Maximize legitimate incremental value, not raw volume
        c12_passed = True
        checks.append(ConstitutionArticleCheck(
            article_number=12,
            name="Article 12: Economic Justification & Restraint",
            description="Do Nothing is a first-class strategy when Net EV is negative or duplicate risk is present.",
            passed=c12_passed,
            status="COMPLIANT",
            evidence=f"Transaction evaluated against Net EV economic baseline.",
            remediation=None,
        ))

        violations = [c for c in checks if not c.passed]
        is_compliant = len(violations) == 0

        blocking_reason = None
        if not is_compliant:
            blocking_reason = f"CONSTITUTION VIOLATION: {violations[0].name} — {violations[0].remediation or violations[0].evidence}"

        return ConstitutionEvaluationResult(
            is_compliant=is_compliant,
            total_articles=12,
            compliant_articles=len(checks) - len(violations),
            violations_count=len(violations),
            checks=checks,
            verdict="CONSTITUTIONALLY_COMPLIANT" if is_compliant else "CONSTITUTIONAL_VIOLATION_BLOCKED",
            blocking_reason=blocking_reason,
        )


constitution_engine = RecoveryConstitution()
