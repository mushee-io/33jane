# Grant Application - 33Jane: Permissioned RWA Execution Infrastructure for CoW Protocol

## Grant Title

**33Jane — Making Permissioned RWA Liquidity Executable Through CoW Protocol**

## Author(s)

**Mateo Castejon / Mushee / 33Jane**  
GitHub: https://github.com/mushee-io/33jane  
Live app: https://33jane.vercel.app  
Execution console: https://33jane.vercel.app/console

Main point of contact: **Mateo Castejon**

Mateo has previously worked with **BitMart** and **Kraken** and is currently working with **Mushee**.

## What we are building

33Jane is infrastructure that helps CoW Protocol work with **permissioned real-world assets (RWAs)**.

With a normal token, a router mainly needs to answer:

> Where is the best price?

With an RWA, that is not enough.

A route may look attractive on price, but the trade can still fail because:

- the wallet has not completed KYC;
- the issuer does not allow that investor type;
- the wallet is in a restricted jurisdiction;
- the asset has transfer restrictions;
- the trade is below the issuer's minimum size;
- the issuer has paused deposits or withdrawals;
- the route cannot actually settle.

33Jane checks these restrictions before execution and returns the **best route that can actually execute**, not simply the route with the best quoted price.

In simple terms:

```text
RWA issuer / RFQ / permissioned liquidity
                |
                v
              33Jane
                |
     eligibility + asset rules
     quotes + route checking
     settlement simulation
                |
                v
         CoW-compatible route
```

The goal is to make it easier for CoW applications and solvers to access permissioned RWA liquidity without building a separate custom integration for every issuer.

## Why this matters to CoW

Permissioned RWAs are different from normal ERC-20 liquidity.

For example, CoW may discover liquidity for OpenEden TBILL, but that does not automatically mean a specific wallet is allowed to buy or receive TBILL.

Without an eligibility layer, a solver can find a good price and still send the user toward a trade that cannot settle.

33Jane solves that problem by checking:

- wallet eligibility;
- issuer KYC state;
- ban status;
- jurisdiction rules;
- accreditation / investor restrictions;
- transfer restrictions;
- minimum and maximum trade sizes;
- issuer pause state;
- available liquidity;
- settlement requirements.

This means CoW-compatible order flow can make a decision based on **executable liquidity**, not only visible liquidity.

The longer-term model is:

```text
OpenEden
Issuer B
Institutional RFQ desk
Permissioned pool
Private credit venue
        |
        v
      33Jane
        |
 normalized permissioned-liquidity layer
        |
        v
CoW applications / solvers
```

Instead of every solver building five different integrations, 33Jane aims to provide one common interface.

## What already works today

We have already built and deployed the first working version ourselves.

### 1. Real OpenEden eligibility checks

33Jane connects directly to OpenEden's Ethereum KYC Manager.

For a connected wallet, it checks issuer-controlled on-chain state such as:

- `isKyc()`
- `isBanned()`

If the wallet is not eligible, 33Jane blocks the route before settlement.

This is not a fake browser checkbox or self-attestation.

### 2. Real OpenEden issuer infrastructure

33Jane connects to OpenEden's live Ethereum vault and reads live issuer data including:

- underlying USDC;
- controller contract;
- fee manager;
- KYC manager;
- TBILL/USDC rate;
- deposit and withdrawal pause state;
- minimum and maximum deposit rules;
- redemption configuration.

When a wallet is eligible, 33Jane can prepare the real USDC approval and OpenEden `deposit()` calldata required for minting TBILL.

### 3. CoW integration

33Jane already connects to the live CoW Orderbook and exposes CoW-oriented endpoints for:

- quoting;
- routing;
- settlement preparation.

The system also returns clear rejection reasons when a route cannot be executed.

### 4. Best executable route selection

33Jane can compare different liquidity sources such as:

- issuer mint/redeem;
- RFQ liquidity;
- permissioned pools;
- CoW liquidity.

A better-priced route is rejected if it cannot execute.

A slightly worse-priced route can win if it is the one that can actually settle.

That is the core idea behind the project.

### 5. Production persistence and evidence

33Jane uses PostgreSQL in production and records:

- assets;
- asset rules;
- eligibility checks;
- quotes;
- routes;
- orders;
- executions;
- audit events.

This gives us a clear evidence trail showing why a route was accepted or rejected.

### 6. Reviewer-safe demo

Most reviewers will not have an OpenEden-approved wallet.

So the app has two clearly separate modes:

- **Production path** — uses real OpenEden contracts and can reject an ineligible wallet.
- **DEMO / MOCK path** — uses clearly labelled synthetic assets and liquidity so reviewers can see the complete routing flow.

The demo is never presented as real production liquidity.

## Current production status

The live deployment currently has:

- PostgreSQL persistence connected;
- Ethereum mainnet RPC connected;
- CoW live integration connected;
- OpenEden on-chain KYC checks connected;
- OpenEden issuer vault connected;
- live mint availability;
- live redeem availability;
- settlement preparation;
- public OpenAPI documentation;
- runtime evidence and audit tracking.

The remaining production boundary is the final **signed CoW order submission / browser broadcast step**.

We deliberately show this as gated in the app instead of pretending it is complete.

## Grant Type

**Milestone-based grant**

The current MVP was built before this application and is contributed by us at no cost to CoW DAO.

We are **not asking CoW DAO to reimburse work already completed**.

## Funding Request

**20,000 xDAI total**

Breakdown:

- M1: **8,000 xDAI**
- M2: **6,000 xDAI**
- M3: **6,000 xDAI**

