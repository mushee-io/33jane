import { AdapterRegistry } from "./adapters/adapter-registry.js";
import { ConstantProductAdapter } from "./adapters/cpmm-adapter.js";
import { CowOrderbookAdapter } from "./adapters/cow-orderbook-adapter.js";
import { IssuerAdapter } from "./adapters/issuer-adapter.js";
import { ProviderHttpAdapter } from "./adapters/provider-http-adapter.js";
import { RfqAdapter } from "./adapters/rfq-adapter.js";
import { CowOrderbookClient } from "./cow/client.js";
import { CowSubsolver } from "./cow/subsolver.js";
import { ConstraintEngine } from "./eligibility/constraint-engine.js";
import { ClaimEligibilityProvider } from "./eligibility/providers.js";
import { EvidenceStore } from "./observability/evidence-store.js";
import { IntegrationMonitor } from "./observability/monitor.js";
import { QuoteEngine } from "./quotes/quote-engine.js";
import { createDemoRegistry } from "./registry/demo-assets.js";
import { PRODUCTION_ASSETS } from "./registry/production-assets.js";
import { RouteEngine } from "./router/route-engine.js";
import { JsonRpcClient } from "./simulation/rpc.js";
import { SettlementSafetyEngine } from "./simulation/safety-engine.js";
import { createProductionPlatform } from "./production/platform.js";
import { OpenEdenOnchainIssuer } from "./issuers/openeden-onchain.js";
import { OpenEdenVaultAdapter } from "./adapters/openeden-vault-adapter.js";

export function createApp() {
  const assets = createDemoRegistry();
  for (const asset of PRODUCTION_ASSETS) assets.upsert(asset);

  const evidence = new EvidenceStore();
  const constraints = new ConstraintEngine([new ClaimEligibilityProvider()]);
  const adapters = new AdapterRegistry();

  adapters.register(new ConstantProductAdapter("demo-stable-amm", [{
    tokenA: "1:eurc-demo",
    tokenB: "1:usdc-demo",
    reserveA: "2500000000000",
    reserveB: "2700000000000",
    feeBps: 5
  }]));

  adapters.register(new IssuerAdapter({
    id: "demo-tbill-issuer",
    cashAssetId: "1:usdc-demo",
    rwaAssetId: "1:mtbill-demo",
    mintRateNumerator: "1000",
    mintRateDenominator: "1003",
    redeemRateNumerator: "997",
    redeemRateDenominator: "1000",
    mintFeeBps: 8,
    redeemFeeBps: 12
  }));

  adapters.register(new RfqAdapter("demo-rfq-maker", [{
    sellAssetId: "1:eurc-demo",
    buyAssetId: "1:mtbill-demo",
    priceNumerator: "1075",
    priceDenominator: "1000",
    maxSellAtomic: "250000000000",
    feeBps: 18
  }]));

  // Killer demo: jUSDC -> Jane Treasury USD across three mock liquidity venues.
  // These are explicitly DEMO/MOCK and never presented as production liquidity.
  adapters.register(new RfqAdapter("demo-jane-rfq", [{
    sellAssetId: "1:jusdc-demo",
    buyAssetId: "1:jane-treasury-demo",
    priceNumerator: "1002",
    priceDenominator: "1000",
    maxSellAtomic: "5000000000000",
    feeBps: 8
  }]));

  adapters.register(new IssuerAdapter({
    id: "demo-jane-issuer",
    cashAssetId: "1:jusdc-demo",
    rwaAssetId: "1:jane-treasury-demo",
    mintRateNumerator: "1000",
    mintRateDenominator: "1000",
    redeemRateNumerator: "998",
    redeemRateDenominator: "1000",
    mintFeeBps: 3,
    redeemFeeBps: 5
  }));

  adapters.register(new ConstantProductAdapter("demo-jane-pool", [{
    tokenA: "1:jusdc-demo",
    tokenB: "1:jane-treasury-demo",
    reserveA: "5000000000000",
    reserveB: "4990000000000",
    feeBps: 12
  }]));

  const rpc = process.env.ETH_RPC_URL ? new JsonRpcClient(process.env.ETH_RPC_URL) : undefined;
  const openEdenIssuer = new OpenEdenOnchainIssuer(rpc);
  if (rpc) {
    adapters.register(new OpenEdenVaultAdapter(openEdenIssuer));
  }

  const cowClient = new CowOrderbookClient();
  if (process.env.ENABLE_COW_LIVE === "true") {
    adapters.register(new CowOrderbookAdapter(
      "cow-mainnet-openeden",
      "mainnet",
      assets,
      cowClient,
      [
        { sellAssetId: "1:usdc", buyAssetId: "1:openeden-tbill" },
        { sellAssetId: "1:openeden-tbill", buyAssetId: "1:usdc" }
      ]
    ));
  }

  if (process.env.OPENEDEN_QUOTE_URL) {
    adapters.register(new ProviderHttpAdapter({
      id: "openeden-provider-bridge",
      quoteEndpoint: process.env.OPENEDEN_QUOTE_URL,
      apiKey: process.env.OPENEDEN_API_KEY,
      pairs: [
        { sellAssetId: "1:usdc", buyAssetId: "1:openeden-tbill", liquidityModel: "issuer-mint" },
        { sellAssetId: "1:openeden-tbill", buyAssetId: "1:usdc", liquidityModel: "issuer-redeem" }
      ]
    }));
  }

  const quotes = new QuoteEngine(assets, adapters, constraints, evidence);
  const routes = new RouteEngine(adapters, quotes);
  const safety = new SettlementSafetyEngine(adapters, evidence, rpc);
  const cowSolver = new CowSubsolver(routes, safety, evidence);
  const monitor = new IntegrationMonitor(assets, rpc);
  const production = createProductionPlatform(assets, adapters, safety, rpc);

  return {
    assets,
    constraints,
    adapters,
    quotes,
    routes,
    safety,
    cowSolver,
    cowClient,
    monitor,
    evidence,
    rpc,
    openEdenIssuer,
    production
  };
}
