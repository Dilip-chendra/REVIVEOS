"""
ReviveAI 2.0 — Policy Studio & Versioning Service

Manages versioned merchant policy rules (v1, v2, v3...), provides real-time
policy simulation ("What if I change this rule?"), and outputs structured
machine-readable block explanations with audit traceability.
"""
from __future__ import annotations
import copy
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.config import get_settings

settings = get_settings()


@dataclass
class PolicyRuleSet:
    policy_id: str
    version: int
    name: str
    description: str
    created_at: str
    created_by: str
    status: str  # "ACTIVE", "DRAFT", "ARCHIVED"
    max_automated_amount_inr: float
    max_retries_per_case: int
    retry_cooldown_minutes: int
    high_risk_threshold: float
    allowed_gateways: List[str]
    require_human_above_amount: float
    customer_communication_opt_out_enforced: bool
    daily_automation_budget_inr: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "policy_id": self.policy_id,
            "version": self.version,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at,
            "created_by": self.created_by,
            "status": self.status,
            "rules": {
                "max_automated_amount_inr": self.max_automated_amount_inr,
                "max_retries_per_case": self.max_retries_per_case,
                "retry_cooldown_minutes": self.retry_cooldown_minutes,
                "high_risk_threshold": self.high_risk_threshold,
                "allowed_gateways": self.allowed_gateways,
                "require_human_above_amount": self.require_human_above_amount,
                "customer_communication_opt_out_enforced": self.customer_communication_opt_out_enforced,
                "daily_automation_budget_inr": self.daily_automation_budget_inr,
            }
        }


# Per-merchant policy version registry
_merchant_policies: Dict[str, List[PolicyRuleSet]] = {}


