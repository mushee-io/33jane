import { randomUUID } from "node:crypto";
import type { AssetId, ExecutionContext, Route } from "../core/types.js";
import { AdapterRegistry } from "../adapters/adapter-registry.js";
import { QuoteEngine } from "../quotes/quote-engine.js";

interface SearchState {
  assetId: AssetId;
  amountAtomic: string;
  visited: Set<AssetId>;
  legs: Route["legs"];
}

export interface RouteSearchOptions {
  maxHops?: number;
  maxStatesPerDepth?: number;
}

export class RouteEngine {
  constructor(
    private readonly adapters: AdapterRegistry,
    private readonly quotes: QuoteEngine
  ) {}

  async findRoutes(
    sellAssetId: AssetId,
    buyAssetId: AssetId,
    sellAmountAtomic: string,
    context: ExecutionContext,
    options: RouteSearchOptions = {}
  ): Promise<Route[]> {
    const maxHops = options.maxHops ?? 3;
    const maxStatesPerDepth = options.maxStatesPerDepth ?? 30;
    let frontier: SearchState[] = [{
      assetId: sellAssetId,
      amountAtomic: sellAmountAtomic,
      visited: new Set([sellAssetId]),
      legs: []
    }];

    const routes: Route[] = [];

    for (let depth = 0; depth < maxHops; depth += 1) {
      const next: SearchState[] = [];

      for (const state of frontier) {
        const pairs = (await Promise.all(
          this.adapters.list().map((adapter) => adapter.listPairs())
        )).flat().filter((pair) => pair.sellAssetId === state.assetId);

        const uniqueDestinations = [...new Set(pairs.map((pair) => pair.buyAssetId))];

        for (const destination of uniqueDestinations) {
          if (state.visited.has(destination)) continue;

          const result = await this.quotes.quote({
            sellAssetId: state.assetId,
            buyAssetId: destination,
            sellAmountAtomic: state.amountAtomic,
            context
          });

          for (const ranked of result.quotes.slice(0, 3)) {
            const legs = [...state.legs, { quote: ranked.quote }];
            if (destination === buyAssetId) {
              routes.push({
                id: randomUUID(),
                sellAssetId,
                buyAssetId,
                sellAmountAtomic,
                buyAmountAtomic: ranked.quote.buyAmountAtomic,
                legs
              });
              continue;
            }

            next.push({
              assetId: destination,
              amountAtomic: ranked.quote.buyAmountAtomic,
              visited: new Set([...state.visited, destination]),
              legs
            });
          }
        }
      }

      next.sort((a, b) => {
        const aa = BigInt(a.amountAtomic);
        const bb = BigInt(b.amountAtomic);
        return aa === bb ? 0 : aa > bb ? -1 : 1;
      });
      frontier = next.slice(0, maxStatesPerDepth);
    }

    routes.sort((a, b) => {
      const aa = BigInt(a.buyAmountAtomic);
      const bb = BigInt(b.buyAmountAtomic);
      return aa === bb ? a.legs.length - b.legs.length : aa > bb ? -1 : 1;
    });

    return routes;
  }
}
