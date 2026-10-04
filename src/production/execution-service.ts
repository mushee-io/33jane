import { randomUUID } from "node:crypto";
import type { AdapterRegistry } from "../adapters/adapter-registry.js";
import type { Route } from "../core/types.js";
import type { DataStore } from "../persistence/store.js";
import type { SettlementSafetyEngine } from "../simulation/safety-engine.js";
import type { AuditService } from "./audit-service.js";
import type { ExecutionPreparation, ExecutionMode } from "./types.js";

function modeFor(adapterId: string, environment: unknown, hasCallableTx: boolean): ExecutionMode {
  if (environment === "demo" || adapterId.startsWith("demo-")) return "SIMULATED";
  if (hasCallableTx) return "MAINNET_READY";
  if (adapterId.toLowerCase().includes("rfq")) return "MANUAL_RFQ";
  return "SIMULATED";
}

export class ExecutionService {
  constructor(
    private readonly store: DataStore,
    private readonly adapters: AdapterRegistry,
    private readonly safety: SettlementSafetyEngine,
    private readonly audit: AuditService
  ) {}

  async prepare(routeId: string, wallet: `0x${string}`, orderId?: string): Promise<ExecutionPreparation> {
    const route = await this.store.getRoute(routeId);
    if (!route) throw new Error("ROUTE_NOT_FOUND");
    if (!route.bestRoute) throw new Error("NO_EXECUTABLE_ROUTE");
    if (route.expiresAt && new Date(route.expiresAt).getTime() <= Date.now()) throw new Error("ROUTE_EXPIRED");

    const candidate = route.bestRoute;
    const adapter = this.adapters.get(candidate.quote.adapterId);
    const context = { wallet };
    const steps = await adapter.buildExecution(candidate.quote.rawQuote, context);

    const legacyRoute: Route = {
      id: routeId,
      sellAssetId: candidate.quote.sellAssetId,
      buyAssetId: candidate.quote.buyAssetId,
      sellAmountAtomic: candidate.quote.sellAmount,
      buyAmountAtomic: candidate.quote.buyAmount,
      legs: [{ quote: candidate.quote.rawQuote }]
    };

    const simulation = await this.safety.simulateRoute(legacyRoute, context);
    const callable = steps.filter((step) => step.type === "call" && step.target && step.data);
    const signatures = steps.filter((step) => step.type === "signature").map((step) => step.description);
    const approvals = steps.filter((step) => step.type === "approve").map((step) => ({
      target: step.target,
      description: step.description
    }));

    const requirements = [
      ...candidate.quote.executionRequirements,
      ...(!simulation.ok ? ["SIMULATION_FAILED"] : []),
      ...(candidate.quote.source === "COW" ? ["COW_ORDER_SIGNING_REQUIRED"] : [])
    ].filter((value, index, all) => all.indexOf(value) === index);

    const environment = candidate.quote.rawQuote.metadata?.environment;
    const mode = modeFor(candidate.quote.adapterId, environment, callable.length > 0);
    const status = !simulation.ok
      ? "BLOCKED"
      : requirements.length > 0 && mode !== "SIMULATED"
        ? "AWAITING_APPROVAL"
        : "READY";

    const execution: ExecutionPreparation = {
      executionId: randomUUID(),
      routeId,
      status,
      mode,
      transactions: callable.map((step) => ({
        target: step.target,
        data: step.data,
        value: step.value,
        description: step.description
      })),
      approvals,
      signaturesRequired: signatures,
      requirements,
      expiresAt: route.expiresAt,
      settlement: {
        adapterId: candidate.quote.adapterId,
        source: candidate.quote.source,
        settlementType: candidate.quote.settlementType,
        quoteId: candidate.quote.quoteId
      },
      simulation: simulation as unknown as Record<string, unknown>,
      createdAt: new Date().toISOString()
    };

    await this.store.saveExecution(execution, orderId);
    await this.audit.record("EXECUTION_PREPARED", wallet, {
      executionId: execution.executionId,
      routeId,
      status,
      mode,
      requirements,
      simulationOk: simulation.ok
    }, orderId);

    return execution;
  }
}
