# Provider Bridge

33Jane deliberately separates protocol eligibility from routing logic.

For an issuer or permissioned liquidity venue that exposes a private or partner API, configure a normalized provider bridge and set its URL in the environment.

## Request

33Jane sends:

```json
{
  "sellAssetId": "1:usdc",
  "buyAssetId": "1:openeden-tbill",
  "sellAmountAtomic": "100000000",
  "wallet": "0x...",
  "recipient": "0x...",
  "claims": {
    "kyc": true,
    "professionalInvestor": true
  }
}
```

## Response

```json
{
  "quoteId": "issuer-quote-123",
  "buyAmountAtomic": "99800000",
  "feeAmountAtomic": "0",
  "expiresAt": "2026-10-04T13:30:00.000Z",
  "confidenceBps": 10000,
  "execution": {
    "target": "0x...",
    "data": "0x...",
    "value": "0x0",
    "signatureRequired": false
  }
}
```

The bridge may sit in front of an issuer SDK, private API, RFQ venue, allow-list service, or institutional workflow. 33Jane never fabricates user eligibility; it consumes the provider's requirements and claims.
