import { pool } from "./client";

let initializationPromise: Promise<void> | null = null;

const rulesTableStatement = `
  CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    user_address TEXT NOT NULL,
    recipient_address TEXT NOT NULL,
    token_symbol TEXT NOT NULL,
    token_address TEXT NOT NULL,
    amount TEXT NOT NULL,
    schedule_type TEXT NOT NULL,
    schedule_value TEXT,
    condition_type TEXT NOT NULL,
    condition_value TEXT,
    status TEXT NOT NULL,
    raw_prompt TEXT NOT NULL,
    parsed_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`;

const executionsTableStatement = `
  CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
    tx_hash TEXT,
    status TEXT NOT NULL,
    executed_at TEXT NOT NULL,
    error_message TEXT,
    mode TEXT NOT NULL
  );
`;

async function initializeDatabase() {
  const maxAttempts = 10;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query(rulesTableStatement);
      await pool.query(executionsTableStatement);
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      console.warn(
        `Postgres is not ready yet (attempt ${attempt}/${maxAttempts}). Retrying in 1.5 seconds...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1_500));
    }
  }
}

export function initDb() {
  if (!initializationPromise) {
    initializationPromise = initializeDatabase().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}
