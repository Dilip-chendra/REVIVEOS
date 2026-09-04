# -*- coding: utf-8 -*-
"""
ReviveOS — Promise to Pay (P2P) Lifecycle Management

States:
  PROMISED -> Outreach suppressed
  FULFILLED -> Recovery attributed
  MISSED -> Strategy re-arbitration triggered
  CANCELLED -> Customer sovereignty honored
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


class PromiseToPayManager:
    def __init__(self):
        self._demo_promises: Dict[str, Dict[str, Any]] = {
            "P2P-101": {
                "id": "P2P-101",
                "case_id": "OPP-002",
                "customer_name": "Priya Sharma",
                "amount_inr": 2500.0,
                "promise_date": "2026-09-08",
                "confidence": 0.88,
                "status": "PROMISED",
                "created_at": "2026-09-01T10:00:00Z",
                "notes": "Customer requested salary-credit date alignment.",
                "data_universe": "DEMO",
            },
            "P2P-102": {
                "id": "P2P-102",
                "case_id": "OPP-003",
                "customer_name": "Siddharth Rao",
                "amount_inr": 18000.0,
                "promise_date": "2026-09-05",
                "confidence": 0.94,
                "status": "PROMISED",
                "created_at": "2026-09-02T14:30:00Z",
                "notes": "Director approved NEFT transfer.",
                "data_universe": "DEMO",
            },
        }
        self._real_promises: Dict[str, Dict[str, Any]] = {}

    def list_promises(self, is_real_mode: bool = False) -> List[Dict[str, Any]]:
        if is_real_mode:
            return list(self._real_promises.values())
        return list(self._demo_promises.values())

    def create_promise(
        self,
        case_id: str,
        customer_name: str,
        amount_inr: float,
        promise_date: str,
        confidence: float = 0.85,
        notes: str = "",
        is_real_mode: bool = False,
    ) -> Dict[str, Any]:
        p2p_id = f"P2P-{uuid.uuid4().hex[:6].upper()}"
        record = {
            "id": p2p_id,
            "case_id": case_id,
            "customer_name": customer_name,
            "amount_inr": amount_inr,
            "promise_date": promise_date,
            "confidence": confidence,
            "status": "PROMISED",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "notes": notes,
            "data_universe": "REAL" if is_real_mode else "DEMO",
        }
        if is_real_mode:
            self._real_promises[p2p_id] = record
        else:
            self._demo_promises[p2p_id] = record
        return record

    def fulfill_promise(self, promise_id: str) -> Optional[Dict[str, Any]]:
        target_dict = self._real_promises if promise_id in self._real_promises else self._demo_promises
        if promise_id in target_dict:
            target_dict[promise_id]["status"] = "FULFILLED"
            target_dict[promise_id]["resolved_at"] = datetime.now(timezone.utc).isoformat()
            return target_dict[promise_id]
        return None

    def miss_promise(self, promise_id: str) -> Optional[Dict[str, Any]]:
        target_dict = self._real_promises if promise_id in self._real_promises else self._demo_promises
        if promise_id in target_dict:
            target_dict[promise_id]["status"] = "MISSED"
            target_dict[promise_id]["resolved_at"] = datetime.now(timezone.utc).isoformat()
            return target_dict[promise_id]
        return None


promise_to_pay_manager = PromiseToPayManager()
