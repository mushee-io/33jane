import type { ExecutionContext, Route } from "../core/types.js";
import { EvidenceStore } from "../observability/evidence-store.js";
import { RouteEngine } from "../router/route-engine.js";
import { SettlementSafetyEngine, type SimulationCertificate } from "../simulation/safety-engine.js";

export interface CowSolveRequest {
  sellAssetId: string;
  buyAssetId: string;
  sellAmountAtomic: string;
  context: ExecutionContext;
  maxHops?: number;
}

export interface CowCandidate {
  route: Route;
  certificate: SimulationCertificate;
  score: string;
}

export interface CowSolveResult {
  candidate: CowCandidate | null;
  alternatives: CowCandidate[];
}

export class CowSubsolver {
  constructor(
    private readonly routes: RouteEngine,
    private readonly safety: SettlementSafetyEngine,
    private readonly evidence: EvidenceStore
  ) {}

  async solve(request: CowSolveRequest): Promise<CowSolveResult> {
    const started = performance.now();
    const routes = await this.routes.findRoutes(
      request.sellAssetId,
      request.buyAssetId,
      request.sellAmountAtomic,
      request.context,
      { maxHops: request.maxHops ?? 3 }
    );

    const candidates: CowCandidate[] = [];
    for (const route of routes) {
      const certificate = await this.safety.simulateRoute(route, request.context);
      if (!certificate.ok) continue;
      candidates.push({
        route,
        certificate,
        score: route.buyAmountAtomic
      });
    }

    candidates.sort((a, b) => {
      const aa = BigInt(a.score);
      const bb = BigInt(b.score);
      return aa === bb ? a.route.legs.length - b.route.legs.length : aa > bb ? -1 : 1;
    });

    this.evidence.recordSolve(performance.now() - started, candidates.length > 0, candidates[0]?.route);
    return { candidate: candidates[0] ?? null, alternatives: candidates.slice(1, 5) };
  }
}
