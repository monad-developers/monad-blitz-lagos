import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "../config/env";
import { executionsTable, rulesTable } from "./schema";

mkdirSync(dirname(env.DATABASE_URL), { recursive: true });

export const sqlite = new Database(env.DATABASE_URL);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, {
  schema: {
    rulesTable,
    executionsTable,
  },
});
