# ReviveOS Recovery Economics — Causal Lift, Counterfactuals & NIC

## Mathematical Formulation
Every at-risk transaction is evaluated against a counterfactual natural recovery baseline:

$$\tau(x) = \max(0, P(\text{Recovery} \mid \text{Intervene}, x) - P(\text{Recovery} \mid \text{Do Nothing}, x))$$

### Net Incremental Contribution (NIC)
$$\text{NIC} = (\tau(x) \times \text{Amount}) - C_{\text{API}} - C_{\text{Discount}} - C_{\text{Friction}}$$

### Recovery Opportunity Score (ROS)
Priority ranking between 0.0 and 100.0 based on causal lift, intent verification, urgency, and calibration confidence.