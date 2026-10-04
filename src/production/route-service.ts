import { randomUUID } from "node:crypto";
import type { AdapterRegistry } from "../adapters/adapter-registry.js";
import type { ExecutionContext } from "../core/types.js";
import type { DataStore } from "../persistence/store.js";
import type { EligibilityService } from "../eligibility/service.js";
import type { AssetService } from "./asset-service.js";
import type {
  ExecutableRouteResult,
  NormalizedQuote,
  RouteCandidate,
  RouteRequest
} from "./types.js";
import { normalizeQuote } from "./quote-normalizer.js";
import type { AuditService } from "./audit-service.js";

function validAtomic(value: string): boolean {
  return /^\d+$/.test(value) && BigInt(value) > 0n;
}

function rankCandidates(a: RouteCandidate, b: RouteCandidate): number {
  const outA = BigInt(a.quote.buyAmount);
  const outB = BigInt(b.quote.buyAmount);
  if (outA !== outB) return outA > outB ? -1 : 1;

  const feeA = BigInt(a.quote.fees || "0");
  const feeB = BigInt(b.quote.fees || "0");
  if (feeA !== feeB) return feeA < feeB ? -1 : 1;

  return a.quote.settlementComplexity - b.quote.settlementComplexity;
}

export class ExecutableRouteService {
  constructor(
    private readonly assets: AssetService,
    private readonly eligibility: EligibilityService,
    private readonly adapters: AdapterRegistry,
    private readonly store: DataStore,
    private readonly audit: AuditService
  ) {}

