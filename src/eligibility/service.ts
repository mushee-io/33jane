import { randomUUID } from "node:crypto";
import type { DataStore } from "../persistence/store.js";
import type { AssetService } from "../production/asset-service.js";
import type { EligibilityInput, EligibilityResult } from "../production/types.js";
import { RuleEngine } from "../rules/engine.js";
import type { TrustedEligibilityProvider } from "./provider.js";

export class EligibilityService {
  constructor(
    private readonly assets: AssetService,
    private readonly rules: RuleEngine,
    private readonly provider: TrustedEligibilityProvider,
    private readonly store: DataStore
  ) {}

  providerHealth() {
    return this.provider.health();
  }

  async check(input: EligibilityInput, orderId?: string): Promise<EligibilityResult> {
    const asset = await this.assets.resolve(input.chainId, input.asset);
    const trustedEligibility = asset.metadata.environment === "demo"
      ? { verified: false, source: "demo" as const }
      : await this.provider.verify(input, asset);

    const demoClaims = asset.metadata.environment === "demo"
      ? (input.demoClaims ?? {})
      : {};

    const checks = await this.rules.evaluate({
      wallet: input.wallet,
      chainId: input.chainId,
      amount: input.amount,
      side: input.side,
      jurisdiction: input.jurisdiction,
      asset,
      trustedEligibility,
      demoClaims,
      now: new Date()
    });

    const failed = checks.filter((check) => !check.passed);
    const result: EligibilityResult = {
      eligible: failed.length === 0,
      status: failed.length === 0 ? "ELIGIBLE" : "INELIGIBLE",
      checks,
      requirements: failed.map((x) => x.message),
      reasons: failed.map((x) => x.code),
      trustedEligibility
    };

    await this.store.saveEligibility(randomUUID(), orderId, result);
    return result;
  }
}
