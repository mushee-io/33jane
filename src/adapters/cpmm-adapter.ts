import { randomUUID } from "node:crypto";
import { subtractBps, toBigInt } from "../core/math.js";
import type { AdapterQuote, ExecutionStep, QuoteRequest } from "../core/types.js";
import type { LiquidityAdapter, SupportedPair } from "./types.js";

interface PoolConfig {
  tokenA: string;
  tokenB: string;
  reserveA: string;
  reserveB: string;
  feeBps: number;
}

export class ConstantProductAdapter implements LiquidityAdapter {
  constructor(readonly id: string, private readonly pools: PoolConfig[]) {}

  async listPairs(): Promise<SupportedPair[]> {
    return this.pools.flatMap((p) => [
      { sellAssetId: p.tokenA, buyAssetId: p.tokenB, liquidityModel: "permissioned-amm" as const },
      { sellAssetId: p.tokenB, buyAssetId: p.tokenA, liquidityModel: "permissioned-amm" as const }
    ]);
  }

  async supports(sellAssetId: string, buyAssetId: string): Promise<boolean> {
    return this.pools.some((p) =>
      (p.tokenA === sellAssetId && p.tokenB === buyAssetId) ||
      (p.tokenB === sellAssetId && p.tokenA === buyAssetId)
    );
  }

  async quote(request: QuoteRequest): Promise<AdapterQuote | null> {
    const pool = this.pools.find((p) =>
      (p.tokenA === request.sellAssetId && p.tokenB === request.buyAssetId) ||
      (p.tokenB === request.sellAssetId && p.tokenA === request.buyAssetId)
    );
    if (!pool) return null;

    const aToB = pool.tokenA === request.sellAssetId;
    const reserveIn = toBigInt(aToB ? pool.reserveA : pool.reserveB);
    const reserveOut = toBigInt(aToB ? pool.reserveB : pool.reserveA);
    const sell = toBigInt(request.sellAmountAtomic);
    const afterFee = subtractBps(sell, pool.feeBps);
    const output = (afterFee * reserveOut) / (reserveIn + afterFee);
    if (output <= 0n || output >= reserveOut) return null;

    return {
      id: randomUUID(),
      adapterId: this.id,
      liquidityModel: "permissioned-amm",
      sellAssetId: request.sellAssetId,
      buyAssetId: request.buyAssetId,
      sellAmountAtomic: request.sellAmountAtomic,
      buyAmountAtomic: output.toString(),
      feeAmountAtomic: (sell - afterFee).toString(),
      expiresAt: new Date(Date.now() + 15_000).toISOString(),
      confidenceBps: 9900,
      settlement: "permissioned-amm",
      metadata: { feeBps: pool.feeBps }
    };
  }

  async buildExecution(quote: AdapterQuote): Promise<ExecutionStep[]> {
    return [{ type: "call", description: `Swap through pool adapter ${this.id} for quote ${quote.id}` }];
  }
}
