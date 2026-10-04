import type { Address, AdapterQuote, SettlementModel } from "../core/types.js";

export type ProductionAssetType =
  | "ERC20"
  | "RWA"
  | "TREASURY"
  | "CREDIT"
  | "EQUITY"
  | "FUND"
  | "COMMODITY"
  | "OTHER";

export type AssetStatus = "ACTIVE" | "INACTIVE";

export interface ProductionAsset {
  assetId: string;
  chainId: number;
  contractAddress: Address;
  symbol: string;
  name: string;
  decimals: number;
  assetType: ProductionAssetType;
  issuer: string;
  issuerUrl?: string;
  permissioned: boolean;
  kycRequired: boolean;
  accreditationRequired: boolean;
  allowedJurisdictions: string[];
  blockedJurisdictions: string[];
  minimumTradeSize?: string;
  maximumTradeSize?: string;
  marketHours?: {
    daysUtc: number[];
    startHourUtc: number;
    endHourUtc: number;
  };
  timezone: string;
  settlementType: SettlementModel[];
  transferRestrictions: string[];
  mintRedeemSupported: boolean;
  rfqSupported: boolean;
  poolSupported: boolean;
  liquidityAdapters: string[];
  walletWhitelist?: Address[];
  status: AssetStatus;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export type RuleCode =
  | "PASS"
  | "WALLET_NOT_WHITELISTED"
  | "KYC_REQUIRED"
  | "JURISDICTION_BLOCKED"
  | "JURISDICTION_NOT_ALLOWED"
  | "MARKET_CLOSED"
  | "BELOW_MINIMUM_SIZE"
  | "ABOVE_MAXIMUM_SIZE"
  | "TRANSFER_RESTRICTED"
  | "ASSET_DISABLED"
  | "UNSUPPORTED_CHAIN"
  | "ACCREDITATION_REQUIRED"
  | "LIQUIDITY_VENUE_RESTRICTED";

export interface RuleResult {
  passed: boolean;
  code: RuleCode;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface TrustedEligibility {
  verified: boolean;
  eligible?: boolean;
  kyc?: boolean;
  accredited?: boolean;
  whitelisted?: boolean;
  transferAllowed?: boolean;
  jurisdiction?: string;
  reasons?: string[];
  source?: string;
}

export interface EligibilityInput {
  wallet: Address;
  asset: string;
  chainId: number;
  amount: string;
  side: "BUY" | "SELL";
  jurisdiction?: string;
  demoClaims?: Record<string, string | boolean>;
}

export interface EligibilityResult {
  eligible: boolean;
  status: "ELIGIBLE" | "INELIGIBLE";
  checks: RuleResult[];
  requirements: string[];
  reasons: RuleCode[];
  trustedEligibility?: TrustedEligibility;
}

export type LiquiditySource = "RFQ" | "MINT_REDEEM" | "PERMISSIONED_POOL" | "COW" | "OTHER";

export interface NormalizedQuote {
  quoteId: string;
  adapterId: string;
  source: LiquiditySource;
  sellToken: Address;
  buyToken: Address;
  sellAssetId: string;
  buyAssetId: string;
  sellAmount: string;
  buyAmount: string;
  effectivePrice: string;
  fees: string;
  expiresAt: string;
  settlementType: SettlementModel;
  eligibilityRequired: boolean;
  executable: boolean;
  executionRequirements: string[];
  settlementComplexity: number;
  rawQuote: AdapterQuote;
}

export interface RouteRequest {
  wallet: Address;
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  jurisdiction?: string;
  side?: "BUY" | "SELL";
  demoClaims?: Record<string, string | boolean>;
}

export interface RouteCandidate {
  quote: NormalizedQuote;
  eligibility: EligibilityResult;
  rejectionReasons: string[];
}

export interface ExecutableRouteResult {
  routeId: string;
  eligible: boolean;
  bestRoute: RouteCandidate | null;
  alternatives: RouteCandidate[];
  constraints: RuleResult[];
  rejected: Array<{ adapterId: string; reason: string; quoteId?: string }>;
  expiresAt?: string;
  createdAt: string;
}

export type ExecutionMode = "SIMULATED" | "TESTNET" | "MANUAL_RFQ" | "MAINNET_READY" | "MAINNET";

export interface ExecutionPreparation {
  executionId: string;
  routeId: string;
  status: "READY" | "AWAITING_APPROVAL" | "BLOCKED";
  mode: ExecutionMode;
  transactions: Array<{
    target?: Address;
    data?: string;
    value?: string;
    description: string;
  }>;
  approvals: Array<{ target?: Address; description: string }>;
  signaturesRequired: string[];
  requirements: string[];
  expiresAt?: string;
  settlement: Record<string, unknown>;
  simulation?: Record<string, unknown>;
  createdAt: string;
}

export type OrderState =
  | "CREATED"
  | "CHECKING_ELIGIBILITY"
  | "INELIGIBLE"
  | "QUOTING"
  | "ROUTE_FOUND"
  | "AWAITING_APPROVAL"
  | "READY"
  | "SUBMITTED"
  | "SETTLED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export interface OrderRecord {
  id: string;
  state: OrderState;
  request: RouteRequest;
  routeId?: string;
  executionId?: string;
  failureCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  eventId: string;
  orderId?: string;
  timestamp: string;
  eventType: string;
  actor: string;
  metadata: Record<string, unknown>;
}
