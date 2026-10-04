import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createApp } from "../bootstrap.js";
import type { ExecutionContext, Route } from "../core/types.js";
import { FixedWindowRateLimiter } from "./rate-limit.js";

const app = createApp();
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";
const limiter = new FixedWindowRateLimiter(Number(process.env.RATE_LIMIT_PER_MINUTE ?? 120));

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function send(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function contextFrom(body: Record<string, unknown>): ExecutionContext {
  const context = (body.context ?? {}) as Record<string, unknown>;
  return {
    wallet: String(context.wallet ?? "0x000000000000000000000000000000000000dEaD") as ExecutionContext["wallet"],
    recipient: context.recipient ? String(context.recipient) as ExecutionContext["recipient"] : undefined,
    claims: (context.claims ?? {}) as Record<string, string | boolean>
  };
}

const server = createServer(async (req, res) => {
  const client = req.socket.remoteAddress ?? "unknown";
  const rate = limiter.consume(client);
  res.setHeader("x-ratelimit-remaining", String(rate.remaining));
  res.setHeader("x-ratelimit-reset", String(rate.resetAt));
  if (!rate.allowed) return send(res, 429, { error: "RATE_LIMITED" });

  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return send(res, 200, {
        ok: true,
        service: "33jane",
        version: "0.2.0",
        milestones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        liveCow: process.env.ENABLE_COW_LIVE === "true",
        rpcConfigured: Boolean(process.env.ETH_RPC_URL)
      });
    }

    if (req.method === "GET" && url.pathname === "/assets") {
      return send(res, 200, { assets: app.assets.list() });
    }

    if (req.method === "GET" && url.pathname.startsWith("/assets/")) {
      const id = decodeURIComponent(url.pathname.slice("/assets/".length));
      return send(res, 200, { asset: app.assets.get(id) });
    }

    if (req.method === "GET" && url.pathname === "/integrations") {
      const adapters = await Promise.all(app.adapters.list().map(async (adapter) => ({
        id: adapter.id,
        pairs: await adapter.listPairs()
      })));
      return send(res, 200, { adapters });
    }

    if (req.method === "GET" && url.pathname === "/evidence") {
      return send(res, 200, app.evidence.snapshot());
    }

    if (req.method === "GET" && url.pathname === "/monitor") {
      return send(res, 200, { assets: await app.monitor.scan() });
    }

    if (req.method === "POST" && url.pathname === "/eligibility") {
      const body = await readJson(req);
      const assetId = String(body.assetId);
      const amountAtomic = String(body.amountAtomic);
      const decision = await app.constraints.evaluate(app.assets.get(assetId), amountAtomic, contextFrom(body));
      return send(res, decision.allowed ? 200 : 422, { assetId, decision });
    }

    if (req.method === "POST" && url.pathname === "/quote") {
      const body = await readJson(req);
      const result = await app.quotes.quote({
        sellAssetId: String(body.sellAssetId),
        buyAssetId: String(body.buyAssetId),
        sellAmountAtomic: String(body.sellAmountAtomic),
        context: contextFrom(body)
      });
      return send(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/route") {
      const body = await readJson(req);
      const routes = await app.routes.findRoutes(
        String(body.sellAssetId),
        String(body.buyAssetId),
        String(body.sellAmountAtomic),
        contextFrom(body),
        { maxHops: Number(body.maxHops ?? 3) }
      );
      return send(res, 200, { routes });
    }

    if (req.method === "POST" && url.pathname === "/simulate") {
      const body = await readJson(req);
      const context = contextFrom(body);
      let route = body.route as Route | undefined;
      if (!route) {
        const routes = await app.routes.findRoutes(
          String(body.sellAssetId),
          String(body.buyAssetId),
          String(body.sellAmountAtomic),
          context,
          { maxHops: Number(body.maxHops ?? 3) }
        );
        route = routes[0];
      }
      if (!route) return send(res, 422, { error: "NO_ROUTE" });
      return send(res, 200, { certificate: await app.safety.simulateRoute(route, context) });
    }

    if (req.method === "POST" && url.pathname === "/cow/solve") {
      const body = await readJson(req);
      const result = await app.cowSolver.solve({
        sellAssetId: String(body.sellAssetId),
        buyAssetId: String(body.buyAssetId),
        sellAmountAtomic: String(body.sellAmountAtomic),
        context: contextFrom(body),
        maxHops: Number(body.maxHops ?? 3)
      });
      return send(res, result.candidate ? 200 : 422, result);
    }

    return send(res, 404, { error: "NOT_FOUND" });
  } catch (error) {
    return send(res, 400, {
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR"
    });
  }
});

server.listen(port, host, () => {
  console.log(`33Jane API listening on http://${host}:${port}`);
});
