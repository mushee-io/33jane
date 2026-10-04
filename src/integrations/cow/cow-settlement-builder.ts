import type { ExecutionService } from "../../production/execution-service.js";
import type { CowPrepareResponse } from "./cow-types.js";

export class CowSettlementBuilder {
  constructor(private readonly executions: ExecutionService) {}

  async prepare(routeId: string, owner: `0x${string}`): Promise<CowPrepareResponse> {
    return {
      routeId,
      preparation: await this.executions.prepare(routeId, owner)
    };
  }
}
