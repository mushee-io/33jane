import { createHash } from "node:crypto";
import { AdapterRegistry } from "../adapters/adapter-registry.js";
import type { ExecutionContext, ExecutionStep, Route } from "../core/types.js";
import { EvidenceStore } from "../observability/evidence-store.js";
import { JsonRpcClient } from "./rpc.js";

export interface SimulationCheck {
  code: string;
  ok: boolean;
  message: string;
}

export interface SimulationCertificate {
  id: string;
  ok: boolean;
  routeId: string;
  createdAt: string;
  blockNumber?: string;
  checks: SimulationCheck[];
  executionSteps: ExecutionStep[];
  digest: string;
}

export class SettlementSafetyEngine {
  constructor(
    private readonly adapters: AdapterRegistry,
    private readonly evidence: EvidenceStore,
    private readonly rpc?: JsonRpcClient
  ) {}

  async simulateRoute(route: Route, context: ExecutionContext): Promise<SimulationCertificate> {
    const started = performance.now();
    const checks: SimulationCheck[] = [];
    const steps: ExecutionStep[] = [];

    checks.push({
      code: "ROUTE_HAS_LEGS",
      ok: route.legs.length > 0,
      message: route.legs.length > 0 ? "route contains execution legs" : "route contains no execution legs"
    });

    let expectedSell = route.sellAssetId;
    let expectedAmount = route.sellAmountAtomic;

    for (const [index, leg] of route.legs.entries()) {
      const quote = leg.quote;
      const continuous = quote.sellAssetId === expectedSell && quote.sellAmountAtomic === expectedAmount;
      checks.push({
        code: `LEG_${index}_CONTINUITY`,
        ok: continuous,
        message: continuous ? "leg connects to previous output" : "route continuity mismatch"
      });

      const positive = /^\d+$/.test(quote.buyAmountAtomic) && BigInt(quote.buyAmountAtomic) > 0n;
      checks.push({
        code: `LEG_${index}_POSITIVE_OUTPUT`,
        ok: positive,
        message: positive ? "leg output is positive" : "leg output is invalid"
      });

      const unexpired = new Date(quote.expiresAt).getTime() > Date.now();
      checks.push({
        code: `LEG_${index}_QUOTE_FRESH`,
        ok: unexpired,
        message: unexpired ? "quote remains valid" : "quote has expired"
      });

      try {
        const adapter = this.adapters.get(quote.adapterId);
        const execution = await adapter.buildExecution(quote, context);
        steps.push(...execution);

        for (const [stepIndex, step] of execution.entries()) {
          if (this.rpc && step.type === "call" && step.target && step.data) {
            try {
              await this.rpc.ethCall({
                from: context.wallet,
                to: step.target,
                data: step.data,
                value: step.value
              });
              checks.push({
                code: `LEG_${index}_STEP_${stepIndex}_ETH_CALL`,
                ok: true,
                message: "remote eth_call simulation succeeded"
              });
            } catch (error) {
              checks.push({
                code: `LEG_${index}_STEP_${stepIndex}_ETH_CALL`,
                ok: false,
                message: error instanceof Error ? error.message : "eth_call failed"
              });
            }
          }
        }
      } catch (error) {
        checks.push({
          code: `LEG_${index}_EXECUTION_PLAN`,
          ok: false,
          message: error instanceof Error ? error.message : "failed to build execution plan"
        });
      }

      expectedSell = quote.buyAssetId;
      expectedAmount = quote.buyAmountAtomic;
    }

    checks.push({
      code: "FINAL_ASSET",
      ok: expectedSell === route.buyAssetId,
      message: expectedSell === route.buyAssetId ? "route ends at requested asset" : "route ends at wrong asset"
    });

    checks.push({
      code: "FINAL_AMOUNT",
      ok: expectedAmount === route.buyAmountAtomic,
      message: expectedAmount === route.buyAmountAtomic ? "final output matches route" : "final output mismatch"
    });

    let blockNumber: string | undefined;
    if (this.rpc) {
      try {
        blockNumber = await this.rpc.blockNumber();
        checks.push({ code: "RPC_HEAD", ok: true, message: `simulated against RPC head ${blockNumber}` });
      } catch (error) {
        checks.push({
          code: "RPC_HEAD",
          ok: false,
          message: error instanceof Error ? error.message : "unable to read RPC head"
        });
      }
    }

    const ok = checks.every((check) => check.ok);
    const createdAt = new Date().toISOString();
    const digest = createHash("sha256").update(JSON.stringify({
      routeId: route.id,
      route,
      checks,
      createdAt,
      blockNumber
    })).digest("hex");

    const certificate: SimulationCertificate = {
      id: `sim_${digest.slice(0, 24)}`,
      ok,
      routeId: route.id,
      createdAt,
      blockNumber,
      checks,
      executionSteps: steps,
      digest: `sha256:${digest}`
    };

    this.evidence.recordSimulation(performance.now() - started, ok);
    return certificate;
  }
}
