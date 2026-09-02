# -*- coding: utf-8 -*-
import uuid
import enum
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.types import JSON as GenericJSON
from sqlalchemy.sql import func
from app.database import Base


class OpportunityState(str, enum.Enum):
    DETECTED = "DETECTED"
    ELIGIBILITY_PENDING = "ELIGIBILITY_PENDING"
    ACTIONABLE = "ACTIONABLE"
    WAITING = "WAITING"
    CUSTOMER_ACTION_REQUIRED = "CUSTOMER_ACTION_REQUIRED"
    HUMAN_REVIEW = "HUMAN_REVIEW"
    IN_PROGRESS = "IN_PROGRESS"
    RECOVERED = "RECOVERED"
    NATURALLY_RECOVERED = "NATURALLY_RECOVERED"
    ABSTAINED = "ABSTAINED"
    BLOCKED = "BLOCKED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    CLOSED = "CLOSED"
    HISTORICAL = "HISTORICAL"


class IntentLevel(str, enum.Enum):
    HIGH_CURRENT_INTENT = "HIGH_CURRENT_INTENT"
    MODERATE_CURRENT_INTENT = "MODERATE_CURRENT_INTENT"
    WEAKENING_INTENT = "WEAKENING_INTENT"
    UNKNOWN = "UNKNOWN"
    EXPIRED = "EXPIRED"


class RecoveryWindowType(str, enum.Enum):
    IMMEDIATE = "IMMEDIATE"       # 0 - 5 minutes
    SHORT_TERM = "SHORT_TERM"     # 5 minutes - 2 hours
    DEFERRED = "DEFERRED"         # 2 - 24 hours
    EXPIRED = "EXPIRED"           # > 24 hours


class CustomerFatigueLevel(str, enum.Enum):
    NO_CONTACT = "NO_CONTACT"
    LOW_FATIGUE = "LOW_FATIGUE"
    MODERATE_FATIGUE = "MODERATE_FATIGUE"
    HIGH_FATIGUE = "HIGH_FATIGUE"
    DO_NOT_CONTACT = "DO_NOT_CONTACT"


class DataProvenance(str, enum.Enum):
    PROVIDER_DERIVED = "PROVIDER_DERIVED"
    REVIVEAI_DERIVED = "REVIVEAI_DERIVED"
    OBSERVED = "OBSERVED"
    ESTIMATED = "ESTIMATED"
    SIMULATION = "SIMULATION"
    DEMO = "DEMO"
    TEST_FIXTURE = "TEST_FIXTURE"


class PaymentEvent(Base):
    """
    Immutable physical transaction event ingested from payment provider or checkout stream.
    Retained forever for forensic auditing, reconciliation, and ML contextual features.
    NEVER mutated to make an old event look current.
    """
    __tablename__ = "payment_events"

    id = Column(String(64), primary_key=True, default=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    merchant_id = Column(String(36), nullable=False, index=True)
    customer_id = Column(String(36), nullable=False, index=True)
    order_id = Column(String(64), nullable=True, index=True)
    provider_payment_id = Column(String(64), nullable=True, index=True)
    gateway = Column(String(32), default="razorpay")
    amount_inr = Column(Float, nullable=False)
    currency = Column(String(3), default="INR")
    status = Column(String(32), nullable=False)
    failure_code = Column(String(64), nullable=True)
    failure_reason = Column(String(255), nullable=True)
    event_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    provenance = Column(SAEnum(DataProvenance), default=DataProvenance.PROVIDER_DERIVED)
    raw_payload = Column(GenericJSON, nullable=True)
    created_at = Column(DateTime, default=func.now())

    def __repr__(self):
        return f"<PaymentEvent id={self.id} status={self.status} amt={self.amount_inr} at={self.event_timestamp}>"


class RecoveryOpportunity(Base):
    """
    Stateful derived business object representing a current revenue-recovery candidate.
    Only enters the active portfolio if validated by the EligibilityEngine.
    """
    __tablename__ = "recovery_opportunities"

    id = Column(String(64), primary_key=True, default=lambda: f"opp_{uuid.uuid4().hex[:12]}")
    merchant_id = Column(String(36), nullable=False, index=True)
    customer_id = Column(String(36), nullable=False, index=True)
    originating_event_id = Column(String(64), ForeignKey("payment_events.id"), nullable=False, index=True)
    order_id = Column(String(64), nullable=True, index=True)
    subscription_id = Column(String(64), nullable=True)
    
    state = Column(SAEnum(OpportunityState), default=OpportunityState.DETECTED, nullable=False, index=True)
    intent_level = Column(SAEnum(IntentLevel), default=IntentLevel.HIGH_CURRENT_INTENT, nullable=False)
    window_type = Column(SAEnum(RecoveryWindowType), default=RecoveryWindowType.IMMEDIATE, nullable=False)
    fatigue_level = Column(SAEnum(CustomerFatigueLevel), default=CustomerFatigueLevel.NO_CONTACT, nullable=False)
    
    amount_inr = Column(Float, nullable=False)
    p_natural = Column(Float, default=0.0)
    p_intervention = Column(Float, default=0.0)
    tau = Column(Float, default=0.0)
    expected_incremental_value_inr = Column(Float, default=0.0)
    intervention_cost_inr = Column(Float, default=5.0)
    friction_penalty = Column(Float, default=2.0)
    risk_score = Column(Float, default=0.1)
    yield_score = Column(Float, default=0.0)
    
    is_eligible = Column(Boolean, default=False)
    disqualification_reasons = Column(GenericJSON, default=list)
    abstention_reason = Column(String(255), nullable=True)
    blocking_reason = Column(String(255), nullable=True)
    
    historical_context_event_ids = Column(GenericJSON, default=list)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    actioned_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    provenance = Column(SAEnum(DataProvenance), default=DataProvenance.REVIVEAI_DERIVED)

    def __repr__(self):
        return f"<RecoveryOpportunity id={self.id} state={self.state} amt={self.amount_inr} eligible={self.is_eligible}>"
