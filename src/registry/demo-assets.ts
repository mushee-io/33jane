import type { RwaAsset } from "../core/types.js";
import { AssetRegistry } from "./asset-registry.js";

export const DEMO_ASSETS: RwaAsset[] = [
  {
    id: "1:usdc-demo",
    chainId: 1,
    address: "0x0000000000000000000000000000000000000001",
    symbol: "USDC",
    name: "Demo USDC",
    decimals: 6,
    category: "stablecoin",
    issuer: "demo",
    settlementModels: ["atomic"],
    quoteCurrencies: [],
    constraints: {},
    metadata: { environment: "demo" }
  },
  {
    id: "1:eurc-demo",
    chainId: 1,
    address: "0x0000000000000000000000000000000000000002",
    symbol: "EURC",
    name: "Demo EURC",
    decimals: 6,
    category: "stablecoin",
    issuer: "demo",
    settlementModels: ["atomic"],
    quoteCurrencies: ["1:usdc-demo"],
    constraints: {},
    metadata: { environment: "demo" }
  },
  {
    id: "1:mtbill-demo",
    chainId: 1,
    address: "0x0000000000000000000000000000000000000010",
    symbol: "mTBILL",
    name: "Demo Tokenized Treasury",
    decimals: 6,
    category: "tokenized-treasury",
    issuer: "demo-issuer",
    settlementModels: ["issuer-mint", "issuer-redeem", "rfq"],
    quoteCurrencies: ["1:usdc-demo", "1:eurc-demo"],
    constraints: {
      minTradeAtomic: "10000000",
      maxTradeAtomic: "1000000000000",
      requiresEligibleWallet: true,
      requiredClaims: [
        { key: "kyc", equals: true },
        { key: "jurisdiction", oneOf: ["GB", "EU"] }
      ]
    },
    metadata: { environment: "demo", navCurrency: "USD" }
  }
];

export function createDemoRegistry(): AssetRegistry {
  const registry = new AssetRegistry();
  for (const asset of DEMO_ASSETS) registry.register(asset);
  return registry;
}
