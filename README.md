# 33Jane

**Permissioned-liquidity infrastructure for CoW Protocol.**

33Jane makes RWA and restricted liquidity machine-readable, routable and simulation-gated. The repository implements the complete Milestones **1–10 reference stack**: registry → eligibility → adapters → quotes → routing → safety simulation → CoW integration → real-asset configuration → SDK/API → production evidence.

## What ships

### Milestones 1–5
- canonical RWA asset registry
- provider-driven eligibility and constraint engine
- universal liquidity adapter interface
- issuer mint/redeem, RFQ and AMM adapters
- normalized quote engine
- multi-hop route discovery

### Milestone 6 — Settlement safety
- route-continuity checks
- quote-expiry and positive-output checks
- adapter execution-plan generation
- optional Ethereum `eth_call` checks
- RPC-head capture
- SHA-256 simulation certificates

### Milestone 7 — CoW integration
- CoW Orderbook REST client
- CoW quote adapter
- sub-solver style route selection
- unsafe routes cannot become solver candidates

### Milestone 8 — Real RWA integration
The production registry includes:
- Ethereum USDC
- **OpenEden TBILL** at `0xdd50C053C096CB04A3e3362E2b622529EC5f2e8a`

Live modes are explicit and disabled by default:
- `ENABLE_COW_LIVE=true` for CoW Orderbook quoting
- `OPENEDEN_QUOTE_URL` for an issuer/provider bridge
- `ETH_RPC_URL` for contract health and remote call simulation

Demo fixtures remain separate from production asset metadata.

### Milestone 9 — Developer layer
- stable HTTP API
- TypeScript `JaneClient`
- normalized provider-bridge contract
- integration discovery endpoint

### Milestone 10 — Production evidence
- rate limiting
- integration health scans
- quote/solve/simulation metrics
- latency tracking
- routed-volume counters
- adapter usage evidence
- benchmark script
- CI tests

## Quick start

```bash
npm install
npm run check
npm run demo
npm run dev
```

API defaults to `http://localhost:8787`.

## API

```text
GET  /health
GET  /assets
GET  /assets/:id
GET  /integrations
GET  /evidence
GET  /monitor

POST /eligibility
POST /quote
POST /route
POST /simulate
POST /cow/solve
```

Example solver request:

```bash
curl -X POST http://localhost:8787/cow/solve \
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

## Architecture

```text
Assets / restrictions
        |
Eligibility Engine
        |
Liquidity Adapters
        |
    Quote Engine
        |
    Route Engine
        |
Settlement Safety
        |
  CoW Sub-solver
        |
 API / SDK / Metrics
```

## Important production boundary

33Jane does **not** claim that an issuer partnership, professional-investor onboarding, audit, CoW Grants approval or unrestricted TBILL execution already exists. The repository provides the integration architecture and production asset configuration; credentialed issuer access must be supplied through the provider bridge or another approved integration.

Read:
- [Architecture](docs/ARCHITECTURE.md)
- [Milestones 1–5](docs/MILESTONES-1-5.md)
- [Milestones 6–10](docs/MILESTONES-6-10.md)
- [Provider bridge](docs/PROVIDER-BRIDGE.md)
