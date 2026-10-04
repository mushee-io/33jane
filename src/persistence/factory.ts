import type { DataStore } from "./store.js";
import { MemoryStore } from "./memory-store.js";
import { PostgresStore } from "./postgres-store.js";

export function createDataStore(): DataStore {
  const url = process.env.DATABASE_URL;
  return url ? new PostgresStore(url) : new MemoryStore();
}
