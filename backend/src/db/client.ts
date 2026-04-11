import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env";
import { executionsTable, rulesTable } from "./schema";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on("error", (error) => {
  console.error("Unexpected Postgres pool error.", error);
});

export const db = drizzle(pool, {
  schema: {
    rulesTable,
    executionsTable,
  },
});
