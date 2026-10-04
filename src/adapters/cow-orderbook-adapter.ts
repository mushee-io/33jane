import { randomUUID } from "node:crypto";
import type { AdapterQuote, ExecutionStep, QuoteRequest } from "../core/types.js";
import { AssetRegistry } from "../registry/asset-registry.js";
import { CowOrderbookClient, type CowNetwork } from "../cow/client.js";
import type { LiquidityAdapter, SupportedPair } from "./types.js";

export interface CowPairConfig {
  sellAssetId: string;
  buyAssetId: string;
}

export class CowOrderbookAdapter implements LiquidityAdapter {
  constructor(
    readonly id: string,
    private readonly network: CowNetwork,
    private readonly assets: AssetRegistry,
    private readonly client: CowOrderbookClient,
    private readonly pairs: CowPairConfig[]
  ) {}

  async listPairs(): Promise<SupportedPair[]> {
    return this.pairs.map((pair) => ({ ...pair, liquidityModel: "atomic" }));
  }

  async supports(sellAssetId: string, buyAssetId: string): Promise<boolean> {
    return this.pairs.some((pair) =>
      pair.sellAssetId === sellAssetId && pair.buyAssetId === buyAssetId
    );
  }

  async quote(request: QuoteRequest): Promise<AdapterQuote | null> {
    if (!(await this.supports(request.sellAssetId, request.buyAssetId))) return null;
    const sell = this.assets.get(request.sellAssetId);
    const buy = this.assets.get(request.buyAssetId);

    const envelope = await this.client.getQuote(this.network, {
      sellToken: sell.address,
      buyToken: buy.address,
      sellAmountBeforeFee: request.sellAmountAtomic,
      kind: "sell",
      from: request.context.wallet,
      receiver: request.context.recipient ?? request.context.wallet,
      priceQuality: "optimal"
    });

    const quote = (envelope.quote ?? envelope) as Record<string, unknown>;
    const buyAmount = String(
      quote.buyAmount ??
      quote.buyAmountAfterFee ??
      envelope.buyAmount ??
      ""
    );
    if (!/^\d+$/.test(buyAmount) || BigInt(buyAmount) <= 0n) return null;

    const feeAmountRaw = quote.feeAmount ?? envelope.feeAmount;
    const validToRaw = quote.validTo ?? envelope.validTo;
    const expiration = envelope.expiration ??
      (typeof validToRaw === "number"
        ? new Date(validToRaw * 1000).toISOString()
        : new Date(Date.now() + 30_000).toISOString());

    return {
      id: String(envelope.id ?? randomUUID()),
      adapterId: this.id,
      liquidityModel: "atomic",
      sellAssetId: request.sellAssetId,
      buyAssetId: request.buyAssetId,
      sellAmountAtomic: request.sellAmountAtomic,
      buyAmountAtomic: buyAmount,
      feeAmountAtomic: feeAmountRaw === undefined ? undefined : String(feeAmountRaw),
      expiresAt: String(expiration),
      confidenceBps: envelope.verified === false ? 9500 : 10000,
      settlement: "atomic",
      metadata: {
        cowNetwork: this.network,
        verified: envelope.verified !== false
      }
    };
  }

  async buildExecution(quote: AdapterQuote): Promise<ExecutionStep[]> {
    return [
      {
        type: "signature",
        description: `Sign CoW order derived from quote ${quote.id}`
      },
      {
        type: "call",
        description: `Submit signed CoW order on ${this.network}`
      }
    ];
  }
}
