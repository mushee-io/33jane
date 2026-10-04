import { z } from "zod";

export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "invalid EVM address");
export const amountSchema = z.string().regex(/^\d+$/, "amount must be an atomic integer string").refine((v) => BigInt(v) > 0n, "amount must be positive");

export const eligibilitySchema = z.object({
  wallet: addressSchema,
  asset: z.string().min(1),
  chainId: z.number().int().positive(),
  amount: amountSchema,
  side: z.enum(["BUY", "SELL"]),
  jurisdiction: z.string().min(2).max(8).optional(),
  demoClaims: z.record(z.union([z.string(), z.boolean()])).optional()
});

export const routeSchema = z.object({
  wallet: addressSchema,
  chainId: z.number().int().positive(),
  sellToken: z.string().min(1),
  buyToken: z.string().min(1),
  sellAmount: amountSchema,
  jurisdiction: z.string().min(2).max(8).optional(),
  side: z.enum(["BUY", "SELL"]).optional(),
  demoClaims: z.record(z.union([z.string(), z.boolean()])).optional()
});

export const cowOrderSchema = z.object({
  owner: addressSchema,
  sellToken: z.string().min(1),
  buyToken: z.string().min(1),
  sellAmount: amountSchema,
  kind: z.enum(["sell", "buy"]),
  chainId: z.number().int().positive(),
  jurisdiction: z.string().min(2).max(8).optional()
});

export const prepareSchema = z.object({
  routeId: z.string().uuid(),
  wallet: addressSchema,
  orderId: z.string().uuid().optional()
});

export const orderCreateSchema = routeSchema;

const marketHoursSchema = z.object({
  daysUtc: z.array(z.number().int().min(0).max(6)),
  startHourUtc: z.number().int().min(0).max(23),
  endHourUtc: z.number().int().min(1).max(24)
});

export const productionAssetSchema = z.object({
  assetId: z.string().min(1),
  chainId: z.number().int().positive(),
  contractAddress: addressSchema,
  symbol: z.string().min(1).max(32),
  name: z.string().min(1).max(160),
  decimals: z.number().int().min(0).max(36),
  assetType: z.enum(["ERC20", "RWA", "TREASURY", "CREDIT", "EQUITY", "FUND", "COMMODITY", "OTHER"]),
  issuer: z.string().min(1),
  issuerUrl: z.string().url().optional(),
  permissioned: z.boolean(),
  kycRequired: z.boolean(),
  accreditationRequired: z.boolean(),
  allowedJurisdictions: z.array(z.string()),
  blockedJurisdictions: z.array(z.string()),
  minimumTradeSize: z.string().regex(/^\d+$/).optional(),
  maximumTradeSize: z.string().regex(/^\d+$/).optional(),
  marketHours: marketHoursSchema.optional(),
  timezone: z.string().default("UTC"),
  settlementType: z.array(z.enum(["atomic", "issuer-mint", "issuer-redeem", "rfq", "permissioned-amm", "vault"])),
  transferRestrictions: z.array(z.string()),
  mintRedeemSupported: z.boolean(),
  rfqSupported: z.boolean(),
  poolSupported: z.boolean(),
  liquidityAdapters: z.array(z.string()),
  walletWhitelist: z.array(addressSchema).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export const productionAssetPatchSchema = productionAssetSchema.partial().omit({ assetId: true, createdAt: true });
