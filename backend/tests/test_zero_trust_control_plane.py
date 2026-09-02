"""
ReviveAI — Zero-Trust Financial Control Plane Test Suite

Verifies:
1. The 12-Article Recovery Constitution (Articles 1-12)
2. Signed Cryptographic Action Contracts (HMAC-SHA256, Integer Minor Paisa Units, TTL Expiry)
3. Safety Governor (Dynamic self-reducing autonomy, blast radius protection, daily recovery budget)
4. Customer Intent Decay & Cross-Order Purchase Completion Correlator
5. Causal Recovery Attribution & Incremental Value Lift
"""
import pytest
import time
import hmac
import hashlib

from app.services.constitution import constitution_engine, ArticleNumber
from app.services.action_contract import action_contract_manager, ActionContract
from app.services.safety_governor import safety_governor, SystemSafetyPosture, GovernorAutonomyCeiling
from app.services.causality_engine import causality_engine, AttributionClass, DuplicateClassification
from app.services.decision_engine import (
    decision_engine, NormalizedCase, CustomerIntent, AuthorizationState,
    RecoveryAutonomyLevel, ActionVerdict
)


class TestRecoveryConstitution:
    def test_constitution_article_1_authorization_gate(self):
        """Article 1: Never act without valid authorization."""
        res = constitution_engine.evaluate(
            case_id="case_auth_test",
            tenant_id="tenant_01",
            amount_inr=1500.0,
            authorization_state="AUTHORIZATION_REQUIRED",
            customer_intent="ACTIVE",
            customer_cancelled=False,
            duplicate_detected=False,
            is_kill_switch_active=False,
            gateway_is_degraded=False,
            trust_score=85.0,
            policy_allowed=True,
            is_autonomous_action=True,
        )
        assert not res.is_compliant
        assert res.violations_count >= 1
        art1 = next(c for c in res.checks if c.article_number == 1)
        assert not art1.passed
        assert art1.status == "VIOLATED"

    def test_constitution_article_2_intent_not_inferred_from_unknown(self):
        """Article 2: Never treat unknown as consent."""
        res = constitution_engine.evaluate(
            case_id="case_intent_test",
            tenant_id="tenant_01",
            amount_inr=2000.0,
            authorization_state="AUTHORIZED",
            customer_intent="UNKNOWN",
            customer_cancelled=False,
            duplicate_detected=False,
            is_kill_switch_active=False,
            gateway_is_degraded=False,
            trust_score=85.0,
            policy_allowed=True,
            is_autonomous_action=True,
        )
        assert not res.is_compliant
        art2 = next(c for c in res.checks if c.article_number == 2)
        assert not art2.passed

    def test_constitution_article_4_duplicate_purchase_shield(self):
        """Article 4: Never allow duplicate financial effects."""
        res = constitution_engine.evaluate(
            case_id="case_dup_test",
            tenant_id="tenant_01",
            amount_inr=45000.0,
            authorization_state="AUTHORIZED",
            customer_intent="ACTIVE",
            customer_cancelled=False,
            duplicate_detected=True,
            is_kill_switch_active=False,
            gateway_is_degraded=False,
            trust_score=85.0,
            policy_allowed=True,
            is_autonomous_action=True,
        )
        assert not res.is_compliant
        art4 = next(c for c in res.checks if c.article_number == 4)
        assert not art4.passed

    def test_constitution_article_7_emergency_stop(self):
        """Article 7: Safe stop invariant."""
        res = constitution_engine.evaluate(
            case_id="case_kill_test",
            tenant_id="tenant_01",
            amount_inr=500.0,
            authorization_state="AUTHORIZED",
            customer_intent="ACTIVE",
            customer_cancelled=False,
            duplicate_detected=False,
            is_kill_switch_active=True,
            gateway_is_degraded=False,
            trust_score=95.0,
            policy_allowed=True,
            is_autonomous_action=True,
        )
        assert not res.is_compliant
        art7 = next(c for c in res.checks if c.article_number == 7)
        assert not art7.passed

    def test_constitution_article_10_customer_sovereignty(self):
        """Article 10: Customer cancellation overrides recovery."""
        res = constitution_engine.evaluate(
            case_id="case_cancel_test",
            tenant_id="tenant_01",
            amount_inr=3000.0,
            authorization_state="AUTHORIZED",
            customer_intent="CANCELLED",
            customer_cancelled=True,
            duplicate_detected=False,
            is_kill_switch_active=False,
            gateway_is_degraded=False,
            trust_score=90.0,
            policy_allowed=True,
            is_autonomous_action=True,
        )
        assert not res.is_compliant
        art10 = next(c for c in res.checks if c.article_number == 10)
        assert not art10.passed

    def test_constitution_all_12_articles_pass_when_fully_safe(self):
        """All 12 Articles pass for a fully authorized, clean case."""
        res = constitution_engine.evaluate(
            case_id="case_clean_test",
            tenant_id="merchant_alpha",
            amount_inr=4999.0,
            authorization_state="AUTHORIZED",
            customer_intent="CONFIRMED",
            customer_cancelled=False,
            duplicate_detected=False,
            is_kill_switch_active=False,
            gateway_is_degraded=False,
            trust_score=95.0,
            policy_allowed=True,
            is_autonomous_action=True,
            data_quality_pct=98.0,
        )
        assert res.is_compliant
        assert res.compliant_articles == 12
        assert res.violations_count == 0


