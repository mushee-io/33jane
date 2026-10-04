# Milestones 6–10 Delivery

## 6 — Settlement Safety

- route continuity verification
- positive-output checks
- quote freshness checks
- adapter execution-plan generation
- optional `eth_call` simulation for calldata-bearing calls
- RPC head capture
- deterministic SHA-256 simulation certificate
- simulation metrics

## 7 — CoW Integration

- CoW Orderbook REST client
- normalized CoW quote adapter
- configurable mainnet live quoting
- solver-style endpoint that selects the best safe route
- only routes with passing safety certificates can become candidates

## 8 — First Real RWA Integration

The production registry now includes OpenEden TBILL on Ethereum mainnet and canonical Ethereum USDC.

The OpenEden TBILL contract is registered at:

`0xdd50C053C096CB04A3e3362E2b622529EC5f2e8a`

The integration models provider eligibility and supports two production connection modes:

1. CoW Orderbook quoting for the real USDC/TBILL pair when `ENABLE_COW_LIVE=true`.
2. A normalized issuer/provider bridge when `OPENEDEN_QUOTE_URL` is configured.

No synthetic provider response is presented as a live issuer quote.

## 9 — Developer Infrastructure

- `JaneClient` TypeScript client
- stable HTTP endpoints for assets, eligibility, quotes, routes, simulation and solving
- normalized provider bridge contract
- configuration-driven integrations
- machine-readable integration metadata

## 10 — Production Evidence & Monitoring

- per-IP rate limiting
- evidence counters
- solve/simulation latency
- successful/failed solve counters
- routed atomic-volume counters
- adapter usage
- contract-code health scanning through optional Ethereum RPC
- benchmark script
- CI coverage for safety, production registry and sub-solver flow

## Scope

The repository is now a production-oriented reference implementation, not a representation that issuer commercial access, user onboarding, audits, or CoW Grants approval have already been secured. Those require external counterparties and credentials.
