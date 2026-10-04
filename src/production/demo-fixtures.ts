import type { ProductionAsset } from "./types.js";

const NOW = "2026-10-04T00:00:00.000Z";

export const DEMO_ELIGIBLE_WALLET = "0x000000000000000000000000000000000000bEEF" as const;
export const DEMO_INELIGIBLE_WALLET = "0x000000000000000000000000000000000000bADD" as const;

export const DEMO_PRODUCTION_ASSETS: ProductionAsset[] = [
  {
    assetId: "1:jusdc-demo",
    chainId: 1,
    contractAddress: "0x0000000000000000000000000000000000000030",
    symbol: "jUSDC",
    name: "Demo USDC",
    decimals: 6,
    assetType: "ERC20",
    issuer: "33Jane Demo",
    permissioned: false,
    kycRequired: false,
    accreditationRequired: false,
    allowedJurisdictions: [],
    blockedJurisdictions: [],
    timezone: "UTC",
    settlementType: ["atomic"],
    transferRestrictions: [],
    mintRedeemSupported: false,
    rfqSupported: false,
    poolSupported: true,
    liquidityAdapters: [],
    status: "ACTIVE",
    metadata: { environment: "demo", label: "DEMO" },
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    assetId: "1:jane-treasury-demo",
    chainId: 1,
    contractAddress: "0x0000000000000000000000000000000000000031",
    symbol: "JTUSD",
    name: "Jane Treasury USD",
    decimals: 6,
    assetType: "TREASURY",
    issuer: "33Jane Demo Issuer",
    permissioned: true,
    kycRequired: true,
    accreditationRequired: false,
    allowedJurisdictions: ["GB", "DE", "FR"],
    blockedJurisdictions: [],
    minimumTradeSize: "1000000000",
    timezone: "UTC",
    settlementType: ["rfq", "issuer-mint", "permissioned-amm"],
    transferRestrictions: ["demo-whitelist"],
    mintRedeemSupported: true,
    rfqSupported: true,
    poolSupported: true,
    liquidityAdapters: ["demo-jane-rfq", "demo-jane-issuer", "demo-jane-pool"],
    walletWhitelist: [DEMO_ELIGIBLE_WALLET],
    status: "ACTIVE",
    metadata: { environment: "demo", label: "DEMO", liquidity: "MOCK" },
    createdAt: NOW,
    updatedAt: NOW
  }
];
