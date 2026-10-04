import type {
  AuditEvent,
  EligibilityResult,
  ExecutableRouteResult,
  ExecutionPreparation,
  OrderRecord,
  ProductionAsset
} from "../production/types.js";
import type { NormalizedQuote } from "../production/types.js";

export interface StoreHealth {
  mode: "postgres" | "memory";
  status: "connected" | "degraded";
}

export interface DataStore {
  init(): Promise<void>;
  health(): Promise<StoreHealth>;

  listAssets(): Promise<ProductionAsset[]>;
  getAsset(assetId: string): Promise<ProductionAsset | null>;
  findAsset(chainId: number, token: string): Promise<ProductionAsset | null>;
  upsertAsset(asset: ProductionAsset): Promise<void>;

  saveEligibility(id: string, orderId: string | undefined, result: EligibilityResult): Promise<void>;
  saveQuote(quote: NormalizedQuote, orderId?: string): Promise<void>;
  saveRoute(route: ExecutableRouteResult, orderId?: string): Promise<void>;
  getRoute(routeId: string): Promise<ExecutableRouteResult | null>;

  createOrder(order: OrderRecord): Promise<void>;
  updateOrder(order: OrderRecord): Promise<void>;
  getOrder(id: string): Promise<OrderRecord | null>;
  listOrders(limit?: number): Promise<OrderRecord[]>;

  saveExecution(execution: ExecutionPreparation, orderId?: string): Promise<void>;
  getExecution(id: string): Promise<ExecutionPreparation | null>;

  appendAudit(event: AuditEvent): Promise<void>;
  listAudit(orderId?: string, limit?: number): Promise<AuditEvent[]>;
}
