# 33Jane Pre-Submission Checklist

Last audited: 2026-10-05

## Product

- [x] Public homepage loads at https://33jane.vercel.app
- [x] Launch Console navigates to a separate /console page
- [x] Premium console UI renders
- [x] Trade view renders
- [x] RWA Network view renders
- [x] Integrations view renders
- [x] Evidence view renders
- [x] Developer API view renders
- [x] Architecture view renders
- [x] Menu drawer opens and closes
- [x] New 33Jane wordmark is deployed

## Production infrastructure

- [x] PostgreSQL persistence connected
- [x] Ethereum mainnet RPC connected
- [x] CoW live integration enabled
- [x] OpenEden on-chain KYC manager reachable
- [x] OpenEden vault reachable
- [x] OpenEden mint currently available
- [x] OpenEden redeem currently available
- [x] OpenEden instant redeem configuration detected
- [x] OpenAPI document publicly reachable
- [x] Readiness endpoint reports the remaining signed CoW order-submission gate

## Safety / correctness

- [x] Production eligibility uses issuer-controlled on-chain state
- [x] Browser self-attestation is not trusted for production OpenEden eligibility
- [x] Ineligible production wallets are blocked before settlement
- [x] DEMO/MOCK assets are explicitly labelled and separated from production assets
- [x] Demo adapters are explicitly prefixed demo-
- [x] Admin asset writes require a Bearer token and fail closed if ADMIN_API_KEY is absent
- [x] API rate limiting is implemented
- [x] Private keys and provider secrets are not persisted by the application
- [x] Final signing/broadcast remains gated rather than simulated as production execution

## Grant demo

- [x] Demo result explicitly reports mode: DEMO / MOCK ONLY
- [x] productionClaim is false
- [x] Demo wallet is eligible
- [x] Best executable route is selected
- [x] Alternative executable routes are returned
- [x] No rejected demo route remained in the audited successful run

Audited successful route:

- adapter: demo-jane-rfq
- source: RFQ
- settlement: rfq
- sell amount: 1000000000
- buy amount: 1001198400

## Engineering

- [x] GitHub CI passes
- [x] Lint passes
- [x] Typecheck passes
- [x] Tests pass
- [x] Production build passes
- [x] No TODO/FIXME markers found in the audited repository search
- [x] No localhost/127.0.0.1 references found in the audited repository search
- [x] MIT license included

## Grant application

- [x] Existing MVP requested at 0 xDAI
- [x] Future work split into milestone-based funding
- [x] Total request: 20,000 xDAI
- [x] Ethereum mainnet payment address included
- [x] Main point of contact filled
- [x] Homepage, console, health and OpenAPI links included
- [x] Production vs DEMO/MOCK distinction documented

## Remaining before posting

- [ ] Make the GitHub repository public so reviewers can open the source link.
- [ ] Post the prepared grant application to the CoW forum.
- [ ] Add the final CoW forum username to the contact line if different from "Mushee".
- [ ] After forum discussion, follow the committee's requested governance / Snapshot step.

## Explicit product boundary

The only major execution capability intentionally not represented as complete is signed CoW order submission / browser broadcast. The production readiness endpoint reports this as COW_ORDER_SUBMISSION_GATED. This is proposed future work, not hidden technical debt.