class TestActionContracts:
    def test_action_contract_generation_and_minor_paisa_units(self):
        """Action contracts must store exact integer minor paisa units (1 INR = 100 Paisa)."""
        contract = action_contract_manager.create_contract(
            case_id="case_paisa_01",
            tenant_id="merchant_01",
            payment_id="pay_01",
            amount_inr=4999.50,
            strategy_type="optimal_smart_delay",
            authorization_state="AUTHORIZED",
            customer_intent="ACTIVE",
            policy_version="v3.2",
            autonomy_level="LEVEL_3_AUTO_ELIGIBLE",
            ttl_seconds=300,
        )
        assert contract.amount_minor_paisa == 499950
        assert len(contract.signature) == 64  # SHA-256 hex string

    def test_action_contract_cryptographic_verification(self):
        """Valid action contract passes constant-time HMAC-SHA256 signature verification."""
        contract = action_contract_manager.create_contract(
            case_id="case_verify_01",
            tenant_id="merchant_01",
            payment_id="pay_01",
            amount_inr=1000.0,
            strategy_type="gateway_failover",
            authorization_state="AUTHORIZED",
            customer_intent="ACTIVE",
            policy_version="v3.2",
            autonomy_level="LEVEL_3_AUTO_ELIGIBLE",
        )
        is_valid, err = action_contract_manager.verify_contract(contract, expected_tenant_id="merchant_01")
        assert is_valid
        assert err is None

    def test_action_contract_tamper_detection(self):
        """Modifying amount in a contract breaks cryptographic HMAC signature."""
        contract = action_contract_manager.create_contract(
            case_id="case_tamper_01",
            tenant_id="merchant_01",
            payment_id="pay_01",
            amount_inr=1000.0,
            strategy_type="optimal_smart_delay",
            authorization_state="AUTHORIZED",
            customer_intent="ACTIVE",
            policy_version="v3.2",
            autonomy_level="LEVEL_3_AUTO_ELIGIBLE",
        )
        # Adversary alters amount from ₹1,000 to ₹10,000
        contract.amount_minor_paisa = 1000000
        is_valid, err = action_contract_manager.verify_contract(contract, expected_tenant_id="merchant_01")
        assert not is_valid
        assert "CRYPTOGRAPHIC INTEGRITY FAILURE" in err

    def test_action_contract_ttl_expiration(self):
        """Expired contracts fail verification."""
        contract = action_contract_manager.create_contract(
            case_id="case_exp_01",
            tenant_id="merchant_01",
            payment_id="pay_01",
            amount_inr=500.0,
            strategy_type="optimal_smart_delay",
            authorization_state="AUTHORIZED",
            customer_intent="ACTIVE",
            policy_version="v3.2",
            autonomy_level="LEVEL_3_AUTO_ELIGIBLE",
            ttl_seconds=-1,  # Already expired
        )
        is_valid, err = action_contract_manager.verify_contract(contract, expected_tenant_id="merchant_01")
        assert not is_valid
        assert "ACTION CONTRACT EXPIRED" in err


