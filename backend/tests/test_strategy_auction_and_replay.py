# -*- coding: utf-8 -*-
"""
ReviveAI -- Strategy Auction, Decision Replay & Policy Simulator Tests
"""
import pytest
from app.services.strategy_auction import strategy_auction_engine, StrategyOption, EvidenceSufficiencyLevel
from app.services.decision_replay import decision_replay_engine
from app.services.policy_simulator import policy_simulator


def test_strategy_auction_smart_retry_vs_payment_link():
    # Pre-authorized mandate renewal
    res_auth = strategy_auction_engine.evaluate_auction(
        opportunity_id="OPP-002",
        amount_inr=2500.0,
        failure_code="EXPIRED_CARD",
        is_pre_authorized=True,
    )
    assert res_auth.winning_strategy == StrategyOption.SMART_RETRY
    assert res_auth.winning_bid.net_economic_contribution_inr > 1500.0
    assert res_auth.autonomy_action == "RECOVER"

    # Non-authorized one-time cart
    res_unauth = strategy_auction_engine.evaluate_auction(
        opportunity_id="OPP-004",
        amount_inr=4999.0,
        failure_code="INSUFFICIENT_FUNDS",
        is_pre_authorized=False,
    )
    assert res_unauth.winning_strategy == StrategyOption.PAYMENT_LINK
    assert res_unauth.winning_bid.requires_customer_action is True
    assert res_unauth.autonomy_action == "ASK_CUSTOMER"


def test_strategy_auction_natural_recovery_abstention():
    res_nat = strategy_auction_engine.evaluate_auction(
        opportunity_id="OPP-003",
        amount_inr=18500.0,
        failure_code="BANK_OFFLINE_TIMEOUT",
        is_pre_authorized=False,
    )
    assert res_nat.winning_strategy == StrategyOption.DO_NOTHING
    assert res_nat.autonomy_action == "DO_NOTHING"
    assert "saves merchant fees" in res_nat.decision_summary


def test_minimum_evidence_to_act_downgrades_autonomy():
    res_stale = strategy_auction_engine.evaluate_auction(
        opportunity_id="OPP-STALE",
        amount_inr=5000.0,
        failure_code="GENERIC_ERROR",
        data_age_seconds=400.0,  # > 300s -> INSUFFICIENT
    )
    assert res_stale.minimum_evidence_met is False
    assert res_stale.winning_bid.evidence_sufficiency == EvidenceSufficiencyLevel.INSUFFICIENT
    assert res_stale.autonomy_action == "WAIT"


def test_decision_replay_forensic_timeline():
    replay = decision_replay_engine.reconstruct_decision_timeline(
        opportunity_id="OPP-002",
        amount_inr=2500.0,
        scenario_type="standard_recovery",
    )
    assert replay.total_steps == 6
    assert replay.timeline[0].phase == "RAW_INGESTION"
    assert replay.timeline[1].phase == "ELIGIBILITY_CHECK"
    assert replay.timeline[3].phase == "PORTFOLIO_ALLOCATION"
    assert replay.timeline[4].contract_id is not None
    assert replay.final_verdict == "EXECUTED_RECOVERED_INCREMENTAL"


def test_decision_replay_toctou_duplicate_intercept():
    replay_toctou = decision_replay_engine.reconstruct_decision_timeline(
        opportunity_id="OPP-001",
        amount_inr=120000.0,
        scenario_type="toctou_duplicate_detected",
    )
    assert replay_toctou.final_verdict == "BLOCKED_TOCTOU_DUPLICATE_PREVENTED"
    assert replay_toctou.timeline[-1].phase == "TOCTOU_VERIFICATION"
    assert replay_toctou.timeline[-1].state_after == "BLOCKED"


def test_policy_simulator_what_if():
    sim_res = policy_simulator.simulate_policy(
        recovery_budget_inr=500.0,
        contact_limit=50,
        reserve_budget_pct=0.20,
    )
    assert sim_res.selected_opportunities_count > 0
    assert sim_res.expected_incremental_recovery_inr > 50000.0
    assert sim_res.net_economic_contribution_inr > 0.0
    assert sim_res.policy_recommendation in ("APPROVE", "REVISE")
