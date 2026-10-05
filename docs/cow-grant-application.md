# Grant Application - 33Jane: Permissioned RWA Execution Infrastructure for CoW Protocol

## Author(s)

**Mushee / 33Jane**  
GitHub: https://github.com/mushee-io/33jane  
Live deployment: https://33jane.vercel.app

Main point of contact: **[INSERT NAME / FORUM USERNAME]**

## Experiences and qualifications

Mushee builds blockchain infrastructure, trading, settlement and developer tooling across EVM and non-EVM ecosystems.

For this proposal, the relevant work is already demonstrated by the self-funded 33Jane prototype:

- live Ethereum mainnet RPC integration;
- live CoW Orderbook integration;
- a production PostgreSQL evidence and order store;
- OpenEden TBILL asset and issuer integration;
- direct OpenEden on-chain KYC / ban checks;
- live OpenEden vault rate, fee, limit and pause-state reads;
- normalized RFQ, issuer, permissioned-pool and CoW liquidity adapters;
- an execution-constraint engine;
- best-executable-route selection;
- settlement preparation and simulation;
- machine-readable audit and rejection evidence.

The live prototype deliberately rejects wallets that do not satisfy issuer restrictions instead of treating a better price as executable.

## Grant Description

**33Jane is permissioned RWA execution infrastructure for CoW Protocol.**

CoW Protocol is extremely good at discovering and competing ordinary on-chain liquidity. Permissioned real-world assets introduce a different execution problem: an economically attractive route can still be impossible to settle because the wallet is not KYC-approved, the investor class is not permitted, the market is closed, a transfer is restricted, a minimum size is not met, or issuer-specific mint/redeem rules are not satisfied.

33Jane adds the missing permissioned-liquidity layer between RWA issuers and CoW-compatible routing.

The flow is:

```text
User / application
      |
      v
CoW-compatible order
      |
      v
33Jane
      |
      +-- asset registry
      +-- issuer eligibility
      +-- jurisdiction / accreditation / transfer rules
      +-- RFQ / issuer / permissioned-pool / CoW liquidity adapters
      +-- quote normalization
      +-- best executable route selection
      +-- settlement simulation
      |
      v
Solver-consumable executable route
```

The key distinction is **best executable route**, not simply best quoted price.

A quote can be rejected even when it has the best nominal output if the wallet cannot legally or technically settle it.

### Current self-funded MVP

The current deployed version already demonstrates:

1. **Real production policy enforcement**
   - OpenEden's Ethereum KYC Manager is queried directly.
   - The connected wallet is checked against issuer-controlled `isKyc()` and `isBanned()` state.
   - Ineligible wallets are blocked before routing or settlement.

2. **Real issuer infrastructure**
   - OpenEden's live Ethereum vault is connected.
   - 33Jane reads the underlying USDC token, controller, fee manager, KYC manager, TBILL/USDC rate, deposit/withdraw pause state and redemption configuration.
   - The system can build real USDC approval + OpenEden `deposit()` calldata when a wallet passes issuer rules.

3. **CoW integration**
   - Live CoW Orderbook quote access.
   - CoW-like route/quote/prepare endpoints.
   - Explicit rejection reasons and settlement requirements.

4. **Persistence and evidence**
   - PostgreSQL persistence for assets, eligibility checks, quotes, routes, orders, executions and audit events.

5. **Reviewer-safe demo**
   - Production mode uses real issuer restrictions and can reject an unapproved wallet.
   - A separately labelled DEMO/MOCK flow proves end-to-end route selection without claiming synthetic liquidity is production liquidity.

### Why this matters to CoW

RWA issuers expose heterogeneous restrictions and liquidity models. Without a normalization layer, each solver/integrator must understand issuer-specific eligibility, quote and settlement behavior independently.

33Jane aims to let CoW-compatible infrastructure integrate one normalized permissioned-liquidity interface instead of custom-building every issuer integration.

This aligns with CIP-82's priorities around:

- strategic ecosystem integrations;
- novel applications built on CoW;
- developer enablement;
- integrations capable of producing measurable protocol usage.

## Type of Grant

**Milestone-based grant.**

The work completed before grant approval is self-funded and is not included in the funding request.

## Milestones

| Milestone | Title | Due date | Funding request |
|---|---|---:|---:|
| M0 | Existing self-funded MVP | Complete before application | **0 xDAI** |
| M1 | Production CoW execution + public RWA adapter SDK | 3 weeks after approval | **8,000 xDAI** |
| M2 | Second production permissioned-liquidity integration | 5 weeks after approval | **6,000 xDAI** |
| M3 | Mainnet pilot, security hardening, metrics and hand-off | 8 weeks after approval | **6,000 xDAI** |

**Total request: 20,000 xDAI**

### M0 - Existing self-funded MVP - 0 xDAI

Already delivered before the grant:

- production database;
- OpenEden production asset model;
- issuer-controlled on-chain eligibility checks;
- live OpenEden vault health/rate/fee/limit reads;
- CoW Orderbook connectivity;
- normalized adapter architecture;
- rule engine;
- quote normalization;
- best-executable-route selection;
- settlement preparation;
- evidence/audit store;
- public reviewer console;
- synthetic reviewer demo clearly separated from production state.

No grant reimbursement is requested for M0.

### M1 - Production CoW execution + public RWA adapter SDK - 8,000 xDAI

Deliverables:

- finalize the signed CoW order / settlement handoff from 33Jane;
- expose a stable TypeScript integration SDK for solver and application consumers;
- formalize the RWA adapter interface for issuer, RFQ and permissioned-pool integrations;
- document quote expiry, eligibility, settlement and rejection semantics;
- add deterministic integration fixtures and conformance tests;
- publish an integration quickstart;
- complete one eligible end-to-end mainnet settlement when issuer eligibility is available.

Acceptance criteria:

- public documented SDK;
- reproducible tests in CI;
- CoW-compatible quote/route/prepare interface;
- at least one successful eligible production settlement OR, if issuer onboarding is externally delayed, a reproducible mainnet fork/test harness using the exact production contracts and calldata with the external dependency explicitly documented.

### M2 - Second production permissioned-liquidity integration - 6,000 xDAI

Deliverables:

- integrate a second real permissioned RWA or institutional RFQ source;
- normalize its eligibility and execution semantics into the same 33Jane interface;
- demonstrate cross-source route comparison;
- show that non-executable better-price liquidity is rejected in favor of an executable route;
- publish integration documentation and test evidence.

Acceptance criteria:

- at least two non-demo production liquidity sources registered;
- source-specific restrictions expressed through reusable rule modules;
- deterministic route comparison and rejection evidence;
- public integration documentation.

### M3 - Mainnet pilot, security hardening, metrics and hand-off - 6,000 xDAI

Deliverables:

- production security review of execution paths;
- replay/expiry/idempotency checks;
- rate limiting and administrative controls;
- route/settlement monitoring;
- 30-day public evidence dashboard;
- final technical documentation;
- maintainership / sustainability plan;
- final demo and grant report.

Target evidence metrics:

- number of production eligibility checks;
- production quote attempts;
- executable vs rejected routes;
- rejection reason distribution;
- successful settlements;
- CoW-routed volume where applicable;
- number of integrated permissioned liquidity sources.

## Length

**8 weeks after successful approval.**

Commencement: upon successful Snapshot approval unless otherwise agreed with the committee.

## Funding Request

**20,000 xDAI total.**

Breakdown:

- M1: 8,000 xDAI
- M2: 6,000 xDAI
- M3: 6,000 xDAI

The existing prototype and all pre-approval development are contributed by Mushee at no cost to CoW DAO.

No COW token request is included in this application.

## Ethereum Mainnet Payment Address

**0xc7f8f2428527a9d5e7e10d769f6ee9148642950f**

Per CIP-82, the Grants Treasury has migrated to Ethereum mainnet.

## Open-source commitment

Grant-funded 33Jane core infrastructure will be available under the **MIT License**.

The project will keep DEMO/MOCK liquidity clearly labelled and separate from production issuer state.

No browser-supplied self-attestation will be presented as real issuer KYC.

## Current links

- Live application: https://33jane.vercel.app
- Health: https://33jane.vercel.app/api/health
- Eligibility provider health: https://33jane.vercel.app/api/eligibility/provider
- Issuer provider health: https://33jane.vercel.app/api/issuer/provider
- OpenAPI: https://33jane.vercel.app/api/openapi
- GitHub: https://github.com/mushee-io/33jane

## Why the current demo is meaningful

The production path already demonstrates a failure condition that ordinary token routing does not solve:

```text
economically routable token pair
        +
live issuer vault
        +
live market
        BUT
wallet fails issuer eligibility
        =
NO EXECUTION
```

33Jane surfaces that as a machine-readable rejection before settlement.

The separate synthetic demo exists only so reviewers without an OpenEden-approved wallet can inspect the successful architecture path end-to-end.

## Other Information

33Jane is intentionally infrastructure rather than an RWA exchange.

The long-term model is:

```text
OpenEden
Issuer B
Institutional RFQ
Permissioned pool
Private credit venue
        |
        v
      33Jane
        |
 normalized permissioned-liquidity interface
        |
        v
CoW-compatible applications / solvers
```

The project's success should ultimately be measured by executable liquidity surfaced to CoW-compatible order flow and the reduction in issuer-specific integration work for solvers and applications.

## Terms and Conditions

By submitting this grant application, I acknowledge and agree to be bound by the CoW DAO Participation Agreement and the CoW DAO Grant Agreement Terms.

**Note to Committee:** Please notify the Grantee of their reviewer and steward in the thread and latest upon successful approval of the Grant on Snapshot.
