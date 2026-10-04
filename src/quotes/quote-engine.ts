import { compareAtomicDesc } from "../core/math.js";
import type {
  AdapterQuote,
  EligibilityDecision,
  QuoteRequest,
  RankedQuote
} from "../core/types.js";
import { AdapterRegistry } from "../adapters/adapter-registry.js";
import { ConstraintEngine } from "../eligibility/constraint-engine.js";
import { EvidenceStore } from "../observability/evidence-store.js";
import { AssetRegistry } from "../registry/asset-registry.js";

export interface QuoteRejection {
  adapterId: string;
  quote?: AdapterQuote;
  eligibility?: EligibilityDecision;
  reason: string;
}

export interface QuoteResult {
  quotes: RankedQuote[];
  rejected: QuoteRejection[];
}

export class QuoteEngine {
  constructor(
    private readonly assets: AssetRegistry,
    private readonly adapters: AdapterRegistry,
    private readonly constraints: ConstraintEngine,
    private readonly evidence?: EvidenceStore
  ) {}

  async quote(request: QuoteRequest): Promise<QuoteResult> {
    this.assets.get(request.sellAssetId);
    const buyAsset = this.assets.get(request.buyAssetId);
    const candidates = await this.adapters.supporting(request.sellAssetId, request.buyAssetId);

    const accepted: Array<{ quote: AdapterQuote; eligibility: EligibilityDecision }> = [];
    const rejected: QuoteRejection[] = [];

    for (const adapter of candidates) {
      try {
        const quote = await adapter.quote(request);
        if (!quote) {
          rejected.push({ adapterId: adapter.id, reason: "NO_EXECUTABLE_QUOTE" });
          continue;
        }
        if (new Date(quote.expiresAt).getTime() <= Date.now()) {
          rejected.push({ adapterId: adapter.id, quote, reason: "QUOTE_EXPIRED" });
          continue;
        }

        const eligibility = await this.constraints.evaluate(
          buyAsset,
          quote.buyAmountAtomic,
          request.context
        );

        if (!eligibility.allowed) {
          rejected.push({
            adapterId: adapter.id,
            quote,
            eligibility,
            reason: "ASSET_CONSTRAINTS_FAILED"
          });
          continue;
        }

        accepted.push({ quote, eligibility });
      } catch (error) {
        rejected.push({
          adapterId: adapter.id,
          reason: error instanceof Error ? error.message : "ADAPTER_ERROR"
        });
      }
    }

    accepted.sort((a, b) => compareAtomicDesc(a.quote.buyAmountAtomic, b.quote.buyAmountAtomic));
    this.evidence?.recordQuote(accepted.length > 0);

    return {
      quotes: accepted.map((item, index) => ({ ...item, rank: index + 1 })),
      rejected
    };
  }
}
