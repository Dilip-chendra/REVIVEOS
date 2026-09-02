# -*- coding: utf-8 -*-
"""
ReviveAI -- Persistent Recovery Outcome & Causal Chain Entity

Links the complete causal chain from detection to attribution with integer minor units (paise).
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional, List


class ConversionLifecycleStage(str, Enum):
    DETECTED = "DETECTED"
    QUALIFIED = "QUALIFIED"
    ALLOCATED = "ALLOCATED"
    INTERVENTION_READY = "INTERVENTION_READY"
    INTERVENTION_DISPATCHED = "INTERVENTION_DISPATCHED"
    CUSTOMER_ENGAGED = "CUSTOMER_ENGAGED"
    PAYMENT_ATTEMPTED = "PAYMENT_ATTEMPTED"
    PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED"
    RECOVERED = "RECOVERED"
    ATTRIBUTED = "ATTRIBUTED"
    
    # Terminal & Alternate states
    ABSTAINED = "ABSTAINED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    DUPLICATE_BLOCKED = "DUPLICATE_BLOCKED"
    HUMAN_REVIEW = "HUMAN_REVIEW"
    UNRECOVERED = "UNRECOVERED"
    UNKNOWN_ATTRIBUTION = "UNKNOWN_ATTRIBUTION"


class DataProvenance(str, Enum):
    PROVIDER_DERIVED = "PROVIDER_DERIVED"
    REVIVEAI_DERIVED = "REVIVEAI_DERIVED"
    OBSERVED = "OBSERVED"
    ESTIMATED = "ESTIMATED"
    SIMULATION = "SIMULATION"
    DEMO = "DEMO"
    TEST_FIXTURE = "TEST_FIXTURE"
    FORECAST = "FORECAST"


@dataclass
class RecoveryOutcome:
    id: str
    tenant_id: str
    opportunity_id: str
    intervention_id: str
    action_type: str
    action_timestamp: str
    
    # Monetary amounts in Integer Minor Units (Paise: 1 INR = 100 Paise)
    amount_paise: int
    recovered_amount_paise: int = 0
    intervention_cost_paise: int = 0
    discount_cost_paise: int = 0
    friction_cost_paise: int = 0
    net_incremental_contribution_paise: int = 0
    
    # Conversion & Attribution
    lifecycle_stage: ConversionLifecycleStage = ConversionLifecycleStage.DETECTED
    customer_action_timestamp: Optional[str] = None
    provider_transaction_id: Optional[str] = None
    provider_status: Optional[str] = None
    payment_link_url: Optional[str] = None
    
    natural_recovery_probability: float = 0.0
    intervention_recovery_probability: float = 0.0
    estimated_uplift: float = 0.0
    attribution_status: str = "PENDING_CONFIRMATION"
    outcome_provenance: DataProvenance = DataProvenance.ESTIMATED
    
    contract_signature: Optional[str] = None
    decision_receipt_hash: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @property
    def amount_inr(self) -> float:
        return self.amount_paise / 100.0

    @property
    def recovered_amount_inr(self) -> float:
        return self.recovered_amount_paise / 100.0

    @property
    def net_incremental_contribution_inr(self) -> float:
        return self.net_incremental_contribution_paise / 100.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "opportunity_id": self.opportunity_id,
            "intervention_id": self.intervention_id,
            "action_type": self.action_type,
            "action_timestamp": self.action_timestamp,
            "amount_paise": self.amount_paise,
            "amount_inr": self.amount_inr,
            "recovered_amount_paise": self.recovered_amount_paise,
            "recovered_amount_inr": self.recovered_amount_inr,
            "intervention_cost_paise": self.intervention_cost_paise,
            "discount_cost_paise": self.discount_cost_paise,
            "friction_cost_paise": self.friction_cost_paise,
            "net_incremental_contribution_paise": self.net_incremental_contribution_paise,
            "net_incremental_contribution_inr": self.net_incremental_contribution_inr,
            "lifecycle_stage": self.lifecycle_stage.value,
            "customer_action_timestamp": self.customer_action_timestamp,
            "provider_transaction_id": self.provider_transaction_id,
            "provider_status": self.provider_status,
            "payment_link_url": self.payment_link_url,
            "natural_recovery_probability": self.natural_recovery_probability,
            "intervention_recovery_probability": self.intervention_recovery_probability,
            "estimated_uplift": self.estimated_uplift,
            "attribution_status": self.attribution_status,
            "outcome_provenance": self.outcome_provenance.value,
            "contract_signature": self.contract_signature,
            "decision_receipt_hash": self.decision_receipt_hash,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
