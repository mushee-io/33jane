export type AssetId = string;
export type Address = `0x${string}`;

export type AssetCategory =
  | "stablecoin"
  | "tokenized-treasury"
  | "tokenized-equity"
  | "credit"
  | "commodity"
  | "fund"
  | "yield-bearing"
  | "other";

export type SettlementModel =
  | "atomic"
  | "issuer-mint"
  | "issuer-redeem"
  | "rfq"
  | "permissioned-amm"
  | "vault";

export interface ClaimRequirement {
  key: string;
  equals?: string | boolean;
  oneOf?: Array<string | boolean>;
}

export interface MarketHours {
  daysUtc: number[];
  startHourUtc: number;
  endHourUtc: number;
}

export interface AssetConstraints {
  minTradeAtomic?: string;
  maxTradeAtomic?: string;
  requiresEligibleWallet?: boolean;
  requiredClaims?: ClaimRequirement[];
  marketHours?: MarketHours;
}

export interface RwaAsset {
  id: AssetId;
  chainId: number;
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  category: AssetCategory;
  issuer: string;
  settlementModels: SettlementModel[];
  quoteCurrencies: AssetId[];
  constraints: AssetConstraints;
  metadata?: Record<string, string | number | boolean>;
}

export interface ExecutionContext {
  wallet: Address;
  recipient?: Address;
  claims?: Record<string, string | boolean>;
  now?: Date;
}

export interface ConstraintCheck {
  code: string;
  ok: boolean;
  message: string;
  source: string;
}

export interface EligibilityDecision {
  allowed: boolean;
  checks: ConstraintCheck[];
  reasons: string[];
}

export interface QuoteRequest {
  sellAssetId: AssetId;
  buyAssetId: AssetId;
  sellAmountAtomic: string;
  context: ExecutionContext;
}

export interface ExecutionStep {
  type: "approve" | "call" | "signature" | "transfer";
  target?: Address;
  description: string;
  data?: string;
  value?: string;
}

export interface AdapterQuote {
  id: string;
  adapterId: string;
  liquidityModel: SettlementModel;
  sellAssetId: AssetId;
  buyAssetId: AssetId;
  sellAmountAtomic: string;
  buyAmountAtomic: string;
  feeAmountAtomic?: string;
  expiresAt: string;
  confidenceBps: number;
  settlement: SettlementModel;
  metadata?: Record<string, string | number | boolean>;
}

export interface RankedQuote {
  quote: AdapterQuote;
  eligibility: EligibilityDecision;
  rank: number;
}

export interface RouteLeg {
  quote: AdapterQuote;
}

export interface Route {
  id: string;
  sellAssetId: AssetId;
  buyAssetId: AssetId;
  sellAmountAtomic: string;
  buyAmountAtomic: string;
  legs: RouteLeg[];
}
