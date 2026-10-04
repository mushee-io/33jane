import type { DataStore, StoreHealth } from "./store.js";
import type {
  AuditEvent,
  EligibilityResult,
  ExecutableRouteResult,
  ExecutionPreparation,
  NormalizedQuote,
  OrderRecord,
  ProductionAsset
} from "../production/types.js";

export class MemoryStore implements DataStore {
  private readonly assets = new Map<string, ProductionAsset>();
  private readonly routes = new Map<string, ExecutableRouteResult>();
  private readonly orders = new Map<string, OrderRecord>();
  private readonly executions = new Map<string, ExecutionPreparation>();
  private readonly audit: AuditEvent[] = [];

  async init(): Promise<void> {}

  async health(): Promise<StoreHealth> {
    return { mode: "memory", status: "degraded" };
  }

  async listAssets(): Promise<ProductionAsset[]> {
    return [...this.assets.values()].map((x) => structuredClone(x));
  }

  async getAsset(assetId: string): Promise<ProductionAsset | null> {
    const value = this.assets.get(assetId);
    return value ? structuredClone(value) : null;
  }

  async findAsset(chainId: number, token: string): Promise<ProductionAsset | null> {
    const needle = token.toLowerCase();
    for (const asset of this.assets.values()) {
      if (asset.chainId !== chainId) continue;
      if (asset.assetId.toLowerCase() === needle || asset.contractAddress.toLowerCase() === needle) {
        return structuredClone(asset);
      }
    }
    return null;
  }

  async upsertAsset(asset: ProductionAsset): Promise<void> {
    this.assets.set(asset.assetId, structuredClone(asset));
  }

  async saveEligibility(_id: string, _orderId: string | undefined, _result: EligibilityResult): Promise<void> {}
  async saveQuote(_quote: NormalizedQuote, _orderId?: string): Promise<void> {}

  async saveRoute(route: ExecutableRouteResult): Promise<void> {
    this.routes.set(route.routeId, structuredClone(route));
  }

  async getRoute(routeId: string): Promise<ExecutableRouteResult | null> {
    const value = this.routes.get(routeId);
    return value ? structuredClone(value) : null;
  }

  async createOrder(order: OrderRecord): Promise<void> {
    this.orders.set(order.id, structuredClone(order));
  }

  async updateOrder(order: OrderRecord): Promise<void> {
    this.orders.set(order.id, structuredClone(order));
  }

  async getOrder(id: string): Promise<OrderRecord | null> {
    const value = this.orders.get(id);
    return value ? structuredClone(value) : null;
  }

  async listOrders(limit = 100): Promise<OrderRecord[]> {
    return [...this.orders.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((x) => structuredClone(x));
  }

  async saveExecution(execution: ExecutionPreparation): Promise<void> {
    this.executions.set(execution.executionId, structuredClone(execution));
  }

  async getExecution(id: string): Promise<ExecutionPreparation | null> {
    const value = this.executions.get(id);
    return value ? structuredClone(value) : null;
  }

  async appendAudit(event: AuditEvent): Promise<void> {
    this.audit.push(structuredClone(event));
  }

  async listAudit(orderId?: string, limit = 200): Promise<AuditEvent[]> {
    return this.audit
      .filter((event) => !orderId || event.orderId === orderId)
      .slice(-limit)
      .reverse()
      .map((x) => structuredClone(x));
  }
}
