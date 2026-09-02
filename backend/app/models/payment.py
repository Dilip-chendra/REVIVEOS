import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class PaymentMethod(str, enum.Enum):
    card = "card"
    upi = "upi"
    netbanking = "netbanking"
    wallet = "wallet"
    emi = "emi"
    nach = "nach"
    other = "other"

class Gateway(str, enum.Enum):
    razorpay = "razorpay"
    payu = "payu"
    cashfree = "cashfree"
    stripe = "stripe"
    other = "other"

class PaymentStatus(str, enum.Enum):
    created = "created"
    authorized = "authorized"
    captured = "captured"
    failed = "failed"
    refunded = "refunded"

class AttemptStatus(str, enum.Enum):
    success = "success"
    failed = "failed"
    pending = "pending"

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False, index=True)
    razorpay_payment_id = Column(String(255), nullable=True)
    amount_inr = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    payment_method = Column(SAEnum(PaymentMethod), nullable=False)
    gateway = Column(SAEnum(Gateway), nullable=False)
    status = Column(SAEnum(PaymentStatus), nullable=False)
    failure_code = Column(String(255), nullable=True)
    failure_reason = Column(String(1000), nullable=True)
    checkout_abandoned = Column(Boolean, nullable=False, default=False)
    attempts_count = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    captured_at = Column(DateTime, nullable=True)

    customer = relationship("Customer", backref="payments")
    merchant = relationship("Merchant", backref="payments")
    attempts = relationship("PaymentAttempt", backref="payment")

    def __repr__(self):
        return f"<Payment(id={self.id}, status={self.status}, amount={self.amount_inr})>"


class PaymentAttempt(Base):
    __tablename__ = "payment_attempts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    payment_id = Column(String(36), ForeignKey("payments.id"), nullable=False, index=True)
    attempt_number = Column(Integer, nullable=False)
    gateway = Column(SAEnum(Gateway), nullable=False)
    status = Column(SAEnum(AttemptStatus), nullable=False)
    failure_code = Column(String(255), nullable=True)
    failure_reason = Column(String(1000), nullable=True)
    amount_inr = Column(Float, nullable=False)
    attempted_at = Column(DateTime, default=func.now(), nullable=False)
    response_time_ms = Column(Integer, nullable=True)

    def __repr__(self):
        return f"<PaymentAttempt(id={self.id}, payment_id={self.payment_id}, status={self.status})>"
