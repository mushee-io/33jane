import { createApp } from "../src/bootstrap.js";

const app = createApp();
const iterations = Number(process.env.BENCH_ITERATIONS ?? 100);
const context = {
  wallet: "0x000000000000000000000000000000000000beef" as const,
  claims: { kyc: true, jurisdiction: "GB" }
};

const samples: number[] = [];

for (let i = 0; i < iterations; i += 1) {
  const started = performance.now();
  const result = await app.cowSolver.solve({
    sellAssetId: "1:eurc-demo",
    buyAssetId: "1:mtbill-demo",
    sellAmountAtomic: "100000000",
    context
  });
  if (!result.candidate) throw new Error("benchmark route unexpectedly unavailable");
  samples.push(performance.now() - started);
}

samples.sort((a, b) => a - b);
const percentile = (p: number) =>
  samples[Math.min(samples.length - 1, Math.floor(samples.length * p))] ?? 0;

console.log(JSON.stringify({
  iterations,
  minMs: samples[0] ?? 0,
  p50Ms: percentile(0.50),
  p95Ms: percentile(0.95),
  p99Ms: percentile(0.99),
  maxMs: samples.at(-1) ?? 0,
  evidence: app.evidence.snapshot()
}, null, 2));
