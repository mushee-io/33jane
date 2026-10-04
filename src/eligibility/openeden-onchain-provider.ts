import {
  decodeFunctionResult,
  encodeFunctionData,
  parseAbi
} from "viem";
import type { JsonRpcClient } from "../simulation/rpc.js";
import type {
  EligibilityInput,
  ProductionAsset,
  TrustedEligibility
} from "../production/types.js";
import type {
  EligibilityProviderHealth,
  TrustedEligibilityProvider
} from "./provider.js";

export const OPENEDEN_ETHEREUM_KYC_MANAGER =
  "0x51Be497AcEd1a2C19f6151064301e356B020D947" as const;

const KYC_ABI = parseAbi([
  "function isKyc(address investor) view returns (bool)",
  "function isBanned(address investor) view returns (bool)",
  "function isUSKyc(address investor) view returns (bool)",
  "function isNonUSKyc(address investor) view returns (bool)"
]);

type KycReadFunction = "isKyc" | "isBanned" | "isUSKyc" | "isNonUSKyc";

export class OpenEdenOnchainEligibilityProvider implements TrustedEligibilityProvider {
  readonly id = "openeden-onchain-kyc";

  constructor(
    private readonly rpc?: JsonRpcClient,
    private readonly kycManager = OPENEDEN_ETHEREUM_KYC_MANAGER
  ) {}

  supports(asset: ProductionAsset): boolean {
    return asset.chainId === 1 && String(asset.metadata.source ?? "").toLowerCase() === "openeden";
  }

  async health(): Promise<EligibilityProviderHealth> {
    if (!this.rpc) {
      return {
        ok: false,
        source: this.id,
        details: {
          chainId: 1,
          kycManager: this.kycManager,
          reason: "ETH_RPC_URL_NOT_CONFIGURED"
        }
      };
    }

    try {
      const code = await this.rpc.getCode(this.kycManager);
      const ok = code !== "0x" && code !== "0x0";
      return {
        ok,
        source: this.id,
        details: {
          chainId: 1,
          kycManager: this.kycManager,
          contractReachable: ok
        }
      };
    } catch (error) {
      return {
        ok: false,
        source: this.id,
        details: {
          chainId: 1,
          kycManager: this.kycManager,
          reason: error instanceof Error ? error.message : "RPC_ERROR"
        }
      };
    }
  }

  private async readBool(
    functionName: KycReadFunction,
    wallet: `0x${string}`
  ): Promise<boolean> {
    if (!this.rpc) throw new Error("ETH_RPC_URL_NOT_CONFIGURED");

    const data = encodeFunctionData({
      abi: KYC_ABI,
      functionName,
      args: [wallet]
    });

    const result = await this.rpc.ethCall({
      to: this.kycManager,
      data
    });

    return decodeFunctionResult({
      abi: KYC_ABI,
      functionName,
      data: result as `0x${string}`
    }) as boolean;
  }

  async verify(
    input: EligibilityInput,
    asset: ProductionAsset
  ): Promise<TrustedEligibility> {
    if (!this.supports(asset)) {
      return {
        verified: false,
        source: this.id,
        reasons: ["OPENEDEN_PROVIDER_UNSUPPORTED_ASSET"]
      };
    }

    if (!this.rpc) {
      return {
        verified: false,
        source: this.id,
        reasons: ["ETH_RPC_URL_NOT_CONFIGURED"]
      };
    }

    try {
      const [isKyc, isBanned, isUSKyc, isNonUSKyc] = await Promise.all([
        this.readBool("isKyc", input.wallet),
        this.readBool("isBanned", input.wallet),
        this.readBool("isUSKyc", input.wallet),
        this.readBool("isNonUSKyc", input.wallet)
      ]);

      const issuerApproved = isKyc && !isBanned;
      const reasons = [
        isKyc ? "OPENEDEN_KYC_CONFIRMED" : "OPENEDEN_KYC_NOT_FOUND",
        isBanned ? "OPENEDEN_WALLET_BANNED" : "OPENEDEN_WALLET_NOT_BANNED",
        ...(isUSKyc ? ["OPENEDEN_US_KYC"] : []),
        ...(isNonUSKyc ? ["OPENEDEN_GENERAL_KYC"] : [])
      ];

      return {
        verified: true,
        source: this.id,
        eligible: issuerApproved,
        kyc: issuerApproved,
        // OpenEden only assigns KYC status after its issuer onboarding process.
        // This means the wallet is issuer-approved for the applicable professional/
        // accredited investor pathway; 33Jane is not independently certifying legal status.
        accredited: issuerApproved,
        whitelisted: issuerApproved,
        transferAllowed: issuerApproved,
        jurisdiction: input.jurisdiction,
        reasons
      };
    } catch (error) {
      return {
        verified: false,
        source: this.id,
        reasons: [
          "OPENEDEN_ONCHAIN_CHECK_FAILED",
          error instanceof Error ? error.message : "UNKNOWN_RPC_ERROR"
        ]
      };
    }
  }
}
