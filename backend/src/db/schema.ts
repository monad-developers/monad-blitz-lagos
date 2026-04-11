import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const rulesTable = sqliteTable("rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  userAddress: text("user_address").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  tokenAddress: text("token_address").notNull(),
  amount: text("amount").notNull(),
  scheduleType: text("schedule_type").notNull(),
  scheduleValue: text("schedule_value"),
  conditionType: text("condition_type").notNull(),
  conditionValue: text("condition_value"),
  status: text("status").notNull(),
  rawPrompt: text("raw_prompt").notNull(),
  parsedJson: text("parsed_json").notNull(),
  createdAt: text("created_at").notNull(),
});

export const executionsTable = sqliteTable("executions", {
  id: text("id").primaryKey(),
  ruleId: text("rule_id")
    .notNull()
    .references(() => rulesTable.id),
  txHash: text("tx_hash"),
  status: text("status").notNull(),
  executedAt: text("executed_at").notNull(),
  errorMessage: text("error_message"),
  mode: text("mode").notNull(),
});

export type RuleRow = typeof rulesTable.$inferSelect;
export type ExecutionRow = typeof executionsTable.$inferSelect;
