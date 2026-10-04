import type { AssetId } from "../core/types.js";
import type { LiquidityAdapter } from "./types.js";

export class AdapterRegistry {
  private readonly adapters = new Map<string, LiquidityAdapter>();

  register(adapter: LiquidityAdapter): void {
    if (this.adapters.has(adapter.id)) throw new Error(`Adapter already registered: ${adapter.id}`);
    this.adapters.set(adapter.id, adapter);
  }

  list(): LiquidityAdapter[] {
    return [...this.adapters.values()];
  }

  async supporting(sellAssetId: AssetId, buyAssetId: AssetId): Promise<LiquidityAdapter[]> {
    const matches: LiquidityAdapter[] = [];
    for (const adapter of this.adapters.values()) {
      if (await adapter.supports(sellAssetId, buyAssetId)) matches.push(adapter);
    }
    return matches;
  }
}
