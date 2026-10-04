import type { RwaAsset } from "../core/types.js";

export const ETHEREUM_USDC: RwaAsset = {
  id: "1:usdc",
  chainId: 1,
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  category: "stablecoin",
  issuer: "Circle",
  settlementModels: ["atomic"],
  quoteCurrencies: [],
  constraints: {},
  metadata: {
    environment: "production",
    source: "ethereum-mainnet"
  }
};

export const OPENEDEN_TBILL: RwaAsset = {
  id: "1:openeden-tbill",
  chainId: 1,
  address: "0xdd50C053C096CB04A3e3362E2b622529EC5f2e8a",
  symbol: "TBILL",
  name: "OpenEden TBILL",
  decimals: 6,
  category: "tokenized-treasury",
  issuer: "OpenEden / Treasury Bills Institutional Liquidity Limited",
  settlementModels: ["issuer-mint", "issuer-redeem", "atomic"],
  quoteCurrencies: ["1:usdc"],
  constraints: {
    requiresEligibleWallet: true,
    requiredClaims: [
      { key: "professionalInvestor", equals: true }
    ]
  },
  metadata: {
    environment: "production",
    source: "openeden",
    restrictionModel: "provider-eligibility"
  }
};

export const PRODUCTION_ASSETS: RwaAsset[] = [
  ETHEREUM_USDC,
  OPENEDEN_TBILL
];