class PolicyStudio:
    def __init__(self):
        pass

    def _get_default_policy(self, merchant_id: str) -> PolicyRuleSet:
        return PolicyRuleSet(
            policy_id=f"pol_{merchant_id}_v1",
            version=1,
            name="Default Enterprise Governance Policy",
            description="Balanced autonomous recovery with strict ₹50,000 ceiling, 3-retry cap, and human escalation.",
            created_at="2026-08-01T00:00:00Z",
            created_by="system_admin",
            status="ACTIVE",
            max_automated_amount_inr=settings.max_automated_amount_inr,
            max_retries_per_case=settings.max_retries_per_case,
            retry_cooldown_minutes=settings.retry_cooldown_minutes,
            high_risk_threshold=0.70,
            allowed_gateways=["razorpay", "payu", "cashfree", "stripe"],
            require_human_above_amount=settings.max_automated_amount_inr,
            customer_communication_opt_out_enforced=True,
            daily_automation_budget_inr=1000000.0,
        )

    def get_policies(self, merchant_id: str) -> List[Dict[str, Any]]:
        if merchant_id not in _merchant_policies or not _merchant_policies[merchant_id]:
            _merchant_policies[merchant_id] = [self._get_default_policy(merchant_id)]
        return [p.to_dict() for p in _merchant_policies[merchant_id]]

    def get_active_policy(self, merchant_id: str) -> PolicyRuleSet:
        if merchant_id not in _merchant_policies or not _merchant_policies[merchant_id]:
            _merchant_policies[merchant_id] = [self._get_default_policy(merchant_id)]
        active = next((p for p in _merchant_policies[merchant_id] if p.status == "ACTIVE"), None)
        return active or _merchant_policies[merchant_id][-1]

    def create_policy_version(
        self,
        merchant_id: str,
        name: str,
        description: str,
        created_by: str,
        rules: Dict[str, Any],
    ) -> Dict[str, Any]:
        if merchant_id not in _merchant_policies or not _merchant_policies[merchant_id]:
            _merchant_policies[merchant_id] = [self._get_default_policy(merchant_id)]

        history = _merchant_policies[merchant_id]
        next_ver = len(history) + 1

        # Mark all prior policies as ARCHIVED
        for p in history:
            p.status = "ARCHIVED"

        new_policy = PolicyRuleSet(
            policy_id=f"pol_{merchant_id}_v{next_ver}",
            version=next_ver,
            name=name or f"Custom Merchant Policy v{next_ver}",
            description=description or f"Updated governance rules with custom limits.",
            created_at=datetime.now(timezone.utc).isoformat(),
            created_by=created_by or "merchant_admin",
            status="ACTIVE",
            max_automated_amount_inr=float(rules.get("max_automated_amount_inr", settings.max_automated_amount_inr)),
            max_retries_per_case=int(rules.get("max_retries_per_case", settings.max_retries_per_case)),
            retry_cooldown_minutes=int(rules.get("retry_cooldown_minutes", settings.retry_cooldown_minutes)),
            high_risk_threshold=float(rules.get("high_risk_threshold", 0.70)),
            allowed_gateways=list(rules.get("allowed_gateways", ["razorpay", "payu", "cashfree", "stripe"])),
            require_human_above_amount=float(rules.get("require_human_above_amount", rules.get("max_automated_amount_inr", 50000.0))),
            customer_communication_opt_out_enforced=bool(rules.get("customer_communication_opt_out_enforced", True)),
            daily_automation_budget_inr=float(rules.get("daily_automation_budget_inr", 1000000.0)),
        )

        history.append(new_policy)
        return new_policy.to_dict()

    def simulate_policy_change(
        self,
        merchant_id: str,
        new_rules: Dict[str, Any],
        cases: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Simulates the effect of proposed policy rule changes against actual active cases.
        Answers: 'What would happen if I change the ceiling or retry limit?'
        """
        active_policy = self.get_active_policy(merchant_id)
        
        target_ceiling = float(new_rules.get("max_automated_amount_inr", active_policy.max_automated_amount_inr))
        target_max_retries = int(new_rules.get("max_retries_per_case", active_policy.max_retries_per_case))
        target_risk_threshold = float(new_rules.get("high_risk_threshold", active_policy.high_risk_threshold))
        target_allowed_gw = set(new_rules.get("allowed_gateways", active_policy.allowed_gateways))

        total_cases = len(cases)
        total_amount = sum(c.get("amount_inr", 0) for c in cases)

        current_blocked_count = 0
        current_blocked_amount = 0.0

        sim_blocked_count = 0
        sim_blocked_amount = 0.0
        
        newly_blocked = []
        newly_allowed = []

        for c in cases:
            amt = float(c.get("amount_inr", 0))
            retries = int(c.get("retry_count", 0))
            risk = float(c.get("risk_score", 0.5))
            gw = str(c.get("gateway", "razorpay")).lower()
            code = str(c.get("failure_code", ""))

            # 1. Evaluate with CURRENT active policy
            curr_pass = (
                amt <= active_policy.max_automated_amount_inr
                and retries < active_policy.max_retries_per_case
                and risk <= active_policy.high_risk_threshold
                and gw in active_policy.allowed_gateways
                and code != "CARD_EXPIRED"
            )
            if not curr_pass:
                current_blocked_count += 1
                current_blocked_amount += amt

            # 2. Evaluate with PROPOSED simulated policy
            sim_pass = (
                amt <= target_ceiling
                and retries < target_max_retries
                and risk <= target_risk_threshold
                and gw in target_allowed_gw
                and code != "CARD_EXPIRED"
            )
            if not sim_pass:
                sim_blocked_count += 1
                sim_blocked_amount += amt

            # Track delta
            if curr_pass and not sim_pass:
                reason = "Amount exceeds new ceiling" if amt > target_ceiling else ("Exceeds retry cap" if retries >= target_max_retries else "Gateway excluded")
                newly_blocked.append({
                    "case_id": c.get("id"),
                    "customer_name": c.get("customer_name", "Unknown"),
                    "amount_inr": amt,
                    "reason": reason,
                })
            elif not curr_pass and sim_pass:
                newly_allowed.append({
                    "case_id": c.get("id"),
                    "customer_name": c.get("customer_name", "Unknown"),
                    "amount_inr": amt,
                })

        return {
            "current_policy_version": f"v{active_policy.version}",
            "simulated_rules": {
                "max_automated_amount_inr": target_ceiling,
                "max_retries_per_case": target_max_retries,
                "high_risk_threshold": target_risk_threshold,
                "allowed_gateways": list(target_allowed_gw),
            },
            "impact_summary": {
                "total_cases_evaluated": total_cases,
                "total_exposure_inr": total_amount,
                "current_blocked_cases": current_blocked_count,
                "current_blocked_revenue_inr": current_blocked_amount,
                "simulated_blocked_cases": sim_blocked_count,
                "simulated_blocked_revenue_inr": sim_blocked_amount,
                "newly_blocked_count": len(newly_blocked),
                "newly_blocked_revenue_inr": sum(b["amount_inr"] for b in newly_blocked),
                "newly_allowed_count": len(newly_allowed),
                "newly_allowed_revenue_inr": sum(a["amount_inr"] for a in newly_allowed),
                "automation_coverage_percentage": round(((total_cases - sim_blocked_count) / max(1, total_cases)) * 100, 1),
                "risk_exposure_reduction_inr": max(0.0, sim_blocked_amount - current_blocked_amount),
            },
            "newly_blocked_cases": newly_blocked[:10],
            "newly_allowed_cases": newly_allowed[:10],
            "recommendation": (
                f"Lowering ceiling to ₹{target_ceiling:,.0f} shifts {len(newly_blocked)} high-value cases (₹{sum(b['amount_inr'] for b in newly_blocked):,.0f}) to Human Review, reducing financial risk."
                if len(newly_blocked) > 0
                else "Simulated policy maintains balanced automation coverage with zero newly blocked cases."
            )
        }


# Singleton
policy_studio = PolicyStudio()