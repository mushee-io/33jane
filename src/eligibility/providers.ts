import type { ExecutionContext, RwaAsset, ConstraintCheck } from "../core/types.js";

export interface EligibilityProvider {
  readonly id: string;
  check(asset: RwaAsset, amountAtomic: string, context: ExecutionContext): Promise<ConstraintCheck[]>;
}

export class ClaimEligibilityProvider implements EligibilityProvider {
  readonly id = "claims";

  async check(asset: RwaAsset, _amountAtomic: string, context: ExecutionContext): Promise<ConstraintCheck[]> {
    const checks: ConstraintCheck[] = [];
    const claims = context.claims ?? {};

    if (asset.constraints.requiresEligibleWallet) {
      checks.push({
        code: "ELIGIBILITY_REQUIRED",
        ok: claims.kyc === true,
        message: claims.kyc === true ? "wallet carries required eligibility claim" : "wallet is missing required eligibility claim",
        source: this.id
      });
    }

    for (const requirement of asset.constraints.requiredClaims ?? []) {
      const actual = claims[requirement.key];
      let ok = true;
      if (requirement.equals !== undefined) ok = actual === requirement.equals;
      if (requirement.oneOf) ok = requirement.oneOf.includes(actual as string | boolean);
      checks.push({
        code: `CLAIM_${requirement.key.toUpperCase()}`,
        ok,
        message: ok ? `claim ${requirement.key} accepted` : `claim ${requirement.key} does not satisfy asset policy`,
        source: this.id
      });
    }

    return checks;
  }
}
