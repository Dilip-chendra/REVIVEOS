# -*- coding: utf-8 -*-
"""
ReviveOS — Revenue Opportunity Graph

Builds a relationship model connecting recovery opportunities by shared dimension:
  SAME_CUSTOMER, SAME_ORDER, SAME_SUBSCRIPTION, SAME_INVOICE,
  SAME_PAYMENT_METHOD, SAME_CHECKOUT_SESSION, SAME_PROVIDER_INCIDENT,
  SAME_AGENT, SAME_MERCHANT

Also computes opportunity half-life decay: urgency decays as time passes.
Different opportunity types have different half-life constants.

AI CONSTRAINT: This graph is used for CLASSIFICATION and EXPLANATION only.
It does NOT determine execution authority. All execution still goes through
the financial_action_gateway.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set


class RelationshipType(str, Enum):
    SAME_CUSTOMER = "SAME_CUSTOMER"
    SAME_ORDER = "SAME_ORDER"
    SAME_SUBSCRIPTION = "SAME_SUBSCRIPTION"
    SAME_INVOICE = "SAME_INVOICE"
    SAME_PAYMENT_METHOD = "SAME_PAYMENT_METHOD"
    SAME_CHECKOUT_SESSION = "SAME_CHECKOUT_SESSION"
    SAME_PROVIDER_INCIDENT = "SAME_PROVIDER_INCIDENT"
    SAME_AGENT = "SAME_AGENT"
    SAME_MERCHANT = "SAME_MERCHANT"


# Half-life constants (in seconds) per opportunity type
HALF_LIFE_SECONDS: Dict[str, float] = {
    "abandoned_cart": 1800.0,          # 30 minutes
    "ABANDONED_CART": 1800.0,
    "failed_subscription": 86400.0,    # 24 hours
    "FAILED_SUBSCRIPTION": 86400.0,
    "subscription_dunning": 86400.0,
    "invoice_overdue": 604800.0,       # 7 days
    "INVOICE_OVERDUE": 604800.0,
    "expired_card": 43200.0,           # 12 hours
    "EXPIRED_CARD": 43200.0,
    "gateway_failure": 3600.0,         # 1 hour
    "GATEWAY_FAILURE": 3600.0,
    "checkout_abandonment": 900.0,     # 15 minutes
    "insufficient_funds": 21600.0,     # 6 hours
    "default": 14400.0,                # 4 hours default
}


@dataclass
class OpportunityEdge:
    from_id: str
    to_id: str
    relationship_type: RelationshipType
    shared_dimension_value: str  # e.g., the customer_id, order_id, etc.
    strength: float = 1.0        # 0-1, used for weighting in arbitration

    def to_dict(self) -> Dict[str, Any]:
        return {
            "from_id": self.from_id,
            "to_id": self.to_id,
            "relationship_type": self.relationship_type.value,
            "shared_dimension_value": self.shared_dimension_value,
            "strength": self.strength,
        }


@dataclass
class HalfLifeDecayResult:
    opportunity_id: str
    opportunity_type: str
    half_life_seconds: float
    age_seconds: float
    urgency_remaining_pct: float  # 0-100
    urgency_multiplier: float     # 0.0 - 1.0
    is_expired: bool
    plain_language: str           # human-readable explanation

    def to_dict(self) -> Dict[str, Any]:
        return {
            "opportunity_id": self.opportunity_id,
            "opportunity_type": self.opportunity_type,
            "half_life_seconds": self.half_life_seconds,
            "age_seconds": round(self.age_seconds, 1),
            "urgency_remaining_pct": round(self.urgency_remaining_pct, 1),
            "urgency_multiplier": round(self.urgency_multiplier, 4),
            "is_expired": self.is_expired,
            "plain_language": self.plain_language,
        }


@dataclass
class FailureCluster:
    cluster_id: str
    cluster_type: str   # PROVIDER_OUTAGE | CARD_BIN_BLOCK | VELOCITY_LIMIT | TIMING_PATTERN | UNKNOWN
    failure_code: str
    gateway: str
    affected_opportunity_ids: List[str]
    total_exposure_inr: float
    earliest_failure_at: Optional[str]
    latest_failure_at: Optional[str]
    resolution_recommendation: str
    treatment_recommendation: str  # "TREAT_AS_INCIDENT" | "INDIVIDUAL_RECOVERY" | "WAIT_FOR_PROVIDER"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "cluster_id": self.cluster_id,
            "cluster_type": self.cluster_type,
            "failure_code": self.failure_code,
            "gateway": self.gateway,
            "affected_opportunity_ids": self.affected_opportunity_ids,
            "affected_count": len(self.affected_opportunity_ids),
            "total_exposure_inr": round(self.total_exposure_inr, 2),
            "earliest_failure_at": self.earliest_failure_at,
            "latest_failure_at": self.latest_failure_at,
            "resolution_recommendation": self.resolution_recommendation,
            "treatment_recommendation": self.treatment_recommendation,
        }


class RevenueOpportunityGraph:
    """
    In-memory graph connecting recovery opportunities by shared dimension.
    Rebuilt on demand from the opportunity pool.
    Thread-safe for read operations (graph is rebuilt atomically).
    """

    def __init__(self):
        self._edges: Dict[str, List[OpportunityEdge]] = {}   # keyed by opportunity_id
        self._clusters: List[FailureCluster] = []
        self._built_at: Optional[str] = None
        self._opportunity_count: int = 0

    # ── Build ──────────────────────────────────────────────────────────────

    def build_from_opportunities(self, opportunities: List[Dict[str, Any]]) -> None:
        """
        Re-index all opportunities and compute all relationship edges.
        Call this whenever the opportunity pool changes.
        """
        new_edges: Dict[str, List[OpportunityEdge]] = {}
        for opp in opportunities:
            new_edges[opp["id"]] = []

        # Build indexes for each dimension
        by_customer: Dict[str, List[str]] = {}
        by_order: Dict[str, List[str]] = {}
        by_subscription: Dict[str, List[str]] = {}
        by_payment_method: Dict[str, List[str]] = {}
        by_failure_code_gateway: Dict[str, List[str]] = {}
        by_merchant: Dict[str, List[str]] = {}

        for opp in opportunities:
            oid = opp["id"]

            cid = opp.get("customer_id")
            if cid:
                by_customer.setdefault(cid, []).append(oid)

            oid_order = opp.get("order_id") or opp.get("original_order_id")
            if oid_order:
                by_order.setdefault(oid_order, []).append(oid)

            sid = opp.get("subscription_id")
            if sid:
                by_subscription.setdefault(sid, []).append(oid)

            pm = opp.get("payment_method") or opp.get("card_last4")
            if pm and pm not in ("unknown", "other"):
                by_payment_method.setdefault(pm, []).append(oid)

            fc = opp.get("failure_code", "")
            gw = opp.get("gateway", "")
            if fc and gw:
                key = f"{fc}::{gw}"
                by_failure_code_gateway.setdefault(key, []).append(oid)

            mid = opp.get("merchant_id", "")
            if mid:
                by_merchant.setdefault(mid, []).append(oid)

        # Emit edges for each shared dimension
        self._add_edges(new_edges, by_customer, RelationshipType.SAME_CUSTOMER, strength=1.0)
        self._add_edges(new_edges, by_order, RelationshipType.SAME_ORDER, strength=1.0)
        self._add_edges(new_edges, by_subscription, RelationshipType.SAME_SUBSCRIPTION, strength=0.9)
        self._add_edges(new_edges, by_payment_method, RelationshipType.SAME_PAYMENT_METHOD, strength=0.7)
        self._add_edges(new_edges, by_failure_code_gateway, RelationshipType.SAME_PROVIDER_INCIDENT, strength=0.8)

        self._edges = new_edges
        self._opportunity_count = len(opportunities)
        self._built_at = datetime.now(timezone.utc).isoformat()
        self._clusters = self._compute_clusters(opportunities, by_failure_code_gateway)

    def _add_edges(
        self,
        edge_map: Dict[str, List[OpportunityEdge]],
        dimension_index: Dict[str, List[str]],
        rel_type: RelationshipType,
        strength: float,
    ) -> None:
        for dim_value, ids in dimension_index.items():
            if len(ids) < 2:
                continue
            for i, a in enumerate(ids):
                for b in ids[i + 1:]:
                    edge_a = OpportunityEdge(from_id=a, to_id=b, relationship_type=rel_type,
                                             shared_dimension_value=dim_value, strength=strength)
                    edge_b = OpportunityEdge(from_id=b, to_id=a, relationship_type=rel_type,
                                             shared_dimension_value=dim_value, strength=strength)
                    edge_map.setdefault(a, []).append(edge_a)
                    edge_map.setdefault(b, []).append(edge_b)

    def _compute_clusters(
        self,
        opportunities: List[Dict[str, Any]],
        by_failure_code_gateway: Dict[str, List[str]],
    ) -> List[FailureCluster]:
        clusters: List[FailureCluster] = []
        opp_lookup = {o["id"]: o for o in opportunities}

        for key, ids in by_failure_code_gateway.items():
            if len(ids) < 2:
                continue
            failure_code, gateway = key.split("::", 1)
            affected = [opp_lookup[i] for i in ids if i in opp_lookup]
            total_exposure = sum(o.get("amount_inr", 0) for o in affected)

            timestamps = [
                o.get("created_at") or o.get("event_timestamp") or o.get("last_action_at")
                for o in affected
            ]
            timestamps = [t for t in timestamps if t]

            cluster_type = self._classify_cluster(failure_code, gateway)
            recommendation = self._cluster_recommendation(cluster_type, failure_code, gateway)

            clusters.append(FailureCluster(
                cluster_id=f"CLU-{failure_code[:8]}-{gateway[:4]}".upper(),
                cluster_type=cluster_type,
                failure_code=failure_code,
                gateway=gateway,
                affected_opportunity_ids=ids,
                total_exposure_inr=total_exposure,
                earliest_failure_at=min(timestamps) if timestamps else None,
                latest_failure_at=max(timestamps) if timestamps else None,
                resolution_recommendation=recommendation,
                treatment_recommendation=self._treatment_for(cluster_type),
            ))

        return clusters

    def _classify_cluster(self, failure_code: str, gateway: str) -> str:
        fc = failure_code.upper()
        if any(x in fc for x in ("GATEWAY", "TIMEOUT", "PROVIDER", "NETWORK")):
            return "PROVIDER_OUTAGE"
        if any(x in fc for x in ("CARD", "BIN", "INSUFFICIENT")):
            return "CARD_BIN_BLOCK"
        if any(x in fc for x in ("VELOCITY", "LIMIT", "RATE")):
            return "VELOCITY_LIMIT"
        if "WEEKEND" in fc or "TIMING" in fc:
            return "TIMING_PATTERN"
        return "UNKNOWN"

    def _cluster_recommendation(self, cluster_type: str, failure_code: str, gateway: str) -> str:
        if cluster_type == "PROVIDER_OUTAGE":
            return f"Route traffic away from {gateway}. {failure_code} indicates provider-side degradation — retrying on same rail will fail. Switch to healthy gateway."
        if cluster_type == "CARD_BIN_BLOCK":
            return "Multiple customers share same card issuer issue. Send payment method update links rather than retrying same card."
        if cluster_type == "VELOCITY_LIMIT":
            return "Spread retry attempts — velocity limits reset on a per-window basis. Stagger retries 30-60 minutes apart."
        if cluster_type == "TIMING_PATTERN":
            return "Timing-related failure cluster. Schedule retries for business hours (Mon-Fri, 9 AM - 6 PM IST)."
        return "Investigate individually — no clear shared provider signal."

    def _treatment_for(self, cluster_type: str) -> str:
        return {
            "PROVIDER_OUTAGE": "TREAT_AS_INCIDENT",
            "CARD_BIN_BLOCK": "INDIVIDUAL_RECOVERY",
            "VELOCITY_LIMIT": "WAIT_FOR_PROVIDER",
            "TIMING_PATTERN": "WAIT_FOR_PROVIDER",
            "UNKNOWN": "INDIVIDUAL_RECOVERY",
        }.get(cluster_type, "INDIVIDUAL_RECOVERY")

    # ── Query ──────────────────────────────────────────────────────────────

    def get_related(self, opp_id: str) -> List[OpportunityEdge]:
        """Get all edges for a given opportunity."""
        return self._edges.get(opp_id, [])

    def get_cluster_for(self, opp_id: str) -> Optional[FailureCluster]:
        """Find the cluster an opportunity belongs to (if any)."""
        for cluster in self._clusters:
            if opp_id in cluster.affected_opportunity_ids:
                return cluster
        return None

    def get_all_clusters(self) -> List[FailureCluster]:
        return self._clusters

    def get_transitive_cluster(self, opp_id: str, max_depth: int = 3) -> List[str]:
        """Transitive closure of related opportunity IDs (BFS)."""
        visited: Set[str] = {opp_id}
        queue = [opp_id]
        depth = 0
        while queue and depth < max_depth:
            next_queue = []
            for oid in queue:
                for edge in self._edges.get(oid, []):
                    if edge.to_id not in visited:
                        visited.add(edge.to_id)
                        next_queue.append(edge.to_id)
            queue = next_queue
            depth += 1
        return list(visited - {opp_id})

    def get_relationship_summary(self) -> Dict[str, Any]:
        """Summary of all graph relationships for dashboard display."""
        total_edges = sum(len(v) for v in self._edges.values()) // 2  # undirected
        by_type: Dict[str, int] = {}
        for edges in self._edges.values():
            for e in edges:
                by_type[e.relationship_type.value] = by_type.get(e.relationship_type.value, 0) + 1
        # Each undirected edge is counted twice — halve
        by_type = {k: v // 2 for k, v in by_type.items()}

        multi_opportunity_customers = sum(
            1 for edges in self._edges.values()
            if any(e.relationship_type == RelationshipType.SAME_CUSTOMER for e in edges)
        ) // 2

        return {
            "built_at": self._built_at,
            "opportunity_count": self._opportunity_count,
            "total_relationship_edges": total_edges,
            "relationships_by_type": by_type,
            "failure_clusters": len(self._clusters),
            "multi_opportunity_customers": multi_opportunity_customers,
            "plain_language_summary": self._build_plain_summary(by_type, multi_opportunity_customers),
        }

    def _build_plain_summary(self, by_type: Dict[str, int], multi_cust: int) -> List[str]:
        lines = []
        sc = by_type.get("SAME_CUSTOMER", 0)
        if sc > 0:
            lines.append(f"{sc} opportunity pair(s) share the same customer — only 1 will be contacted today.")
        si = by_type.get("SAME_PROVIDER_INCIDENT", 0)
        if si > 0:
            lines.append(f"{si} opportunity pair(s) share the same gateway failure pattern — treating as incident cluster.")
        sp = by_type.get("SAME_PAYMENT_METHOD", 0)
        if sp > 0:
            lines.append(f"{sp} opportunity pair(s) share the same payment method — likely same BIN or issuer issue.")
        if self._clusters:
            lines.append(f"{len(self._clusters)} failure cluster(s) detected — review Gateway Commander for bulk action.")
        if not lines:
            lines.append("No shared relationships detected — all opportunities are independent.")
        return lines

    # ── Half-Life Decay ────────────────────────────────────────────────────

    def compute_half_life_decay(
        self,
        opp_id: str,
        opportunity_type: str = "failed_subscription",
        created_at: Optional[str] = None,
    ) -> HalfLifeDecayResult:

        """
        Compute how much urgency remains for this opportunity.
        Formula: urgency_multiplier = 0.5 ^ (elapsed_seconds / half_life_seconds)
        """
        half_life = HALF_LIFE_SECONDS.get(opportunity_type, HALF_LIFE_SECONDS["default"])

        if created_at:
            try:
                if isinstance(created_at, str):
                    ts = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                else:
                    ts = created_at
                ts = ts.replace(tzinfo=timezone.utc) if ts.tzinfo is None else ts
                elapsed = (datetime.now(timezone.utc) - ts).total_seconds()
            except Exception:
                elapsed = 0.0
        else:
            elapsed = 0.0

        elapsed = max(0.0, elapsed)
        urgency_multiplier = math.pow(0.5, elapsed / half_life)
        urgency_pct = urgency_multiplier * 100.0
        is_expired = urgency_pct < 5.0

        if is_expired:
            plain = f"This opportunity has expired — {elapsed/3600:.1f}h old, well past its {half_life/3600:.0f}h window."
        elif urgency_pct >= 80:
            plain = f"High urgency — still {urgency_pct:.0f}% of recovery window remaining. Act now."
        elif urgency_pct >= 40:
            plain = f"Moderate urgency — {urgency_pct:.0f}% of recovery window remaining."
        else:
            plain = f"Low urgency — only {urgency_pct:.0f}% of recovery window remaining. Value of waiting is low."

        return HalfLifeDecayResult(
            opportunity_id=opp_id,
            opportunity_type=opportunity_type,
            half_life_seconds=half_life,
            age_seconds=elapsed,
            urgency_remaining_pct=round(urgency_pct, 1),
            urgency_multiplier=round(urgency_multiplier, 4),
            is_expired=is_expired,
            plain_language=plain,
        )


# Global singleton
opportunity_graph = RevenueOpportunityGraph()
