import { randomUUID } from "node:crypto";
import type { AdapterQuote, ExecutionStep, QuoteRequest, SettlementModel } from "../core/types.js";
import type { LiquidityAdapter, SupportedPair } from "./types.js";

export interface ProviderPair {
  sellAssetId: string;
  buyAssetId: string;
  liquidityModel: SettlementModel;
}

export interface ProviderQuoteResponse {
  quoteId?: string;
  buyAmountAtomic: string;
  feeAmountAtomic?: string;
  expiresAt?: string;
  confidenceBps?: number;
  execution?: {
    target?: string;
    data?: string;
    value?: string;
    signatureRequired?: boolean;
  };
  metadata?: Record<string, string | number | boolean>;
}

export interface ProviderHttpAdapterConfig {
  id: string;
  quoteEndpoint: string;
  pairs: ProviderPair[];
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export class ProviderHttpAdapter implements LiquidityAdapter {
  readonly id: string;
  private readonly fetchImpl: typeof fetch;
  private readonly executionByQuote = new Map<string, ProviderQuoteResponse["execution"]>();

  constructor(private readonly config: ProviderHttpAdapterConfig) {
    this.id = config.id;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async listPairs(): Promise<SupportedPair[]> {
    return this.config.pairs.map((pair) => ({ ...pair }));
  }

  async supports(sellAssetId: string, buyAssetId: string): Promise<boolean> {
    return this.config.pairs.some((pair) =>
      pair.sellAssetId === sellAssetId && pair.buyAssetId === buyAssetId
    );
  }

  async quote(request: QuoteRequest): Promise<AdapterQuote | null> {
    const pair = this.config.pairs.find((candidate) =>
      candidate.sellAssetId === request.sellAssetId &&
      candidate.buyAssetId === request.buyAssetId
    );
    if (!pair) return null;

    const response = await this.fetchImpl(this.config.quoteEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {})
      },
      body: JSON.stringify({
        sellAssetId: request.sellAssetId,
        buyAssetId: request.buyAssetId,
        sellAmountAtomic: request.sellAmountAtomic,
        wallet: request.context.wallet,
        recipient: request.context.recipient ?? request.context.wallet,
        claims: request.context.claims ?? {}
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`PROVIDER_QUOTE_HTTP_${response.status}:${text.slice(0, 500)}`);
    }

    const payload = await response.json() as ProviderQuoteResponse;
    if (!/^\d+$/.test(payload.buyAmountAtomic) || BigInt(payload.buyAmountAtomic) <= 0n) {
      throw new Error("PROVIDER_INVALID_BUY_AMOUNT");
    }

    const id = payload.quoteId ?? randomUUID();
    if (payload.execution) this.executionByQuote.set(id, payload.execution);

    return {
      id,
      adapterId: this.id,
      liquidityModel: pair.liquidityModel,
      sellAssetId: request.sellAssetId,
      buyAssetId: request.buyAssetId,
      sellAmountAtomic: request.sellAmountAtomic,
      buyAmountAtomic: payload.buyAmountAtomic,
      feeAmountAtomic: payload.feeAmountAtomic,
      expiresAt: payload.expiresAt ?? new Date(Date.now() + 30_000).toISOString(),
      confidenceBps: payload.confidenceBps ?? 9750,
      settlement: pair.liquidityModel,
      metadata: payload.metadata
    };
  }

  async buildExecution(quote: AdapterQuote): Promise<ExecutionStep[]> {
    const execution = this.executionByQuote.get(quote.id);
    const steps: ExecutionStep[] = [];
    if (execution?.signatureRequired) {
      steps.push({ type: "signature", description: `Authorize provider quote ${quote.id}` });
    }
    steps.push({
      type: "call",
      target: execution?.target as ExecutionStep["target"],
      data: execution?.data,
      value: execution?.value,
      description: `Execute provider quote ${quote.id} via ${this.id}`
    });
    return steps;
  }
}
