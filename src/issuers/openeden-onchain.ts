import {
  decodeFunctionResult,
  encodeFunctionData,
  parseAbi
} from "viem";
import type { JsonRpcClient } from "../simulation/rpc.js";

export const OPENEDEN_ETHEREUM_VAULT =
  "0xdd50C053C096CB04A3e3362E2b622529EC5f2e8a" as const;
export const OPENEDEN_ETHEREUM_KYC_MANAGER =
  "0x51Be497AcEd1a2C19f6151064301e356B020D947" as const;
export const ETHEREUM_USDC =
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;

const VAULT_READ_ABI = parseAbi([
  "function underlying() view returns (address)",
  "function controller() view returns (address)",
  "function feeManager() view returns (address)",
  "function kycManager() view returns (address)",
  "function tbillUsdcRate() view returns (uint256)",
  "function previewDeposit(uint256 assets) view returns (uint256)",
  "function previewRedeem(uint256 shares) view returns (uint256)",
  "function txsFee(uint8 actionType,address sender,uint256 assets) view returns (uint256 oeFee,int256 pFee,uint256 totalFee)",
  "function firstDepositMap(address investor) view returns (bool)",
  "function totalSupplyCap() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function redemptionContract() view returns (address)"
]);

const CONTROLLER_ABI = parseAbi([
  "function pausedDeposit() view returns (bool)",
  "function pausedWithdraw() view returns (bool)"
]);

const FEE_MANAGER_ABI = parseAbi([
  "function getMinMaxDeposit() view returns (uint256 minDeposit,uint256 maxDeposit)",
  "function getMinMaxWithdraw() view returns (uint256 minWithdraw,uint256 maxWithdraw)",
  "function getFirstDeposit() view returns (uint256 firstDeposit)"
]);

const VAULT_WRITE_ABI = parseAbi([
  "function deposit(uint256 assets,address receiver)",
  "function redeem(uint256 shares,address receiver)",
  "function redeemIns(uint256 shares,address receiver) returns (uint256)"
]);

const ERC20_ABI = parseAbi([
  "function approve(address spender,uint256 amount) returns (bool)"
]);

type Address = `0x${string}`;

export interface OpenEdenVaultHealth {
  ok: boolean;
  vault: Address;
  underlying?: Address;
  controller?: Address;
  feeManager?: Address;
  kycManager?: Address;
  rate?: string;
  depositPaused?: boolean;
  withdrawPaused?: boolean;
  mintAvailable?: boolean;
  redeemAvailable?: boolean;
  instantRedeemConfigured?: boolean;
  reason?: string;
}

export interface OpenEdenMintQuote {
  executable: boolean;
  sellAmount: string;
  buyAmount: string;
  feeAmount: string;
  rate: string;
  minDeposit: string;
  maxDeposit: string;
  firstDepositMinimum: string;
  firstDepositSatisfied: boolean;
  depositPaused: boolean;
  supplyCap: string;
  totalSupply: string;
  reasons: string[];
}

export class OpenEdenOnchainIssuer {
  constructor(
    private readonly rpc?: JsonRpcClient,
    readonly vault: Address = OPENEDEN_ETHEREUM_VAULT
  ) {}

  private async read<T>(
    address: Address,
    abi: readonly unknown[],
    functionName: string,
    args: readonly unknown[] = []
  ): Promise<T> {
    if (!this.rpc) throw new Error("ETH_RPC_URL_NOT_CONFIGURED");
    const data = encodeFunctionData({
      abi: abi as any,
      functionName: functionName as any,
      args: args as any
    });
    const result = await this.rpc.ethCall({ to: address, data });
    return decodeFunctionResult({
      abi: abi as any,
      functionName: functionName as any,
      data: result as `0x${string}`
    }) as T;
  }

