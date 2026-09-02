# ReviveOS Agent Interoperability Protocol (REVIVEOS-PROTOCOL-1.1)

## Canonical Signature Scheme
```
METHOD
PATH
AGENT_ID
KEY_ID
TIMESTAMP
REQUEST_ID
PROPOSAL_ID
PROTOCOL_VERSION
SHA256(BODY)
```
Signed via HMAC-SHA256 with key rotation and sliding-window replay protection.