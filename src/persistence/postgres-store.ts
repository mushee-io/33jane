import postgres from "postgres";
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

export class PostgresStore implements DataStore {
  private readonly sql: ReturnType<typeof postgres>;

  constructor(url: string) {
    this.sql = postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false
    });
  }

  async init(): Promise<void> {
    await this.sql`select 1 as ok`;
  }

  async health(): Promise<StoreHealth> {
    try {
      await this.sql`select 1 as ok`;
      return { mode: "postgres", status: "connected" };
    } catch {
      return { mode: "postgres", status: "degraded" };
    }
  }

  async listAssets(): Promise<ProductionAsset[]> {
    const rows = await this.sql`select payload from assets order by asset_id`;
    return rows.map((row) => row.payload as ProductionAsset);
  }

  async getAsset(assetId: string): Promise<ProductionAsset | null> {
    const rows = await this.sql`select payload from assets where asset_id = ${assetId} limit 1`;
    return rows[0]?.payload as ProductionAsset ?? null;
  }

  async findAsset(chainId: number, token: string): Promise<ProductionAsset | null> {
    const lower = token.toLowerCase();
    const rows = await this.sql`
      select payload from assets
      where chain_id = ${chainId}
        and (lower(asset_id) = ${lower} or lower(contract_address) = ${lower})
      limit 1
    `;
    return rows[0]?.payload as ProductionAsset ?? null;
  }

  async upsertAsset(asset: ProductionAsset): Promise<void> {
    await this.sql`
      insert into assets(asset_id, chain_id, contract_address, payload, created_at, updated_at)
      values(
        ${asset.assetId},
        ${asset.chainId},
        ${asset.contractAddress},
        ${this.sql.json(asset as any)},
        ${asset.createdAt},
        ${asset.updatedAt}
      )
      on conflict(asset_id) do update set
        chain_id = excluded.chain_id,
        contract_address = excluded.contract_address,
        payload = excluded.payload,
        updated_at = excluded.updated_at
    `;
  }

  async saveEligibility(id: string, orderId: string | undefined, result: EligibilityResult): Promise<void> {
    await this.sql`
      insert into eligibility_checks(id, order_id, payload, created_at)
      values(${id}, ${orderId ?? null}, ${this.sql.json(result as any)}, now())
      on conflict(id) do nothing
    `;
  }

  async saveQuote(quote: NormalizedQuote, orderId?: string): Promise<void> {
    await this.sql`
      insert into quotes(id, order_id, adapter_id, expires_at, payload, created_at)
      values(
        ${quote.quoteId},
        ${orderId ?? null},
        ${quote.adapterId},
        ${quote.expiresAt},
        ${this.sql.json(quote as any)},
        now()
      )
      on conflict(id) do update set payload = excluded.payload
    `;
  }

  async saveRoute(route: ExecutableRouteResult, orderId?: string): Promise<void> {
    await this.sql`
      insert into routes(id, order_id, expires_at, payload, created_at)
      values(
        ${route.routeId},
        ${orderId ?? null},
        ${route.expiresAt ?? null},
        ${this.sql.json(route as any)},
        ${route.createdAt}
      )
      on conflict(id) do update set payload = excluded.payload, expires_at = excluded.expires_at
    `;
  }

  async getRoute(routeId: string): Promise<ExecutableRouteResult | null> {
    const rows = await this.sql`select payload from routes where id = ${routeId} limit 1`;
    return rows[0]?.payload as ExecutableRouteResult ?? null;
  }

  async createOrder(order: OrderRecord): Promise<void> {
    await this.sql`
      insert into orders(id, state, payload, created_at, updated_at)
      values(${order.id}, ${order.state}, ${this.sql.json(order as any)}, ${order.createdAt}, ${order.updatedAt})
    `;
  }

  async updateOrder(order: OrderRecord): Promise<void> {
    await this.sql`
      update orders
      set state = ${order.state}, payload = ${this.sql.json(order as any)}, updated_at = ${order.updatedAt}
      where id = ${order.id}
    `;
  }

  async getOrder(id: string): Promise<OrderRecord | null> {
    const rows = await this.sql`select payload from orders where id = ${id} limit 1`;
    return rows[0]?.payload as OrderRecord ?? null;
  }

  async listOrders(limit = 100): Promise<OrderRecord[]> {
    const rows = await this.sql`select payload from orders order by created_at desc limit ${limit}`;
    return rows.map((row) => row.payload as OrderRecord);
  }

  async saveExecution(execution: ExecutionPreparation, orderId?: string): Promise<void> {
    await this.sql`
      insert into executions(id, order_id, route_id, status, payload, created_at)
      values(
        ${execution.executionId},
        ${orderId ?? null},
        ${execution.routeId},
        ${execution.status},
        ${this.sql.json(execution as any)},
        ${execution.createdAt}
      )
      on conflict(id) do update set status = excluded.status, payload = excluded.payload
    `;
  }

  async getExecution(id: string): Promise<ExecutionPreparation | null> {
    const rows = await this.sql`select payload from executions where id = ${id} limit 1`;
    return rows[0]?.payload as ExecutionPreparation ?? null;
  }

  async appendAudit(event: AuditEvent): Promise<void> {
    await this.sql`
      insert into audit_events(id, order_id, event_type, actor, payload, created_at)
      values(
        ${event.eventId},
        ${event.orderId ?? null},
        ${event.eventType},
        ${event.actor},
        ${this.sql.json(event.metadata as any)},
        ${event.timestamp}
      )
    `;
  }

  async listAudit(orderId?: string, limit = 200): Promise<AuditEvent[]> {
    const rows = orderId
      ? await this.sql`
          select id, order_id, event_type, actor, payload, created_at
          from audit_events where order_id = ${orderId}
          order by created_at desc limit ${limit}
        `
      : await this.sql`
          select id, order_id, event_type, actor, payload, created_at
          from audit_events order by created_at desc limit ${limit}
        `;

    return rows.map((row) => ({
      eventId: String(row.id),
      orderId: row.order_id ? String(row.order_id) : undefined,
      eventType: String(row.event_type),
      actor: String(row.actor),
      metadata: (row.payload ?? {}) as Record<string, unknown>,
      timestamp: new Date(row.created_at as string).toISOString()
    }));
  }
}
