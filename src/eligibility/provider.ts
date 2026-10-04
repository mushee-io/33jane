import type { EligibilityInput, ProductionAsset, TrustedEligibility } from "../production/types.js";

export interface EligibilityProviderHealth {
  ok: boolean;
  source: string;
  details?: Record<string, unknown>;
}

export interface TrustedEligibilityProvider {
  readonly id: string;
  supports(asset: ProductionAsset): boolean;
  verify(input: EligibilityInput, asset: ProductionAsset): Promise<TrustedEligibility>;
  health(): Promise<EligibilityProviderHealth>;
}
