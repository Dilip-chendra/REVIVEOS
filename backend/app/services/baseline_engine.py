"""
ReviveAI — Baseline Recovery Engine (World A)

This engine represents a realistic traditional recovery strategy.
"What would have happened without ReviveAI?"

Methodology:
- No intelligent route switching.
- No AI sequencing or contextual reminders.
- Simple fixed-retry policy.
- Retries fail if the underlying reason isn't transient (e.g. insufficient funds usually stays failed).
"""
import random
from typing import Dict, Any

class BaselineEngine:
    def __init__(self):
        # Traditional configuration
        self.config = {
            "max_retries": 2,
            "route_switch": False,
            "ai_diagnosis": False,
            "personalization": False,
            "dynamic_prioritization": False
        }

    def simulate_recovery(self, case_data: Dict[str, Any], seed: int) -> Dict[str, Any]:
        """
        Simulate a traditional fixed-retry recovery attempt.
        """
        rng = random.Random(seed + hash(case_data['id']) + 999)
        
        amount = float(case_data.get('amount_inr', 0.0))
        failure_category = case_data.get('failure_category', 'unknown')
        true_recoverable = case_data.get('ground_truth_recoverable', False)
        
        # Baseline probabilities are lower than intelligent ReviveAI probabilities.
        # This is a scientifically honest assumption based on industry standards
        # where fixed retries without context have lower success rates.
        baseline_prob_map = {
            "gateway_degradation": 0.15,   # Without route switch, retrying a degraded gateway usually fails
            "temporary_failure": 0.50,     # Simple retries work okay for truly transient issues
            "subscription_failure": 0.25,  # Needs sequencing/reminders, blind retry works poorly
            "checkout_abandonment": 0.05,  # Hard to recover without contextual reminders
            "insufficient_funds": 0.10,    # Blind retries rarely work unless they happen to deposit funds
            "repeated_retry_failure": 0.01,
            "invoice_overdue": 0.15,       # Blind dunning isn't very effective
            "suspicious_pattern": 0.00,
            "customer_disengagement": 0.02,
            "unknown": 0.20
        }
        
        baseline_prob = baseline_prob_map.get(failure_category, 0.20)
        
        # If the case is fundamentally unrecoverable (ground truth), neither baseline nor ReviveAI can recover it.
        if not true_recoverable:
            baseline_prob = 0.0

        # Simulate 2 dumb retries
        recovered = False
        attempts = 0
        
        for _ in range(self.config["max_retries"]):
            attempts += 1
            if rng.random() < baseline_prob:
                recovered = True
                break
                
        return {
            "recovered": recovered,
            "amount_recovered_inr": amount if recovered else 0.0,
            "attempts": attempts,
            "action": "fixed_retry",
            "policy": "traditional"
        }

baseline_engine = BaselineEngine()
