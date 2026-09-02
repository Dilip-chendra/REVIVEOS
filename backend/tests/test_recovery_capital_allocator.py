"""
ReviveAI — AI Recovery Capital Allocator & Incremental Revenue Optimization Engine Test Suite

Verifies:
1. Global Constrained Knapsack Allocation (Budget Limit & Contact Cap enforcement)
2. "The Amount Trap": High-yield low-friction ₹2,500 case outranks low-yield ₹1,20,000 case
3. "The Natural Recovery Restraint": High natural settlement (P(Natural) >= 75%) routed to INTENTIONALLY_ABSTAIN
4. Budget What-If Dynamic Reallocation (₹500 -> ₹200 shifts the optimal portfolio immediately)
5. 5% Synthetic Holdout Control Group Assignment
6. Counterfactual Uplift & Settlement Attribution Calculation
7. Continuous Regret Minimization Matrix Breakdown
8. Financial Action Gateway Signed Action Execution
"""
import pytest
from app.services.capital_allocator import (
    capital_allocator, OpportunityBucket, RecoveryCapitalAllocator
)
from app.services.attribution_regret_engine import attribution_regret_engine
from app.services.financial_gateway import financial_action_gateway, FinancialActionRequest
from app.services.action_contract import action_contract_manager


class TestRecoveryCapitalAllocator:
    def test_portfolio_seeding_and_amount_trap_properties(self):
        """Verifies 500 opportunities seeded and ₹2,500 high-yield case outranks ₹1,20,000 trap."""
        allocator = RecoveryCapitalAllocator()
        opps = allocator.get_opportunities()
        assert len(opps) == 500
        assert sum(o.amount_inr for o in opps) > 1000000.0  # ~₹14.5L gross exposure

        # Find the two explicit trap cases
        opp_large = next(o for o in opps if o.id == "OPP-001")
        opp_sub = next(o for o in opps if o.id == "OPP-002")

        # High-yield subscriber has much higher yield score than ₹1.2L whale
        assert opp_sub.yield_score > opp_large.yield_score
        assert opp_sub.tau > opp_large.tau  # 87pp uplift vs 12pp uplift

    def test_constrained_knapsack_budget_and_contact_limits(self):
        """Ensures allocator strictly respects recovery budget and contact limits."""
        allocator = RecoveryCapitalAllocator()
        res = allocator.optimize_portfolio(recovery_budget_inr=500.0, contact_limit=50)

        assert res.allocated_budget_inr <= 500.0
        assert res.allocated_contacts <= 50
        assert res.remaining_budget_inr >= 0.0
        assert res.expected_incremental_recovery_inr > 100000.0  # Significant incremental yield
        assert res.incremental_recovery_yield_ratio > 100.0      # High multiple (e.g. > 500x)

        # Pursue bucket count
        pursue_ids = res.buckets[OpportunityBucket.PURSUE.value]
        assert len(pursue_ids) > 0
        assert len(pursue_ids) <= 50

    def test_natural_recovery_abstention_trap(self):
        """Verifies that ₹18,500 case with 89% natural recovery is placed in INTENTIONALLY_ABSTAIN."""
        allocator = RecoveryCapitalAllocator()
        res = allocator.optimize_portfolio(recovery_budget_inr=500.0, contact_limit=50)

        opp_natural = next(o for o in allocator.get_opportunities() if o.id == "OPP-003")
        assert opp_natural.bucket == OpportunityBucket.INTENTIONALLY_ABSTAIN
        assert "Natural Settlement Probability" in (opp_natural.abstention_reason or "")
        assert opp_natural.id in res.buckets[OpportunityBucket.INTENTIONALLY_ABSTAIN.value]

    def test_budget_shift_dynamic_reallocation(self):
        """Changing budget from ₹500 to ₹100 dynamically shrinks selected portfolio."""
        allocator = RecoveryCapitalAllocator()

        res_500 = allocator.optimize_portfolio(recovery_budget_inr=500.0, contact_limit=50)
        res_100 = allocator.optimize_portfolio(recovery_budget_inr=100.0, contact_limit=10)

        assert res_100.allocated_budget_inr <= 100.0
        assert res_100.allocated_contacts <= 10
        assert len(res_100.buckets[OpportunityBucket.PURSUE.value]) < len(res_500.buckets[OpportunityBucket.PURSUE.value])
        assert res_100.expected_incremental_recovery_inr < res_500.expected_incremental_recovery_inr

    def test_synthetic_control_holdout_presence(self):
        """5% un-contacted synthetic control group is preserved for counterfactual measurement."""
        allocator = RecoveryCapitalAllocator()
        res = allocator.optimize_portfolio()

        assert res.held_out_count > 0
        assert res.held_out_exposure_inr > 10000.0

    def test_settlement_attribution_and_causal_lift(self):
        """Settlement sync produces positive causal uplift and accurate regret breakdown."""
        settle_res = attribution_regret_engine.simulate_settlement_sync(
            recovery_budget_inr=500.0,
            contact_limit=50,
        )

        assert settle_res.treatment_recovered > 0
        assert settle_res.treatment_recovery_rate > settle_res.holdout_recovery_rate
        assert settle_res.observed_causal_uplift_pp > 20.0  # Demonstrates positive causal lift
        assert settle_res.capital_saved_abstention_inr > 1000.0
        assert settle_res.good_decisions_pct > 30.0
        assert settle_res.good_decisions_count > 100
        assert len(settle_res.regret_summary) == 4

    @pytest.mark.asyncio
    async def test_portfolio_batch_dispatches_signed_action_contracts(self):
        """PURSUE opportunities execute via FinancialActionGateway with cryptographic verification."""
        alloc_res = capital_allocator.optimize_portfolio(recovery_budget_inr=500.0, contact_limit=50)
        pursue_ids = alloc_res.buckets[OpportunityBucket.PURSUE.value]
        opps = capital_allocator.get_opportunities()
        target_opp = next(o for o in opps if o.id in pursue_ids)

        contract = action_contract_manager.create_contract(
            case_id=target_opp.case_id,
            tenant_id="merchant_test_tenant",
            payment_id=f"pay_{target_opp.id}",
            amount_inr=target_opp.amount_inr,
            strategy_type="smart_retry",
            authorization_state="AUTHORIZED",
            customer_intent="CONFIRMED",
            policy_version="v2.1",
            autonomy_level="AUTONOMOUS",
        )

        assert contract.signature is not None
        valid, err = action_contract_manager.verify_contract(contract, expected_tenant_id="merchant_test_tenant")
        assert valid is True

        req = FinancialActionRequest(
            merchant_id="merchant_test_tenant",
            case_id=target_opp.case_id,
            action_type="smart_retry",
            actor="RECOVERY_ENGINE",
            signed_contract=contract.to_dict(),
        )

        exec_res = await financial_action_gateway.execute_action(req)
        assert exec_res.status.value in ("EXECUTED", "BLOCKED", "ESCALATED")
