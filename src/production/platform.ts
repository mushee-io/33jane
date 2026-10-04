import type { AdapterRegistry } from "../adapters/adapter-registry.js";
import type { AssetRegistry } from "../registry/asset-registry.js";
import type { SettlementSafetyEngine } from "../simulation/safety-engine.js";
import { createDataStore } from "../persistence/factory.js";
import { toProductionAsset, AssetService } from "./asset-service.js";
import { DEMO_PRODUCTION_ASSETS } from "./demo-fixtures.js";
import { AuditService } from "./audit-service.js";
import { RuleEngine } from "../rules/engine.js";
import {
  AccreditationRule,
  AssetActiveRule,
  JurisdictionAllowlistRule,
  JurisdictionBlocklistRule,
  KycRequirementRule,
  LiquidityVenueRule,
  MarketHoursRule,
  MaximumTradeRule,
  MinimumTradeRule,
  SupportedChainRule,
  TransferRestrictionRule,
  WalletWhitelistRule
} from "../rules/core-rules.js";
import { ExternalEligibilityProvider } from "../eligibility/external-provider.js";
import { EligibilityService } from "../eligibility/service.js";
import { ExecutableRouteService } from "./route-service.js";
import { ExecutionService } from "./execution-service.js";
import { OrderService } from "./order-service.js";
import { CowRouteAdapter } from "../integrations/cow/cow-route-adapter.js";
import { CowSettlementBuilder } from "../integrations/cow/cow-settlement-builder.js";

export function createProductionPlatform(
  registry: AssetRegistry,
  adapters: AdapterRegistry,
  safety: SettlementSafetyEngine
) {
  const store = createDataStore();
  const seeds = [
    ...registry.list().map(toProductionAsset),
    ...DEMO_PRODUCTION_ASSETS
  ];
  const assets = new AssetService(store, seeds);
  const audit = new AuditService(store);
  const rules = new RuleEngine([
    new AssetActiveRule(),
    new SupportedChainRule(),
    new WalletWhitelistRule(),
    new KycRequirementRule(),
    new AccreditationRule(),
    new JurisdictionAllowlistRule(),
    new JurisdictionBlocklistRule(),
    new MinimumTradeRule(),
    new MaximumTradeRule(),
    new MarketHoursRule(),
    new TransferRestrictionRule(),
    new LiquidityVenueRule()
  ]);
  const eligibility = new EligibilityService(
    assets,
    rules,
    new ExternalEligibilityProvider(),
    store
  );
  const routes = new ExecutableRouteService(assets, eligibility, adapters, store, audit);
  const executions = new ExecutionService(store, adapters, safety, audit);
  const orders = new OrderService(store, routes, executions, audit);
  const cow = new CowRouteAdapter(routes);
  const cowSettlement = new CowSettlementBuilder(executions);

  return {
    store,
    assets,
    audit,
    rules,
    eligibility,
    routes,
    executions,
    orders,
    cow,
    cowSettlement
  };
}
