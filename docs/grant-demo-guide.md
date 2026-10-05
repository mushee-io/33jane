# 33Jane Reviewer Demo Guide

## 1. Production proof: real issuer enforcement

Open:

https://33jane.vercel.app

Connect any Ethereum wallet and run **Check 33Jane constraints**.

If the wallet is not approved by OpenEden, 33Jane should return a production rejection such as:

- `KYC_REQUIRED`
- `ACCREDITATION_REQUIRED`
- `TRANSFER_RESTRICTED`

This is expected and is part of the proof: the application does not pretend permissioned liquidity is executable when issuer restrictions fail.

Provider health:

- https://33jane.vercel.app/api/eligibility/provider
- https://33jane.vercel.app/api/issuer/provider

## 2. Architecture proof: explicit MOCK successful route

Click **Run Grant Demo**.

The demo uses:

- `jUSDC`
- `Jane Treasury USD (JTUSD)`
- synthetic eligible wallet `0x000000000000000000000000000000000000bEEF`
- demo KYC / transfer claims
- demo RFQ
- demo issuer mint
- demo permissioned pool

The output is explicitly labelled `DEMO / MOCK ONLY`.

The purpose is to let a reviewer inspect:

1. eligibility pass;
2. multiple liquidity sources;
3. normalized quotes;
4. executable-vs-non-executable gating;
5. best executable route selection;
6. alternatives and rejection evidence.

No synthetic result is represented as OpenEden or production institutional liquidity.

## 3. Production infrastructure health

Open:

https://33jane.vercel.app/api/health

Expected production capabilities include:

- PostgreSQL persistence;
- Ethereum RPC;
- CoW connectivity;
- OpenEden on-chain eligibility;
- OpenEden issuer vault;
- live mint/redeem availability.

## 4. Developer API

Open:

https://33jane.vercel.app/api/openapi

Core endpoints:

- `POST /api/eligibility`
- `POST /api/route`
- `POST /api/cow/quote`
- `POST /api/cow/route`
- `POST /api/cow/prepare`
- `POST /api/execute/prepare`

## 5. The point of 33Jane

33Jane is not an RWA exchange.

It is the translation, eligibility and execution layer that lets CoW-compatible order flow understand permissioned liquidity without every integration rebuilding issuer-specific logic.
