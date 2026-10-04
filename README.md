# 33Jane

## Permissioned RWA Execution Infrastructure for CoW Protocol

CoW Protocol can optimize execution across liquidity sources, but permissioned assets introduce constraints that ordinary token routing cannot solve alone.

**33Jane provides the eligibility, restriction and specialized liquidity layer required to make these assets executable.**

33Jane does not try to be an RWA exchange or another generic DEX. It determines whether an economically attractive route is actually permitted and executable, returns the **best executable route**, prepares settlement requirements, and records the decision trail.

## Architecture

```text
User / Application
        |
        v
     CoW Order
        |
        v
      33Jane
        |
   +----+------------------+
   |                       |
Asset Registry       Wallet Eligibility
   |                       |
Asset Rules          Access / Compliance
   +-----------+-----------+
               |
      Execution Constraints
               |
     +---------+-----------+
     |         |           |
    RFQ   Mint/Redeem  Permissioned Pool
     +---------+-----------+
               |
       Quote Normalization
               |
        Route Selection
               |
     Best Executable Route
               |
      CoW Integration Layer
               |
     Settlement Preparation
               |
        Execution / Receipt
```

## Asset registry

The production asset model supports chain/address metadata, issuer data, permissioning, KYC/accreditation requirements, jurisdiction rules, min/max sizes, market hours, transfer restrictions, liquidity adapters, settlement modes and status.

Administrative writes are protected with `ADMIN_API_KEY`.

- `GET /api/assets`
- `GET /api/assets/:assetId`
- `GET /api/assets/:assetId/rules`
- `POST /api/assets` (admin)
- `PATCH /api/assets/:assetId` (admin)

## Eligibility engine

`POST /api/eligibility`

Rules are composable and machine-readable:

- wallet whitelist
- KYC requirement
- jurisdiction allowlist/blocklist
- min/max trade size
- market hours
- asset active/inactive
- accreditation
- transfer restrictions
- liquidity venue restrictions

Production assets do not trust browser self-attestation. If a production asset requires KYC/accreditation/transfer permission, configure `ELIGIBILITY_PROVIDER_URL`.

## Liquidity adapters

The existing adapter architecture is preserved and used by the production router:

- RFQ
- issuer mint/redeem
- permissioned AMM
- provider HTTP bridge
- CoW Orderbook

Demo adapters are clearly prefixed `demo-` and are never presented as production liquidity.

## Routing

`POST /api/route`

Routing performs:

1. asset resolution
2. restriction/eligibility checks
3. compatible adapter discovery
4. concurrent quote requests
5. quote normalization
6. expiry/output/executability validation
7. rejection of non-executable quotes
8. ranking by executable output, fees and settlement complexity
9. persistence of quote/route evidence
10. best executable route + alternatives

A better-priced quote that cannot execute is rejected in favor of an executable alternative.

## CoW integration

CoW-specific translation is isolated under `src/integrations/cow/`.

- `POST /api/cow/quote`
- `POST /api/cow/route`
- `POST /api/cow/prepare`
- `GET /api/cow/routes/:routeId`

33Jane accepts CoW-like sell-order requests, evaluates permissioned-asset constraints, discovers specialized liquidity and returns deterministic solver-consumable route information.

This is structured for future specialist external-liquidity/BYOS integration without claiming unsupported CoW behavior.

## Execution preparation

`POST /api/execute/prepare`

33Jane does not blindly execute transactions. Preparation returns:

- transactions that can actually be built
- approvals
- required signatures
- expiry
- settlement metadata
- simulation certificate/result
- explicit execution mode: `SIMULATED`, `TESTNET`, `MANUAL_RFQ`, `MAINNET_READY`, or `MAINNET`

## Order lifecycle and audit

Orders persist these states:

`CREATED -> CHECKING_ELIGIBILITY -> INELIGIBLE | ROUTE_FOUND -> AWAITING_APPROVAL | READY -> SUBMITTED -> SETTLED`

Failures, expiry and cancellation are also represented.

- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders`
- `POST /api/orders/:id/cancel`
- `GET /api/audit?orderId=...`

Audit records include eligibility decisions, rules, quotes, rejected routes, selected route and execution preparation. Private keys and provider secrets are never persisted.

## Persistence

Production persistence uses PostgreSQL through `DATABASE_URL`.

Migration:

```bash
npm run migrate
```

The schema persists:

- assets
- asset rules
- eligibility checks
- liquidity providers
- quotes
- routes
- orders
- executions
- audit events

Without `DATABASE_URL`, 33Jane deliberately reports `memory-fallback` in health/readiness and should not be treated as durable production infrastructure.

## Demo

The repository includes explicitly labelled **DEMO / MOCK** assets:

- `jUSDC`
- `Jane Treasury USD (JTUSD)`

Jane Treasury USD requires a demo whitelist, KYC flag, permitted jurisdiction and a minimum $1,000 atomic-equivalent trade. Demo RFQ, issuer mint and permissioned-pool adapters demonstrate the architecture without presenting simulated liquidity as institutional liquidity.

The contrast is tested:

- eligible demo wallet -> route selected
- ineligible wallet -> rejected before execution
- best-price non-executable quote -> rejected
- worse-price executable quote -> selected

## Developer API

OpenAPI:

- `GET /api/openapi`

Core endpoints:

- `POST /api/eligibility`
- `POST /api/route`
- `POST /api/cow/quote`
- `POST /api/cow/prepare`

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment variables

- `DATABASE_URL` — PostgreSQL persistence
- `ADMIN_API_KEY` — protected asset-registry writes
- `ETH_RPC_URL` — mainnet RPC / eth_call simulation
- `ENABLE_COW_LIVE` — CoW Orderbook adapter
- `ELIGIBILITY_PROVIDER_URL` — trusted production eligibility provider
- `ELIGIBILITY_PROVIDER_API_KEY` — optional provider credential
- `OPENEDEN_QUOTE_URL` — approved issuer/provider bridge
- `OPENEDEN_API_KEY` — optional issuer credential
- `RATE_LIMIT_PER_MINUTE` — API rate limit

## Testing

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs all four gates on every push to `main`.

## Deployment

The Vercel deployment serves the existing 33Jane console and the same consolidated API handler used by local development.

Real mainnet execution still depends on real issuer eligibility/provider credentials and the final signed CoW order-submission flow. The code does not claim those external capabilities when they are not configured.
