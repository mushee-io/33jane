import type { AssetId, RwaAsset } from "../core/types.js";

export class AssetRegistry {
  private readonly assets = new Map<AssetId, RwaAsset>();

  register(asset: RwaAsset): RwaAsset {
    if (this.assets.has(asset.id)) throw new Error(`Asset already registered: ${asset.id}`);
    this.assertValid(asset);
    this.assets.set(asset.id, structuredClone(asset));
    return this.get(asset.id);
  }

  upsert(asset: RwaAsset): RwaAsset {
    this.assertValid(asset);
    this.assets.set(asset.id, structuredClone(asset));
    return this.get(asset.id);
  }

  get(id: AssetId): RwaAsset {
    const asset = this.assets.get(id);
    if (!asset) throw new Error(`Unknown asset: ${id}`);
    return structuredClone(asset);
  }

  has(id: AssetId): boolean {
    return this.assets.has(id);
  }

  list(): RwaAsset[] {
    return [...this.assets.values()].map((asset) => structuredClone(asset));
  }

  private assertValid(asset: RwaAsset): void {
    if (!asset.id) throw new Error("asset.id is required");
    if (!/^0x[a-fA-F0-9]{40}$/.test(asset.address)) throw new Error(`Invalid asset address: ${asset.address}`);
    if (!Number.isInteger(asset.chainId) || asset.chainId <= 0) throw new Error("chainId must be a positive integer");
    if (!Number.isInteger(asset.decimals) || asset.decimals < 0 || asset.decimals > 36) {
      throw new Error("decimals must be between 0 and 36");
    }
  }
}
