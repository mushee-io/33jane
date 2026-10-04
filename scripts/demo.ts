import { createApp } from "../src/bootstrap.js";

const app = createApp();
const context = {
  wallet: "0x000000000000000000000000000000000000beef" as const,
  claims: { kyc: true, jurisdiction: "GB" }
};

console.log("\n33Jane — milestones 1–5 demo\n");

console.log("1) Assets");
console.table(app.assets.list().map((asset) => ({
  id: asset.id,
  symbol: asset.symbol,
  category: asset.category,
  settlement: asset.settlementModels.join(",")
})));

console.log("\n2) Eligibility");
console.log(await app.constraints.evaluate(app.assets.get("1:mtbill-demo"), "50000000", context));

console.log("\n3–4) Direct normalized quotes");
const direct = await app.quotes.quote({
  sellAssetId: "1:eurc-demo",
  buyAssetId: "1:mtbill-demo",
  sellAmountAtomic: "100000000",
  context
});
console.dir(direct, { depth: null });

console.log("\n5) Routes");
const routes = await app.routes.findRoutes(
  "1:eurc-demo",
  "1:mtbill-demo",
  "100000000",
  context,
  { maxHops: 3 }
);
console.dir(routes.slice(0, 5), { depth: null });
