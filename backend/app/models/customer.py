import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    merchant_id = Column(String(36), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    total_payments_count = Column(Integer, nullable=False, default=0)
    successful_payments_count = Column(Integer, nullable=False, default=0)
    total_amount_paid_inr = Column(Float, nullable=False, default=0.0)
    lifetime_value_inr = Column(Float, nullable=False, default=0.0)
    first_payment_at = Column(DateTime, nullable=True)
    last_payment_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    opt_out_communications = Column(Boolean, nullable=False, default=False)
    risk_score = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    merchant = relationship("Merchant", backref="customers")

    def __repr__(self):
        return f"<Customer(id={self.id}, email={self.email}, merchant_id={self.merchant_id})>"
