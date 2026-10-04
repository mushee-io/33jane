import type { RouteRequest } from "../../production/types.js";
import type { CowLikeOrderRequest } from "./cow-types.js";

export function cowOrderToRouteRequest(order: CowLikeOrderRequest): RouteRequest {
  if (order.kind !== "sell") {
    throw new Error("COW_BUY_KIND_NOT_YET_SUPPORTED");
  }
  return {
    wallet: order.owner,
    chainId: order.chainId,
    sellToken: order.sellToken,
    buyToken: order.buyToken,
    sellAmount: order.sellAmount,
    jurisdiction: order.jurisdiction,
    side: "BUY"
  };
}
