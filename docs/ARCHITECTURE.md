# 33Jane Architecture

33Jane is a permissioned-liquidity gateway designed to expose non-standard and RWA liquidity through one normalized interface.

## Milestone 1 — RWA Registry

The registry is the canonical source of asset metadata, settlement modes, quote currencies, and provider-defined constraints. The current implementation is in-memory for deterministic development. A persistent/indexed registry can be added without changing downstream interfaces.

## Milestone 2 — Constraint Engine

Every candidate RWA output is checked before it can become a route. Rules are data-driven and providers are pluggable. 33Jane does not decide legal eligibility; it normalizes claims and restrictions supplied by the relevant asset/attestation provider.

## Milestone 3 — Adapter Standard

All liquidity sources implement `LiquidityAdapter`:
- pair discovery
- normalized quoting
- execution-plan generation

The repository ships three deliberately different models:
- issuer mint/redeem
- RFQ
- constant-product AMM

## Milestone 4 — Quote Engine

The quote engine fans out to compatible adapters, rejects expired/non-executable results, applies destination-asset constraints, normalizes outputs, and ranks executable quotes.

## Milestone 5 — Route Engine

The route engine explores adapter liquidity as a graph and can combine normal DeFi liquidity with permissioned liquidity. The demo proves both:
- direct EURC -> mTBILL via RFQ
- EURC -> USDC -> mTBILL via AMM + issuer mint

## Next

Milestones 6–10 should add deterministic fork simulation, transaction/call-data generation, CoW solver/BYOS integration, a real RWA integration, production SDK/API hardening, monitoring, and measured CoW order flow.
