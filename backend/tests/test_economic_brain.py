# -*- coding: utf-8 -*-
"""
ReviveOS — Comprehensive Economic Brain & Decision Intelligence Test Suite
Covers:
  1. Revenue Opportunity Graph & Edge Building
  2. Opportunity Half-Life Decay Calculations
  3. Failure Signature Clustering & Root Causes
  4. Recovery Forecasting & Margin Calculations
  5. Recovery Inventory Partitioning (Pursue, Wait, Leave, Uncertain)
  6. Value Protected / What We Prevented Telemetry
  7. Decision Quality Loop (5 Categories + Economic Value)
  8. Cross-Agent Arbitration & Customer Attention Caps
  9. Recovery Plan Auction & Wait-to-Learn Timings
  10. Policy Compiler & What-If Simulations
  11. Absolute Real/Demo Environment Isolation
  12. Mega-Scenario Scale Benchmark Verification
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth import get_current_user
from app.models.user import User
from app.state import get_state, reset_state, set_active_environment
from app.services.opportunity_graph import (
    RevenueOpportunityGraph,
    RelationshipType,
    HALF_LIFE_SECONDS,
    opportunity_graph,
)
from app.services.recovery_forecast import (
    RecoveryForecastService,
    recovery_forecast_service,
)
from app.services.decision_quality import (
    DecisionQualityEngine,
    DecisionQualityCategory,
    decision_quality_engine,
)
from app.services.strategy_auction import (
    StrategyAuctionEngine,
    StrategyOption,
    strategy_auction_engine,
)
from app.services.agent_arbitrator import (
    MultiAgentArbitrator,
    AgentProposal,
    AgentType,
    AgentActionType,
    multi_agent_arbitrator,
)

test_user = User(
    id="test-judge-admin-01",
    clerk_user_id="clerk_test_judge_01",
    email="judge@buildathon.in",
    merchant_id="MERCH-TEST-001",
)


@pytest.fixture(autouse=True)
def setup_auth_and_state():
    app.dependency_overrides[get_current_user] = lambda: test_user
    reset_state("MERCH-TEST-001")
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


# ── 1. Revenue Opportunity Graph Tests ────────────────────────────────────────

class TestRevenueOpportunityGraph:
    def test_graph_initialization_and_empty_state(self):
        graph = RevenueOpportunityGraph()
        assert graph.get_all_clusters() == []
        summary = graph.get_relationship_summary()
        assert summary["opportunity_count"] == 0
        assert summary["total_relationship_edges"] == 0

    def test_graph_same_customer_edges(self):
        graph = RevenueOpportunityGraph()
        opps = [
            {"id": "OPP-A", "customer_id": "CUST-1", "amount_inr": 1000},
            {"id": "OPP-B", "customer_id": "CUST-1", "amount_inr": 2000},
            {"id": "OPP-C", "customer_id": "CUST-2", "amount_inr": 3000},
        ]
        graph.build_from_opportunities(opps)
        related_a = graph.get_related("OPP-A")
        assert len(related_a) == 1
        assert related_a[0].to_id == "OPP-B"
        assert related_a[0].relationship_type == RelationshipType.SAME_CUSTOMER
        assert len(graph.get_related("OPP-C")) == 0

    def test_graph_same_order_edges(self):
        graph = RevenueOpportunityGraph()
        opps = [
            {"id": "OPP-1", "order_id": "ORD-XYZ", "amount_inr": 500},
            {"id": "OPP-2", "order_id": "ORD-XYZ", "amount_inr": 500},
        ]
        graph.build_from_opportunities(opps)
        edges = graph.get_related("OPP-1")
        assert any(e.relationship_type == RelationshipType.SAME_ORDER for e in edges)

    def test_graph_same_payment_method_edges(self):
        graph = RevenueOpportunityGraph()
        opps = [
            {"id": "OPP-10", "payment_method": "card_hdfc_4421", "amount_inr": 1500},
            {"id": "OPP-11", "payment_method": "card_hdfc_4421", "amount_inr": 2500},
        ]
        graph.build_from_opportunities(opps)
        edges = graph.get_related("OPP-10")
        assert any(e.relationship_type == RelationshipType.SAME_PAYMENT_METHOD for e in edges)

    def test_graph_transitive_cluster_bfs(self):
        graph = RevenueOpportunityGraph()
        opps = [
            {"id": "OPP-1", "customer_id": "CUST-X", "order_id": "ORD-1"},
            {"id": "OPP-2", "customer_id": "CUST-X", "order_id": "ORD-2"},
            {"id": "OPP-3", "customer_id": "CUST-Y", "order_id": "ORD-2"},
        ]
        graph.build_from_opportunities(opps)
        cluster = graph.get_transitive_cluster("OPP-1")
        assert "OPP-2" in cluster
        assert "OPP-3" in cluster


# ── 2. Opportunity Half-Life Decay Tests ──────────────────────────────────────

class TestOpportunityHalfLife:
    def test_half_life_constants_defined(self):
        assert HALF_LIFE_SECONDS["abandoned_cart"] == 1800.0
        assert HALF_LIFE_SECONDS["failed_subscription"] == 86400.0
        assert HALF_LIFE_SECONDS["invoice_overdue"] == 604800.0

    def test_half_life_decay_fresh_opportunity(self):
        graph = RevenueOpportunityGraph()
        res = graph.compute_half_life_decay("OPP-TEST", "abandoned_cart", created_at=None)
        assert res.urgency_multiplier >= 0.99
        assert not res.is_expired
        assert "High urgency" in res.plain_language

    def test_half_life_decay_expired_opportunity(self):
        graph = RevenueOpportunityGraph()
        res = graph.compute_half_life_decay("OPP-OLD", "abandoned_cart", created_at="2020-01-01T00:00:00Z")
        assert res.urgency_multiplier < 0.05
        assert res.is_expired
        assert "expired" in res.plain_language.lower()


# ── 3. Failure Signature Clustering Tests ────────────────────────────────────

class TestFailureClustering:
    def test_gateway_outage_clustering(self):
        graph = RevenueOpportunityGraph()
        opps = [
            {"id": "OPP-G1", "failure_code": "GATEWAY_TIMEOUT", "gateway": "payu", "amount_inr": 5000},
            {"id": "OPP-G2", "failure_code": "GATEWAY_TIMEOUT", "gateway": "payu", "amount_inr": 7000},
        ]
        graph.build_from_opportunities(opps)
        clusters = graph.get_all_clusters()
        assert len(clusters) == 1
        assert clusters[0].cluster_type == "PROVIDER_OUTAGE"
        assert clusters[0].total_exposure_inr == 12000.0
        assert clusters[0].treatment_recommendation == "TREAT_AS_INCIDENT"

    def test_card_bin_block_clustering(self):
        graph = RevenueOpportunityGraph()
        opps = [
            {"id": "OPP-B1", "failure_code": "CARD_EXPIRED", "gateway": "razorpay", "amount_inr": 2000},
            {"id": "OPP-B2", "failure_code": "CARD_EXPIRED", "gateway": "razorpay", "amount_inr": 4000},
        ]
        graph.build_from_opportunities(opps)
        clusters = graph.get_all_clusters()
        assert len(clusters) == 1
        assert clusters[0].cluster_type == "CARD_BIN_BLOCK"


# ── 4. Recovery Forecast & Inventory Tests ───────────────────────────────────

class TestRecoveryForecastAndInventory:
    def test_forecast_calculation_with_opportunities(self):
        service = RecoveryForecastService()
        opps = [
            {"id": "OPP-1", "amount_inr": 10000, "recovery_probability": 0.8, "p_natural": 0.1, "tau": 0.7, "risk_score": 0.1},
            {"id": "OPP-2", "amount_inr": 5000, "recovery_probability": 0.9, "p_natural": 0.85, "tau": 0.05, "risk_score": 0.1},
        ]
        forecast = service.generate_forecast("MERCH-001", opps, budget_total_inr=5000)
        assert forecast.total_exposure_inr == 15000.0
        assert forecast.forecast_24h_inr > 0
        assert forecast.inventory.pursue_now_count == 1  # OPP-1 has tau 0.7
        assert forecast.inventory.wait_and_watch_count == 1  # OPP-2 has p_natural 0.85

    def test_what_we_prevented_tracking(self):
        service = RecoveryForecastService()
        safety_metrics = {
            "customer_prompts_sent": 12,
            "duplicate_purchases_prevented": 5,
            "customer_cancellations_honored": 4,
            "policy_violations_prevented": 8,
        }
        forecast = service.generate_forecast("MERCH-001", [], safety_metrics=safety_metrics)
        prev = forecast.inventory.what_we_prevented
        assert prev.duplicate_actions_blocked == 5
        assert prev.customer_cancellations_honored == 4
        assert prev.policy_violations_blocked == 8

    def test_real_mode_zero_forecast_isolation(self):
        service = RecoveryForecastService()
        forecast = service.generate_forecast("MERCH-001", [], is_real_mode=True)
        assert forecast.total_exposure_inr == 0.0
        assert forecast.forecast_24h_inr == 0.0
        assert forecast.inventory.pursue_now_count == 0


# ── 5. Decision Quality Loop Tests ───────────────────────────────────────────

class TestDecisionQualityLoop:
    def test_good_action_classification(self):
        engine = DecisionQualityEngine()
        res = engine.classify_decision(
            merchant_id="M1",
            opp_id="OPP-G",
            decision_made="INTERVENED",
            outcome_observed="PAID",
            tau_at_decision=0.60,
            p_natural_at_decision=0.10,
            amount_inr=5000,
            intervention_cost_inr=4.0,
        )
        assert res.quality_category == DecisionQualityCategory.GOOD_ACTION
        assert res.quality_score >= 0.8
        assert "Good Action" in res.plain_language

    def test_good_abstention_classification(self):
        engine = DecisionQualityEngine()
        res = engine.classify_decision(
            merchant_id="M1",
            opp_id="OPP-A",
            decision_made="ABSTAINED",
            outcome_observed="PAID",
            tau_at_decision=0.05,
            p_natural_at_decision=0.85,
            amount_inr=10000,
            intervention_cost_inr=0.0,
        )
        assert res.quality_category == DecisionQualityCategory.GOOD_ABSTENTION
        assert "Smart Restraint" in res.plain_language

    def test_wasted_action_classification(self):
        engine = DecisionQualityEngine()
        res = engine.classify_decision(
            merchant_id="M1",
            opp_id="OPP-W",
            decision_made="INTERVENED",
            outcome_observed="NOT_PAID",
            tau_at_decision=0.04,
            p_natural_at_decision=0.10,
            amount_inr=3000,
            intervention_cost_inr=4.0,
        )
        assert res.quality_category == DecisionQualityCategory.WASTED_ACTION
        assert "Wasted Action" in res.plain_language

    def test_missed_opportunity_classification(self):
        engine = DecisionQualityEngine()
        res = engine.classify_decision(
            merchant_id="M1",
            opp_id="OPP-M",
            decision_made="ABSTAINED",
            outcome_observed="NOT_PAID",
            tau_at_decision=0.50,
            p_natural_at_decision=0.15,
            amount_inr=8000,
            intervention_cost_inr=0.0,
        )
        assert res.quality_category == DecisionQualityCategory.MISSED_OPPORTUNITY
        assert "Missed Opportunity" in res.plain_language

    def test_harmful_action_classification(self):
        engine = DecisionQualityEngine()
        res = engine.classify_decision(
            merchant_id="M1",
            opp_id="OPP-H",
            decision_made="INTERVENED",
            outcome_observed="CANCELLED",
            tau_at_decision=0.30,
            p_natural_at_decision=0.20,
            amount_inr=5000,
            intervention_cost_inr=4.0,
        )
        assert res.quality_category == DecisionQualityCategory.HARMFUL_ACTION
        assert res.quality_score == 0.0

    def test_quality_summary_aggregates_values(self):
        engine = DecisionQualityEngine()
        summary = engine.get_quality_summary("MERCH-001")
        assert summary.total_decisions > 0
        assert summary.overall_quality_score > 0
        assert "good_actions" in summary.to_dict()["breakdown"]


# ── 6. Multi-Agent Arbitration & Customer Attention Tests ───────────────────

class TestMultiAgentArbitration:
    def test_attention_record_creation_and_defaults(self):
        arbitrator = MultiAgentArbitrator()
        rec = arbitrator.get_attention_record("CUST-NEW-99")
        assert rec.daily_contact_cap == 1
        assert rec.contacts_used_today == 0
        assert not rec.opt_out_status

    def test_opted_out_customer_suppresses_all_agents(self):
        arbitrator = MultiAgentArbitrator()
        rec = arbitrator.get_attention_record("CUST-OPTED-OUT")
        rec.opt_out_status = True
        verdict = arbitrator.arbitrate(customer_id="CUST-OPTED-OUT", customer_name="Opted Out Cust")
        assert verdict.winning_action == AgentActionType.DELIBERATE_ABSTENTION
        assert verdict.attention_cap_remaining == 0
        assert "Article 6" in verdict.arbitration_summary

    def test_highest_nic_agent_wins_arbitration(self):
        arbitrator = MultiAgentArbitrator()
        verdict = arbitrator.arbitrate(customer_id="CUST-ARB-01")
        assert verdict.winning_net_contribution_inr > 0
        assert len(verdict.suppressed_proposals) >= 1
        # Suppressed reasons explain why they lost
        assert "Suppressed in favor of" in verdict.suppressed_proposals[0]["suppression_reason"]


# ── 7. Recovery Strategy Plan Auction Tests ─────────────────────────────────

class TestStrategyAuctionEngine:
    def test_smart_retry_wins_with_mandate(self):
        engine = StrategyAuctionEngine()
        res = engine.evaluate_auction(
            opportunity_id="OPP-SUB",
            amount_inr=3000,
            failure_code="INSUFFICIENT_FUNDS",
            is_pre_authorized=True,
        )
        assert res.winning_strategy == StrategyOption.SMART_RETRY
        assert res.autonomy_action == "RECOVER"

    def test_high_natural_recovery_triggers_do_nothing(self):
        engine = StrategyAuctionEngine()
        res = engine.evaluate_auction(
            opportunity_id="OPP-TIMEOUT",
            amount_inr=5000,
            failure_code="GATEWAY_TIMEOUT",
            is_pre_authorized=False,
        )
        assert res.winning_strategy == StrategyOption.DO_NOTHING
        assert res.autonomy_action == "DO_NOTHING"

    def test_temporal_counterfactuals_computed(self):
        engine = StrategyAuctionEngine()
        res = engine.evaluate_auction(
            opportunity_id="OPP-TIMING",
            amount_inr=10000,
            failure_code="CARD_EXPIRED",
            is_pre_authorized=False,
        )
        assert "ACT_NOW" in res.temporal_counterfactuals
        assert "WAIT_5MIN" in res.temporal_counterfactuals
        assert "DO_NOTHING" in res.temporal_counterfactuals


# ── 8. API Endpoint Integration Tests ────────────────────────────────────────

class TestEconomicBrainEndpoints:
    def test_get_recovery_forecast_endpoint(self, client):
        r = client.get("/api/dashboard/recovery-forecast")
        assert r.status_code == 200
        data = r.json()
        assert "recovery_forecast" in data
        assert "next_24h_inr" in data["recovery_forecast"]
        assert "economic_model" in data

    def test_get_recovery_inventory_endpoint(self, client):
        r = client.get("/api/dashboard/recovery-inventory")
        assert r.status_code == 200
        data = r.json()
        assert "pursue_now" in data
        assert "wait_and_watch" in data
        assert "what_we_prevented" in data

    def test_get_opportunity_graph_endpoint(self, client):
        r = client.get("/api/dashboard/opportunity-graph")
        assert r.status_code == 200
        data = r.json()
        assert "opportunity_count" in data
        assert "clusters" in data

    def test_get_decision_quality_endpoint(self, client):
        r = client.get("/api/portfolio/decision-quality")
        assert r.status_code == 200
        data = r.json()
        assert "overall_quality_score" in data
        assert "breakdown" in data

    def test_post_record_outcome_endpoint(self, client):
        payload = {
            "opportunity_id": "OPP-TEST-REC",
            "decision_made": "INTERVENED",
            "outcome_observed": "PAID",
            "tau_at_decision": 0.55,
            "p_natural_at_decision": 0.10,
            "amount_inr": 4500,
            "intervention_cost_inr": 4.0,
        }
        r = client.post("/api/portfolio/record-outcome", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["quality_category"] == "GOOD_ACTION"

    def test_get_agent_competition_endpoint(self, client):
        r = client.get("/api/portfolio/agent-competition/CUST-9821")
        assert r.status_code == 200
        data = r.json()
        assert data["customer_id"] == "CUST-9821"
        assert "One Customer, One Recovery Decision" in data["governance_policy"]

    def test_get_opportunity_plans_endpoint(self, client):
        r = client.get("/api/portfolio/opportunity-plans/OPP-001?amount_inr=5000&failure_code=CARD_EXPIRED")
        assert r.status_code == 200
        data = r.json()
        assert "winning_plan" in data
        assert "all_plans_ranked" in data
        assert len(data["all_plans_ranked"]) >= 4

    def test_get_half_life_endpoint(self, client):
        r = client.get("/api/portfolio/half-life/OPP-CART?opportunity_type=abandoned_cart")
        assert r.status_code == 200
        data = r.json()
        assert "urgency_remaining_pct" in data
        assert data["half_life_seconds"] == 1800.0

    def test_policy_compile_nl_endpoint(self, client):
        payload = {
            "natural_language_instruction": "Only retry if amount is under ₹30,000 and probability is above 70%",
            "run_simulation": True,
        }
        r = client.post("/api/policies/compile", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["is_deployable"] is True
        assert data["parsed_rules"]["max_automated_amount_inr"] == 30000.0

    def test_policy_what_if_endpoint(self, client):
        payload = {
            "change_description": "Lower ceiling to ₹20,000",
            "new_max_automated_amount_inr": 20000.0,
        }
        r = client.post("/api/policies/what-if", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert "impact" in data

    def test_incidents_clusters_endpoint(self, client):
        r = client.get("/api/incidents/clusters")
        assert r.status_code == 200
        data = r.json()
        assert "total_clusters" in data

    def test_judge_mega_scenario_endpoint(self, client):
        r = client.get("/api/judge/mega-scenario")
        assert r.status_code == 200
        data = r.json()
        assert data["scale_metrics"]["total_events_ingested"] == 10000
        assert data["scale_metrics"]["total_revenue_at_risk_inr"] == 42000000.0
        assert data["constraints"]["recovery_budget_ceiling_inr"] == 10000.0


# ── 9. Real/Demo Isolation Verification ──────────────────────────────────────

class TestEnvironmentIsolationForEconomicBrain:
    def test_real_mode_empty_forecast(self, client):
        set_active_environment("MERCH-TEST-001", "RAZORPAY_TEST")
        r = client.get("/api/dashboard/recovery-forecast")
        assert r.status_code == 200
        data = r.json()
        # In empty real mode, exposure is ₹0
        assert data["active_portfolio"]["total_exposure_inr"] == 0.0
        assert data["recovery_forecast"]["next_24h_inr"] == 0.0

    def test_real_mode_empty_inventory(self, client):
        set_active_environment("MERCH-TEST-001", "RAZORPAY_TEST")
        r = client.get("/api/dashboard/recovery-inventory")
        assert r.status_code == 200
        data = r.json()
        assert data["pursue_now"]["total_exposure_inr"] == 0.0

    def test_real_mode_empty_clusters(self, client):
        set_active_environment("MERCH-TEST-001", "RAZORPAY_TEST")
        r = client.get("/api/incidents/clusters")
        assert r.status_code == 200
        data = r.json()
        assert data["total_clusters"] == 0

