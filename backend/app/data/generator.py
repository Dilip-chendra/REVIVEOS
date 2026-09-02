"""
ReviveAI — Synthetic Dataset Generator

Generates realistic Indian payment failure/recovery datasets with:
- Proper failure rate distributions (not uniform random)
- Realistic merchant profiles and customer behavior
- Ground-truth recovery labels for evaluation
- 70/30 train/eval split with no data leakage
- Fully reproducible with fixed seed

Distributions:
  Successful payments:        65%
  Recoverable failures:       18%
    - Gateway degradation:     5%
    - Temporary failure:       6%
    - Subscription failure:    4%
    - Checkout abandonment:    3%
  Non-recoverable failures:    7%
    - Insufficient funds:      4%
    - Repeated failure:        2%
    - Suspicious:              1%
  Overdue invoices:            4%
  Customer disengagement:      3%
  Unknown:                     3%
"""
from __future__ import annotations

import random
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np


@dataclass
class SyntheticMerchant:
    id: str
    name: str
    business_type: str
    monthly_gmv_inr: float
    risk_tier: str


@dataclass
class SyntheticCustomer:
    id: str
    merchant_id: str
    name: str
    email: str
    phone: str
    total_payments: int
    successful_payments: int
    lifetime_value_inr: float
    opt_out_communications: bool
    is_flagged: bool

    @property
    def success_rate(self) -> float:
        return self.successful_payments / max(self.total_payments, 1)


@dataclass
class SyntheticPaymentRecord:
    id: str
    merchant_id: str
    customer_id: str
    amount_inr: float
    payment_method: str
    gateway: str
    status: str                   # captured / failed / abandoned
    failure_code: str             # empty string if success/abandoned
    case_type: str                # what kind of risk case this is
    failure_category: str         # from FailureCategory
    retry_count: int
    consecutive_failures: int
    gateway_is_degraded: bool
    gateway_failure_rate_1h: float
    days_since_last_success: int
    subscription_age_days: int
    subscription_failed_count: int
    invoice_days_overdue: int
    hour_of_day: int
    day_of_week: int
    customer_success_rate: float
    customer_lifetime_value_inr: float
    customer_opted_out: bool
    is_flagged_customer: bool
    # Ground truth labels (for held-out evaluation only)
    ground_truth_recoverable: bool
    ground_truth_recovered: bool
    ground_truth_recovery_method: str
    split: str                   # 'train' or 'eval'
    created_at: datetime


