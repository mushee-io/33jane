import { AdapterRegistry } from "./adapters/adapter-registry.js";
import { ConstantProductAdapter } from "./adapters/cpmm-adapter.js";
import { IssuerAdapter } from "./adapters/issuer-adapter.js";
import { RfqAdapter } from "./adapters/rfq-adapter.js";
import { ConstraintEngine } from "./eligibility/constraint-engine.js";
import { ClaimEligibilityProvider } from "./eligibility/providers.js";
import { QuoteEngine } from "./quotes/quote-engine.js";
import { createDemoRegistry } from "./registry/demo-assets.js";
import { RouteEngine } from "./router/route-engine.js";

export function createApp() {
  const assets = createDemoRegistry();
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

  const quotes = new QuoteEngine(assets, adapters, constraints);
  const routes = new RouteEngine(adapters, quotes);

  return { assets, constraints, adapters, quotes, routes };
}
