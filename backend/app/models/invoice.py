import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    issued = "issued"
    paid = "paid"
    partially_paid = "partially_paid"
    overdue = "overdue"
    cancelled = "cancelled"
    written_off = "written_off"

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False, index=True)
    invoice_number = Column(String(255), unique=True, nullable=False)
    amount_inr = Column(Float, nullable=False)
    tax_inr = Column(Float, nullable=False, default=0.0)
    total_inr = Column(Float, nullable=False)
    status = Column(SAEnum(InvoiceStatus), nullable=False)
    issued_at = Column(DateTime, nullable=False)
    due_at = Column(DateTime, nullable=False)
    paid_at = Column(DateTime, nullable=True)
    days_overdue = Column(Integer, nullable=False, default=0)
    description = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    customer = relationship("Customer", backref="invoices")
    merchant = relationship("Merchant", backref="invoices")

    def __repr__(self):
        return f"<Invoice(id={self.id}, invoice_number={self.invoice_number}, status={self.status})>"
