export function toBigInt(value: string): bigint {
  if (!/^\d+$/.test(value)) throw new Error(`Invalid atomic amount: ${value}`);
  return BigInt(value);
}

export function mulDivFloor(amount: bigint, numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error("division by zero");
  return (amount * numerator) / denominator;
}

export function subtractBps(amount: bigint, bps: number): bigint {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
    throw new Error("bps must be an integer between 0 and 10000");
  }
  return mulDivFloor(amount, BigInt(10_000 - bps), 10_000n);
}

export function compareAtomicDesc(a: string, b: string): number {
  const aa = toBigInt(a);
  const bb = toBigInt(b);
  return aa === bb ? 0 : aa > bb ? -1 : 1;
}
