export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "33Jane API",
    version: "0.4.0",
    description: "Permissioned RWA Execution Infrastructure for CoW Protocol."
  },
  servers: [{ url: "https://33jane.vercel.app" }],
  paths: {
    "/api/health": { get: { summary: "Service, database and adapter health" } },
    "/api/assets": {
      get: { summary: "List registered assets" },
      post: { summary: "Create/update an asset (admin Bearer token required)" }
    },
    "/api/assets/{assetId}": {
      get: { summary: "Get an asset" },
      patch: { summary: "Patch an asset (admin Bearer token required)" }
    },
    "/api/assets/{assetId}/rules": { get: { summary: "Get execution rules for an asset" } },
    "/api/eligibility": { post: { summary: "Evaluate wallet and asset execution constraints" } },
    "/api/route": { post: { summary: "Return the best executable route and alternatives" } },
    "/api/cow/quote": { post: { summary: "Translate a CoW-like sell order into a solver-compatible 33Jane quote" } },
    "/api/cow/route": { post: { summary: "Return deterministic CoW-compatible routing information" } },
    "/api/cow/prepare": { post: { summary: "Prepare settlement requirements without blindly executing" } },
    "/api/cow/routes/{routeId}": { get: { summary: "Retrieve a previously computed CoW-compatible route" } },
    "/api/execute/prepare": { post: { summary: "Prepare approvals, signatures and transactions for a route" } },
    "/api/orders": {
      get: { summary: "List order lifecycle records" },
      post: { summary: "Create an order and run eligibility/routing" }
    },
    "/api/orders/{id}": { get: { summary: "Get an order lifecycle record" } },
    "/api/orders/{id}/cancel": { post: { summary: "Cancel an unsettled order" } },
    "/api/audit": { get: { summary: "List audit events; optional orderId query filter" } },
    "/api/integrations": { get: { summary: "List registered liquidity adapters and supported pairs" } },
    "/api/openapi": { get: { summary: "OpenAPI document" } }
  }
} as const;
