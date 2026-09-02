import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.types import JSON as GenericJSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class CaseType(str, enum.Enum):
    payment_failure = "payment_failure"
    checkout_abandonment = "checkout_abandonment"
    subscription_failure = "subscription_failure"
    overdue_invoice = "overdue_invoice"
    gateway_degradation = "gateway_degradation"

class CaseStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    recovered = "recovered"
    failed = "failed"
    escalated = "escalated"
    blocked = "blocked"
    closed = "closed"

class RecoveryStrategy(str, enum.Enum):
    retry = "retry"
    route_switch = "route_switch"
    reminder = "reminder"
    sequence = "sequence"
    escalate = "escalate"
    stop = "stop"

class HumanAction(str, enum.Enum):
    approved = "approved"
    rejected = "rejected"
    modified = "modified"

class ActionType(str, enum.Enum):
    retry = "retry"
    route_switch = "route_switch"
    send_reminder = "send_reminder"
    send_followup = "send_followup"
    escalate_human = "escalate_human"
    stop = "stop"
    mark_recovered = "mark_recovered"

class ActionStatus(str, enum.Enum):
    pending = "pending"
    executing = "executing"
    success = "success"
    failed = "failed"
    blocked_by_policy = "blocked_by_policy"
    cancelled = "cancelled"

class ExecutedBy(str, enum.Enum):
    AI_AGENT = "AI_AGENT"
    HUMAN = "HUMAN"
    SYSTEM = "SYSTEM"
    POLICY_ENGINE = "POLICY_ENGINE"

class OutcomeType(str, enum.Enum):
    payment_success = "payment_success"
    payment_failed = "payment_failed"
    customer_responded = "customer_responded"
    no_response = "no_response"
    escalated = "escalated"
    stopped = "stopped"


class RecoveryCase(Base):
    __tablename__ = "recovery_cases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False, index=True)
    payment_id = Column(String(36), ForeignKey("payments.id"), nullable=True)
    subscription_id = Column(String(36), ForeignKey("subscriptions.id"), nullable=True)
    invoice_id = Column(String(36), ForeignKey("invoices.id"), nullable=True)
    
    case_type = Column(SAEnum(CaseType), nullable=False)
    status = Column(SAEnum(CaseStatus), nullable=False)
    amount_at_risk_inr = Column(Float, nullable=False)
    recovery_probability = Column(Float, nullable=False)
    expected_recovery_value_inr = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    
    ai_diagnosis = Column(String(5000), nullable=True)
    ai_recommended_action = Column(String(1000), nullable=True)
    recommended_strategy = Column(SAEnum(RecoveryStrategy), nullable=False)
    
    retry_count = Column(Integer, nullable=False, default=0)
    consecutive_failures = Column(Integer, nullable=False, default=0)
    amount_recovered_inr = Column(Float, nullable=False, default=0.0)
    
    is_human_required = Column(Boolean, nullable=False, default=False)
    human_action = Column(SAEnum(HumanAction), nullable=True)
    human_action_at = Column(DateTime, nullable=True)
    human_note = Column(String(2000), nullable=True)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    customer = relationship("Customer", backref="recovery_cases")
    merchant = relationship("Merchant", backref="recovery_cases")
    payment = relationship("Payment", backref="recovery_cases")
    subscription = relationship("Subscription", backref="recovery_cases")
    invoice = relationship("Invoice", backref="recovery_cases")
    actions = relationship("RecoveryAction", backref="case")

    def __repr__(self):
        return f"<RecoveryCase(id={self.id}, type={self.case_type}, status={self.status})>"


class RecoveryAction(Base):
    __tablename__ = "recovery_actions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("recovery_cases.id"), nullable=False, index=True)
    action_type = Column(SAEnum(ActionType), nullable=False)
    status = Column(SAEnum(ActionStatus), nullable=False)
    policy_passed = Column(Boolean, nullable=False)
    policy_result = Column(GenericJSON, nullable=True)
    executed_by = Column(SAEnum(ExecutedBy), nullable=False)
    amount_attempted_inr = Column(Float, nullable=True)
    amount_recovered_inr = Column(Float, nullable=False, default=0.0)
    error_message = Column(String(1000), nullable=True)
    
    executed_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    outcomes = relationship("RecoveryOutcome", backref="action")

    def __repr__(self):
        return f"<RecoveryAction(id={self.id}, action_type={self.action_type}, status={self.status})>"


class RecoveryOutcome(Base):
    __tablename__ = "recovery_outcomes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("recovery_cases.id"), nullable=False, index=True)
    action_id = Column(String(36), ForeignKey("recovery_actions.id"), nullable=False, index=True)
    outcome_type = Column(SAEnum(OutcomeType), nullable=False)
    amount_recovered_inr = Column(Float, nullable=False, default=0.0)
    recovery_method = Column(String(255), nullable=True)
    notes = Column(String(2000), nullable=True)
    recorded_at = Column(DateTime, default=func.now(), nullable=False)

    def __repr__(self):
        return f"<RecoveryOutcome(id={self.id}, outcome_type={self.outcome_type})>"
