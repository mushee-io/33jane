import { randomUUID } from "node:crypto";
import type {
  AdapterQuote,
  ExecutionStep,
  QuoteRequest
} from "../core/types.js";
import type { LiquidityAdapter, SupportedPair } from "./types.js";
import { OpenEdenOnchainIssuer } from "../issuers/openeden-onchain.js";

export class OpenEdenVaultAdapter implements LiquidityAdapter {
  readonly id = "openeden-onchain-vault";

  constructor(private readonly issuer: OpenEdenOnchainIssuer) {}

  async listPairs(): Promise<SupportedPair[]> {
    return [{
      sellAssetId: "1:usdc",
      buyAssetId: "1:openeden-tbill",
      liquidityModel: "issuer-mint"
    }];
  }

  async supports(sellAssetId: string, buyAssetId: string): Promise<boolean> {
    return sellAssetId === "1:usdc" && buyAssetId === "1:openeden-tbill";
  }

  async quote(request: QuoteRequest): Promise<AdapterQuote | null> {
    if (!(await this.supports(request.sellAssetId, request.buyAssetId))) return null;

    const mint = await this.issuer.quoteMint(
      request.context.wallet,
      request.sellAmountAtomic
    );

    return {
      id: randomUUID(),
      adapterId: this.id,
      liquidityModel: "issuer-mint",
      sellAssetId: request.sellAssetId,
      buyAssetId: request.buyAssetId,
      sellAmountAtomic: request.sellAmountAtomic,
      buyAmountAtomic: mint.buyAmount,
      feeAmountAtomic: mint.feeAmount,
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
      confidenceBps: 10000,
      settlement: "issuer-mint",
      metadata: {
        environment: "production",
        source: "openeden-onchain-vault",
        executable: mint.executable,
        depositPaused: mint.depositPaused,
        firstDepositSatisfied: mint.firstDepositSatisfied,
        rate: mint.rate,
        minDeposit: mint.minDeposit,
        maxDeposit: mint.maxDeposit,
        firstDepositMinimum: mint.firstDepositMinimum,
        reasons: mint.reasons.join(",")
      }
    };
  }

  async buildExecution(
    quote: AdapterQuote,
    context: { wallet: `0x${string}`; recipient?: `0x${string}` }
  ): Promise<ExecutionStep[]> {
    if (quote.metadata?.executable === false) {
      throw new Error(String(quote.metadata.reasons ?? "OPENEDEN_QUOTE_NOT_EXECUTABLE"));
    }

    const receiver = context.recipient ?? context.wallet;
    const approval = this.issuer.buildMintApproval(quote.sellAmountAtomic);
    const deposit = this.issuer.buildMintCall(quote.sellAmountAtomic, receiver);

    return [
      {
        type: "approve",
        target: approval.target,
        data: approval.data,
        description: "Approve OpenEden vault to spend USDC"
      },
      {
        type: "call",
        target: deposit.target,
        data: deposit.data,
        description: "Deposit USDC into OpenEden and mint TBILL"
      }
    ];
  }
}
