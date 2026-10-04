import { toBigInt } from "../core/math.js";
import type {
  ConstraintCheck,
  EligibilityDecision,
  ExecutionContext,
  RwaAsset
} from "../core/types.js";
import type { EligibilityProvider } from "./providers.js";

export class ConstraintEngine {
  constructor(private readonly providers: EligibilityProvider[] = []) {}

  async evaluate(asset: RwaAsset, amountAtomic: string, context: ExecutionContext): Promise<EligibilityDecision> {
    const checks: ConstraintCheck[] = [];
    const amount = toBigInt(amountAtomic);

    if (asset.constraints.minTradeAtomic) {
      const min = toBigInt(asset.constraints.minTradeAtomic);
      checks.push({
        code: "MIN_TRADE",
        ok: amount >= min,
        message: amount >= min ? "minimum trade satisfied" : "trade is below minimum",
        source: "asset-policy"
      });
    }

    if (asset.constraints.maxTradeAtomic) {
      const max = toBigInt(asset.constraints.maxTradeAtomic);
      checks.push({
        code: "MAX_TRADE",
        ok: amount <= max,
        message: amount <= max ? "maximum trade satisfied" : "trade exceeds maximum",
        source: "asset-policy"
      });
    }

    const market = asset.constraints.marketHours;
    if (market) {
      const now = context.now ?? new Date();
      const day = now.getUTCDay();
      const hour = now.getUTCHours();
      const open =
        market.daysUtc.includes(day) &&
        hour >= market.startHourUtc &&
        hour < market.endHourUtc;
      checks.push({
        code: "MARKET_HOURS",
        ok: open,
        message: open ? "market is open" : "market is closed",
        source: "asset-policy"
      });
    }

    for (const provider of this.providers) {
      checks.push(...(await provider.check(asset, amountAtomic, context)));
    }

    const failed = checks.filter((check) => !check.ok);
    return {
      allowed: failed.length === 0,
      checks,
      reasons: failed.map((check) => check.code)
    };
  }
}
