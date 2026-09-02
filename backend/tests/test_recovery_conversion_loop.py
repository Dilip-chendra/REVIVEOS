# -*- coding: utf-8 -*-
"""
ReviveAI -- Recovery Conversion Loop & Outcome Tests
"""
import pytest
from app.models.recovery_outcome import ConversionLifecycleStage, DataProvenance
from app.services.recovery_conversion_service import recovery_conversion_service


def test_customer_controlled_recovery_link_generation():
    res = recovery_conversion_service.generate_customer_recovery_link("OPP-001")
    assert res["status"] == "RECOVERY_LINK_GENERATED"
    assert res["payment_link_url"].startswith("https://rzp.io/i/")
    assert res["authorization_mode"] == "CUSTOMER_CONTROLLED_ONE_TIME_CHECKOUT"
    assert res["provenance"] == DataProvenance.PROVIDER_DERIVED.value
    assert res["amount_paise"] == int(round(res["amount_inr"] * 100))


def test_reconcile_confirmed_customer_payment():
    res = recovery_conversion_service.simulate_customer_payment_completion("OPP-001", "pay_RZPTEST123456")
    assert res["status"] == "PAYMENT_RECONCILED"
    assert res["provider_transaction_id"] == "pay_RZPTEST123456"
    assert res["lifecycle_stage"] == ConversionLifecycleStage.RECOVERED.value
    assert res["attribution_status"] == "REVIVEAI_ASSISTED_CONFIRMED"


def test_forensic_recovery_ledger():
    ledger = recovery_conversion_service.get_all_outcomes()
    assert len(ledger) >= 3
    # Check integer minor unit precision
    for record in ledger:
        assert isinstance(record["amount_paise"], int)
        assert record["amount_inr"] == record["amount_paise"] / 100.0
        assert record["outcome_provenance"] in [p.value for p in DataProvenance]


def test_conversion_funnel():
    funnel = recovery_conversion_service.get_conversion_funnel()
    assert len(funnel["funnel_stages"]) == 5
    assert funnel["recovery_roi_multiple"] > 100.0
