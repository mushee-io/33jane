import type {
  EligibilityInput,
  ProductionAsset,
  TrustedEligibility
} from "../production/types.js";
import type {
  EligibilityProviderHealth,
  TrustedEligibilityProvider
} from "./provider.js";

export class CompositeEligibilityProvider implements TrustedEligibilityProvider {
  readonly id = "composite-eligibility";

  constructor(private readonly providers: TrustedEligibilityProvider[]) {}

  supports(asset: ProductionAsset): boolean {
    return this.providers.some((provider) => provider.supports(asset));
  }

  async health(): Promise<EligibilityProviderHealth> {
    const providers = await Promise.all(
      this.providers.map(async (provider) => ({
        id: provider.id,
        ...(await provider.health())
      }))
    );

    return {
      ok: providers.some((provider) => provider.ok),
      source: this.id,
      details: { providers }
    };
  }

  async verify(
    input: EligibilityInput,
    asset: ProductionAsset
  ): Promise<TrustedEligibility> {
    const failures: string[] = [];

    for (const provider of this.providers) {
      if (!provider.supports(asset)) continue;

      try {
        const result = await provider.verify(input, asset);
        if (result.verified) return result;
        failures.push(...(result.reasons ?? []));
      } catch (error) {
        failures.push(
          `${provider.id}:${error instanceof Error ? error.message : "UNKNOWN_ERROR"}`
        );
      }
    }

    return {
      verified: false,
      source: this.id,
      reasons: failures.length ? failures : ["NO_ELIGIBILITY_PROVIDER_AVAILABLE"]
    };
  }
}
