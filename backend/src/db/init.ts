import { sqlite } from "./client";

let initialized = false;

export function initDb() {
  if (initialized) {
    return;
  }

  sqlite.exec(`
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

    CREATE TABLE IF NOT EXISTS executions (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL,
      tx_hash TEXT,
      status TEXT NOT NULL,
      executed_at TEXT NOT NULL,
      error_message TEXT,
      mode TEXT NOT NULL,
      FOREIGN KEY(rule_id) REFERENCES rules(id) ON DELETE CASCADE
    );
  `);

  initialized = true;
}
