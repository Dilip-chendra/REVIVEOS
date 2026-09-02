# ReviveOS Hardened Action Contracts

## Cryptographic Guarantees
- **Single-Use Atomic Consumption**: Enforced via monotonic memory lock.
- **Strict TTL Expiry**: Default 300s window.
- **Instant Revocation**: Explicit cancellation if state changes before execution.
- **Tenant Isolation**: Mandatory tenant ID verification.