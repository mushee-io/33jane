# 33Jane

**Permissioned-liquidity infrastructure for CoW Protocol.**

33Jane makes RWA and other restricted liquidity machine-readable and routable. The long-term goal is simple: a CoW solver should be able to ask one system what permissioned liquidity exists, whether a route is executable for a specific order, and how it can be settled.

This repository now contains the first working vertical slice for **Milestones 1–5**.

## What works

- canonical RWA asset registry
- provider-driven eligibility/constraint engine
- universal liquidity adapter interface
- issuer mint/redeem adapter
- RFQ adapter
- constant-product AMM adapter
- normalized quote engine
- multi-hop execution routing
- HTTP API
- deterministic demo fixtures
- tests + CI

The demo is deliberately synthetic. No demo token or adapter is presented as a production issuer integration.

## Quick start

```bash
npm install
npm run typecheck
npm test
npm run demo
npm run dev
```

API defaults to `http://localhost:8787`.

## API

### Assets

```bash
curl http://localhost:8787/assets
```

### Eligibility

```bash
curl -X POST http://localhost:8787/eligibility \
  -H 'content-type: application/json' \
  -d '{
    "assetId":"1:mtbill-demo",
    "amountAtomic":"50000000",
    "context":{
      "wallet":"0x000000000000000000000000000000000000beef",
      "claims":{"kyc":true,"jurisdiction":"GB"}
    }
  }'
```

### Direct quotes

```bash
curl -X POST http://localhost:8787/quote \
  -H 'content-type: application/json' \
  -d '{
    "sellAssetId":"1:eurc-demo",
    "buyAssetId":"1:mtbill-demo",
    "sellAmountAtomic":"100000000",
    "context":{
      "wallet":"0x000000000000000000000000000000000000beef",
      "claims":{"kyc":true,"jurisdiction":"GB"}
    }
  }'
```

### Route

```bash
curl -X POST http://localhost:8787/route \
  -H 'content-type: application/json' \
  -d '{
    "sellAssetId":"1:eurc-demo",
    "buyAssetId":"1:mtbill-demo",
    "sellAmountAtomic":"100000000",
    "maxHops":3,
    "context":{
      "wallet":"0x000000000000000000000000000000000000beef",
      "claims":{"kyc":true,"jurisdiction":"GB"}
    }
  }'
```

The route engine can discover both a direct RFQ route and a multi-hop path:

```text
EURC -> mTBILL
EURC -> USDC -> mTBILL
```

## Architecture

```text
RWA Asset Registry
       |
Constraint Engine
       |
Adapter Registry
  |       |       |
Issuer   RFQ     AMM
   \      |      /
      Quote Engine
           |
      Route Engine
           |
        HTTP API
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/MILESTONES-1-5.md](docs/MILESTONES-1-5.md).

## Next build

Milestone 6: deterministic fork simulation and settlement-safety engine.

Milestone 7: CoW/BYOS execution integration.

Milestone 8: first real RWA integration.

Milestone 9: public adapter SDK and protocol onboarding.

Milestone 10: production network, monitoring, benchmarks, and grant evidence.
