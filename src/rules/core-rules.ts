import type { ExecutionRule, RuleContext } from "./types.js";
import type { RuleResult } from "../production/types.js";

function pass(message: string, metadata?: Record<string, unknown>): RuleResult {
  return { passed: true, code: "PASS", message, metadata };
}

export class AssetActiveRule implements ExecutionRule {
  readonly id = "asset-active";
  evaluate({ asset }: RuleContext): RuleResult {
    return asset.status === "ACTIVE"
      ? pass("asset is active")
      : { passed: false, code: "ASSET_DISABLED", message: "asset is disabled" };
  }
}

export class SupportedChainRule implements ExecutionRule {
  readonly id = "supported-chain";
  evaluate({ asset, chainId }: RuleContext): RuleResult {
    return asset.chainId === chainId
      ? pass("chain is supported")
      : { passed: false, code: "UNSUPPORTED_CHAIN", message: "asset is not configured for requested chain" };
  }
}

export class WalletWhitelistRule implements ExecutionRule {
  readonly id = "wallet-whitelist";
  evaluate(context: RuleContext): RuleResult {
    const { asset, wallet, trustedEligibility, demoClaims } = context;
    if (!asset.walletWhitelist?.length) return pass("asset has no explicit wallet whitelist");
    const direct = asset.walletWhitelist.some((x) => x.toLowerCase() === wallet.toLowerCase());
    const demo = asset.metadata.environment === "demo" && demoClaims.whitelisted === true;
    const trusted = trustedEligibility.verified && trustedEligibility.whitelisted === true;
    return direct || demo || trusted
      ? pass("wallet whitelist requirement satisfied")
      : { passed: false, code: "WALLET_NOT_WHITELISTED", message: "wallet is not whitelisted" };
  }
}

export class KycRequirementRule implements ExecutionRule {
  readonly id = "kyc";
  evaluate({ asset, trustedEligibility, demoClaims }: RuleContext): RuleResult {
    if (!asset.kycRequired) return pass("KYC is not required");
    const demo = asset.metadata.environment === "demo" && demoClaims.kyc === true;
    const trusted = trustedEligibility.verified && trustedEligibility.kyc === true;
    return demo || trusted
      ? pass("KYC requirement satisfied", { source: demo ? "demo-claim" : trustedEligibility.source })
      : { passed: false, code: "KYC_REQUIRED", message: "verified KYC is required" };
  }
}

export class AccreditationRule implements ExecutionRule {
  readonly id = "accreditation";
  evaluate({ asset, trustedEligibility, demoClaims }: RuleContext): RuleResult {
    if (!asset.accreditationRequired) return pass("accreditation is not required");
    const demo = asset.metadata.environment === "demo" && demoClaims.professionalInvestor === true;
    const trusted = trustedEligibility.verified && trustedEligibility.accredited === true;
    return demo || trusted
      ? pass("accreditation requirement satisfied", { source: demo ? "demo-claim" : trustedEligibility.source })
      : { passed: false, code: "ACCREDITATION_REQUIRED", message: "verified accreditation is required" };
  }
}

export class JurisdictionAllowlistRule implements ExecutionRule {
  readonly id = "jurisdiction-allowlist";
  evaluate({ asset, jurisdiction, trustedEligibility }: RuleContext): RuleResult {
    if (!asset.allowedJurisdictions.length) return pass("asset has no jurisdiction allowlist");
    const resolved = trustedEligibility.jurisdiction ?? jurisdiction;
    const ok = Boolean(resolved && asset.allowedJurisdictions.includes(resolved));
    return ok
      ? pass("jurisdiction is allowed", { jurisdiction: resolved })
      : { passed: false, code: "JURISDICTION_NOT_ALLOWED", message: "jurisdiction is not on the asset allowlist", metadata: { jurisdiction: resolved } };
  }
}

export class JurisdictionBlocklistRule implements ExecutionRule {
  readonly id = "jurisdiction-blocklist";
  evaluate({ asset, jurisdiction, trustedEligibility }: RuleContext): RuleResult {
    const resolved = trustedEligibility.jurisdiction ?? jurisdiction;
    if (!resolved || !asset.blockedJurisdictions.includes(resolved)) return pass("jurisdiction is not blocked");
    return { passed: false, code: "JURISDICTION_BLOCKED", message: "jurisdiction is blocked", metadata: { jurisdiction: resolved } };
  }
}

export class MinimumTradeRule implements ExecutionRule {
  readonly id = "minimum-trade";
  evaluate({ asset, amount }: RuleContext): RuleResult {
    if (!asset.minimumTradeSize) return pass("asset has no minimum trade size");
    const ok = BigInt(amount) >= BigInt(asset.minimumTradeSize);
    return ok
      ? pass("minimum trade size satisfied")
      : { passed: false, code: "BELOW_MINIMUM_SIZE", message: "trade is below the asset minimum", metadata: { minimum: asset.minimumTradeSize } };
  }
}

export class MaximumTradeRule implements ExecutionRule {
  readonly id = "maximum-trade";
  evaluate({ asset, amount }: RuleContext): RuleResult {
    if (!asset.maximumTradeSize) return pass("asset has no maximum trade size");
    const ok = BigInt(amount) <= BigInt(asset.maximumTradeSize);
    return ok
      ? pass("maximum trade size satisfied")
      : { passed: false, code: "ABOVE_MAXIMUM_SIZE", message: "trade exceeds the asset maximum", metadata: { maximum: asset.maximumTradeSize } };
  }
}

export class MarketHoursRule implements ExecutionRule {
  readonly id = "market-hours";
  evaluate({ asset, now }: RuleContext): RuleResult {
    const market = asset.marketHours;
    if (!market) return pass("asset has no market-hours restriction");
    const open = market.daysUtc.includes(now.getUTCDay())
      && now.getUTCHours() >= market.startHourUtc
      && now.getUTCHours() < market.endHourUtc;
    return open
      ? pass("market is open")
      : { passed: false, code: "MARKET_CLOSED", message: "asset market is currently closed" };
  }
}

export class TransferRestrictionRule implements ExecutionRule {
  readonly id = "transfer-restrictions";
  evaluate({ asset, trustedEligibility, demoClaims }: RuleContext): RuleResult {
    if (!asset.transferRestrictions.length) return pass("asset has no transfer restriction");
    const demo = asset.metadata.environment === "demo" && demoClaims.transferAllowed === true;
    const trusted = trustedEligibility.verified && trustedEligibility.transferAllowed === true;
    return demo || trusted
      ? pass("transfer restriction satisfied", { source: demo ? "demo-claim" : trustedEligibility.source })
      : { passed: false, code: "TRANSFER_RESTRICTED", message: "transfer permission has not been verified" };
  }
}

export class LiquidityVenueRule implements ExecutionRule {
  readonly id = "liquidity-venue";
  evaluate({ asset, availableAdapterIds }: RuleContext): RuleResult {
    if (!asset.liquidityAdapters.length || availableAdapterIds === undefined) {
      return pass("no venue restriction evaluated");
    }
    const ok = availableAdapterIds.some((id) => asset.liquidityAdapters.includes(id));
    return ok
      ? pass("compatible liquidity venue available")
      : { passed: false, code: "LIQUIDITY_VENUE_RESTRICTED", message: "no permitted liquidity venue is available" };
  }
}
