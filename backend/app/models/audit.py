import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.types import JSON as GenericJSON
from sqlalchemy.sql import func
from app.database import Base

class AuditEventType(str, enum.Enum):
    RISK_DETECTED = "RISK_DETECTED"
    AI_DIAGNOSIS_GENERATED = "AI_DIAGNOSIS_GENERATED"
    STRATEGY_SELECTED = "STRATEGY_SELECTED"
    POLICY_CHECK_PASSED = "POLICY_CHECK_PASSED"
    POLICY_CHECK_FAILED = "POLICY_CHECK_FAILED"
    ACTION_EXECUTED = "ACTION_EXECUTED"
    PAYMENT_SUCCESS = "PAYMENT_SUCCESS"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    HUMAN_ESCALATED = "HUMAN_ESCALATED"
    HUMAN_APPROVED = "HUMAN_APPROVED"
    HUMAN_REJECTED = "HUMAN_REJECTED"
    AUTOMATION_STOPPED = "AUTOMATION_STOPPED"
    AMOUNT_RECOVERED = "AMOUNT_RECOVERED"
    SIMULATION_STARTED = "SIMULATION_STARTED"
    SIMULATION_COMPLETED = "SIMULATION_COMPLETED"
    SYSTEM_ERROR = "SYSTEM_ERROR"

class Actor(str, enum.Enum):
    AI_AGENT = "AI_AGENT"
    POLICY_ENGINE = "POLICY_ENGINE"
    HUMAN = "HUMAN"
    SYSTEM = "SYSTEM"

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    correlation_id = Column(String(255), nullable=False, index=True)
    case_id = Column(String(36), ForeignKey("recovery_cases.id"), nullable=True, index=True)
    event_type = Column(SAEnum(AuditEventType), nullable=False)
    actor = Column(SAEnum(Actor), nullable=False)
    event_data = Column(GenericJSON, nullable=False)
    policy_result = Column(GenericJSON, nullable=True)
    amount_inr = Column(Float, nullable=True)
    is_sensitive = Column(Boolean, nullable=False, default=False)
    timestamp = Column(DateTime, default=func.now(), nullable=False, index=True)

    def __repr__(self):
        return f"<AuditEvent(id={self.id}, event_type={self.event_type}, actor={self.actor})>"
