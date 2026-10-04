import type { ExecutionRule, RuleContext } from "./types.js";
import type { RuleResult } from "../production/types.js";

export class RuleEngine {
  constructor(private readonly rules: ExecutionRule[]) {}

  async evaluate(context: RuleContext): Promise<RuleResult[]> {
    const results: RuleResult[] = [];
    for (const rule of this.rules) {
      results.push(await rule.evaluate(context));
    }
    return results;
  }
}
