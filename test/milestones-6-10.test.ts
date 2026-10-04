import assert from "node:assert/strict";
import test from "node:test";
import { ProviderHttpAdapter } from "../src/adapters/provider-http-adapter.js";
import { createApp } from "../src/bootstrap.js";
import { OPENEDEN_TBILL } from "../src/registry/production-assets.js";

const context = {
  wallet: "0x000000000000000000000000000000000000beef" as const,
  claims: { kyc: true, jurisdiction: "GB" }
};

test("Milestone 6: safe route receives a deterministic certificate shape", async () => {
  const app = createApp();
  const routes = await app.routes.findRoutes(
    "1:eurc-demo",
    "1:mtbill-demo",
    "100000000",
    context,
    { maxHops: 3 }
  );
  assert.ok(routes[0]);
  const certificate = await app.safety.simulateRoute(routes[0]!, context);
  assert.equal(certificate.ok, true);
  assert.match(certificate.digest, /^sha256:[a-f0-9]{64}$/);
  assert.ok(certificate.executionSteps.length > 0);
});

test("Milestone 7: CoW sub-solver emits only a simulated candidate", async () => {
  const app = createApp();
  const result = await app.cowSolver.solve({
    sellAssetId: "1:eurc-demo",
    buyAssetId: "1:mtbill-demo",
    sellAmountAtomic: "100000000",
    context
  });
  assert.ok(result.candidate);
  assert.equal(result.candidate?.certificate.ok, true);
});

test("Milestone 8: real OpenEden TBILL mainnet contract is registered", () => {
  const app = createApp();
  const asset = app.assets.get("1:openeden-tbill");
  assert.equal(asset.address.toLowerCase(), OPENEDEN_TBILL.address.toLowerCase());
  assert.equal(asset.metadata?.environment, "production");
  assert.equal(asset.symbol, "TBILL");
});

test("Milestone 8/9: provider bridge normalizes a real-provider shaped response", async () => {
  const adapter = new ProviderHttpAdapter({
    id: "provider-test",
    quoteEndpoint: "https://provider.invalid/quote",
    pairs: [{
      sellAssetId: "1:usdc",
      buyAssetId: "1:openeden-tbill",
      liquidityModel: "issuer-mint"
    }],
    fetchImpl: async () => new Response(JSON.stringify({
      quoteId: "q1",
      buyAmountAtomic: "99800000",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      confidenceBps: 10000,
      execution: {
        target: "0x0000000000000000000000000000000000000010",
        data: "0x1234"
      }
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  });

  const quote = await adapter.quote({
    sellAssetId: "1:usdc",
    buyAssetId: "1:openeden-tbill",
    sellAmountAtomic: "100000000",
    context
  });

  assert.equal(quote?.buyAmountAtomic, "99800000");
  const steps = await adapter.buildExecution(quote!, context);
  assert.equal(steps[0]?.target, "0x0000000000000000000000000000000000000010");
});

test("Milestone 10: evidence records successful solver work", async () => {
  const app = createApp();
  await app.cowSolver.solve({
    sellAssetId: "1:eurc-demo",
    buyAssetId: "1:mtbill-demo",
    sellAmountAtomic: "100000000",
    context
  });
  const snapshot = app.evidence.snapshot();
  assert.equal(snapshot.solves.total, 1);
  assert.equal(snapshot.solves.successful, 1);
  assert.ok(snapshot.simulations.total > 0);
  assert.ok(snapshot.uniqueAdapters.length > 0);
});
