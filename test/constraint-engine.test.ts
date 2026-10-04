import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/bootstrap.js";

const app = createApp();
const asset = app.assets.get("1:mtbill-demo");

test("eligible wallet passes RWA constraints", async () => {
  const result = await app.constraints.evaluate(asset, "50000000", {
    wallet: "0x000000000000000000000000000000000000beef",
    claims: { kyc: true, jurisdiction: "GB" }
  });
  assert.equal(result.allowed, true);
});

test("missing KYC fails RWA constraints", async () => {
  const result = await app.constraints.evaluate(asset, "50000000", {
    wallet: "0x000000000000000000000000000000000000beef",
    claims: { jurisdiction: "GB" }
  });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("ELIGIBILITY_REQUIRED"));
});

test("below minimum trade fails before execution", async () => {
  const result = await app.constraints.evaluate(asset, "1000", {
    wallet: "0x000000000000000000000000000000000000beef",
    claims: { kyc: true, jurisdiction: "GB" }
  });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("MIN_TRADE"));
});
