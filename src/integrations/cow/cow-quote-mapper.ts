import type { ExecutableRouteResult } from "../../production/types.js";
import type { CowRouteResponse } from "./cow-types.js";

export function routeToCowResponse(route: ExecutableRouteResult): CowRouteResponse {
  const best = route.bestRoute;
  return {
    routeId: route.routeId,
    executable: Boolean(best?.quote.executable && route.eligible),
    route: best,
    source: best?.quote.source,
    executableAmount: best?.quote.buyAmount,
    quoteExpiry: route.expiresAt,
    requirements: best?.quote.executionRequirements ?? route.constraints.filter((x) => !x.passed).map((x) => x.message),
    settlementData: best ? {
      adapterId: best.quote.adapterId,
      quoteId: best.quote.quoteId,
      settlementType: best.quote.settlementType,
      sellToken: best.quote.sellToken,
      buyToken: best.quote.buyToken
    } : {},
    rejectionReasons: [
      ...route.constraints.filter((x) => !x.passed).map((x) => x.code),
      ...route.rejected.map((x) => x.reason)
    ],
    alternatives: route.alternatives
  };
}
