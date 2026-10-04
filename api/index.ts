import { createApp } from "../src/bootstrap.js";
import type { ExecutionContext, Route } from "../src/core/types.js";
import { FixedWindowRateLimiter } from "../src/api/rate-limit.js";

const app = createApp();
const limiter = new FixedWindowRateLimiter(Number(process.env.RATE_LIMIT_PER_MINUTE ?? 120));

function json(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      ...extraHeaders
    }
  });
}

async function bodyFrom(request: Request): Promise<Record<string, unknown>> {
  if (request.method === "GET" || request.method === "HEAD") return {};
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text) as Record<string, unknown>;
}

function contextFrom(body: Record<string, unknown>): ExecutionContext {
  const context = (body.context ?? {}) as Record<string, unknown>;
  return {
    wallet: String(context.wallet ?? "0x000000000000000000000000000000000000dEaD") as ExecutionContext["wallet"],
    recipient: context.recipient
      ? String(context.recipient) as ExecutionContext["recipient"]
      : undefined,
    claims: (context.claims ?? {}) as Record<string, string | boolean>
  };
}

export const config = {
  maxDuration: 30
};

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });

    const url = new URL(request.url);
    const action = url.searchParams.get("action") ?? "health";
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const client = forwarded || request.headers.get("x-real-ip") || "unknown";
    const rate = limiter.consume(client);

    const rateHeaders = {
      "x-ratelimit-remaining": String(rate.remaining),
      "x-ratelimit-reset": String(rate.resetAt)
    };

    if (!rate.allowed) return json({ error: "RATE_LIMITED" }, 429, rateHeaders);

    try {
      if (action === "health" && request.method === "GET") {
        return json({
          ok: true,
          service: "33jane",
          version: "0.3.0",
          deployment: "vercel",
          milestones: [1,2,3,4,5,6,7,8,9,10],
          liveCow: process.env.ENABLE_COW_LIVE === "true",
          rpcConfigured: Boolean(process.env.ETH_RPC_URL),
          providerBridgeConfigured: Boolean(process.env.OPENEDEN_QUOTE_URL),
          cowQuoteApi: true
        }, 200, rateHeaders);
      }

      if (action === "assets" && request.method === "GET") {
        return json({ assets: app.assets.list() }, 200, rateHeaders);
      }

      if (action === "asset" && request.method === "GET") {
        const id = url.searchParams.get("id");
        if (!id) return json({ error: "ASSET_ID_REQUIRED" }, 400, rateHeaders);
        return json({ asset: app.assets.get(id) }, 200, rateHeaders);
      }

      if (action === "integrations" && request.method === "GET") {
        const adapters = await Promise.all(app.adapters.list().map(async (adapter) => ({
          id: adapter.id,
          pairs: await adapter.listPairs()
        })));
        return json({ adapters }, 200, rateHeaders);
      }

      if (action === "evidence" && request.method === "GET") {
        return json(app.evidence.snapshot(), 200, rateHeaders);
      }

      if (action === "monitor" && request.method === "GET") {
        return json({ assets: await app.monitor.scan() }, 200, rateHeaders);
      }

      if (action === "readiness" && request.method === "GET") {
        return json({
          network: "ethereum-mainnet",
          capabilities: {
            walletConnection: true,
            cowLiveQuote: true,
            rpcSimulation: Boolean(process.env.ETH_RPC_URL),
            openEdenAssetRegistry: true,
            issuerEligibilityProvider: Boolean(process.env.OPENEDEN_QUOTE_URL),
            issuerMintRedeemExecution: Boolean(process.env.OPENEDEN_QUOTE_URL),
            cowOrderSubmission: false
          },
          blockers: [
            ...(!process.env.OPENEDEN_QUOTE_URL ? [{
              code: "ISSUER_PROVIDER_REQUIRED",
              message: "OpenEden issuer eligibility and direct mint/redeem execution require an approved provider integration."
            }] : []),
            {
              code: "COW_ORDER_SIGNING_NOT_ENABLED",
              message: "Live CoW order submission is intentionally gated until the browser signing flow is enabled and audited."
            }
          ]
        }, 200, rateHeaders);
      }

      const body = await bodyFrom(request);

      if (action === "live-quote" && request.method === "POST") {
        const sellAssetId = String(body.sellAssetId ?? "");
        const buyAssetId = String(body.buyAssetId ?? "");
        const sellAmountAtomic = String(body.sellAmountAtomic ?? "");
        const wallet = String(body.wallet ?? "");

        if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
          return json({ error: "VALID_WALLET_REQUIRED" }, 400, rateHeaders);
        }
        if (!/^\d+$/.test(sellAmountAtomic) || BigInt(sellAmountAtomic) <= 0n) {
          return json({ error: "VALID_SELL_AMOUNT_REQUIRED" }, 400, rateHeaders);
        }

        const sell = app.assets.get(sellAssetId);
        const buy = app.assets.get(buyAssetId);
        if (sell.chainId !== 1 || buy.chainId !== 1) {
          return json({ error: "LIVE_QUOTE_CURRENTLY_ETHEREUM_ONLY" }, 400, rateHeaders);
        }

        try {
          const quote = await app.cowClient.getQuote("mainnet", {
            sellToken: sell.address,
            buyToken: buy.address,
            sellAmountBeforeFee: sellAmountAtomic,
            kind: "sell",
            from: wallet,
            receiver: wallet,
            priceQuality: "optimal"
          });
          return json({
            source: "cow-orderbook-mainnet",
            live: true,
            sellAsset: { id: sell.id, symbol: sell.symbol, address: sell.address },
            buyAsset: { id: buy.id, symbol: buy.symbol, address: buy.address },
            quote
          }, 200, rateHeaders);
        } catch (error) {
          return json({
            source: "cow-orderbook-mainnet",
            live: true,
            executable: false,
            error: error instanceof Error ? error.message : "COW_LIVE_QUOTE_FAILED"
          }, 422, rateHeaders);
        }
      }

      if (action === "eligibility" && request.method === "POST") {
        const assetId = String(body.assetId ?? "");
        const amountAtomic = String(body.amountAtomic ?? "");
        const decision = await app.constraints.evaluate(
          app.assets.get(assetId),
          amountAtomic,
          contextFrom(body)
        );
        return json({ assetId, decision }, decision.allowed ? 200 : 422, rateHeaders);
      }

      if (action === "quote" && request.method === "POST") {
        const result = await app.quotes.quote({
          sellAssetId: String(body.sellAssetId ?? ""),
          buyAssetId: String(body.buyAssetId ?? ""),
          sellAmountAtomic: String(body.sellAmountAtomic ?? ""),
          context: contextFrom(body)
        });
        return json(result, 200, rateHeaders);
      }

      if (action === "route" && request.method === "POST") {
        const routes = await app.routes.findRoutes(
          String(body.sellAssetId ?? ""),
          String(body.buyAssetId ?? ""),
          String(body.sellAmountAtomic ?? ""),
          contextFrom(body),
          { maxHops: Number(body.maxHops ?? 3) }
        );
        return json({ routes }, 200, rateHeaders);
      }

      if (action === "simulate" && request.method === "POST") {
        const context = contextFrom(body);
        let route = body.route as Route | undefined;

        if (!route) {
          const routes = await app.routes.findRoutes(
            String(body.sellAssetId ?? ""),
            String(body.buyAssetId ?? ""),
            String(body.sellAmountAtomic ?? ""),
            context,
            { maxHops: Number(body.maxHops ?? 3) }
          );
          route = routes[0];
        }

        if (!route) return json({ error: "NO_ROUTE" }, 422, rateHeaders);
        const certificate = await app.safety.simulateRoute(route, context);
        return json({ certificate }, certificate.ok ? 200 : 422, rateHeaders);
      }

      if (action === "cow-solve" && request.method === "POST") {
        const result = await app.cowSolver.solve({
          sellAssetId: String(body.sellAssetId ?? ""),
          buyAssetId: String(body.buyAssetId ?? ""),
          sellAmountAtomic: String(body.sellAmountAtomic ?? ""),
          context: contextFrom(body),
          maxHops: Number(body.maxHops ?? 3)
        });
        return json(result, result.candidate ? 200 : 422, rateHeaders);
      }

      return json({ error: "NOT_FOUND", action, method: request.method }, 404, rateHeaders);
    } catch (error) {
      return json({
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR"
      }, 400, rateHeaders);
    }
  }
};
