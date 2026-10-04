import type {
  AdapterQuote,
  AssetId,
  ExecutionContext,
  ExecutionStep,
  QuoteRequest,
  SettlementModel
} from "../core/types.js";

export interface SupportedPair {
  sellAssetId: AssetId;
  buyAssetId: AssetId;
  liquidityModel: SettlementModel;
}

export interface LiquidityAdapter {
  readonly id: string;
  listPairs(): Promise<SupportedPair[]>;
  supports(sellAssetId: AssetId, buyAssetId: AssetId): Promise<boolean>;
  quote(request: QuoteRequest): Promise<AdapterQuote | null>;
  buildExecution(quote: AdapterQuote, context: ExecutionContext): Promise<ExecutionStep[]>;
}
