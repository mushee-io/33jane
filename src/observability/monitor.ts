import { AssetRegistry } from "../registry/asset-registry.js";
import { JsonRpcClient } from "../simulation/rpc.js";

export interface AssetHealth {
  assetId: string;
  address: string;
  environment: string;
  status: "configured" | "healthy" | "no-code" | "rpc-error";
  detail?: string;
}

export class IntegrationMonitor {
  constructor(
    private readonly assets: AssetRegistry,
    private readonly rpc?: JsonRpcClient
  ) {}

  async scan(): Promise<AssetHealth[]> {
    const results: AssetHealth[] = [];
    for (const asset of this.assets.list()) {
      const environment = String(asset.metadata?.environment ?? "unknown");
      if (!this.rpc || environment !== "production") {
        results.push({
          assetId: asset.id,
          address: asset.address,
          environment,
          status: "configured"
        });
        continue;
      }

      try {
        const code = await this.rpc.getCode(asset.address);
        results.push({
          assetId: asset.id,
          address: asset.address,
          environment,
          status: code === "0x" ? "no-code" : "healthy",
          detail: code === "0x" ? "no contract bytecode at configured address" : undefined
        });
      } catch (error) {
        results.push({
          assetId: asset.id,
          address: asset.address,
          environment,
          status: "rpc-error",
          detail: error instanceof Error ? error.message : "RPC error"
        });
      }
    }
    return results;
  }
}
