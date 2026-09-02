"""
ReviveAI — Central Financial Safety Governor & Dynamic Autonomy Controller

Sits at the pinnacle of the Financial Control Plane.
Continuously determines the MAXIMUM ALLOWED AUTONOMY across the entire system.

Core Capabilities:
1. Dynamic Self-Reducing Autonomy (Earns autonomy through proven reliability)
2. Daily Recovery Budget Exposure Caps (Prevents runaway automation)
3. Financial Blast Radius Protection (Calculates aggregate downside before execution)
4. System-Wide Safety Posture (0-100 Composite score across 7 integrity pillars)
5. Autonomy Explainer (Transparently details why autonomy was reduced)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone


class SystemSafetyPosture(str, Enum):
    NORMAL = "NORMAL"                     # Full autonomy allowed up to Level 3.
    DEGRADED = "DEGRADED"                 # Provider or model degraded. Autonomy reduced to Level 2 (Ask).
    PROTECTIVE = "PROTECTIVE"             # Multiple anomalies detected. Autonomy reduced to Level 1 (Recommend).
    HUMAN_ONLY = "HUMAN_ONLY"             # High financial risk or budget exhausted. Autonomy reduced to Level 4 (Human Approval).
    EMERGENCY_STOP = "EMERGENCY_STOP"     # Kill switch active or severe mismatch. Autonomy reduced to Level 5 (Hard Stop).


class GovernorAutonomyCeiling(str, Enum):
    LEVEL_3_AUTO_ELIGIBLE = "LEVEL_3_AUTO_ELIGIBLE"
    LEVEL_2_CUSTOMER_INITIATED = "LEVEL_2_CUSTOMER_INITIATED"
    LEVEL_1_RECOMMEND = "LEVEL_1_RECOMMEND"
    LEVEL_0_OBSERVE = "LEVEL_0_OBSERVE"
    LEVEL_5_HARD_STOP = "LEVEL_5_HARD_STOP"


@dataclass
class DailyRecoveryBudget:
    daily_limit_inr: float = 500000.0  # ₹5,00,000 per merchant / day
    used_today_inr: float = 0.0
    remaining_inr: float = 500000.0
    is_exhausted: bool = False
    reset_at_utc: str = field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d 23:59:59 UTC"))

    def record_usage(self, amount_inr: float) -> bool:
        if self.used_today_inr + amount_inr > self.daily_limit_inr:
            self.is_exhausted = True
            return False
        self.used_today_inr += amount_inr
        self.remaining_inr = max(0.0, self.daily_limit_inr - self.used_today_inr)
        self.is_exhausted = self.remaining_inr <= 0
        return True


@dataclass
class BlastRadiusAssessment:
    eligible_cases_count: int
    average_amount_inr: float
    total_potential_exposure_inr: float
    merchant_daily_budget_remaining_inr: float
    within_safe_limits: bool
    risk_assessment: str
    remediation: Optional[str] = None


@dataclass
class GovernorDecision:
    max_allowed_autonomy: GovernorAutonomyCeiling
    posture: SystemSafetyPosture
    safety_score: float  # 0 - 100
    is_autonomous_permitted: bool
    reduction_reasons: List[str]
    pillars: Dict[str, float]
    daily_budget: Dict[str, Any]
    blast_radius: Dict[str, Any]
    evaluated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SafetyGovernor:
    def __init__(self):
        self._merchant_budgets: Dict[str, DailyRecoveryBudget] = {}

    def get_budget(self, merchant_id: str) -> DailyRecoveryBudget:
        if merchant_id not in self._merchant_budgets:
            self._merchant_budgets[merchant_id] = DailyRecoveryBudget()
        return self._merchant_budgets[merchant_id]

    def compute_blast_radius(
        self,
        merchant_id: str,
        eligible_cases: List[Dict[str, Any]],
    ) -> BlastRadiusAssessment:
        budget = self.get_budget(merchant_id)
        count = len(eligible_cases)
        total_val = sum(c.get("amount_inr", 0) for c in eligible_cases)
        avg_val = (total_val / count) if count > 0 else 0.0

        within_limits = total_val <= budget.remaining_inr
        risk_str = "SAFE_EXPOSURE" if within_limits else "BLAST_RADIUS_LIMIT_EXCEEDED"
        remediation = None if within_limits else f"Batch exposure ₹{total_val:,.0f} exceeds daily remaining budget ₹{budget.remaining_inr:,.0f}."

        return BlastRadiusAssessment(
            eligible_cases_count=count,
            average_amount_inr=round(avg_val, 2),
            total_potential_exposure_inr=round(total_val, 2),
            merchant_daily_budget_remaining_inr=round(budget.remaining_inr, 2),
            within_safe_limits=within_limits,
            risk_assessment=risk_str,
            remediation=remediation,
        )

    def evaluate_system_governance(
        self,
        merchant_id: str,
        gateway_health_score: float = 98.0,
        duplicate_anomalies_detected: int = 0,
        reconciliation_mismatches: int = 0,
        model_calibration_score: float = 94.0,
        data_quality_score: float = 95.0,
        policy_integrity_score: float = 100.0,
        audit_chain_valid: bool = True,
        is_kill_switch_active: bool = False,
        incident_mode: str = "NORMAL",
        candidate_amount_inr: float = 0.0,
    ) -> GovernorDecision:
        budget = self.get_budget(merchant_id)
        reasons: List[str] = []

        # 7 Integrity Pillars (0 - 100)
        p_data = data_quality_score
        p_provider = gateway_health_score
        p_model = model_calibration_score
        p_policy = policy_integrity_score
        p_dup = 0.0 if duplicate_anomalies_detected > 0 else 100.0
        p_recon = 0.0 if reconciliation_mismatches > 0 else 100.0
        p_audit = 100.0 if audit_chain_valid else 0.0

        safety_score = (
            p_data * 0.15 +
            p_provider * 0.20 +
            p_model * 0.15 +
            p_policy * 0.20 +
            p_dup * 0.10 +
            p_recon * 0.10 +
            p_audit * 0.10
        )
        safety_score = round(max(0.0, min(100.0, safety_score)), 1)

        # Autonomy Ceiling & Posture Determination
        if is_kill_switch_active or incident_mode == "EMERGENCY_STOP":
            posture = SystemSafetyPosture.EMERGENCY_STOP
            ceiling = GovernorAutonomyCeiling.LEVEL_5_HARD_STOP
            reasons.append("Global Emergency Recovery Kill Switch is ACTIVE.")
        elif reconciliation_mismatches > 0:
            posture = SystemSafetyPosture.EMERGENCY_STOP
            ceiling = GovernorAutonomyCeiling.LEVEL_5_HARD_STOP
            reasons.append(f"CRITICAL RECONCILIATION MISMATCH: {reconciliation_mismatches} discrepancy detected with Razorpay provider ledger.")
        elif duplicate_anomalies_detected > 0:
            posture = SystemSafetyPosture.PROTECTIVE
            ceiling = GovernorAutonomyCeiling.LEVEL_1_RECOMMEND
            reasons.append(f"DUPLICATE RISK SPIKE: {duplicate_anomalies_detected} matching transactions detected. Automated debit frozen.")
        elif budget.is_exhausted or (candidate_amount_inr > budget.remaining_inr):
            posture = SystemSafetyPosture.HUMAN_ONLY
            ceiling = GovernorAutonomyCeiling.LEVEL_1_RECOMMEND
            reasons.append(f"DAILY RECOVERY BUDGET EXHAUSTED: Remaining ₹{budget.remaining_inr:,.0f} of ₹{budget.daily_limit_inr:,.0f}.")
        elif gateway_health_score < 70.0 or incident_mode in ("DEGRADED", "PROTECTIVE"):
            posture = SystemSafetyPosture.DEGRADED
            ceiling = GovernorAutonomyCeiling.LEVEL_2_CUSTOMER_INITIATED
            reasons.append(f"GATEWAY INSTABILITY: Provider health is {gateway_health_score:.0f}%. Autonomy downgraded to interactive links.")
        elif model_calibration_score < 75.0:
            posture = SystemSafetyPosture.DEGRADED
            ceiling = GovernorAutonomyCeiling.LEVEL_2_CUSTOMER_INITIATED
            reasons.append(f"MODEL CALIBRATION DRIFT: Accuracy score is {model_calibration_score:.0f}%. Autonomous fund movement restricted.")
        else:
            posture = SystemSafetyPosture.NORMAL
            ceiling = GovernorAutonomyCeiling.LEVEL_3_AUTO_ELIGIBLE

        is_permitted = ceiling == GovernorAutonomyCeiling.LEVEL_3_AUTO_ELIGIBLE

        return GovernorDecision(
            max_allowed_autonomy=ceiling,
            posture=posture,
            safety_score=safety_score,
            is_autonomous_permitted=is_permitted,
            reduction_reasons=reasons,
            pillars={
                "data_integrity": p_data,
                "provider_health": p_provider,
                "model_reliability": p_model,
                "policy_integrity": p_policy,
                "duplicate_protection": p_dup,
                "reconciliation_health": p_recon,
                "audit_health": p_audit,
            },
            daily_budget={
                "daily_limit_inr": budget.daily_limit_inr,
                "used_today_inr": budget.used_today_inr,
                "remaining_inr": budget.remaining_inr,
                "is_exhausted": budget.is_exhausted,
            },
            blast_radius={
                "within_safe_limits": budget.remaining_inr >= candidate_amount_inr,
                "candidate_exposure_inr": candidate_amount_inr,
            },
        )


safety_governor = SafetyGovernor()
