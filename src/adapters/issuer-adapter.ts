import { randomUUID } from "node:crypto";
import { mulDivFloor, subtractBps, toBigInt } from "../core/math.js";
import type { AdapterQuote, ExecutionStep, QuoteRequest } from "../core/types.js";
import type { LiquidityAdapter, SupportedPair } from "./types.js";

interface IssuerAdapterConfig {
  id: string;
  cashAssetId: string;
  rwaAssetId: string;
  mintRateNumerator: string;
  mintRateDenominator: string;
  redeemRateNumerator: string;
  redeemRateDenominator: string;
  mintFeeBps: number;
  redeemFeeBps: number;
  quoteTtlSeconds?: number;
}

export class IssuerAdapter implements LiquidityAdapter {
  readonly id: string;

  constructor(private readonly config: IssuerAdapterConfig) {
    this.id = config.id;
  }

  async listPairs(): Promise<SupportedPair[]> {
    return [
      { sellAssetId: this.config.cashAssetId, buyAssetId: this.config.rwaAssetId, liquidityModel: "issuer-mint" },
      { sellAssetId: this.config.rwaAssetId, buyAssetId: this.config.cashAssetId, liquidityModel: "issuer-redeem" }
    ];
  }

  async supports(sellAssetId: string, buyAssetId: string): Promise<boolean> {
    return (await this.listPairs()).some((pair) => pair.sellAssetId === sellAssetId && pair.buyAssetId === buyAssetId);
  }

  async quote(request: QuoteRequest): Promise<AdapterQuote | null> {
    const minting = request.sellAssetId === this.config.cashAssetId && request.buyAssetId === this.config.rwaAssetId;
    const redeeming = request.sellAssetId === this.config.rwaAssetId && request.buyAssetId === this.config.cashAssetId;
    if (!minting && !redeeming) return null;

    const input = toBigInt(request.sellAmountAtomic);
    const raw = minting
      ? mulDivFloor(input, BigInt(this.config.mintRateNumerator), BigInt(this.config.mintRateDenominator))
      : mulDivFloor(input, BigInt(this.config.redeemRateNumerator), BigInt(this.config.redeemRateDenominator));
    const feeBps = minting ? this.config.mintFeeBps : this.config.redeemFeeBps;
    const output = subtractBps(raw, feeBps);
    const fee = raw - output;
    const ttl = this.config.quoteTtlSeconds ?? 30;

    return {
      id: randomUUID(),
      adapterId: this.id,
      liquidityModel: minting ? "issuer-mint" : "issuer-redeem",
      sellAssetId: request.sellAssetId,
      buyAssetId: request.buyAssetId,
      sellAmountAtomic: request.sellAmountAtomic,
      buyAmountAtomic: output.toString(),
      feeAmountAtomic: fee.toString(),
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      confidenceBps: 9950,
      settlement: minting ? "issuer-mint" : "issuer-redeem",
      metadata: { feeBps }
    };
  }

  async buildExecution(quote: AdapterQuote): Promise<ExecutionStep[]> {
    return [
      {
        type: "call",
        description: quote.liquidityModel === "issuer-mint"
          ? `Mint ${quote.buyAssetId} with issuer adapter ${this.id}`
          : `Redeem ${quote.sellAssetId} with issuer adapter ${this.id}`
      }
    ];
  }
}
