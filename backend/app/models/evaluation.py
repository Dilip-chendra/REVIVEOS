import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Split(str, enum.Enum):
    train = "train"
    eval = "eval"

class EvalStrategy(str, enum.Enum):
    retry = "retry"
    route_switch = "route_switch"
    reminder = "reminder"
    sequence = "sequence"
    escalate = "escalate"
    stop = "stop"

class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_scale = Column(Integer, nullable=False)
    dataset_seed = Column(Integer, nullable=False)
    split = Column(SAEnum(Split), nullable=False)
    
    precision = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1_score = Column(Float, nullable=False)
    
    recovery_rate = Column(Float, nullable=False)
    false_intervention_rate = Column(Float, nullable=False)
    human_escalation_rate = Column(Float, nullable=False)
    
    total_cases = Column(Integer, nullable=False)
    recovered_cases = Column(Integer, nullable=False)
    failed_cases = Column(Integer, nullable=False)
    escalated_cases = Column(Integer, nullable=False)
    
    total_revenue_at_risk_inr = Column(Float, nullable=False)
    total_revenue_recovered_inr = Column(Float, nullable=False)
    net_revenue_recovered_inr = Column(Float, nullable=False)
    
    avg_recovery_value_inr = Column(Float, nullable=False)
    revenue_per_1000_transactions_inr = Column(Float, nullable=False)
    
    processing_time_seconds = Column(Float, nullable=False)
    evaluated_at = Column(DateTime, default=func.now(), nullable=False)

    experiments = relationship("ExperimentResult", backref="evaluation")

    def __repr__(self):
        return f"<EvaluationResult(id={self.id}, scale={self.dataset_scale})>"


class ExperimentResult(Base):
    __tablename__ = "experiment_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    evaluation_id = Column(String(36), ForeignKey("evaluation_results.id"), nullable=False, index=True)
    strategy = Column(SAEnum(EvalStrategy), nullable=False)
    
    total_attempts = Column(Integer, nullable=False)
    successful_recoveries = Column(Integer, nullable=False)
    recovery_rate = Column(Float, nullable=False)
    avg_recovery_value_inr = Column(Float, nullable=False)
    
    total_recovered_inr = Column(Float, nullable=False)
    cost_inr = Column(Float, nullable=False)
    net_inr = Column(Float, nullable=False)
    
    avg_time_to_recovery_hours = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)

    def __repr__(self):
        return f"<ExperimentResult(id={self.id}, strategy={self.strategy})>"
