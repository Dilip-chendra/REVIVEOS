# -*- coding: utf-8 -*-
"""
ReviveOS -- Action Proposal Data Model for Recovery Auction

Defines persisted ActionProposal entities submitted by autonomous recovery agents
(Subscription Agent, Cart Agent, Invoice Agent, Retention Agent).
All monetary values maintain integer minor units (paise: 1 INR = 100 paise).
"""
from __future__ import annotations
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional, List


class ProposalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    SUPPRESSED = "SUPPRESSED"
    EXPIRED = "EXPIRED"
    REJECTED_POLICY = "REJECTED_POLICY"
    REJECTED_DUPLICATE = "REJECTED_DUPLICATE"
    REJECTED_NATURAL = "REJECTED_NATURAL"
    REJECTED_CAPACITY = "REJECTED_CAPACITY"
    CANCELLED = "CANCELLED"


class AgentCategory(str, Enum):
    SUBSCRIPTION_AGENT = "SUBSCRIPTION_AGENT"
    ABANDONED_CART_AGENT = "ABANDONED_CART_AGENT"
    INVOICE_COLLECTION_AGENT = "INVOICE_COLLECTION_AGENT"
    CUSTOMER_RETENTION_AGENT = "CUSTOMER_RETENTION_AGENT"
    PAYMENT_FAILURE_AGENT = "PAYMENT_FAILURE_AGENT"


@dataclass
class ActionProposal:
    proposal_id: str
    tenant_id: str
    customer_id: str
    customer_name: str
    opportunity_id: str
    agent_id: str
    agent_type: AgentCategory
    action_type: str
    
    # Monetary amounts in Integer Minor Units (Paise)
    amount_paise: int
    direct_cost_paise: int
    discount_cost_paise: int
    
    # Probabilities & Uplift
    expected_recovery_probability: float
    expected_natural_recovery_probability: float
    estimated_incremental_uplift: float  # tau = p_int - p_nat
    
    # Scoring Factors
    friction_score: float  # 0.0 (low) to 1.0 (high)
    customer_attention_units: int  # Default 1
    urgency_score: float  # 0.0 to 1.0
    risk_score: float  # 0.0 to 1.0
    
    authorization_state: str  # PRE_AUTHORIZED, CUSTOMER_ACTION_REQUIRED, NOT_AUTHORIZED
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: Optional[str] = None
    provenance: str = "ESTIMATED"
    status: ProposalStatus = ProposalStatus.PENDING
    
    # Computed Auction Metrics (in Paise)
    incremental_value_paise: int = 0
    net_contribution_paise: int = 0
    capacity_efficiency_score: float = 0.0
    suppression_reason: Optional[str] = None
    runner_up_delta_paise: Optional[int] = None

    @property
    def amount_inr(self) -> float:
        return self.amount_paise / 100.0

    @property
    def net_contribution_inr(self) -> float:
        return self.net_contribution_paise / 100.0

    @property
    def direct_cost_inr(self) -> float:
        return self.direct_cost_paise / 100.0

    @property
    def discount_cost_inr(self) -> float:
        return self.discount_cost_paise / 100.0

    def compute_auction_metrics(self, merchant_margin: float = 0.85):
        """
        Deterministic integer paise calculation of Net Economic Contribution & Efficiency.
        """
        # gross value adjusted for margin in paise
        margin_gross_paise = int(round(self.amount_paise * merchant_margin))
        self.incremental_value_paise = int(round(self.estimated_incremental_uplift * margin_gross_paise))
        
        # Friction and risk penalties in paise
        friction_penalty_paise = int(round(self.friction_score * 300))  # Up to ₹3.00 penalty
        risk_penalty_paise = int(round(self.risk_score * 500))          # Up to ₹5.00 penalty
        
        # Net Economic Contribution
        self.net_contribution_paise = (
            self.incremental_value_paise
            - self.direct_cost_paise
            - self.discount_cost_paise
            - friction_penalty_paise
            - risk_penalty_paise
        )
        
        # Total capacity consumed (direct cost in INR + attention units scaled)
        cost_inr = max(0.5, self.direct_cost_paise / 100.0)
        denom = cost_inr + (self.customer_attention_units * 1.5) + (self.friction_score * 2.0)
        self.capacity_efficiency_score = round(self.net_contribution_inr / denom, 2)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposal_id": self.proposal_id,
            "tenant_id": self.tenant_id,
            "customer_id": self.customer_id,
            "customer_name": self.customer_name,
            "opportunity_id": self.opportunity_id,
            "agent_id": self.agent_id,
            "agent_type": self.agent_type.value if hasattr(self.agent_type, "value") else str(self.agent_type),
            "action_type": self.action_type,
            "amount_paise": self.amount_paise,
            "amount_inr": self.amount_inr,
            "direct_cost_paise": self.direct_cost_paise,
            "direct_cost_inr": self.direct_cost_inr,
            "discount_cost_paise": self.discount_cost_paise,
            "discount_cost_inr": self.discount_cost_inr,
            "expected_recovery_probability": self.expected_recovery_probability,
            "expected_natural_recovery_probability": self.expected_natural_recovery_probability,
            "estimated_incremental_uplift": self.estimated_incremental_uplift,
            "friction_score": self.friction_score,
            "customer_attention_units": self.customer_attention_units,
            "urgency_score": self.urgency_score,
            "risk_score": self.risk_score,
            "authorization_state": self.authorization_state,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
            "provenance": self.provenance,
            "status": self.status.value if hasattr(self.status, "value") else str(self.status),
            "incremental_value_paise": self.incremental_value_paise,
            "net_contribution_paise": self.net_contribution_paise,
            "net_contribution_inr": self.net_contribution_inr,
            "capacity_efficiency_score": self.capacity_efficiency_score,
            "suppression_reason": self.suppression_reason,
            "runner_up_delta_paise": self.runner_up_delta_paise,
            "runner_up_delta_inr": (self.runner_up_delta_paise / 100.0) if self.runner_up_delta_paise is not None else None,
        }
