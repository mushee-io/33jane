import type { RwaAsset } from "../core/types.js";
import type { DataStore } from "../persistence/store.js";
import type { ProductionAsset, ProductionAssetType } from "./types.js";

function mapType(asset: RwaAsset): ProductionAssetType {
  switch (asset.category) {
    case "stablecoin": return "ERC20";
    case "tokenized-treasury": return "TREASURY";
    case "tokenized-equity": return "EQUITY";
    case "credit": return "CREDIT";
    case "commodity": return "COMMODITY";
    case "fund": return "FUND";
    default: return asset.category === "other" ? "OTHER" : "RWA";
  }
}

function allowedJurisdictions(asset: RwaAsset): string[] {
  const requirement = asset.constraints.requiredClaims?.find((x) => x.key === "jurisdiction");
  return requirement?.oneOf?.filter((x): x is string => typeof x === "string") ?? [];
}

export function toProductionAsset(asset: RwaAsset): ProductionAsset {
  const now = new Date().toISOString();
  const environment = String(asset.metadata?.environment ?? "unknown");
  const restriction = asset.metadata?.restrictionModel
    ? [String(asset.metadata.restrictionModel)]
    : [];
  return {
    assetId: asset.id,
    chainId: asset.chainId,
    contractAddress: asset.address,
    symbol: asset.symbol,
    name: asset.name,
    decimals: asset.decimals,
    assetType: mapType(asset),
    issuer: asset.issuer,
    issuerUrl: typeof asset.metadata?.issuerUrl === "string" ? asset.metadata.issuerUrl : undefined,
    permissioned: asset.constraints.requiresEligibleWallet === true || restriction.length > 0,
    kycRequired: asset.constraints.requiresEligibleWallet === true,
    accreditationRequired: asset.constraints.requiredClaims?.some((x) => x.key === "professionalInvestor") ?? false,
    allowedJurisdictions: allowedJurisdictions(asset),
    blockedJurisdictions: [],
    minimumTradeSize: asset.constraints.minTradeAtomic,
    maximumTradeSize: asset.constraints.maxTradeAtomic,
    marketHours: asset.constraints.marketHours,
    timezone: "UTC",
    settlementType: [...asset.settlementModels],
    transferRestrictions: restriction,
    mintRedeemSupported: asset.settlementModels.some((x) => x === "issuer-mint" || x === "issuer-redeem"),
    rfqSupported: asset.settlementModels.includes("rfq"),
    poolSupported: asset.settlementModels.includes("permissioned-amm"),
    liquidityAdapters: [],
    status: "ACTIVE",
    metadata: { ...(asset.metadata ?? {}), environment },
    createdAt: now,
    updatedAt: now
  };
}

export class AssetService {
  private initPromise?: Promise<void>;

  constructor(
    private readonly store: DataStore,
    private readonly seeds: ProductionAsset[]
  ) {}

  ready(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        await this.store.init();
        for (const seed of this.seeds) {
          const existing = await this.store.getAsset(seed.assetId);
          if (!existing) await this.store.upsertAsset(seed);
        }
      })();
    }
    return this.initPromise;
  }

  async list(): Promise<ProductionAsset[]> {
    await this.ready();
    return this.store.listAssets();
  }

  async get(assetId: string): Promise<ProductionAsset> {
    await this.ready();
    const asset = await this.store.getAsset(assetId);
    if (!asset) throw new Error("ASSET_NOT_FOUND");
    return asset;
  }

  async resolve(chainId: number, token: string): Promise<ProductionAsset> {
    await this.ready();
    const asset = await this.store.findAsset(chainId, token);
    if (!asset) throw new Error("ASSET_NOT_FOUND");
    return asset;
  }

  async upsert(asset: ProductionAsset): Promise<ProductionAsset> {
    await this.ready();
    const existing = await this.store.getAsset(asset.assetId);
    const now = new Date().toISOString();
    const next: ProductionAsset = {
      ...asset,
      createdAt: existing?.createdAt ?? asset.createdAt ?? now,
      updatedAt: now
    };
    await this.store.upsertAsset(next);
    return next;
  }

  async rules(assetId: string): Promise<Record<string, unknown>> {
    const asset = await this.get(assetId);
    return {
      assetId: asset.assetId,
      permissioned: asset.permissioned,
      kycRequired: asset.kycRequired,
      accreditationRequired: asset.accreditationRequired,
      allowedJurisdictions: asset.allowedJurisdictions,
      blockedJurisdictions: asset.blockedJurisdictions,
      minimumTradeSize: asset.minimumTradeSize,
      maximumTradeSize: asset.maximumTradeSize,
      marketHours: asset.marketHours,
      timezone: asset.timezone,
      transferRestrictions: asset.transferRestrictions,
      status: asset.status
    };
  }
}
