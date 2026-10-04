import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/bootstrap.js";
import { DEMO_ELIGIBLE_WALLET, DEMO_INELIGIBLE_WALLET } from "../src/production/demo-fixtures.js";

test("eligible demo order reaches ROUTE_FOUND and audit is recorded", async () => {
  const app = createApp();
  const order = await app.production.orders.create({
    wallet: DEMO_ELIGIBLE_WALLET,
    chainId: 1,
    sellToken: "1:jusdc-demo",
    buyToken: "1:jane-treasury-demo",
    sellAmount: "1000000000",
    jurisdiction: "GB",
    side: "BUY",
    demoClaims: { kyc: true, transferAllowed: true }
  });

  assert.equal(order.state, "ROUTE_FOUND");
  assert.ok(order.routeId);
  const events = await app.production.store.listAudit(order.id);
  assert.ok(events.some((x) => x.eventType === "ELIGIBILITY_DECIDED"));
  assert.ok(events.some((x) => x.eventType === "ROUTE_SELECTED"));
});

test("ineligible wallet is rejected before execution", async () => {
  const app = createApp();
  const order = await app.production.orders.create({
    wallet: DEMO_INELIGIBLE_WALLET,
    chainId: 1,
    sellToken: "1:jusdc-demo",
    buyToken: "1:jane-treasury-demo",
    sellAmount: "1000000000",
    jurisdiction: "GB",
    side: "BUY",
    demoClaims: { kyc: true, transferAllowed: true }
  });

  assert.equal(order.state, "INELIGIBLE");
  assert.equal(order.failureCode, "WALLET_NOT_WHITELISTED");
  assert.equal(order.executionId, undefined);
});
