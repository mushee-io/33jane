import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const sql = postgres(url, { max: 1, prepare: false });
try {
  const migration = await readFile(resolve("migrations/001_initial.sql"), "utf8");
  await sql.unsafe(migration);
  console.log("33Jane database migration complete");
} finally {
  await sql.end();
}
