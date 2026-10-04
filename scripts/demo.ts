import { createApp } from "../src/bootstrap.js";

const app = createApp();
const context = {
  wallet: "0x000000000000000000000000000000000000beef" as const,
  claims: { kyc: true, jurisdiction: "GB" }
};

console.log("\n33Jane — milestones 1–10 demo\n");

console.log("Assets");
console.table(app.assets.list().map((asset) => ({
  id: asset.id,
  symbol: asset.symbol,
  category: asset.category,
  environment: asset.metadata?.environment ?? "unknown"
})));

const routes = await app.routes.findRoutes(
  "1:eurc-demo",
  "1:mtbill-demo",
  "100000000",
  context,
  { maxHops: 3 }
);

console.log("\nBest route");
console.dir(routes[0], { depth: null });

if (routes[0]) {
  console.log("\nSettlement-safety certificate");
  console.dir(await app.safety.simulateRoute(routes[0], context), { depth: null });
}

console.log("\nCoW sub-solver candidate");
console.dir(await app.cowSolver.solve({
  sellAssetId: "1:eurc-demo",
  buyAssetId: "1:mtbill-demo",
  sellAmountAtomic: "100000000",
  context
}), { depth: null });

console.log("\nOpenEden production registry entry");
console.dir(app.assets.get("1:openeden-tbill"), { depth: null });

console.log("\nGrant evidence");
console.dir(app.evidence.snapshot(), { depth: null });
