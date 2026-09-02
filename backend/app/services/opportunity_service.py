# -*- coding: utf-8 -*-
"""
ReviveAI -- Dynamic Opportunity Management Service
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Any, Set

from app.models.opportunity import (
    OpportunityState,
    IntentLevel,
    RecoveryWindowType,
    CustomerFatigueLevel,
    DataProvenance,
)
from app.services.eligibility_engine import eligibility_engine, EligibilityContext, EligibilityResult
from app.config import get_settings

settings = get_settings()


class OpportunityService:
    def __init__(self):
        self.reset_data()

    def reset_data(self):
        self._events: Dict[str, Dict[str, Any]] = {}
        self._opportunities: Dict[str, Dict[str, Any]] = {}
        self._customer_events_index: Dict[str, List[str]] = {}
        self._customer_orders_completed: Dict[str, Set[str]] = {}
        self._seed_initial_demonstration_data()

    def _seed_initial_demonstration_data(self):
        now = datetime.now(timezone.utc)

        # SCENARIO A: 30-Day-Old Failed Payment (OPP-HIST-001)
        old_evt_id = "EVT-HIST-001"
        self._events[old_evt_id] = {
            "id": old_evt_id,
            "merchant_id": "MERCH-001",
            "customer_id": "CUST-OLD-999",
            "customer_name": "Rohan Deshmukh",
            "order_id": "ORD-IPHONE-001",
            "amount_inr": 40000.0,
            "gateway": "razorpay",
            "status": "failed",
            "failure_code": "INSUFFICIENT_FUNDS",
            "failure_reason": "Card balance insufficient",
            "event_timestamp": now - timedelta(days=30),
            "order_status": "closed",
            "customer_active_checkout": False,
            "is_pre_authorized": False,
            "provenance": DataProvenance.SIMULATION.value,
        }
        self._customer_events_index["CUST-OLD-999"] = [old_evt_id]

        ctx_old = EligibilityContext(
            event_id=old_evt_id,
            merchant_id="MERCH-001",
            customer_id="CUST-OLD-999",
            amount_inr=40000.0,
            event_timestamp=now - timedelta(days=30),
            order_id="ORD-IPHONE-001",
            order_status="closed",
            customer_active_checkout=False,
        )
        res_old = eligibility_engine.evaluate(ctx_old)
        
        self._opportunities["OPP-HIST-001"] = {
            "id": "OPP-HIST-001",
            "merchant_id": "MERCH-001",
            "customer_id": "CUST-OLD-999",
            "customer_name": "Rohan Deshmukh",
            "customer_tenure_months": 2,
            "originating_event_id": old_evt_id,
            "order_id": "ORD-IPHONE-001",
            "amount_inr": 40000.0,
            "failure_code": "INSUFFICIENT_FUNDS",
            "failure_reason": "Card balance insufficient",
            "state": OpportunityState.HISTORICAL.value,
            "intent_level": IntentLevel.EXPIRED.value,
            "window_type": RecoveryWindowType.EXPIRED.value,
            "fatigue_level": CustomerFatigueLevel.NO_CONTACT.value,
            "is_eligible": False,
            "disqualification_reasons": ["RECOVERY_WINDOW_EXPIRED_HISTORICAL_RECORD"],
            "p_natural": 0.05,
            "p_intervention": 0.35,
            "tau": 0.30,
            "expected_incremental_value_inr": 0.0,
            "yield_score": 0.0,
            "historical_context_event_ids": [],
            "created_at": now - timedelta(days=30),
            "expires_at": now - timedelta(days=29),
            "provenance": DataProvenance.SIMULATION.value,
        }

        # SCENARIO B: The Amount Trap (OPP-001 vs OPP-002)
        evt_whale = "EVT-WHALE-001"
        self._events[evt_whale] = {
            "id": evt_whale,
            "merchant_id": "MERCH-001",
            "customer_id": "CUST-WHALE-001",
            "customer_name": "Aarav Mehta (Enterprise Whale)",
            "order_id": "ORD-ENT-001",
            "amount_inr": 120000.0,
            "gateway": "razorpay",
            "status": "failed",
            "failure_code": "GATEWAY_TIMEOUT",
            "failure_reason": "High-value velocity check step-up required",
            "event_timestamp": now - timedelta(minutes=18),
            "order_status": "open",
            "customer_active_checkout": True,
            "is_pre_authorized": False,
            "provenance": DataProvenance.SIMULATION.value,
        }
        self._opportunities["OPP-001"] = {
            "id": "OPP-001",
            "merchant_id": "MERCH-001",
            "customer_id": "CUST-WHALE-001",
            "customer_name": "Aarav Mehta (Enterprise Whale)",
            "customer_tenure_months": 1,
            "originating_event_id": evt_whale,
            "order_id": "ORD-ENT-001",
            "amount_inr": 120000.0,
            "failure_code": "GATEWAY_TIMEOUT",
            "failure_reason": "High-value velocity check step-up required",
            "state": OpportunityState.HUMAN_REVIEW.value,
            "intent_level": IntentLevel.HIGH_CURRENT_INTENT.value,
            "window_type": RecoveryWindowType.SHORT_TERM.value,
            "fatigue_level": CustomerFatigueLevel.NO_CONTACT.value,
            "is_eligible": True,
            "disqualification_reasons": [],
            "p_natural": 0.08,
            "p_intervention": 0.12,
            "tau": 0.04,
            "expected_incremental_value_inr": 4800.0,
            "intervention_cost_inr": 35.0,
            "friction_penalty": 15.0,
            "risk_score": 0.65,
            "yield_score": 12.5,
            "historical_context_event_ids": [],
            "created_at": now - timedelta(minutes=18),
            "expires_at": now + timedelta(hours=2),
            "provenance": DataProvenance.SIMULATION.value,
        }

        evt_saas = "EVT-SAAS-002"
        self._events[evt_saas] = {
            "id": evt_saas,
            "merchant_id": "MERCH-001",
            "customer_id": "CUST-SAAS-002",
            "customer_name": "Priya Sharma (Pro Subscriber)",
            "order_id": "ORD-SUB-002",
            "subscription_id": "SUB-PRO-002",
            "amount_inr": 2500.0,
            "gateway": "razorpay",
            "status": "failed",
            "failure_code": "EXPIRED_CARD",
            "failure_reason": "Mandate renewal failed due to updated token required",
            "event_timestamp": now - timedelta(minutes=10),
            "order_status": "open",
            "subscription_status": "active",
            "is_pre_authorized": True,
            "provenance": DataProvenance.SIMULATION.value,
        }
        self._opportunities["OPP-002"] = {
            "id": "OPP-002",
            "merchant_id": "MERCH-001",
            "customer_id": "CUST-SAAS-002",
            "customer_name": "Priya Sharma (Pro Subscriber)",
            "customer_tenure_months": 24,
            "originating_event_id": evt_saas,
            "order_id": "ORD-SUB-002",
            "subscription_id": "SUB-PRO-002",
            "amount_inr": 2500.0,
            "failure_code": "EXPIRED_CARD",
            "failure_reason": "Mandate renewal failed due to updated token required",
            "state": OpportunityState.ACTIONABLE.value,
            "intent_level": IntentLevel.HIGH_CURRENT_INTENT.value,
            "window_type": RecoveryWindowType.SHORT_TERM.value,
            "fatigue_level": CustomerFatigueLevel.NO_CONTACT.value,
            "is_eligible": True,
            "disqualification_reasons": [],
            "p_natural": 0.05,
            "p_intervention": 0.92,
            "tau": 0.87,
            "expected_incremental_value_inr": 2175.0,
            "intervention_cost_inr": 4.5,
            "friction_penalty": 0.8,
            "risk_score": 0.02,
            "yield_score": 410.0,
            "historical_context_event_ids": [],
            "created_at": now - timedelta(minutes=10),
            "expires_at": now + timedelta(hours=6),
            "provenance": DataProvenance.SIMULATION.value,
        }

        # SCENARIO C: Intentional Abstention (OPP-003)
        evt_upi = "EVT-UPI-003"
        self._events[evt_upi] = {
            "id": evt_upi,
            "merchant_id": "MERCH-001",
            "customer_id": "CUST-UPI-003",
            "customer_name": "Vikram Malhotra",
            "order_id": "ORD-UPI-003",
            "amount_inr": 18500.0,
            "gateway": "razorpay",
            "status": "failed",
            "failure_code": "BANK_OFFLINE_TIMEOUT",
            "failure_reason": "HDFC UPI auto-reconciliation pending in clearing cycle",
            "event_timestamp": now - timedelta(minutes=25),
            "order_status": "open",
            "customer_active_checkout": True,
            "is_pre_authorized": False,
            "provenance": DataProvenance.SIMULATION.value,
        }
        self._opportunities["OPP-003"] = {
            "id": "OPP-003",
            "merchant_id": "MERCH-001",
            "customer_id": "CUST-UPI-003",
            "customer_name": "Vikram Malhotra",
            "customer_tenure_months": 8,
            "originating_event_id": evt_upi,
            "order_id": "ORD-UPI-003",
            "amount_inr": 18500.0,
            "failure_code": "BANK_OFFLINE_TIMEOUT",
            "failure_reason": "HDFC UPI auto-reconciliation pending in clearing cycle",
            "state": OpportunityState.ABSTAINED.value,
            "intent_level": IntentLevel.HIGH_CURRENT_INTENT.value,
            "window_type": RecoveryWindowType.SHORT_TERM.value,
            "fatigue_level": CustomerFatigueLevel.NO_CONTACT.value,
            "is_eligible": True,
            "disqualification_reasons": [],
            "p_natural": 0.89,
            "p_intervention": 0.91,
            "tau": 0.02,
            "expected_incremental_value_inr": 370.0,
            "intervention_cost_inr": 6.0,
            "friction_penalty": 3.0,
            "risk_score": 0.05,
            "yield_score": 38.0,
            "abstention_reason": "Natural Settlement Probability (89%) is high.",
            "historical_context_event_ids": [],
            "created_at": now - timedelta(minutes=25),
            "expires_at": now + timedelta(hours=2),
            "provenance": DataProvenance.SIMULATION.value,
        }

        # Seed Remaining 496 opportunities to total EXACTLY 500
        failure_templates = [
            {"code": "INSUFFICIENT_FUNDS", "reason": "Insufficient balance on debit card", "base_p_nat": 0.12, "base_p_int": 0.78},
            {"code": "CARD_EXPIRED", "reason": "Credit card token expired during renewal", "base_p_nat": 0.04, "base_p_int": 0.88},
            {"code": "GATEWAY_TIMEOUT", "reason": "Sub-processor network latency spike", "base_p_nat": 0.85, "base_p_int": 0.89},
            {"code": "AUTH_FAILED_3DS", "reason": "Customer OTP timed out on mobile banking app", "base_p_nat": 0.18, "base_p_int": 0.82},
            {"code": "VELOCITY_LIMIT", "reason": "Issuing bank daily e-commerce quota exceeded", "base_p_nat": 0.08, "base_p_int": 0.65},
            {"code": "MANDATE_DECLINED", "reason": "Auto-debit execution declined by clearinghouse", "base_p_nat": 0.06, "base_p_int": 0.91},
        ]

        names = [
            "Ananya Sen", "Kabir Bedi", "Siddharth Rao", "Meera Nair", "Zoya Khan",
            "Aditya Varma", "Pooja Hegde", "Devendra Joshi", "Sneha Roy", "Arjun Kapoor",
            "Kavita Iyer", "Ramesh Chawla", "Divya Menon", "Karan Singhania", "Tanya Bajaj"
        ]

        import random
        rng = random.Random(42)

        for i in range(4, 500):
            opp_id = f"OPP-{i:03d}"
            evt_id = f"EVT-{i:03d}"
            tmpl = failure_templates[i % len(failure_templates)]
            cust_name = f"{names[i % len(names)]} #{i}"
            cust_id = f"CUST-{i:03d}"

            r = rng.random()
            if r < 0.80:
                amt = round(rng.uniform(600, 7800), -1)
            elif r < 0.98:
                amt = round(rng.uniform(8500, 48000), -2)
            else:
                amt = round(rng.uniform(55000, 95000), -2)

            cohort = i % 100
            if cohort < 24:
                age_hrs = rng.uniform(25, 720)
                state = OpportunityState.HISTORICAL
                is_eligible = False
                reasons = ["RECOVERY_WINDOW_EXPIRED_HISTORICAL_RECORD"]
                window = RecoveryWindowType.EXPIRED
                intent = IntentLevel.EXPIRED
            elif cohort < 40:
                age_hrs = rng.uniform(0.5, 4)
                state = OpportunityState.NATURALLY_RECOVERED
                is_eligible = False
                reasons = ["PAYMENT_ALREADY_SETTLED"]
                window = RecoveryWindowType.SHORT_TERM
                intent = IntentLevel.HIGH_CURRENT_INTENT
            elif cohort < 48:
                age_hrs = rng.uniform(0.1, 2)
                state = OpportunityState.CANCELLED if i % 2 == 0 else OpportunityState.BLOCKED
                is_eligible = False
                reasons = ["CUSTOMER_EXPLICIT_CANCELLATION"] if state == OpportunityState.CANCELLED else ["DUPLICATE_PURCHASE_DETECTED_FOR_CART"]
                window = RecoveryWindowType.IMMEDIATE
                intent = IntentLevel.EXPIRED
            else:
                age_hrs = rng.uniform(0.05, 3.0)
                is_eligible = True
                reasons = []
                window = RecoveryWindowType.IMMEDIATE if age_hrs < 0.1 else RecoveryWindowType.SHORT_TERM
                intent = IntentLevel.HIGH_CURRENT_INTENT

                if amt > settings.max_automated_amount_inr:
                    state = OpportunityState.HUMAN_REVIEW
                elif tmpl["base_p_nat"] >= 0.80:
                    state = OpportunityState.ABSTAINED
                else:
                    state = OpportunityState.ACTIONABLE

            p_nat = round(min(0.95, max(0.02, tmpl["base_p_nat"] + rng.uniform(-0.04, 0.04))), 2)
            p_int = round(min(0.98, max(p_nat + 0.05, tmpl["base_p_int"] + rng.uniform(-0.05, 0.05))), 2)
            tau = round(max(0.01, p_int - p_nat), 2)
            exp_v = round(tau * amt, 0)
            cost = round(rng.uniform(3.0, 7.5), 1)
            friction = round(rng.uniform(0.5, 3.5), 1)
            risk = round(rng.uniform(0.01, 0.18), 2) if amt <= 50000 else round(rng.uniform(0.35, 0.70), 2)
            yield_score = round(max(1.0, (tau * amt * (1.0 - risk)) / (cost + friction + (risk * 15.0))), 1)

            abstention_reason = None
            if state == OpportunityState.ABSTAINED:
                abstention_reason = f"Natural Settlement Probability ({int(p_nat * 100)}%) is high."

            self._opportunities[opp_id] = {
                "id": opp_id,
                "merchant_id": "MERCH-001",
                "customer_id": cust_id,
                "customer_name": cust_name,
                "customer_tenure_months": rng.randint(1, 36),
                "originating_event_id": evt_id,
                "order_id": f"ORD-{i:03d}",
                "amount_inr": amt,
                "failure_code": tmpl["code"],
                "failure_reason": tmpl["reason"],
                "state": state.value,
                "intent_level": intent.value,
                "window_type": window.value,
                "fatigue_level": CustomerFatigueLevel.NO_CONTACT.value,
                "is_eligible": is_eligible,
                "disqualification_reasons": reasons,
                "p_natural": p_nat,
                "p_intervention": p_int,
                "tau": tau,
                "expected_incremental_value_inr": exp_v if is_eligible else 0.0,
                "intervention_cost_inr": cost,
                "friction_penalty": friction,
                "risk_score": risk,
                "yield_score": yield_score if is_eligible else 0.0,
                "abstention_reason": abstention_reason,
                "historical_context_event_ids": [],
                "created_at": now - timedelta(hours=age_hrs),
                "expires_at": now + timedelta(hours=24 - min(24.0, age_hrs)),
                "provenance": DataProvenance.SIMULATION.value,
            }

    def get_all_opportunities(self) -> List[Dict[str, Any]]:
        return list(self._opportunities.values())

    def get_opportunity(self, opportunity_id: str) -> Optional[Dict[str, Any]]:
        return self._opportunities.get(opportunity_id)

    def trigger_new_checkout_from_historical_customer(
        self,
        customer_id: str = "CUST-OLD-999",
        customer_name: str = "Rohan Deshmukh",
        new_amount_inr: float = 40000.0,
        new_order_id: str = "ORD-IPHONE-NEW-TODAY",
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        historical_event_ids = self._customer_events_index.get(customer_id, ["EVT-HIST-001"])

        new_evt_id = f"EVT-FRESH-{uuid.uuid4().hex[:6]}"
        self._events[new_evt_id] = {
            "id": new_evt_id,
            "merchant_id": "MERCH-001",
            "customer_id": customer_id,
            "customer_name": customer_name,
            "order_id": new_order_id,
            "amount_inr": new_amount_inr,
            "gateway": "razorpay",
            "status": "failed",
            "failure_code": "PAYMENT_CANCELLED_BY_USER",
            "failure_reason": "Checkout interrupted -- customer returned to cart",
            "event_timestamp": now,
            "order_status": "open",
            "customer_active_checkout": True,
            "is_pre_authorized": False,
            "provenance": DataProvenance.REVIVEAI_DERIVED.value,
        }

        ctx = EligibilityContext(
            event_id=new_evt_id,
            merchant_id="MERCH-001",
            customer_id=customer_id,
            amount_inr=new_amount_inr,
            event_timestamp=now,
            order_id=new_order_id,
            order_status="open",
            customer_active_checkout=True,
            has_new_checkout_trigger=True,
            historical_context_ids=historical_event_ids,
        )
        res = eligibility_engine.evaluate(ctx)

        new_opp_id = f"OPP-NEW-{uuid.uuid4().hex[:6]}"
        new_opp = {
            "id": new_opp_id,
            "merchant_id": "MERCH-001",
            "customer_id": customer_id,
            "customer_name": customer_name,
            "customer_tenure_months": 2,
            "originating_event_id": new_evt_id,
            "order_id": new_order_id,
            "amount_inr": new_amount_inr,
            "failure_code": "CHECKOUT_REOPENED",
            "failure_reason": "Fresh cart checkout initiated -- historical failure attached as diagnostic context",
            "state": OpportunityState.CUSTOMER_ACTION_REQUIRED.value,
            "intent_level": IntentLevel.HIGH_CURRENT_INTENT.value,
            "window_type": RecoveryWindowType.IMMEDIATE.value,
            "fatigue_level": CustomerFatigueLevel.NO_CONTACT.value,
            "is_eligible": True,
            "disqualification_reasons": [],
            "p_natural": 0.10,
            "p_intervention": 0.85,
            "tau": 0.75,
            "expected_incremental_value_inr": 30000.0,
            "intervention_cost_inr": 5.0,
            "friction_penalty": 1.5,
            "risk_score": 0.08,
            "yield_score": 380.0,
            "historical_context_event_ids": historical_event_ids,
            "created_at": now,
            "expires_at": now + timedelta(hours=2),
            "provenance": DataProvenance.REVIVEAI_DERIVED.value,
        }

        self._opportunities[new_opp_id] = new_opp
        return {
            "message": "Fresh Recovery Opportunity created. Historical failed payment preserved as analytical context without resurrection.",
            "new_opportunity": new_opp,
            "historical_preserved_id": "OPP-HIST-001",
            "historical_state": self._opportunities["OPP-HIST-001"]["state"],
        }

    def cancel_opportunity_by_customer(self, opportunity_id: str) -> Dict[str, Any]:
        opp = self._opportunities.get(opportunity_id)
        if not opp:
            raise KeyError(f"Opportunity {opportunity_id} not found.")

        opp["state"] = OpportunityState.CANCELLED.value
        opp["is_eligible"] = False
        opp["disqualification_reasons"] = ["CUSTOMER_EXPLICIT_CANCELLATION"]
        opp["intent_level"] = IntentLevel.EXPIRED.value
        opp["yield_score"] = 0.0

        return {
            "opportunity_id": opportunity_id,
            "state": OpportunityState.CANCELLED.value,
            "sovereignty_stop_applied": True,
            "message": "Customer sovereignty stop confirmed. Recovery permanently halted.",
        }

    def mark_cart_purchased_elsewhere(self, customer_id: str, order_id: str) -> int:
        count = 0
        for opp in self._opportunities.values():
            if opp["customer_id"] == customer_id and opp.get("order_id") == order_id:
                if opp["state"] not in (OpportunityState.RECOVERED.value, OpportunityState.CLOSED.value):
                    opp["state"] = OpportunityState.BLOCKED.value
                    opp["is_eligible"] = False
                    opp["disqualification_reasons"].append("DUPLICATE_PURCHASE_DETECTED_FOR_CART")
                    opp["yield_score"] = 0.0
                    count += 1
        return count


opportunity_service = OpportunityService()