class TestSafetyGovernor:
    def test_governor_downgrades_autonomy_on_provider_degradation(self):
        """Safety Governor dynamically reduces autonomy when gateway is degraded."""
        gov_res = safety_governor.evaluate_system_governance(
            merchant_id="merchant_gov_01",
            gateway_health_score=45.0,  # Degraded
            duplicate_anomalies_detected=0,
            reconciliation_mismatches=0,
        )
        assert gov_res.posture == SystemSafetyPosture.DEGRADED
        assert gov_res.max_allowed_autonomy == GovernorAutonomyCeiling.LEVEL_2_CUSTOMER_INITIATED
        assert not gov_res.is_autonomous_permitted

    def test_governor_emergency_stop_on_reconciliation_mismatch(self):
        """Governor immediately triggers Emergency Stop if reconciliation mismatch detected."""
        gov_res = safety_governor.evaluate_system_governance(
            merchant_id="merchant_gov_02",
            gateway_health_score=98.0,
            duplicate_anomalies_detected=0,
            reconciliation_mismatches=2,  # Discrepancy!
        )
        assert gov_res.posture == SystemSafetyPosture.EMERGENCY_STOP
        assert gov_res.max_allowed_autonomy == GovernorAutonomyCeiling.LEVEL_5_HARD_STOP
        assert not gov_res.is_autonomous_permitted

    def test_daily_recovery_budget_exhaustion(self):
        """Governor pauses autonomy when merchant daily recovery budget is exhausted."""
        budget = safety_governor.get_budget("merchant_budget_test")
        budget.used_today_inr = 490000.0
        budget.remaining_inr = 10000.0

        # Attempt to recover ₹15,000 (exceeds remaining ₹10,000)
        gov_res = safety_governor.evaluate_system_governance(
            merchant_id="merchant_budget_test",
            candidate_amount_inr=15000.0,
        )
        assert gov_res.posture == SystemSafetyPosture.HUMAN_ONLY
        assert not gov_res.is_autonomous_permitted


class TestCausalityAndIntentDecay:
    def test_customer_intent_exponential_decay(self):
        """Customer intent decays over time from active to ambiguous to expired."""
        fresh_intent = causality_engine.compute_intent_decay("CONFIRMED", elapsed_seconds=60)
        assert fresh_intent.decayed_intent_state == "CONFIRMED"
        assert fresh_intent.decayed_confidence_pct >= 90.0

        stale_intent = causality_engine.compute_intent_decay("CONFIRMED", elapsed_seconds=2400)
        assert stale_intent.is_window_expired
        assert stale_intent.decayed_intent_state == "EXPIRED"

    def test_purchase_completion_cross_order_correlator(self):
        """Detects if customer already paid identical amount on another order."""
        other_cases = [
            {"id": "order_completed_99", "customer_id": "cust_123", "amount_inr": 3500.0, "status": "recovered"},
        ]
        status, match_id, detail = causality_engine.correlate_purchase_completion(
            current_case_id="case_curr_1",
            customer_id="cust_123",
            amount_inr=3500.0,
            merchant_cases=other_cases,
        )
        assert status == DuplicateClassification.CONFIRMED_DUPLICATE
        assert match_id == "order_completed_99"

    def test_causal_recovery_attribution_and_incremental_lift(self):
        """Attribution engine calculates true incremental lift vs holdout baseline."""
        attr_res = causality_engine.attribute_recovery_outcome(
            case_id="case_attr_1",
            amount_inr=10000.0,
            action_executed_by_reviveai=True,
            time_to_payment_seconds=300,
        )
        assert attr_res.attribution == AttributionClass.REVIVEAI_ASSISTED
        assert attr_res.incremental_lift_percentage_points > 0
        assert attr_res.incremental_value_inr > 0
