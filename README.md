# 33jane

**The private intelligence router for the internet.**

33jane is a multi-model AI access layer that automatically chooses the best available model for each request based on **quality, price, speed, reliability and privacy**.

The product principle is simple:

> No model should know more than it needs to know.

This branch contains the first five AI-platform milestones for the Monad Metropolis build while preserving the repository's earlier RWA/CoW work underneath the same codebase during the transition.

## What is live in Milestones 1-5

### M1 — 33jane Chat
- responsive chat application
- Auto / Fast / Reason / Code / Vision / Private modes
- local browser conversation history
- local text-file attachment support
- provider health indicator
- per-answer route/cost metadata

### M2 — Multi-model intelligence router
- task classification
- configurable OpenAI, Groq and OpenRouter routes
- optional OpenAI-compatible confidential endpoint
- model capability, context-window, speed and privacy scoring
- automatic provider failover when a selected route fails

### M3 — Price Optimizer
- input/output token estimation
- configurable per-model pricing
- quality threshold before cost optimization
- effective cost adjusted by observed reliability
- estimated savings and alternative-route comparison

Pricing values are routing estimates and are environment-configurable. They are not hard-coded billing guarantees from providers.

### M4 — Outcome-based routing
- execution success/failure telemetry
- latency tracking
- retry and thumbs-up/down feedback
- Bayesian reliability prior for new models
- model quality score adapts to real outcomes

The current alpha telemetry store is process memory. Durable telemetry is a later milestone.

### M5 — Local privacy firewall
Sensitive values are detected and replaced **in the browser before the request is sent to 33jane**.

Current detectors include:
- email addresses
- phone-like identifiers
- API keys
- bearer tokens
- IBANs
- UK National Insurance-style identifiers
- 32-byte hex private-key patterns

The upstream model receives placeholders such as `<EMAIL_1>`. 33jane rehydrates those placeholders locally for the user after inference.

## Architecture

```text
User
  |
  v
Browser privacy firewall
  |  redact/minimize before upload
  v
33jane Router
  |-- task classifier
  |-- quality threshold
  |-- price optimizer
  |-- reliability/outcome score
  |-- privacy policy
  v
Selected AI provider
  |
  v
33jane response metadata
  |
  v
Browser rehydrates protected values
```

## API

### Health
```
GET /api/ai/health
```

### Models
```
GET /api/ai/models
```

### Preview a route without executing inference
```
POST /api/ai/route
```

Example:

```json
{
  "mode": "auto",
  "messages": [
    { "role": "user", "content": "Debug this TypeScript function" }
  ],
  "clientPrivacy": {
    "applied": true,
    "redactedCount": 1,
    "categories": ["EMAIL"]
  }
}
```

### Execute
```
POST /api/ai/chat
```

### Feed outcomes back into routing
```
POST /api/ai/feedback
```

### Router telemetry
```
GET /api/ai/metrics
```

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Open the static frontend through the deployment/dev static server and point it at the API process.

At least one provider credential is required for live inference. Route previews still work without credentials.

## Provider configuration

See `.env.example`.

Supported alpha routes:
- OpenAI-compatible OpenAI endpoint
- Groq OpenAI-compatible endpoint
- OpenRouter
- custom private OpenAI-compatible endpoint

Model IDs, price estimates, privacy flags and quality scores can all be changed through environment variables without changing application code.

## Tests

```bash
npm run check
```

The AI tests cover classification, cheapest-adequate routing, private-mode restrictions, outcome learning and reliability learning.

## Monad direction

Prompts and AI responses remain offchain.

The Monad phase will add programmable inference budgets, settlement and verifiable execution receipts while keeping private content offchain.

```text
Private inference offchain
        +
Programmable settlement on Monad
```

## Legacy RWA / CoW module

The original permissioned-RWA work remains in the repository while 33jane transitions to the AI platform. Its existing console and server modules have not been deleted by this branch. The new AI endpoints are isolated under `src/ai/` and `/api/ai/*`.

## License

MIT