Existing MVP: **0 xDAI requested**

## Milestones

### M0 — Existing self-funded MVP — 0 xDAI

Already complete:

- production database;
- OpenEden asset model;
- OpenEden on-chain eligibility checks;
- live OpenEden vault reads;
- CoW Orderbook connectivity;
- rule engine;
- normalized liquidity adapters;
- best executable route engine;
- settlement preparation;
- audit/evidence store;
- reviewer console;
- clearly separated demo environment.

No grant funding is requested for this work.

### M1 — Production CoW execution + public RWA adapter SDK — 8,000 xDAI

**Target: within 3 weeks of approval**

We will:

- finish the signed CoW order / settlement handoff;
- publish a stable TypeScript SDK;
- formalize the adapter interface for issuer, RFQ and permissioned-pool integrations;
- document eligibility, quote expiry, settlement and rejection rules;
- add conformance and integration tests;
- publish a quickstart for developers;
- complete an eligible end-to-end production settlement when issuer eligibility is available.

**Acceptance criteria**

- public TypeScript SDK;
- documented adapter interface;
- reproducible CI tests;
- CoW-compatible quote / route / prepare flow;
- one successful eligible production settlement, or if issuer onboarding is externally delayed, a reproducible mainnet-fork/test harness using the real production contracts and calldata.

### M2 — Second production RWA / permissioned-liquidity integration — 6,000 xDAI

**Target: within 5 weeks of approval**

We will integrate a second real permissioned liquidity source.

This can be another RWA issuer, institutional RFQ provider or permissioned venue.

We will:

- integrate its eligibility and execution rules;
- normalize it into the same 33Jane interface;
- compare routes across multiple real sources;
- demonstrate that a better-priced non-executable route is rejected;
- publish integration documentation.

**Acceptance criteria**

- at least two non-demo production liquidity sources;
- reusable issuer-specific rule modules;
- route comparison across production sources;
- public documentation and reproducible evidence.

### M3 — Mainnet pilot, security hardening and public metrics — 6,000 xDAI

**Target: within 8 weeks of approval**

We will:

- review production execution paths;
- add replay, expiry and idempotency protections;
- strengthen rate limits and admin controls;
- improve route and settlement monitoring;
- publish a 30-day evidence dashboard;
- publish final technical documentation;
- provide a maintainership plan;
- publish a final grant report and demo.

**Metrics we will report**

- production eligibility checks;
- production quote attempts;
- executable vs rejected routes;
- rejection reasons;
- successful settlements;
- CoW-routed volume where applicable;
- number of production liquidity integrations.

## Length

**8 weeks after approval**

Work begins after successful approval unless otherwise agreed with the Grants Committee.

## Payment Address

**0xc7f8f2428527a9d5e7e10d769f6ee9148642950f**

Ethereum mainnet payment address.

## Open-source commitment

Grant-funded 33Jane core infrastructure will be released under the **MIT License**.

We will continue to keep all DEMO/MOCK liquidity clearly separated from production integrations.

We will not present browser-supplied self-attestation as real issuer KYC.

## Live Links

- Homepage: https://33jane.vercel.app
- Execution console: https://33jane.vercel.app/console
- Health: https://33jane.vercel.app/api/health
- Readiness: https://33jane.vercel.app/api/readiness
- Eligibility provider health: https://33jane.vercel.app/api/eligibility/provider
- Issuer provider health: https://33jane.vercel.app/api/issuer/provider
- OpenAPI: https://33jane.vercel.app/api/openapi
- GitHub: https://github.com/mushee-io/33jane

## A simple example of why 33Jane is useful

Suppose a wallet wants to trade:

```text
1,000 USDC -> OpenEden TBILL
```

CoW may be able to see a market or quote.

33Jane then asks:

```text
Is this wallet KYC approved?        Yes / No
Is this wallet banned?              Yes / No
Is the investor allowed?            Yes / No
Is the transfer permitted?          Yes / No
Is the issuer accepting deposits?   Yes / No
Is the trade large enough?          Yes / No
Can settlement actually complete?   Yes / No
```

If one of the critical checks fails, 33Jane blocks the route.

If the checks pass, 33Jane can compare available liquidity and return the best route that can actually settle.

That is the problem we are solving.

## Why we believe this is a good fit for CoW Grants

33Jane is not another frontend for swapping tokens.

It is infrastructure designed to help CoW-compatible systems work with a class of assets that have extra execution constraints.

The value to CoW is:

- more accessible RWA order flow;
- fewer failed permissioned-asset routes;
- reusable integrations instead of issuer-by-issuer custom work;
- a standard way to expose eligibility-aware liquidity;
- measurable routing and settlement activity;
- an open-source developer layer that can be reused by other builders.

Our goal is simple:

> Make permissioned RWA liquidity usable by CoW without forcing every solver or application to understand every issuer's custom system.

## Terms and Conditions

By submitting this grant application, I acknowledge and agree to be bound by the [CoW DAO Participation Agreement](https://gateway.pinata.cloud/ipfs/Qmf9MYhcG2pFrDoVy13p6FWeVF4nG9HbJvRfYYbhazTCFe) and the [CoW DAO Grant Agreement Terms](https://bafkreifcftgaleyxkekkic36beyveiomqmlwyduyfh3s25zj3uyngr6ht4.ipfs.dweb.link/).

**Note to Committee:** Please notify the Grantee of their reviewer and steward in the thread and latest upon successful approval of the Grant on Snapshot.
