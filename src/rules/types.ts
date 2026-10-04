import type { Address } from "../core/types.js";
import type { ProductionAsset, RuleResult, TrustedEligibility } from "../production/types.js";

export interface RuleContext {
  wallet: Address;
  chainId: number;
  amount: string;
  side: "BUY" | "SELL";
  jurisdiction?: string;
  asset: ProductionAsset;
  trustedEligibility: TrustedEligibility;
  demoClaims: Record<string, string | boolean>;
  availableAdapterIds?: string[];
  now: Date;
}

export interface ExecutionRule {
  readonly id: string;
  evaluate(context: RuleContext): Promise<RuleResult> | RuleResult;
}
