# -*- coding: utf-8 -*-
"""
ReviveOS — Omnichannel Recovery Orchestration, Scheduled Autonomy & Payout Suite
"""
import pytest
from datetime import datetime, timezone, timedelta

from app.services.communication_orchestrator import (
    communication_orchestrator,
    CommunicationOrchestrator,
)
from app.services.email_gateway import EmailGateway, SMTPEmailProvider, MockEmailProvider
from app.services.channel_optimizer import ChannelOptimizer
from app.services.intervention_scheduler import (
    InterventionScheduler,
    TimingDecision,
    ActionStatus,
    AutonomyMode,
)
from app.services.payout_gateway import PayoutGateway, PayoutStatus
from app.state import set_active_environment, get_state


class TestOmnichannelAndAutonomy:
    @pytest.fixture(autouse=True)
    def reset_state_and_mode(self):
        set_active_environment("default", "DEMO")
        yield
        set_active_environment("default", "DEMO")

    def test_communication_orchestrator_enforces_attention_budget(self):
        """Customer cannot be contacted more than 1 time per 24 hours."""
        orch = CommunicationOrchestrator()
        # 1st dispatch succeeds
        res1 = orch.dispatch_communication(
            merchant_id="test_m",
            case_id="CASE-1",
            customer_id="CUST-FATIGUE-1",
            customer_name="Aarav Sharma",
            channel="WHATSAPP",
            recipient="+91 99999 11111",
            subject_or_preview="Payment notice",
            message_body="Please resolve payment.",
            is_demo=True,
        )
        assert res1["success"] is True
        assert res1["status"] == "DELIVERED"

        # 2nd dispatch within 24h is blocked by Attention Budget
        res2 = orch.dispatch_communication(
            merchant_id="test_m",
            case_id="CASE-1",
            customer_id="CUST-FATIGUE-1",
            customer_name="Aarav Sharma",
            channel="EMAIL",
            recipient="aarav@example.com",
            subject_or_preview="Invoice notice",
            message_body="Reminder for invoice.",
            is_demo=True,
        )
        assert res2["success"] is False
        assert res2["status"] == "BLOCKED_ATTENTION_BUDGET"
        assert "Contact limit exceeded" in res2["reason"]

    def test_customer_opt_out_blocks_all_channels(self):
        """Customer opt-out immediately blocks outreach across all channels."""
        orch = CommunicationOrchestrator()
        res = orch.dispatch_communication(
            merchant_id="test_m",
            case_id="CASE-2",
            customer_id="CUST-OPTOUT-1",
            customer_name="Rohan Mehra",
            channel="WHATSAPP",
            recipient="+91 98888 22222",
            subject_or_preview="Payment link",
            message_body="Here is your link.",
            customer_opt_out=True,
            is_demo=True,
        )
        assert res["success"] is False
        assert res["status"] == "OPTED_OUT"
        assert "Customer has opted out" in res["reason"]

    def test_duplicate_send_suppressed_by_idempotency(self):
        """Duplicate requests with same idempotency key are suppressed without duplicate dispatch."""
        orch = CommunicationOrchestrator()
        idem_key = "IDEM-SEND-TEST-99"

        res1 = orch.dispatch_communication(
            merchant_id="test_m",
            case_id="CASE-3",
            customer_id="CUST-IDEM-1",
            customer_name="Simran Kaur",
            channel="EMAIL",
            recipient="simran@example.com",
            subject_or_preview="Receipt Reminder",
            message_body="Invoice is ready.",
            idempotency_key=idem_key,
            is_demo=True,
        )
        assert res1["success"] is True

        res2 = orch.dispatch_communication(
            merchant_id="test_m",
            case_id="CASE-3",
            customer_id="CUST-IDEM-1",
            customer_name="Simran Kaur",
            channel="EMAIL",
            recipient="simran@example.com",
            subject_or_preview="Receipt Reminder",
            message_body="Invoice is ready.",
            idempotency_key=idem_key,
            is_demo=True,
        )
        assert res2["success"] is True
        assert res2["status"] == "DUPLICATE_SUPPRESSED"
        assert "Duplicate request suppressed" in res2["reason"]

    def test_channel_optimizer_ranks_by_net_incremental_contribution(self):
        """Channel optimizer evaluates all channels and recommends one with highest NIC."""
        opt = ChannelOptimizer()
        res = opt.optimize_channel(
            case_id="CASE-4",
            amount_inr=5000.0,
            customer_tenure_months=6,
            prior_contacts_24h=0,
        )
        assert res["is_suppressed"] is False
        assert res["recommended_channel"] in ("WHATSAPP", "PAYMENT_LINK", "EMAIL")
        assert len(res["channels"]) == 5
        recommended = next(c for c in res["channels"] if c["is_recommended"])
        assert recommended["expected_incremental_nic_inr"] > 0

    def test_timing_engine_respects_customer_hours_and_natural_recovery(self):
        """Timing engine enforces allowable business hours and abstains when P(Nat) >= 75%."""
        sched = InterventionScheduler()

        # High natural recovery -> WAIT
        res_nat = sched.evaluate_timing(
            case_id="CASE-NAT",
            amount_inr=3000.0,
            p_natural_recovery=0.82,
            customer_current_hour=11,
        )
        assert res_nat["decision"] == TimingDecision.WAIT.value

        # Outside business hours (2:00 AM) -> SCHEDULE
        res_night = sched.evaluate_timing(
            case_id="CASE-NIGHT",
            amount_inr=3000.0,
            p_natural_recovery=0.25,
            customer_current_hour=2,
        )
        assert res_night["decision"] == TimingDecision.SCHEDULE.value
        assert "outside acceptable contact hours" in res_night["reason"]

        # Prime business hours (11:00 AM) -> SEND_NOW
        res_day = sched.evaluate_timing(
            case_id="CASE-DAY",
            amount_inr=3000.0,
            p_natural_recovery=0.25,
            customer_current_hour=11,
        )
        assert res_day["decision"] == TimingDecision.SEND_NOW.value

    def test_scheduler_smart_wakeup_rechecks_live_state_and_cancels_if_paid(self):
        """Smart wake-up TOCTOU check cancels scheduled action if case was already paid."""
        sched = InterventionScheduler()
        now = datetime.now(timezone.utc)

        # Schedule action
        job = sched.schedule_action(
            case_id="CASE-PAID-CHECK",
            customer_id="CUST-P-1",
            customer_name="Neha Joshi",
            action_type="SEND_PAYMENT_LINK",
            channel="WHATSAPP",
            recipient="+91 91111 22222",
            scheduled_for=now,
            reason="Test schedule",
            merchant_id="default",
            is_demo=True,
        )

        # Inject case as already paid into state
        state = get_state("default")
        state["cases"] = [{"id": "CASE-PAID-CHECK", "status": "paid", "amount_inr": 4000.0}]

        # Trigger execution with live re-check
        res = sched.execute_scheduled_action_with_live_recheck(action_id=job.id, merchant_id="default")
        assert res["success"] is False
        assert res["status"] == ActionStatus.CANCELLED.value
        assert "Payment has already been captured" in res["reason"]

    def test_autonomous_mode_cannot_bypass_policy_ceiling(self):
        """Actions above INR 50,000 must be escalated to human operations."""
        sched = InterventionScheduler()
        res = sched.evaluate_timing(
            case_id="CASE-WHALE",
            amount_inr=120000.0,
            p_natural_recovery=0.20,
            customer_current_hour=11,
        )
        assert res["decision"] == TimingDecision.ESCALATE.value
        assert "exceeds autonomous ceiling" in res["reason"]

    def test_email_gateway_default_send_and_mock_fallback(self):
        """Email gateway dispatches via mock in demo and requires SMTP in real mode."""
        gw = EmailGateway()

        # Demo mode dispatch succeeds
        demo_res = gw.send(
            to_email="test@domain.com",
            subject="Recovery Notice",
            body_text="Your payment is pending.",
            is_demo=True,
        )
        assert demo_res.status == "DELIVERED"
        assert demo_res.is_simulated is True

        # Real mode without SMTP returns honest failure, never faking
        real_res = gw.send(
            to_email="real@domain.com",
            subject="Recovery Notice",
            body_text="Your payment is pending.",
            is_demo=False,
        )
        assert real_res.status == "FAILED"
        assert "EMAIL PROVIDER NOT CONFIGURED" in real_res.error

    def test_payout_requires_authorization_and_enforces_limit(self):
        """Payouts <= INR 10k auto-approved; > INR 10k requires human sign-off."""
        pg = PayoutGateway()

        # Small refund: auto-approved and completed
        res_small = pg.request_payout(
            merchant_id="test_m",
            case_id="CASE-P1",
            beneficiary_name="Rahul V",
            beneficiary_account="1234567890",
            amount_inr=2500.0,
            purpose="CUSTOMER_REFUND",
            is_demo=True,
        )
        assert res_small["success"] is True
        assert res_small["requires_human_approval"] is False
        assert res_small["status"] == PayoutStatus.COMPLETED.value

        # Large compensation: pending human approval
        res_large = pg.request_payout(
            merchant_id="test_m",
            case_id="CASE-P2",
            beneficiary_name="Acme Corp",
            beneficiary_account="9876543210",
            amount_inr=45000.0,
            purpose="DISPUTE_RESOLUTION",
            is_demo=True,
        )
        assert res_large["success"] is True
        assert res_large["requires_human_approval"] is True
        assert res_large["status"] == PayoutStatus.PENDING_APPROVAL.value

        # Human operator approves
        app_res = pg.approve_payout(payout_id=res_large["payout"]["id"], merchant_id="test_m")
        assert app_res["success"] is True
        assert app_res["status"] == PayoutStatus.COMPLETED.value

    def test_payout_idempotency_key_prevents_duplicate_disbursement(self):
        """Duplicate payout requests are suppressed by idempotency."""
        pg = PayoutGateway()
        idem = "PAYOUT-IDEM-SAFE-01"

        res1 = pg.request_payout(
            merchant_id="test_m",
            case_id="CASE-P3",
            beneficiary_name="Same User",
            beneficiary_account="1111222233",
            amount_inr=1500.0,
            purpose="CUSTOMER_REFUND",
            idempotency_key=idem,
            is_demo=True,
        )
        assert res1["success"] is True

        res2 = pg.request_payout(
            merchant_id="test_m",
            case_id="CASE-P3",
            beneficiary_name="Same User",
            beneficiary_account="1111222233",
            amount_inr=1500.0,
            purpose="CUSTOMER_REFUND",
            idempotency_key=idem,
            is_demo=True,
        )
        assert res2["success"] is True
        assert res2["status"] == "DUPLICATE_SUPPRESSED"

    def test_real_mode_never_uses_demo_communication_data(self):
        """In Real Mode, list_communications excludes simulated demo records."""
        orch = CommunicationOrchestrator()
        demo_list = orch.list_communications(merchant_id="default", is_real_mode=False)
        assert len(demo_list) > 0  # Contains seeded demo communications

        real_list = orch.list_communications(merchant_id="default", is_real_mode=True)
        # Real mode strictly rejects all simulated demo records
        assert all(not r["is_simulated"] for r in real_list)