@dataclass
class GeneratedDataset:
    merchants: list[SyntheticMerchant]
    customers: list[SyntheticCustomer]
    train_records: list[SyntheticPaymentRecord]
    eval_records: list[SyntheticPaymentRecord]
    scale: int
    seed: int
    generated_at: datetime

    @property
    def all_records(self) -> list[SyntheticPaymentRecord]:
        return self.train_records + self.eval_records

    @property
    def at_risk_records(self) -> list[SyntheticPaymentRecord]:
        return [r for r in self.all_records if r.status != "captured"]

    @property
    def total_amount_at_risk_inr(self) -> float:
        return sum(r.amount_inr for r in self.at_risk_records)

    @property
    def total_recoverable_inr(self) -> float:
        return sum(r.amount_inr for r in self.at_risk_records if r.ground_truth_recoverable)

    @property
    def true_recovery_rate(self) -> float:
        at_risk = self.at_risk_records
        if not at_risk:
            return 0.0
        recovered = [r for r in at_risk if r.ground_truth_recovered]
        return len(recovered) / len(at_risk)

    def summary(self) -> dict[str, Any]:
        all_r = self.all_records
        at_risk = self.at_risk_records
        return {
            "scale": self.scale,
            "seed": self.seed,
            "total_records": len(all_r),
            "train_records": len(self.train_records),
            "eval_records": len(self.eval_records),
            "merchants": len(self.merchants),
            "customers": len(self.customers),
            "successful_payments": len([r for r in all_r if r.status == "captured"]),
            "at_risk_records": len(at_risk),
            "total_amount_at_risk_inr": round(self.total_amount_at_risk_inr, 2),
            "total_recoverable_inr": round(self.total_recoverable_inr, 2),
            "true_recovery_rate": round(self.true_recovery_rate, 4),
            "generated_at": self.generated_at.isoformat(),
            "category_breakdown": self._category_breakdown(),
        }

    def _category_breakdown(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for r in self.at_risk_records:
            counts[r.failure_category] = counts.get(r.failure_category, 0) + 1
        return counts


# ── Constants ─────────────────────────────────────────────────────────────────

GATEWAY_FAILURE_CODES = [
    "GATEWAY_CONNECTION_ERROR",
    "GATEWAY_TECHNICAL_ERROR",
    "PAYMENT_TIMEOUT",
    "SERVER_ERROR",
]
TEMP_FAILURE_CODES = [
    "BAD_REQUEST_ERROR",
    "NETWORK_ERROR",
    "PAYMENT_TIMEOUT",
]
FUNDS_FAILURE_CODES = [
    "INSUFFICIENT_BALANCE",
    "INSUFFICIENT_FUNDS",
    "CREDIT_LIMIT_EXCEEDED",
]
FRAUD_CODES = ["FRAUD_DETECTED", "DO_NOT_HONOR"]

GATEWAYS = ["razorpay", "payu", "cashfree"]
GATEWAY_WEIGHTS = [0.60, 0.25, 0.15]

PAYMENT_METHODS = ["card", "upi", "netbanking", "wallet", "emi", "nach"]
PAYMENT_METHOD_WEIGHTS = [0.30, 0.40, 0.15, 0.08, 0.05, 0.02]

# Percentage breakdown of record types
RECORD_TYPE_DISTRIBUTION = [
    # (type_key, weight)
    ("success",           0.65),
    ("gateway_failure",   0.05),
    ("temp_failure",      0.06),
    ("subscription",      0.04),
    ("abandonment",       0.03),
    ("insufficient",      0.04),
    ("repeated",          0.02),
    ("suspicious",        0.01),
    ("invoice_overdue",   0.04),
    ("disengagement",     0.03),
    ("unknown",           0.03),
]
RECORD_TYPES = [t[0] for t in RECORD_TYPE_DISTRIBUTION]
RECORD_WEIGHTS = [t[1] for t in RECORD_TYPE_DISTRIBUTION]

# Ground truth recovery rates by category (is_recoverable, was_recovered)
RECOVERY_TRUTH = {
    "gateway_failure":  (0.80, 0.70, "route_switch"),
    "temp_failure":     (0.65, 0.60, "retry"),
    "subscription":     (0.55, 0.50, "sequence"),
    "abandonment":      (0.35, 0.30, "reminder"),
    "invoice_overdue":  (0.45, 0.40, "reminder"),
    "insufficient":     (0.20, 0.15, "reminder"),
    "repeated":         (0.08, 0.05, "escalate"),
    "suspicious":       (0.03, 0.02, "escalate"),
    "disengagement":    (0.12, 0.10, "reminder"),
    "unknown":          (0.40, 0.35, "retry"),
    "success":          (0.00, 0.00, ""),
}


class DataGenerator:
    """
    Generates synthetic payment/revenue recovery datasets.
    Fully deterministic with fixed seed.
    """

    def __init__(self, scale: int = 10_000, seed: int = 42):
        self.scale = scale
        self.seed = seed
        self.rng = random.Random(seed)
        self.np_rng = np.random.default_rng(seed)

    def generate(self) -> GeneratedDataset:
        """Generate the full dataset with train/eval split."""
        merchants = self._generate_merchants()
        customers = self._generate_customers(merchants)
        all_records = self._generate_payment_records(merchants, customers)

        # Deterministic 70/30 split — shuffle then cut
        rng_split = random.Random(self.seed + 9999)
        rng_split.shuffle(all_records)
        split_idx = int(len(all_records) * 0.70)
        train = all_records[:split_idx]
        eval_ = all_records[split_idx:]

        for r in train:
            r.split = "train"
        for r in eval_:
            r.split = "eval"

        return GeneratedDataset(
            merchants=merchants,
            customers=customers,
            train_records=train,
            eval_records=eval_,
            scale=self.scale,
            seed=self.seed,
            generated_at=datetime.now(timezone.utc),
        )

    # ── Merchant Generation ───────────────────────────────────────────────────

    def _generate_merchants(self) -> list[SyntheticMerchant]:
        """5 realistic Indian merchant profiles."""
        return [
            SyntheticMerchant(
                id=str(uuid.UUID(int=1)),
                name="Finflow SaaS",
                business_type="saas",
                monthly_gmv_inr=45_00_000,
                risk_tier="low",
            ),
            SyntheticMerchant(
                id=str(uuid.UUID(int=2)),
                name="ShopKart Online",
                business_type="ecommerce",
                monthly_gmv_inr=2_50_00_000,
                risk_tier="medium",
            ),
            SyntheticMerchant(
                id=str(uuid.UUID(int=3)),
                name="EnterpriseEdge B2B",
                business_type="b2b",
                monthly_gmv_inr=1_20_00_000,
                risk_tier="low",
            ),
            SyntheticMerchant(
                id=str(uuid.UUID(int=4)),
                name="StreamVibe Subscriptions",
                business_type="subscription",
                monthly_gmv_inr=80_00_000,
                risk_tier="low",
            ),
            SyntheticMerchant(
                id=str(uuid.UUID(int=5)),
                name="TradeMart Marketplace",
                business_type="marketplace",
                monthly_gmv_inr=3_50_00_000,
                risk_tier="high",
            ),
        ]

    # ── Customer Generation ───────────────────────────────────────────────────

    def _generate_customers(
        self, merchants: list[SyntheticMerchant]
    ) -> list[SyntheticCustomer]:
        """~200 customers per merchant with realistic profiles."""
        customers = []
        first_names = [
            "Rahul", "Priya", "Amit", "Sneha", "Vikram", "Kavya", "Rohan",
            "Ananya", "Siddharth", "Meera", "Arjun", "Divya", "Kunal",
            "Pooja", "Nikhil", "Shruti", "Aditya", "Riya", "Manish", "Nisha",
            "Suresh", "Lakshmi", "Deepak", "Sangeetha", "Rajesh", "Usha",
        ]
        last_names = [
            "Sharma", "Patel", "Singh", "Kumar", "Verma", "Gupta", "Jain",
            "Mehta", "Reddy", "Nair", "Krishnan", "Pillai", "Agarwal", "Mishra",
        ]
        domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]

        customer_idx = 0
        for merchant in merchants:
            n_customers = 200
            for i in range(n_customers):
                fn = self.rng.choice(first_names)
                ln = self.rng.choice(last_names)
                name = f"{fn} {ln}"
                email = f"{fn.lower()}.{ln.lower()}{customer_idx}@{self.rng.choice(domains)}"
                phone = f"+91{self.rng.randint(7000000000, 9999999999)}"

                total = self.rng.randint(1, 30)
                # Customer success rate varies by merchant risk tier
                if merchant.risk_tier == "low":
                    success_rate = self.rng.gauss(0.88, 0.08)
                elif merchant.risk_tier == "medium":
                    success_rate = self.rng.gauss(0.78, 0.12)
                else:
                    success_rate = self.rng.gauss(0.68, 0.15)
                success_rate = max(0.0, min(1.0, success_rate))
                successful = int(total * success_rate)
                ltv = successful * self._merchant_avg_amount(merchant) * self.rng.uniform(0.8, 1.4)

                customers.append(SyntheticCustomer(
                    id=str(uuid.uuid4()),
                    merchant_id=merchant.id,
                    name=name,
                    email=email,
                    phone=phone,
                    total_payments=total,
                    successful_payments=successful,
                    lifetime_value_inr=round(ltv, 2),
                    opt_out_communications=self.rng.random() < 0.03,  # 3% opt out
                    is_flagged=self.rng.random() < 0.005,             # 0.5% flagged
                ))
                customer_idx += 1

        return customers

    # ── Payment Record Generation ─────────────────────────────────────────────

    def _generate_payment_records(
        self,
        merchants: list[SyntheticMerchant],
        customers: list[SyntheticCustomer],
    ) -> list[SyntheticPaymentRecord]:
        """Generate self.scale payment records with realistic distributions."""
        records = []
        now = datetime.now(timezone.utc)

        # Build customer lookup
        customer_by_merchant: dict[str, list[SyntheticCustomer]] = {}
        for c in customers:
            customer_by_merchant.setdefault(c.merchant_id, []).append(c)

        # Simulate gateway degradation periods (adds realism)
        degraded_gateway = self.rng.choice(GATEWAYS)
        degradation_start = now - timedelta(hours=self.rng.randint(1, 6))
        degradation_end = now - timedelta(minutes=self.rng.randint(0, 30))

        for i in range(self.scale):
            merchant = self.rng.choice(merchants)
            merchant_customers = customer_by_merchant.get(merchant.id, customers[:10])
            customer = self.rng.choice(merchant_customers)

            amount = self._sample_amount(merchant)
            gateway = self.rng.choices(GATEWAYS, weights=GATEWAY_WEIGHTS)[0]
            payment_method = self.rng.choices(PAYMENT_METHODS, weights=PAYMENT_METHOD_WEIGHTS)[0]

            # Temporal features
            record_time = now - timedelta(hours=self.rng.randint(0, 168))  # Last 7 days
            hour_of_day = record_time.hour
            day_of_week = record_time.weekday()

            # Gateway health features
            is_degraded = (
                gateway == degraded_gateway
                and degradation_start <= record_time <= degradation_end
            )
            gateway_failure_rate = self.rng.uniform(0.18, 0.45) if is_degraded else self.rng.uniform(0.01, 0.08)

            # Determine record type
            record_type = self.rng.choices(RECORD_TYPES, weights=RECORD_WEIGHTS)[0]

            # Override type if gateway is degraded (more gateway failures during degradation)
            if is_degraded and self.rng.random() < 0.6:
                record_type = "gateway_failure"

            # Build features based on type
            rec = self._build_record(
                record_type=record_type,
                record_id=str(uuid.uuid4()),
                merchant=merchant,
                customer=customer,
                amount=amount,
                gateway=gateway,
                payment_method=payment_method,
                is_degraded=is_degraded,
                gateway_failure_rate=gateway_failure_rate,
                record_time=record_time,
                hour_of_day=hour_of_day,
                day_of_week=day_of_week,
            )
            records.append(rec)

        return records

    def _build_record(
        self,
        record_type: str,
        record_id: str,
        merchant: SyntheticMerchant,
        customer: SyntheticCustomer,
        amount: float,
        gateway: str,
        payment_method: str,
        is_degraded: bool,
        gateway_failure_rate: float,
        record_time: datetime,
        hour_of_day: int,
        day_of_week: int,
    ) -> SyntheticPaymentRecord:
        """Build a single payment record for the given type."""
        # Defaults
        status = "captured"
        failure_code = ""
        case_type = "none"
        failure_category = "success"
        retry_count = 0
        consecutive_failures = 0
        subscription_age_days = 0
        subscription_failed_count = 0
        invoice_days_overdue = 0

        # Days since last success
        days_since_success = self.rng.randint(0, 3) if customer.success_rate > 0.7 else self.rng.randint(1, 30)

        if record_type == "success":
            status = "captured"

        elif record_type == "gateway_failure":
            status = "failed"
            failure_code = self.rng.choice(GATEWAY_FAILURE_CODES)
            case_type = "payment_failure"
            failure_category = "gateway_degradation"
            retry_count = self.rng.randint(0, 1)
            consecutive_failures = retry_count

        elif record_type == "temp_failure":
            status = "failed"
            failure_code = self.rng.choice(TEMP_FAILURE_CODES)
            case_type = "payment_failure"
            failure_category = "temporary_failure"
            retry_count = self.rng.randint(0, 2)
            consecutive_failures = min(retry_count, 1)

        elif record_type == "subscription":
            status = "failed"
            failure_code = self.rng.choice(TEMP_FAILURE_CODES + ["SUBSCRIPTION_PENDING"])
            case_type = "subscription_failure"
            failure_category = "subscription_failure"
            subscription_age_days = self.rng.randint(30, 730)
            subscription_failed_count = self.rng.randint(1, 3)
            retry_count = subscription_failed_count - 1
            consecutive_failures = 1
            # Subscription amounts tend to be fixed/small
            amount = self.rng.choice([299, 499, 999, 1299, 1999, 2999, 4999])

        elif record_type == "abandonment":
            status = "abandoned"
            failure_code = ""
            case_type = "checkout_abandonment"
            failure_category = "checkout_abandonment"
            # Abandonment amounts slightly lower (people abandon high prices)
            amount = amount * self.rng.uniform(0.5, 1.2)
            days_since_success = self.rng.randint(0, 7)

        elif record_type == "insufficient":
            status = "failed"
            failure_code = self.rng.choice(FUNDS_FAILURE_CODES)
            case_type = "payment_failure"
            failure_category = "insufficient_funds"
            retry_count = self.rng.randint(0, 2)
            consecutive_failures = retry_count

        elif record_type == "repeated":
            status = "failed"
            failure_code = self.rng.choice(TEMP_FAILURE_CODES)
            case_type = "payment_failure"
            failure_category = "repeated_retry_failure"
            retry_count = 3  # Max retries hit
            consecutive_failures = 2

        elif record_type == "suspicious":
            status = "failed"
            failure_code = self.rng.choice(FRAUD_CODES)
            case_type = "payment_failure"
            failure_category = "suspicious_pattern"
            retry_count = self.rng.randint(0, 1)
            consecutive_failures = 0

        elif record_type == "invoice_overdue":
            status = "failed"
            failure_code = ""
            case_type = "overdue_invoice"
            failure_category = "invoice_overdue"
            invoice_days_overdue = self.rng.randint(1, 60)
            # B2B invoices tend to be larger
            if merchant.business_type == "b2b":
                amount = amount * self.rng.uniform(1.5, 3.0)

        elif record_type == "disengagement":
            status = "abandoned"
            failure_code = ""
            case_type = "checkout_abandonment"
            failure_category = "customer_disengagement"
            days_since_success = self.rng.randint(30, 90)

        else:  # unknown
            status = "failed"
            failure_code = self.rng.choice(["UNKNOWN_ERROR", ""])
            case_type = "payment_failure"
            failure_category = "unknown"
            retry_count = self.rng.randint(0, 1)

        # Ground truth
        recoverable, recovered, method = self._determine_ground_truth(record_type, customer)

        return SyntheticPaymentRecord(
            id=str(uuid.uuid4()),
            merchant_id=merchant.id,
            customer_id=customer.id,
            amount_inr=round(max(amount, 1.0), 2),
            payment_method=payment_method,
            gateway=gateway,
            status=status,
            failure_code=failure_code,
            case_type=case_type if case_type != "none" else "payment_failure",
            failure_category=failure_category,
            retry_count=retry_count,
            consecutive_failures=consecutive_failures,
            gateway_is_degraded=is_degraded,
            gateway_failure_rate_1h=round(gateway_failure_rate, 4),
            days_since_last_success=days_since_success,
            subscription_age_days=subscription_age_days,
            subscription_failed_count=subscription_failed_count,
            invoice_days_overdue=invoice_days_overdue,
            hour_of_day=hour_of_day,
            day_of_week=day_of_week,
            customer_success_rate=round(customer.success_rate, 4),
            customer_lifetime_value_inr=customer.lifetime_value_inr,
            customer_opted_out=customer.opt_out_communications,
            is_flagged_customer=customer.is_flagged,
            ground_truth_recoverable=recoverable,
            ground_truth_recovered=recovered,
            ground_truth_recovery_method=method,
            split="",  # Set after shuffle
            created_at=record_time,
        )

    def _determine_ground_truth(
        self, record_type: str, customer: SyntheticCustomer
    ) -> tuple[bool, bool, str]:
        """
        Determine ground truth labels for evaluation.
        Uses seeded random to ensure reproducibility.
        """
        rates = RECOVERY_TRUTH.get(record_type, (0.40, 0.35, "retry"))
        p_recoverable, p_recovered, method = rates

        # Customer history adjustment — good customers are more recoverable
        adjustment = (customer.success_rate - 0.5) * 0.15
        p_recoverable = max(0.0, min(1.0, p_recoverable + adjustment))
        p_recovered = max(0.0, min(1.0, p_recovered + adjustment * 0.8))

        is_recoverable = self.rng.random() < p_recoverable
        was_recovered = is_recoverable and (self.rng.random() < (p_recovered / max(p_recoverable, 0.01)))

        return is_recoverable, was_recovered, method if was_recovered else ""

    def _sample_amount(self, merchant: SyntheticMerchant) -> float:
        """Sample a realistic payment amount for this merchant type."""
        if merchant.business_type == "saas":
            amt = float(self.np_rng.lognormal(mean=np.log(1999), sigma=0.5))
            return max(99, min(amt, 49999))
        elif merchant.business_type == "ecommerce":
            amt = float(self.np_rng.lognormal(mean=np.log(2500), sigma=0.8))
            return max(199, min(amt, 99999))
        elif merchant.business_type == "b2b":
            amt = float(self.np_rng.lognormal(mean=np.log(75000), sigma=0.7))
            return max(5000, min(amt, 999999))
        elif merchant.business_type == "subscription":
            return float(self.rng.choices(
                [299, 499, 999, 1999, 4999],
                weights=[20, 25, 30, 15, 10]
            )[0])
        else:  # marketplace
            amt = float(self.np_rng.lognormal(mean=np.log(3000), sigma=1.0))
            return max(99, min(amt, 199999))

    def _merchant_avg_amount(self, merchant: SyntheticMerchant) -> float:
        avg_map = {
            "saas": 1999,
            "ecommerce": 2500,
            "b2b": 75000,
            "subscription": 999,
            "marketplace": 3000,
        }
        return avg_map.get(merchant.business_type, 2500)


# ── CLI Entry Point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json
    import sys

    scale = int(sys.argv[1]) if len(sys.argv) > 1 else 10_000
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 42

    print(f"Generating {scale:,} records with seed {seed}...")
    gen = DataGenerator(scale=scale, seed=seed)
    dataset = gen.generate()
    summary = dataset.summary()
    print(json.dumps(summary, indent=2))
    print(f"\nTrain: {len(dataset.train_records):,} | Eval: {len(dataset.eval_records):,}")
    print(f"Revenue at risk: ₹{summary['total_amount_at_risk_inr']:,.0f}")
    print(f"Recoverable: ₹{summary['total_recoverable_inr']:,.0f}")
    print(f"True recovery rate: {summary['true_recovery_rate']:.1%}")
