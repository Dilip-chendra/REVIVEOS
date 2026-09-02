import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.sql import func
from app.database import Base

class BusinessType(str, enum.Enum):
    ecommerce = "ecommerce"
    saas = "saas"
    subscription = "subscription"
    b2b = "b2b"
    other = "other"

class RiskTier(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"

class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, default="My Business")
    email = Column(String(255), nullable=False, default="")
    business_type = Column(SAEnum(BusinessType), nullable=False, default=BusinessType.other)
    business_size = Column(String(50), nullable=True)           # small / medium / large / enterprise
    payment_platform = Column(String(100), nullable=True)       # razorpay / stripe / payu / other
    razorpay_merchant_id = Column(String(255), nullable=True)
    monthly_gmv_inr = Column(Float, nullable=False, default=0.0)
    risk_tier = Column(SAEnum(RiskTier), nullable=False, default=RiskTier.medium)
    is_active = Column(Boolean, nullable=False, default=True)
    onboarding_complete = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Merchant(id={self.id}, name={self.name}, onboarded={self.onboarding_complete})>"
