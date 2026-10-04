import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { AdapterRegistry } from "../src/adapters/adapter-registry.js";
import type { LiquidityAdapter, SupportedPair } from "../src/adapters/types.js";
import type { AdapterQuote, ExecutionStep, QuoteRequest } from "../src/core/types.js";
import { MemoryStore } from "../src/persistence/memory-store.js";
import { AssetService } from "../src/production/asset-service.js";
import { DEMO_ELIGIBLE_WALLET, DEMO_PRODUCTION_ASSETS } from "../src/production/demo-fixtures.js";
import { AuditService } from "../src/production/audit-service.js";
import { RuleEngine } from "../src/rules/engine.js";
import {
  AssetActiveRule,
  JurisdictionAllowlistRule,
  JurisdictionBlocklistRule,
  KycRequirementRule,
  MinimumTradeRule,
  TransferRestrictionRule,
  WalletWhitelistRule
} from "../src/rules/core-rules.js";
import { EligibilityService } from "../src/eligibility/service.js";
import { ExternalEligibilityProvider } from "../src/eligibility/external-provider.js";
import { ExecutableRouteService } from "../src/production/route-service.js";

class FakeAdapter implements LiquidityAdapter {
  constructor(
    readonly id: string,
    private readonly buyAmount: string | null,
    private readonly expiresAt: string,
    private readonly executable = true
  ) {}

  async listPairs(): Promise<SupportedPair[]> {
    return [{
      sellAssetId: "1:jusdc-demo",
      buyAssetId: "1:jane-treasury-demo",
      liquidityModel: "rfq"
    }];
  }

  async supports(sell: string, buy: string): Promise<boolean> {
    return sell === "1:jusdc-demo" && buy === "1:jane-treasury-demo";
  }

  async quote(request: QuoteRequest): Promise<AdapterQuote | null> {
    if (this.buyAmount === null) return null;
    return {
      id: randomUUID(),
      adapterId: this.id,
      liquidityModel: "rfq",
      sellAssetId: request.sellAssetId,
      buyAssetId: request.buyAssetId,
      sellAmountAtomic: request.sellAmountAtomic,
      buyAmountAtomic: this.buyAmount,
      feeAmountAtomic: "1000",
      expiresAt: this.expiresAt,
      confidenceBps: 10000,
      settlement: "rfq",
      metadata: { executable: this.executable, environment: "demo" }
    };
  }

  async buildExecution(): Promise<ExecutionStep[]> {
    return [{ type: "call", description: "demo execution" }];
  }
}

function setup(adaptersToAdd: LiquidityAdapter[]) {
  const store = new MemoryStore();
  const assets = new AssetService(store, DEMO_PRODUCTION_ASSETS);
  const registry = new AdapterRegistry();
  for (const adapter of adaptersToAdd) registry.register(adapter);
  const rules = new RuleEngine([
    new AssetActiveRule(),
    new WalletWhitelistRule(),
    new KycRequirementRule(),
    new JurisdictionAllowlistRule(),
    new JurisdictionBlocklistRule(),
    new MinimumTradeRule(),
    new TransferRestrictionRule()
  ]);
  const eligibility = new EligibilityService(
    assets,
    rules,
    new ExternalEligibilityProvider(undefined, undefined),
    store
  );
  return new ExecutableRouteService(assets, eligibility, registry, store, new AuditService(store));
}

const request = {
  wallet: DEMO_ELIGIBLE_WALLET,
  chainId: 1,
  sellToken: "1:jusdc-demo",
  buyToken: "1:jane-treasury-demo",
  sellAmount: "1000000000",
  jurisdiction: "GB",
  side: "BUY" as const,
  demoClaims: { kyc: true, transferAllowed: true }
};

test("RFQ unavailable falls back to another adapter", async () => {
  const route = setup([
    new FakeAdapter("rfq-unavailable", null, new Date(Date.now() + 60_000).toISOString()),
    new FakeAdapter("fallback", "995000000", new Date(Date.now() + 60_000).toISOString())
  ]);
  const result = await route.route(request);
  assert.equal(result.bestRoute?.quote.adapterId, "fallback");
});

test("expired quote is rejected", async () => {
  const route = setup([
    new FakeAdapter("expired", "1100000000", new Date(Date.now() - 60_000).toISOString()),
    new FakeAdapter("fresh", "990000000", new Date(Date.now() + 60_000).toISOString())
  ]);
  const result = await route.route(request);
  assert.equal(result.bestRoute?.quote.adapterId, "fresh");
  assert.ok(result.rejected.some((x) => x.adapterId === "expired" && x.reason.includes("QUOTE_EXPIRED")));
});

test("better-price non-executable quote loses to worse-price executable quote", async () => {
  const route = setup([
    new FakeAdapter("best-price-but-blocked", "1200000000", new Date(Date.now() + 60_000).toISOString(), false),
    new FakeAdapter("worse-price-executable", "990000000", new Date(Date.now() + 60_000).toISOString(), true)
  ]);
  const result = await route.route(request);
  assert.equal(result.bestRoute?.quote.adapterId, "worse-price-executable");
  assert.equal(result.bestRoute?.quote.executable, true);
  assert.ok(result.rejected.some((x) => x.adapterId === "best-price-but-blocked"));
});
