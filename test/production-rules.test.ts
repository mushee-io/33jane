import assert from "node:assert/strict";
import test from "node:test";
import { RuleEngine } from "../src/rules/engine.js";
import {
  AssetActiveRule,
  JurisdictionAllowlistRule,
  JurisdictionBlocklistRule,
  KycRequirementRule,
  MarketHoursRule,
  MinimumTradeRule,
  WalletWhitelistRule
} from "../src/rules/core-rules.js";
import { DEMO_ELIGIBLE_WALLET, DEMO_INELIGIBLE_WALLET, DEMO_PRODUCTION_ASSETS } from "../src/production/demo-fixtures.js";

const treasury = DEMO_PRODUCTION_ASSETS.find((x) => x.assetId === "1:jane-treasury-demo")!;

function context(overrides: Record<string, unknown> = {}) {
  return {
    wallet: DEMO_ELIGIBLE_WALLET,
    chainId: 1,
    amount: "1000000000",
    side: "BUY" as const,
    jurisdiction: "GB",
    asset: treasury,
    trustedEligibility: { verified: false, source: "demo" },
    demoClaims: { kyc: true, transferAllowed: true },
    availableAdapterIds: ["demo-jane-rfq"],
    now: new Date("2026-10-05T12:00:00Z"),
    ...overrides
  } as any;
}

test("eligible demo user passes core permission rules", async () => {
  const engine = new RuleEngine([
    new WalletWhitelistRule(),
    new KycRequirementRule(),
    new JurisdictionAllowlistRule(),
    new JurisdictionBlocklistRule(),
    new MinimumTradeRule()
  ]);
  const checks = await engine.evaluate(context());
  assert.equal(checks.every((x) => x.passed), true);
});

test("wallet not whitelisted is rejected", async () => {
  const result = await new WalletWhitelistRule().evaluate(context({ wallet: DEMO_INELIGIBLE_WALLET }));
  assert.equal(result.passed, false);
  assert.equal(result.code, "WALLET_NOT_WHITELISTED");
});

test("blocked jurisdiction is rejected", async () => {
  const asset = { ...treasury, blockedJurisdictions: ["GB"] };
  const result = await new JurisdictionBlocklistRule().evaluate(context({ asset }));
  assert.equal(result.passed, false);
  assert.equal(result.code, "JURISDICTION_BLOCKED");
});

test("below minimum trade is rejected", async () => {
  const result = await new MinimumTradeRule().evaluate(context({ amount: "999999999" }));
  assert.equal(result.passed, false);
  assert.equal(result.code, "BELOW_MINIMUM_SIZE");
});

test("market closed is rejected", async () => {
  const asset = {
    ...treasury,
    marketHours: { daysUtc: [1,2,3,4,5], startHourUtc: 9, endHourUtc: 17 }
  };
  const result = await new MarketHoursRule().evaluate(context({
    asset,
    now: new Date("2026-10-04T12:00:00Z")
  }));
  assert.equal(result.passed, false);
  assert.equal(result.code, "MARKET_CLOSED");
});

test("inactive asset is rejected", async () => {
  const result = await new AssetActiveRule().evaluate(context({ asset: { ...treasury, status: "INACTIVE" } }));
  assert.equal(result.passed, false);
  assert.equal(result.code, "ASSET_DISABLED");
});
