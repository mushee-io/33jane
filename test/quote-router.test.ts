import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/bootstrap.js";

const context = {
  wallet: "0x000000000000000000000000000000000000beef" as const,
  claims: { kyc: true, jurisdiction: "GB" }
};

test("quote engine returns normalized direct RFQ", async () => {
  const app = createApp();
  const result = await app.quotes.quote({
    sellAssetId: "1:eurc-demo",
    buyAssetId: "1:mtbill-demo",
    sellAmountAtomic: "100000000",
    context
  });

  assert.ok(result.quotes.length >= 1);
  assert.equal(result.quotes[0]?.quote.liquidityModel, "rfq");
});

test("router discovers direct and multi-hop RWA paths", async () => {
  const app = createApp();
  const routes = await app.routes.findRoutes(
    "1:eurc-demo",
    "1:mtbill-demo",
    "100000000",
    context,
    { maxHops: 3 }
  );

  assert.ok(routes.length >= 2);
  assert.ok(routes.some((route) => route.legs.length === 1));
  assert.ok(routes.some((route) => route.legs.length === 2));
});

test("ineligible user gets no RWA route", async () => {
  const app = createApp();
  const routes = await app.routes.findRoutes(
    "1:eurc-demo",
    "1:mtbill-demo",
    "100000000",
    {
      wallet: "0x000000000000000000000000000000000000beef",
      claims: { kyc: false, jurisdiction: "GB" }
    },
    { maxHops: 3 }
  );

  assert.equal(routes.length, 0);
});
