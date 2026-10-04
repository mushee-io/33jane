import type {
  ProductionAsset,
  TrustedEligibility,
  EligibilityInput
} from "../production/types.js";
import type {
  EligibilityProviderHealth,
  TrustedEligibilityProvider
} from "./provider.js";

export class ExternalEligibilityProvider implements TrustedEligibilityProvider {
  readonly id = "external-provider";

  constructor(
    private readonly url = process.env.ELIGIBILITY_PROVIDER_URL,
    private readonly apiKey = process.env.ELIGIBILITY_PROVIDER_API_KEY,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  supports(_asset: ProductionAsset): boolean {
    return Boolean(this.url);
  }

  async health(): Promise<EligibilityProviderHealth> {
    return {
      ok: Boolean(this.url),
      source: this.id,
      details: {
        configured: Boolean(this.url)
      }
    };
  }

  async verify(input: EligibilityInput, asset: ProductionAsset): Promise<TrustedEligibility> {
    if (!this.url) {
      return {
        verified: false,
        source: "not-configured",
        reasons: ["ELIGIBILITY_PROVIDER_NOT_CONFIGURED"]
      };
    }

    const response = await this.fetchImpl(this.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({
        wallet: input.wallet,
        assetId: asset.assetId,
        asset: asset.contractAddress,
        chainId: input.chainId,
        amount: input.amount,
        side: input.side,
        jurisdiction: input.jurisdiction
      })
    });

    if (!response.ok) {
      return {
        verified: false,
        source: this.id,
        reasons: [`ELIGIBILITY_PROVIDER_HTTP_${response.status}`]
      };
    }

    const payload = await response.json() as Record<string, unknown>;
    return {
      verified: true,
      source: this.id,
      eligible: payload.eligible === true,
      kyc: payload.kyc === true,
      accredited: payload.accredited === true,
      whitelisted: payload.whitelisted === true,
      transferAllowed: payload.transferAllowed === true,
      jurisdiction: typeof payload.jurisdiction === "string"
        ? payload.jurisdiction
        : input.jurisdiction,
      reasons: Array.isArray(payload.reasons) ? payload.reasons.map(String) : []
    };
  }
}
