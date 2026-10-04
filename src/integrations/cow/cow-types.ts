import type { ExecutionPreparation, ExecutableRouteResult } from "../../production/types.js";

export interface CowLikeOrderRequest {
  owner: `0x${string}`;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  kind: "sell" | "buy";
  chainId: number;
  jurisdiction?: string;
}

export interface CowRouteResponse {
  routeId: string;
  executable: boolean;
  route: ExecutableRouteResult["bestRoute"];
  source?: string;
  executableAmount?: string;
  quoteExpiry?: string;
  requirements: string[];
  settlementData: Record<string, unknown>;
  rejectionReasons: string[];
  alternatives: ExecutableRouteResult["alternatives"];
}

export interface CowPrepareResponse {
  routeId: string;
  preparation: ExecutionPreparation;
}
