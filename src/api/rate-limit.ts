export class FixedWindowRateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000
  ) {}

  consume(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const current = this.hits.get(key);
    if (!current || current.resetAt <= now) {
      const next = { count: 1, resetAt: now + this.windowMs };
      this.hits.set(key, next);
      return { allowed: true, remaining: Math.max(0, this.limit - 1), resetAt: next.resetAt };
    }

    current.count += 1;
    return {
      allowed: current.count <= this.limit,
      remaining: Math.max(0, this.limit - current.count),
      resetAt: current.resetAt
    };
  }
}