  async route(request: RouteRequest, orderId?: string): Promise<ExecutableRouteResult> {
    const createdAt = new Date().toISOString();
    const routeId = randomUUID();
    const sellAsset = await this.assets.resolve(request.chainId, request.sellToken);
    const buyAsset = await this.assets.resolve(request.chainId, request.buyToken);
    const restrictedAsset = buyAsset.permissioned ? buyAsset : (sellAsset.permissioned ? sellAsset : buyAsset);

    const supporting = await this.adapters.supporting(sellAsset.assetId, buyAsset.assetId);
    const adapterIds = supporting.map((adapter) => adapter.id);

    await this.audit.record("ELIGIBILITY_CHECK_STARTED", request.wallet, {
      assetId: restrictedAsset.assetId,
      chainId: request.chainId,
      amount: request.sellAmount
    }, orderId);

    const eligibility = await this.eligibility.check({
      wallet: request.wallet,
      asset: restrictedAsset.assetId,
      chainId: request.chainId,
      amount: request.sellAmount,
      side: request.side ?? "BUY",
      jurisdiction: request.jurisdiction,
      demoClaims: request.demoClaims
    }, orderId);

    await this.audit.record("ELIGIBILITY_DECIDED", request.wallet, {
      eligible: eligibility.eligible,
      reasons: eligibility.reasons,
      checks: eligibility.checks
    }, orderId);

    if (!eligibility.eligible) {
      const rejected: ExecutableRouteResult = {
        routeId,
        eligible: false,
        bestRoute: null,
        alternatives: [],
        constraints: eligibility.checks,
        rejected: adapterIds.map((adapterId) => ({ adapterId, reason: "ELIGIBILITY_FAILED" })),
        createdAt
      };
      await this.store.saveRoute(rejected, orderId);
      await this.audit.record("ROUTE_REJECTED", request.wallet, {
        routeId,
        reasons: eligibility.reasons
      }, orderId);
      return rejected;
    }

    await this.audit.record("QUOTING_STARTED", request.wallet, {
      adapterIds,
      sellAssetId: sellAsset.assetId,
      buyAssetId: buyAsset.assetId
    }, orderId);

    const context: ExecutionContext = {
      wallet: request.wallet,
      claims: restrictedAsset.metadata.environment === "demo" ? request.demoClaims : undefined
    };

    const settled = await Promise.allSettled(
      supporting.map(async (adapter) => {
        const quote = await adapter.quote({
          sellAssetId: sellAsset.assetId,
          buyAssetId: buyAsset.assetId,
          sellAmountAtomic: request.sellAmount,
          context
        });
        if (!quote) return { adapterId: adapter.id, candidate: null as RouteCandidate | null, reason: "NO_QUOTE" };

        const executionRequirements: string[] = [];
        try {
          const steps = await adapter.buildExecution(quote, context);
          if (steps.some((step) => step.type === "signature")) executionRequirements.push("SIGNATURE_REQUIRED");
          if (steps.some((step) => step.type === "approve")) executionRequirements.push("APPROVAL_REQUIRED");
        } catch {
          executionRequirements.push("EXECUTION_PREPARATION_FAILED");
        }

        const normalized = normalizeQuote(quote, sellAsset, buyAsset, executionRequirements);
        const expired = new Date(normalized.expiresAt).getTime() <= Date.now();
        const invalidOutput = !validAtomic(normalized.buyAmount);
        const nonExecutable = normalized.executable === false || executionRequirements.includes("EXECUTION_PREPARATION_FAILED");

        const rejectionReasons = [
          ...(expired ? ["QUOTE_EXPIRED"] : []),
          ...(invalidOutput ? ["INVALID_OUTPUT"] : []),
          ...(nonExecutable ? ["NON_EXECUTABLE"] : [])
        ];

        const candidate: RouteCandidate = {
          quote: { ...normalized, executable: rejectionReasons.length === 0 },
          eligibility,
          rejectionReasons
        };

        await this.store.saveQuote(candidate.quote, orderId);
        await this.audit.record("QUOTE_RECEIVED", adapter.id, {
          quoteId: candidate.quote.quoteId,
          executable: candidate.quote.executable,
          buyAmount: candidate.quote.buyAmount,
          rejectionReasons
        }, orderId);

        return { adapterId: adapter.id, candidate, reason: rejectionReasons[0] };
      })
    );

    const candidates: RouteCandidate[] = [];
    const rejected: ExecutableRouteResult["rejected"] = [];

    for (const result of settled) {
      if (result.status === "rejected") {
        rejected.push({ adapterId: "unknown", reason: result.reason instanceof Error ? result.reason.message : "ADAPTER_ERROR" });
        continue;
      }
      if (!result.value.candidate) {
        rejected.push({ adapterId: result.value.adapterId, reason: result.value.reason ?? "NO_QUOTE" });
        continue;
      }
      if (!result.value.candidate.quote.executable) {
        rejected.push({
          adapterId: result.value.adapterId,
          reason: result.value.candidate.rejectionReasons.join(",") || "NON_EXECUTABLE",
          quoteId: result.value.candidate.quote.quoteId
        });
        continue;
      }
      candidates.push(result.value.candidate);
    }

    candidates.sort(rankCandidates);
    const bestRoute = candidates[0] ?? null;
    const alternatives = candidates.slice(1);
    const expiresAt = bestRoute?.quote.expiresAt;

    const response: ExecutableRouteResult = {
      routeId,
      eligible: true,
      bestRoute,
      alternatives,
      constraints: eligibility.checks,
      rejected,
      expiresAt,
      createdAt
    };

    await this.store.saveRoute(response, orderId);
    await this.audit.record(bestRoute ? "ROUTE_SELECTED" : "NO_EXECUTABLE_ROUTE", "33jane", {
      routeId,
      selectedQuoteId: bestRoute?.quote.quoteId,
      selectedAdapterId: bestRoute?.quote.adapterId,
      alternatives: alternatives.map((x) => x.quote.quoteId),
      rejected
    }, orderId);

    return response;
  }

  async get(routeId: string): Promise<ExecutableRouteResult> {
    const route = await this.store.getRoute(routeId);
    if (!route) throw new Error("ROUTE_NOT_FOUND");
    return route;
  }
}
