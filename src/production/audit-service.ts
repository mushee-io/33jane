import { randomUUID } from "node:crypto";
import type { DataStore } from "../persistence/store.js";

export class AuditService {
  constructor(private readonly store: DataStore) {}

  async record(
    eventType: string,
    actor: string,
    metadata: Record<string, unknown> = {},
    orderId?: string
  ): Promise<void> {
    await this.store.appendAudit({
      eventId: randomUUID(),
      orderId,
      timestamp: new Date().toISOString(),
      eventType,
      actor,
      metadata
    });
  }
}