  async health(): Promise<OpenEdenVaultHealth> {
    if (!this.rpc) {
      return {
        ok: false,
        vault: this.vault,
        reason: "ETH_RPC_URL_NOT_CONFIGURED"
      };
    }

    try {
      const code = await this.rpc.getCode(this.vault);
      if (code === "0x" || code === "0x0") {
        return { ok: false, vault: this.vault, reason: "VAULT_CODE_NOT_FOUND" };
      }

      const [underlying, controller, feeManager, kycManager, rate, redemptionContract] =
        await Promise.all([
          this.read<Address>(this.vault, VAULT_READ_ABI, "underlying"),
          this.read<Address>(this.vault, VAULT_READ_ABI, "controller"),
          this.read<Address>(this.vault, VAULT_READ_ABI, "feeManager"),
          this.read<Address>(this.vault, VAULT_READ_ABI, "kycManager"),
          this.read<bigint>(this.vault, VAULT_READ_ABI, "tbillUsdcRate"),
          this.read<Address>(this.vault, VAULT_READ_ABI, "redemptionContract")
        ]);

      const [depositPaused, withdrawPaused] = await Promise.all([
        this.read<boolean>(controller, CONTROLLER_ABI, "pausedDeposit"),
        this.read<boolean>(controller, CONTROLLER_ABI, "pausedWithdraw")
      ]);

      const dependenciesMatch =
        underlying.toLowerCase() === ETHEREUM_USDC.toLowerCase() &&
        kycManager.toLowerCase() === OPENEDEN_ETHEREUM_KYC_MANAGER.toLowerCase();

      const zero = "0x0000000000000000000000000000000000000000";
      return {
        ok: dependenciesMatch,
        vault: this.vault,
        underlying,
        controller,
        feeManager,
        kycManager,
        rate: rate.toString(),
        depositPaused,
        withdrawPaused,
        mintAvailable: dependenciesMatch && !depositPaused,
        redeemAvailable: dependenciesMatch && !withdrawPaused,
        instantRedeemConfigured: redemptionContract.toLowerCase() !== zero,
        ...(dependenciesMatch ? {} : { reason: "OPENEDEN_DEPENDENCY_MISMATCH" })
      };
    } catch (error) {
      return {
        ok: false,
        vault: this.vault,
        reason: error instanceof Error ? error.message : "OPENEDEN_HEALTH_FAILED"
      };
    }
  }

  async quoteMint(wallet: Address, sellAmount: string): Promise<OpenEdenMintQuote> {
    if (!this.rpc) throw new Error("ETH_RPC_URL_NOT_CONFIGURED");
    const health = await this.health();
    if (!health.ok || !health.feeManager || !health.rate) {
      throw new Error(health.reason ?? "OPENEDEN_ISSUER_UNAVAILABLE");
    }

    const amount = BigInt(sellAmount);
    const [
      feeResult,
      minMax,
      firstDepositMinimum,
      firstDepositSatisfied,
      supplyCap,
      totalSupply
    ] = await Promise.all([
      this.read<readonly [bigint, bigint, bigint]>(
        this.vault,
        VAULT_READ_ABI,
        "txsFee",
        [0, wallet, amount]
      ),
      this.read<readonly [bigint, bigint]>(
        health.feeManager,
        FEE_MANAGER_ABI,
        "getMinMaxDeposit"
      ),
      this.read<bigint>(
        health.feeManager,
        FEE_MANAGER_ABI,
        "getFirstDeposit"
      ),
      this.read<boolean>(
        this.vault,
        VAULT_READ_ABI,
        "firstDepositMap",
        [wallet]
      ),
      this.read<bigint>(this.vault, VAULT_READ_ABI, "totalSupplyCap"),
      this.read<bigint>(this.vault, VAULT_READ_ABI, "totalSupply")
    ]);

    const totalFee = feeResult[2];
    const [minDeposit, maxDeposit] = minMax;
    const trimmed = amount > totalFee ? amount - totalFee : 0n;
    const shares = trimmed > 0n
      ? await this.read<bigint>(this.vault, VAULT_READ_ABI, "previewDeposit", [trimmed])
      : 0n;

    const reasons: string[] = [];
    if (health.depositPaused) reasons.push("OPENEDEN_DEPOSIT_PAUSED");
    if (amount < minDeposit) reasons.push("BELOW_OPENEDEN_MIN_DEPOSIT");
    if (maxDeposit > 0n && amount > maxDeposit) reasons.push("ABOVE_OPENEDEN_MAX_DEPOSIT");
    if (!firstDepositSatisfied && amount < firstDepositMinimum) {
      reasons.push("BELOW_OPENEDEN_FIRST_DEPOSIT_MINIMUM");
    }
    if (shares === 0n) reasons.push("ZERO_TBILL_OUTPUT");
    if (supplyCap > 0n && totalSupply + shares > supplyCap) {
      reasons.push("OPENEDEN_SUPPLY_CAP_EXCEEDED");
    }

    return {
      executable: reasons.length === 0,
      sellAmount: amount.toString(),
      buyAmount: shares.toString(),
      feeAmount: totalFee.toString(),
      rate: health.rate,
      minDeposit: minDeposit.toString(),
      maxDeposit: maxDeposit.toString(),
      firstDepositMinimum: firstDepositMinimum.toString(),
      firstDepositSatisfied,
      depositPaused: health.depositPaused === true,
      supplyCap: supplyCap.toString(),
      totalSupply: totalSupply.toString(),
      reasons
    };
  }

  buildMintApproval(amount: string): { target: Address; data: string } {
    return {
      target: ETHEREUM_USDC,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [this.vault, BigInt(amount)]
      })
    };
  }

  buildMintCall(amount: string, receiver: Address): { target: Address; data: string } {
    return {
      target: this.vault,
      data: encodeFunctionData({
        abi: VAULT_WRITE_ABI,
        functionName: "deposit",
        args: [BigInt(amount), receiver]
      })
    };
  }
}
