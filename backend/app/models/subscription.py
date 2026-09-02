import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class BillingPeriod(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    quarterly = "quarterly"
    yearly = "yearly"

class SubscriptionStatus(str, enum.Enum):
    created = "created"
    authenticated = "authenticated"
    active = "active"
    pending = "pending"
    halted = "halted"
    cancelled = "cancelled"
    completed = "completed"
    expired = "expired"

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False, index=True)
    razorpay_subscription_id = Column(String(255), nullable=True)
    plan_name = Column(String(255), nullable=False)
    amount_inr = Column(Float, nullable=False)
    billing_period = Column(SAEnum(BillingPeriod), nullable=False)
    status = Column(SAEnum(SubscriptionStatus), nullable=False)
    start_at = Column(DateTime, nullable=False)
    end_at = Column(DateTime, nullable=True)
    total_count = Column(Integer, nullable=False)
    paid_count = Column(Integer, nullable=False, default=0)
    failed_count = Column(Integer, nullable=False, default=0)
    next_charge_at = Column(DateTime, nullable=True)
    last_charged_at = Column(DateTime, nullable=True)
    charge_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    customer = relationship("Customer", backref="subscriptions")
    merchant = relationship("Merchant", backref="subscriptions")

    def __repr__(self):
        return f"<Subscription(id={self.id}, status={self.status}, plan={self.plan_name})>"
