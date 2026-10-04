# Milestones 1–5 Delivery

## 1. Registry
- canonical asset schema
- RWA categories and settlement models
- provider-defined constraints
- validated asset registration
- demo registry

## 2. Eligibility
- min/max trade enforcement
- required-claim model
- wallet eligibility provider interface
- market-hours support
- machine-readable rejection codes

## 3. Universal adapters
- common `LiquidityAdapter` interface
- issuer mint/redeem adapter
- RFQ adapter
- constant-product AMM adapter
- normalized execution-step interface

## 4. Quotes
- adapter discovery
- normalized quotes
- quote expiry handling
- fee normalization
- eligibility filtering
- deterministic output ranking

## 5. Routing
- liquidity graph exploration
- multi-hop routes
- loop prevention
- configurable hop/state limits
- direct vs multi-hop path comparison

### Scope note
The bundled assets and liquidity are demo fixtures. They are intentionally not represented as production RWA integrations. Real issuer contracts, attestations, CoW settlement, fork simulation, and security hardening belong to the next build phase.
