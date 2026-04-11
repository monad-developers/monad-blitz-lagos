import { randomUUID } from "node:crypto";
import {
  paymentRuleSchema,
  ruleExecutionSchema,
  type PaymentRule,
  type RuleExecution,
  type RuleStatus,
  type RunMode,
  type RunRuleResponse,
} from "@paypilot/shared";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { executionsTable, rulesTable, type ExecutionRow, type RuleRow } from "../../db/schema";
import { getDemoWalletClient } from "../../lib/monad";
import { evaluateRuleCondition } from "../engine/engine.service";
import { prepareRuleTransaction } from "../payments/payments.service";

function mapRuleRow(row: RuleRow): PaymentRule {
  return paymentRuleSchema.parse({
    id: row.id,
    name: row.name,
    userAddress: row.userAddress,
    recipientAddress: row.recipientAddress,
    tokenSymbol: row.tokenSymbol,
    tokenAddress: row.tokenAddress,
    amount: row.amount,
    scheduleType: row.scheduleType,
    scheduleValue: row.scheduleValue ?? undefined,
    conditionType: row.conditionType,
    conditionValue: row.conditionValue ?? undefined,
    status: row.status,
    rawPrompt: row.rawPrompt,
    createdAt: row.createdAt,
  });
}

function mapExecutionRow(row: ExecutionRow): RuleExecution {
  return ruleExecutionSchema.parse({
    id: row.id,
    ruleId: row.ruleId,
    txHash: row.txHash,
    status: row.status,
    executedAt: row.executedAt,
    errorMessage: row.errorMessage,
    mode: row.mode,
  });
}

function serializeRule(rule: PaymentRule) {
  return {
    id: rule.id,
    name: rule.name,
    userAddress: rule.userAddress,
    recipientAddress: rule.recipientAddress,
    tokenSymbol: rule.tokenSymbol,
    tokenAddress: rule.tokenAddress,
    amount: rule.amount,
    scheduleType: rule.scheduleType,
    scheduleValue: rule.scheduleValue ?? null,
    conditionType: rule.conditionType,
    conditionValue: rule.conditionValue ?? null,
    status: rule.status,
    rawPrompt: rule.rawPrompt,
    parsedJson: JSON.stringify(rule),
    createdAt: rule.createdAt,
  };
}

export function listRules() {
  const rows = db
    .select()
    .from(rulesTable)
    .orderBy(desc(rulesTable.createdAt))
    .all();

  return rows.map(mapRuleRow);
}

export function getRuleById(id: string) {
  const row = db.select().from(rulesTable).where(eq(rulesTable.id, id)).get();

  return row ? mapRuleRow(row) : null;
}

export function saveRule(rule: PaymentRule) {
  const parsedRule = paymentRuleSchema.parse(rule);

  db.insert(rulesTable)
    .values(serializeRule(parsedRule))
    .onConflictDoUpdate({
      target: rulesTable.id,
      set: serializeRule(parsedRule),
    })
    .run();

  return parsedRule;
}

export function setRuleStatus(id: string, status: RuleStatus) {
  db.update(rulesTable).set({ status }).where(eq(rulesTable.id, id)).run();
  return getRuleById(id);
}

function createExecution(params: {
  ruleId: string;
  status: RuleExecution["status"];
  mode: RunMode;
  txHash?: string | null;
  errorMessage?: string | null;
}) {
  const execution = ruleExecutionSchema.parse({
    id: randomUUID(),
    ruleId: params.ruleId,
    txHash: params.txHash ?? null,
    status: params.status,
    executedAt: new Date().toISOString(),
    errorMessage: params.errorMessage ?? null,
    mode: params.mode,
  });

  db.insert(executionsTable)
    .values({
      id: execution.id,
      ruleId: execution.ruleId,
      txHash: execution.txHash,
      status: execution.status,
      executedAt: execution.executedAt,
      errorMessage: execution.errorMessage,
      mode: execution.mode,
    })
    .run();

  return execution;
}

export async function runRuleById(id: string, options: { mode?: RunMode; userAddress?: string }) {
  const rule = getRuleById(id);

  if (!rule) {
    throw new Error("Rule not found.");
  }

  const mode = options.mode ?? "simulate";
  const evaluation = await evaluateRuleCondition(rule, options.userAddress || rule.userAddress);

  if (!evaluation.canExecute) {
    const execution = createExecution({
      ruleId: rule.id,
      status: "failed",
      mode,
      errorMessage: evaluation.reason,
    });

    return {
      rule,
      execution,
      canExecute: false,
      reason: evaluation.reason,
    } satisfies RunRuleResponse;
  }

  let prepared;

  try {
    prepared = await prepareRuleTransaction({
      ...rule,
      userAddress: options.userAddress || rule.userAddress,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare the rule transaction.";
    const execution = createExecution({
      ruleId: rule.id,
      status: "failed",
      mode,
      errorMessage: message,
    });

    return {
      rule,
      execution,
      canExecute: false,
      reason: message,
    } satisfies RunRuleResponse;
  }

  if (mode === "simulate") {
    const execution = createExecution({
      ruleId: rule.id,
      status: "simulated",
      mode,
    });

    return {
      rule,
      execution,
      canExecute: true,
      transaction: prepared.summary,
      reason: evaluation.reason,
    } satisfies RunRuleResponse;
  }

  if (mode === "prepare") {
    const execution = createExecution({
      ruleId: rule.id,
      status: "prepared",
      mode,
    });

    return {
      rule,
      execution,
      canExecute: true,
      transaction: prepared.summary,
      reason: evaluation.reason,
    } satisfies RunRuleResponse;
  }

  const demoWallet = getDemoWalletClient();

  if (!demoWallet) {
    const execution = createExecution({
      ruleId: rule.id,
      status: "prepared",
      mode,
    });

    return {
      rule,
      execution,
      canExecute: true,
      transaction: prepared.summary,
      reason:
        "Prepared transaction only. Set DEMO_EXECUTOR_PRIVATE_KEY to let the backend broadcast demo transactions.",
    } satisfies RunRuleResponse;
  }

  try {
    const txHash = await demoWallet.walletClient.sendTransaction({
      account: demoWallet.account,
      to: prepared.request.to,
      value: prepared.request.value,
      data: prepared.request.data,
    });

    const execution = createExecution({
      ruleId: rule.id,
      status: "success",
      mode,
      txHash,
    });

    setRuleStatus(rule.id, "executed");

    return {
      rule: {
        ...rule,
        status: "executed",
      },
      execution,
      canExecute: true,
      transaction: prepared.summary,
      reason: evaluation.reason,
    } satisfies RunRuleResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Broadcast failed.";
    const execution = createExecution({
      ruleId: rule.id,
      status: "failed",
      mode,
      errorMessage: message,
    });

    setRuleStatus(rule.id, "failed");

    return {
      rule: {
        ...rule,
        status: "failed",
      },
      execution,
      canExecute: false,
      transaction: prepared.summary,
      reason: message,
    } satisfies RunRuleResponse;
  }
}
