import type { Route } from "../core/types.js";

export interface EvidenceSnapshot {
  startedAt: string;
  quotes: { total: number; successful: number };
  simulations: { total: number; successful: number; averageLatencyMs: number };
  solves: { total: number; successful: number; averageLatencyMs: number };
  routedSellAtomic: string;
  routedBuyAtomic: string;
  uniqueAdapters: string[];
}

export class EvidenceStore {
  private readonly startedAt = new Date().toISOString();
  private quotesTotal = 0;
  private quotesSuccessful = 0;
  private simulationsTotal = 0;
  private simulationsSuccessful = 0;
  private simulationLatencyMs = 0;
  private solvesTotal = 0;
  private solvesSuccessful = 0;
  private solveLatencyMs = 0;
  private routedSellAtomic = 0n;
  private routedBuyAtomic = 0n;
  private readonly adapters = new Set<string>();

  recordQuote(success: boolean): void {
    this.quotesTotal += 1;
    if (success) this.quotesSuccessful += 1;
  }

  recordSimulation(latencyMs: number, success: boolean): void {
    this.simulationsTotal += 1;
    this.simulationLatencyMs += latencyMs;
    if (success) this.simulationsSuccessful += 1;
  }

  recordSolve(latencyMs: number, success: boolean, route?: Route): void {
    this.solvesTotal += 1;
    this.solveLatencyMs += latencyMs;
    if (success) this.solvesSuccessful += 1;
    if (route) {
      this.routedSellAtomic += BigInt(route.sellAmountAtomic);
      this.routedBuyAtomic += BigInt(route.buyAmountAtomic);
      for (const leg of route.legs) this.adapters.add(leg.quote.adapterId);
    }
  }

  snapshot(): EvidenceSnapshot {
    return {
      startedAt: this.startedAt,
      quotes: {
        total: this.quotesTotal,
        successful: this.quotesSuccessful
      },
      simulations: {
        total: this.simulationsTotal,
        successful: this.simulationsSuccessful,
        averageLatencyMs: this.simulationsTotal === 0 ? 0 : this.simulationLatencyMs / this.simulationsTotal
      },
      solves: {
        total: this.solvesTotal,
        successful: this.solvesSuccessful,
        averageLatencyMs: this.solvesTotal === 0 ? 0 : this.solveLatencyMs / this.solvesTotal
      },
      routedSellAtomic: this.routedSellAtomic.toString(),
      routedBuyAtomic: this.routedBuyAtomic.toString(),
      uniqueAdapters: [...this.adapters].sort()
    };
  }
}
