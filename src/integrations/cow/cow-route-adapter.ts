import type { ExecutableRouteService } from "../../production/route-service.js";
import type { CowLikeOrderRequest, CowRouteResponse } from "./cow-types.js";
import { cowOrderToRouteRequest } from "./cow-order-mapper.js";
import { routeToCowResponse } from "./cow-quote-mapper.js";

export class CowRouteAdapter {
  constructor(private readonly routes: ExecutableRouteService) {}

  async quote(order: CowLikeOrderRequest): Promise<CowRouteResponse> {
    const route = await this.routes.route(cowOrderToRouteRequest(order));
    return routeToCowResponse(route);
  }

  async get(routeId: string): Promise<CowRouteResponse> {
    return routeToCowResponse(await this.routes.get(routeId));
  }
}
