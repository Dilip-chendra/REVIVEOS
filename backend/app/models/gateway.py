import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base

class GatewayHealth(Base):
    __tablename__ = "gateway_health"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    gateway = Column(String(100), nullable=False, index=True)
    success_rate_1h = Column(Float, nullable=False)
    success_rate_24h = Column(Float, nullable=False)
    avg_response_time_ms = Column(Float, nullable=False)
    failure_rate_1h = Column(Float, nullable=False)
    is_degraded = Column(Boolean, nullable=False, default=False)
    degradation_started_at = Column(DateTime, nullable=True)
    incident_note = Column(String(1000), nullable=True)
    recorded_at = Column(DateTime, default=func.now(), nullable=False, index=True)

    def __repr__(self):
        return f"<GatewayHealth(gateway={self.gateway}, is_degraded={self.is_degraded})>"
