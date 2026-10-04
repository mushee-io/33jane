import type { AdapterQuote } from "../core/types.js";
import type { ProductionAsset, LiquiditySource, NormalizedQuote } from "./types.js";

function sourceFor(adapterId: string, settlement: AdapterQuote["settlement"]): LiquiditySource {
  const id = adapterId.toLowerCase();
  if (id.includes("cow")) return "COW";
  if (settlement === "rfq" || id.includes("rfq")) return "RFQ";
  if (settlement === "issuer-mint" || settlement === "issuer-redeem" || id.includes("issuer") || id.includes("provider")) {
    return "MINT_REDEEM";
  }
  if (settlement === "permissioned-amm" || id.includes("amm") || id.includes("pool")) return "PERMISSIONED_POOL";
  return "OTHER";
}

function complexity(settlement: AdapterQuote["settlement"]): number {
  switch (settlement) {
    case "atomic": return 1;
    case "permissioned-amm": return 2;
    case "rfq": return 2;
    case "issuer-mint":
    case "issuer-redeem": return 3;
    case "vault": return 3;
  }
}

function effectivePrice(sellAmount: string, buyAmount: string): string {
  const sell = BigInt(sellAmount);
  const buy = BigInt(buyAmount);
  if (sell === 0n) return "0";
  const scale = 10n ** 18n;
  const scaled = (buy * scale) / sell;
  const text = scaled.toString().padStart(19, "0");
  return `${text.slice(0, -18)}.${text.slice(-18)}`;
}

export function normalizeQuote(
  quote: AdapterQuote,
  sellAsset: ProductionAsset,
  buyAsset: ProductionAsset,
  executionRequirements: string[] = []
): NormalizedQuote {
  const metadataExecutable = quote.metadata?.executable;
  return {
    quoteId: quote.id,
    adapterId: quote.adapterId,
    source: sourceFor(quote.adapterId, quote.settlement),
    sellToken: sellAsset.contractAddress,
    buyToken: buyAsset.contractAddress,
    sellAssetId: sellAsset.assetId,
    buyAssetId: buyAsset.assetId,
    sellAmount: quote.sellAmountAtomic,
    buyAmount: quote.buyAmountAtomic,
    effectivePrice: effectivePrice(quote.sellAmountAtomic, quote.buyAmountAtomic),
    fees: quote.feeAmountAtomic ?? "0",
    expiresAt: quote.expiresAt,
    settlementType: quote.settlement,
    eligibilityRequired: buyAsset.permissioned || sellAsset.permissioned,
    executable: metadataExecutable !== false,
    executionRequirements,
    settlementComplexity: complexity(quote.settlement),
    rawQuote: quote
  };
}
