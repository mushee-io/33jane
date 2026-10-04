import { timingSafeEqual } from "node:crypto";
import type { createApp } from "../bootstrap.js";
import type { ProductionAsset } from "../production/types.js";
import {
  cowOrderSchema,
  eligibilitySchema,
  orderCreateSchema,
  prepareSchema,
  productionAssetPatchSchema,
  productionAssetSchema,
  routeSchema
} from "./schemas.js";
import { openApiSpec } from "./openapi.js";
import { FixedWindowRateLimiter } from "./rate-limit.js";

type App = ReturnType<typeof createApp>;

function json(payload: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      ...headers
    }
  });
}

async function parseBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text);
}

function normalizePath(url: URL): string {
  const routed = url.searchParams.get("path");
  if (!routed) return url.pathname;
  const clean = routed.replace(/^\/+/, "").replace(/^api\//, "");
  return `/api/${clean}`;
}

function bearer(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

function constantTimeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function requireAdmin(request: Request): Response | null {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return json({ error: "ADMIN_API_KEY_NOT_CONFIGURED" }, 503);
  const actual = bearer(request);
  if (!actual || !constantTimeEqual(actual, expected)) return json({ error: "UNAUTHORIZED" }, 401);
  return null;
}

function zodError(error: unknown): Response {
  const value = error as { issues?: unknown[]; message?: string };
  return json({
    error: "VALIDATION_ERROR",
    issues: value.issues ?? [value.message ?? "invalid request"]
  }, 400);
}

export function createApiHandler(app: App) {
  const limiter = new FixedWindowRateLimiter(Number(process.env.RATE_LIMIT_PER_MINUTE ?? 120));

  return async function handle(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });

    const url = new URL(request.url);
    const path = normalizePath(url);
    const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const rate = limiter.consume(client);
    const rateHeaders = {
      "x-ratelimit-remaining": String(rate.remaining),
      "x-ratelimit-reset": String(rate.resetAt)
    };
    if (!rate.allowed) return json({ error: "RATE_LIMITED" }, 429, rateHeaders);

    try {
      const p = app.production;
      await p.assets.ready();

      if (request.method === "GET" && path === "/api/health") {
        const database = await p.store.health();
        const adapters = await Promise.all(app.adapters.list().map(async (adapter) => ({
          id: adapter.id,
          pairs: (await adapter.listPairs()).length
        })));
        const eligibilityProvider = await p.eligibilityProvider.health();
        return json({
          status: database.status === "connected" || database.mode === "memory" ? "ok" : "degraded",
          service: "33Jane",
          version: "0.4.0",
          environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
          database: database.mode === "postgres" && database.status === "connected" ? "connected" : "memory-fallback",
          persistenceMode: database.mode,
          rpc: Boolean(process.env.ETH_RPC_URL),
          cow: process.env.ENABLE_COW_LIVE === "true",
          eligibilityProvider: eligibilityProvider.ok,
          eligibilityProviderStatus: eligibilityProvider,
          issuerProvider: Boolean(process.env.OPENEDEN_QUOTE_URL),
          adapters
        }, 200, rateHeaders);
      }

      if (request.method === "GET" && path === "/api/eligibility/provider") {
        return json(await p.eligibilityProvider.health(), 200, rateHeaders);
      }

      if (request.method === "GET" && path === "/api/openapi") {
        return json(openApiSpec, 200, rateHeaders);
      }

      if (request.method === "GET" && path === "/api/assets") {
        return json({ assets: await p.assets.list() }, 200, rateHeaders);
      }

      const assetRulesMatch = path.match(/^\/api\/assets\/([^/]+)\/rules$/);
      if (request.method === "GET" && assetRulesMatch) {
        return json(await p.assets.rules(decodeURIComponent(assetRulesMatch[1]!)), 200, rateHeaders);
      }

      const assetMatch = path.match(/^\/api\/assets\/([^/]+)$/);
      if (request.method === "GET" && assetMatch) {
        return json({ asset: await p.assets.get(decodeURIComponent(assetMatch[1]!)) }, 200, rateHeaders);
      }

      if (request.method === "POST" && path === "/api/assets") {
        const denied = requireAdmin(request);
        if (denied) return denied;
        let parsed;
        try { parsed = productionAssetSchema.parse(await parseBody(request)); }
        catch (error) { return zodError(error); }
        const now = new Date().toISOString();
        const asset = await p.assets.upsert({
          ...parsed,
          createdAt: parsed.createdAt ?? now,
          updatedAt: parsed.updatedAt ?? now
        } as ProductionAsset);
        await p.audit.record("ASSET_UPSERTED", "admin", { assetId: asset.assetId });
        return json({ asset }, 201, rateHeaders);
      }

      if (request.method === "PATCH" && assetMatch) {
        const denied = requireAdmin(request);
        if (denied) return denied;
        let patch;
        try { patch = productionAssetPatchSchema.parse(await parseBody(request)); }
        catch (error) { return zodError(error); }
        const current = await p.assets.get(decodeURIComponent(assetMatch[1]!));
        const asset = await p.assets.upsert({ ...current, ...patch } as ProductionAsset);
        await p.audit.record("ASSET_PATCHED", "admin", { assetId: asset.assetId, fields: Object.keys(patch) });
        return json({ asset }, 200, rateHeaders);
      }

      if (request.method === "POST" && path === "/api/eligibility") {
        let input;
        try { input = eligibilitySchema.parse(await parseBody(request)); }
        catch (error) { return zodError(error); }
        const result = await p.eligibility.check(input as any);
        return json(result, result.eligible ? 200 : 422, rateHeaders);
      }

      if (request.method === "POST" && path === "/api/route") {
        let input;
        try { input = routeSchema.parse(await parseBody(request)); }
        catch (error) { return zodError(error); }
        const route = await p.routes.route(input as any);
        return json(route, route.bestRoute ? 200 : 422, rateHeaders);
      }

      if (request.method === "POST" && (path === "/api/cow/quote" || path === "/api/cow/route")) {
        let input;
        try { input = cowOrderSchema.parse(await parseBody(request)); }
        catch (error) { return zodError(error); }
        const response = await p.cow.quote(input as any);
        return json(response, response.executable ? 200 : 422, rateHeaders);
      }

      const cowRouteMatch = path.match(/^\/api\/cow\/routes\/([0-9a-f-]+)$/i);
      if (request.method === "GET" && cowRouteMatch) {
        return json(await p.cow.get(cowRouteMatch[1]!), 200, rateHeaders);
      }

      if (request.method === "POST" && path === "/api/cow/prepare") {
        const raw = await parseBody(request) as Record<string, unknown>;
        let input;
        try { input = prepareSchema.parse(raw); }
        catch (error) { return zodError(error); }
        return json(await p.cowSettlement.prepare(input.routeId, input.wallet as any), 200, rateHeaders);
      }

      if (request.method === "POST" && path === "/api/execute/prepare") {
        let input;
        try { input = prepareSchema.parse(await parseBody(request)); }
        catch (error) { return zodError(error); }
        const execution = await p.executions.prepare(input.routeId, input.wallet as any, input.orderId);
        return json(execution, execution.status === "BLOCKED" ? 422 : 200, rateHeaders);
      }

      if (request.method === "POST" && path === "/api/orders") {
        let input;
        try { input = orderCreateSchema.parse(await parseBody(request)); }
        catch (error) { return zodError(error); }
        const order = await p.orders.create(input as any);
        return json(order, order.state === "INELIGIBLE" || order.state === "FAILED" ? 422 : 201, rateHeaders);
      }

      if (request.method === "GET" && path === "/api/orders") {
        const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 100)));
        return json({ orders: await p.orders.list(limit) }, 200, rateHeaders);
      }

      const orderCancelMatch = path.match(/^\/api\/orders\/([0-9a-f-]+)\/cancel$/i);
      if (request.method === "POST" && orderCancelMatch) {
        const actor = bearer(request) ? "api-client" : "anonymous";
        return json(await p.orders.cancel(orderCancelMatch[1]!, actor), 200, rateHeaders);
      }

      const orderMatch = path.match(/^\/api\/orders\/([0-9a-f-]+)$/i);
      if (request.method === "GET" && orderMatch) {
        const order = await p.orders.get(orderMatch[1]!);
        const audit = await p.store.listAudit(order.id);
        return json({ order, audit }, 200, rateHeaders);
      }

      if (request.method === "GET" && path === "/api/audit") {
        return json({
          events: await p.store.listAudit(url.searchParams.get("orderId") ?? undefined)
        }, 200, rateHeaders);
      }

      if (request.method === "GET" && path === "/api/integrations") {
        return json({
          adapters: await Promise.all(app.adapters.list().map(async (adapter) => ({
            id: adapter.id,
            pairs: await adapter.listPairs()
          })))
        }, 200, rateHeaders);
      }

      if (request.method === "GET" && path === "/api/evidence") {
        return json(app.evidence.snapshot(), 200, rateHeaders);
      }

      if (request.method === "GET" && path === "/api/monitor") {
        return json({ assets: await app.monitor.scan() }, 200, rateHeaders);
      }

      if (request.method === "GET" && path === "/api/readiness") {
        const db = await p.store.health();
        const eligibilityProvider = await p.eligibilityProvider.health();
        return json({
          network: "ethereum-mainnet",
          persistence: db,
          capabilities: {
            walletConnection: true,
            cowLiveQuote: process.env.ENABLE_COW_LIVE === "true",
            rpcSimulation: Boolean(process.env.ETH_RPC_URL),
            issuerEligibilityProvider: eligibilityProvider.ok,
            issuerMintRedeemExecution: Boolean(process.env.OPENEDEN_QUOTE_URL),
            orderLifecycle: true,
            auditTrail: true,
            executionPreparation: true,
            cowOrderSubmission: false
          },
          blockers: [
            ...(!process.env.DATABASE_URL ? [{ code: "DATABASE_URL_REQUIRED", message: "Postgres is required for durable production persistence." }] : []),
            ...(!eligibilityProvider.ok ? [{ code: "ELIGIBILITY_PROVIDER_REQUIRED", message: "Production permissioned assets require a trusted eligibility provider." }] : []),
            ...(!process.env.OPENEDEN_QUOTE_URL ? [{ code: "ISSUER_PROVIDER_REQUIRED", message: "Direct OpenEden mint/redeem requires approved provider access." }] : []),
            { code: "COW_ORDER_SUBMISSION_GATED", message: "33Jane prepares CoW-compatible settlement data but does not yet submit signed CoW orders." }
          ]
        }, 200, rateHeaders);
      }

      // Compatibility endpoint: raw live CoW market quote, independent from issuer eligibility.
      if (request.method === "POST" && path === "/api/live/quote") {
        const raw = await parseBody(request) as Record<string, unknown>;
        const wallet = String(raw.wallet ?? "");
        const sellAmount = String(raw.sellAmountAtomic ?? "");
        if (!/^0x[a-fA-F0-9]{40}$/.test(wallet) || !/^\d+$/.test(sellAmount)) {
          return json({ error: "VALID_WALLET_AND_AMOUNT_REQUIRED" }, 400, rateHeaders);
        }
        const sell = await p.assets.get(String(raw.sellAssetId ?? "1:usdc"));
        const buy = await p.assets.get(String(raw.buyAssetId ?? "1:openeden-tbill"));
        const quote = await app.cowClient.getQuote("mainnet", {
          sellToken: sell.contractAddress,
          buyToken: buy.contractAddress,
          sellAmountBeforeFee: sellAmount,
          kind: "sell",
          from: wallet,
          receiver: wallet,
          priceQuality: "optimal"
        });
        return json({ source: "cow-orderbook-mainnet", live: true, quote }, 200, rateHeaders);
      }

      return json({ error: "NOT_FOUND", path, method: request.method }, 404, rateHeaders);
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      const status = [
        "ASSET_NOT_FOUND",
        "ROUTE_NOT_FOUND",
        "ORDER_NOT_FOUND"
      ].includes(message) ? 404 : 400;
      return json({ error: message }, status, rateHeaders);
    }
  };
}
