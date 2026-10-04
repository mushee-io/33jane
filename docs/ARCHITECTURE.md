# 33Jane Architecture

33Jane is a permissioned-liquidity gateway for CoW Protocol. It normalizes RWA assets, provider restrictions and non-standard liquidity into routes that can be checked before they are exposed as solver candidates.

## Pipeline

```text
Asset Registry
     |
Constraint / Eligibility Engine
     |
Adapter Registry
 |        |          |              |
AMM     Issuer      RFQ       Provider / CoW
 \        |          |              /
        Quote Engine
             |
        Route Engine
             |
   Settlement Safety Engine
             |
      CoW Sub-solver
             |
      API / SDK / Evidence
```

## Safety model

Every route must preserve asset/amount continuity, have positive outputs, use unexpired quotes and produce an adapter execution plan. If an Ethereum RPC is configured, calldata-bearing steps can also be checked with `eth_call`. Passing simulations receive a SHA-256 certificate.

## Real-asset integration

The production registry contains Ethereum USDC and OpenEden TBILL. Live execution is configuration-gated:

- `ENABLE_COW_LIVE=true` activates CoW Orderbook quoting for the real pair.
- `OPENEDEN_QUOTE_URL` activates the normalized issuer/provider bridge.
- `ETH_RPC_URL` activates contract health checks and remote call simulation.

This distinction is intentional: the repo never labels synthetic quotes as issuer liquidity.

## CoW integration

33Jane includes an Orderbook API client and adapter plus a sub-solver style endpoint. The sub-solver only returns candidates that pass the settlement-safety engine.

## Observability

The evidence store records quote attempts, simulations, solve latency, route volume and adapters used. The integration monitor checks production contract bytecode when an RPC is configured.

See [MILESTONES-1-5.md](MILESTONES-1-5.md), [MILESTONES-6-10.md](MILESTONES-6-10.md), and [PROVIDER-BRIDGE.md](PROVIDER-BRIDGE.md).
