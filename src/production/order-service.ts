import { randomUUID } from "node:crypto";
import type { DataStore } from "../persistence/store.js";
import type { AuditService } from "./audit-service.js";
import type { ExecutionService } from "./execution-service.js";
import type { ExecutableRouteService } from "./route-service.js";
import type { OrderRecord, RouteRequest, OrderState } from "./types.js";

export class OrderService {
  constructor(
    private readonly store: DataStore,
    private readonly routes: ExecutableRouteService,
    private readonly executions: ExecutionService,
    private readonly audit: AuditService
  ) {}

  private async transition(order: OrderRecord, state: OrderState, extra: Partial<OrderRecord> = {}): Promise<OrderRecord> {
    const next = { ...order, ...extra, state, updatedAt: new Date().toISOString() };
    await this.store.updateOrder(next);
    await this.audit.record("ORDER_STATE_CHANGED", "33jane", { from: order.state, to: state }, order.id);
    return next;
  }

  async create(request: RouteRequest): Promise<OrderRecord> {
    const now = new Date().toISOString();
    let order: OrderRecord = {
      id: randomUUID(),
      state: "CREATED",
      request,
      createdAt: now,
      updatedAt: now
    };

    await this.store.createOrder(order);
    await this.audit.record("ORDER_CREATED", request.wallet, { request }, order.id);
    order = await this.transition(order, "CHECKING_ELIGIBILITY");

    try {
      const route = await this.routes.route(request, order.id);
      if (!route.eligible) {
        return this.transition(order, "INELIGIBLE", {
          routeId: route.routeId,
          failureCode: route.constraints.find((x) => !x.passed)?.code
        });
      }
      if (!route.bestRoute) {
        return this.transition(order, "FAILED", {
          routeId: route.routeId,
          failureCode: "NO_EXECUTABLE_ROUTE"
        });
      }
      order = await this.transition(order, "ROUTE_FOUND", { routeId: route.routeId });
      return order;
    } catch (error) {
      return this.transition(order, "FAILED", {
        failureCode: error instanceof Error ? error.message : "ORDER_FAILED"
      });
    }
  }

  async prepare(id: string): Promise<OrderRecord> {
    let order = await this.get(id);
    if (!order.routeId) throw new Error("ORDER_HAS_NO_ROUTE");
    if (["CANCELLED", "SETTLED", "EXPIRED"].includes(order.state)) throw new Error("ORDER_NOT_PREPARABLE");

    const execution = await this.executions.prepare(order.routeId, order.request.wallet, order.id);
    const state: OrderState = execution.status === "READY" ? "READY"
      : execution.status === "AWAITING_APPROVAL" ? "AWAITING_APPROVAL"
      : "FAILED";
    order = await this.transition(order, state, { executionId: execution.executionId });
    return order;
  }

  async get(id: string): Promise<OrderRecord> {
    const order = await this.store.getOrder(id);
    if (!order) throw new Error("ORDER_NOT_FOUND");
    return order;
  }

  async list(limit = 100): Promise<OrderRecord[]> {
    return this.store.listOrders(limit);
  }

  async cancel(id: string, actor: string): Promise<OrderRecord> {
    const order = await this.get(id);
    if (["SETTLED", "CANCELLED"].includes(order.state)) throw new Error("ORDER_NOT_CANCELLABLE");
    const next = await this.transition(order, "CANCELLED");
    await this.audit.record("ORDER_CANCELLED", actor, {}, id);
    return next;
  }
}
