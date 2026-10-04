import { randomUUID } from "node:crypto";
import { mulDivFloor, subtractBps, toBigInt } from "../core/math.js";
import type { AdapterQuote, ExecutionStep, QuoteRequest } from "../core/types.js";
import type { LiquidityAdapter, SupportedPair } from "./types.js";

interface RfqMarket {
  sellAssetId: string;
  buyAssetId: string;
  priceNumerator: string;
  priceDenominator: string;
  maxSellAtomic: string;
  feeBps: number;
}

export class RfqAdapter implements LiquidityAdapter {
  constructor(readonly id: string, private readonly markets: RfqMarket[], private readonly ttlSeconds = 20) {}

  async listPairs(): Promise<SupportedPair[]> {
    return this.markets.map((m) => ({ sellAssetId: m.sellAssetId, buyAssetId: m.buyAssetId, liquidityModel: "rfq" }));
  }

  async supports(sellAssetId: string, buyAssetId: string): Promise<boolean> {
    return this.markets.some((m) => m.sellAssetId === sellAssetId && m.buyAssetId === buyAssetId);
  }

  async quote(request: QuoteRequest): Promise<AdapterQuote | null> {
    const market = this.markets.find((m) => m.sellAssetId === request.sellAssetId && m.buyAssetId === request.buyAssetId);
    if (!market) return null;
    const sell = toBigInt(request.sellAmountAtomic);
    if (sell > toBigInt(market.maxSellAtomic)) return null;

    const gross = mulDivFloor(sell, BigInt(market.priceNumerator), BigInt(market.priceDenominator));
    const net = subtractBps(gross, market.feeBps);

    return {
      id: randomUUID(),
      adapterId: this.id,
      liquidityModel: "rfq",
      sellAssetId: request.sellAssetId,
      buyAssetId: request.buyAssetId,
      sellAmountAtomic: request.sellAmountAtomic,
      buyAmountAtomic: net.toString(),
      feeAmountAtomic: (gross - net).toString(),
      expiresAt: new Date(Date.now() + this.ttlSeconds * 1000).toISOString(),
      confidenceBps: 10000,
      settlement: "rfq",
      metadata: { maxSellAtomic: market.maxSellAtomic, feeBps: market.feeBps }
    };
  }

  async buildExecution(quote: AdapterQuote): Promise<ExecutionStep[]> {
    return [
      { type: "signature", description: `Accept signed RFQ ${quote.id} from ${this.id}` },
      { type: "call", description: `Settle RFQ ${quote.id}` }
    ];
  }
}
