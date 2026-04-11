import type { PaymentRule, ParsedRuleDraft, RuleCompletionField } from "./rule";
import type { PreparedTransaction, RuleExecution, RunMode } from "./payment";

export type HealthResponse = {
  status: "ok";
  service: string;
  network: string;
  chainId: number;
  timestamp: string;
};

export type ParseRuleRequest = {
  prompt: string;
  userAddress?: string;
};

export type ParseRuleResponse = {
  rule: ParsedRuleDraft;
  missingFields: RuleCompletionField[];
  needsCompletion: boolean;
  source: "openai" | "heuristic";
};

export type SaveRuleRequest = {
  rule: PaymentRule;
};

export type SaveRuleResponse = {
  rule: PaymentRule;
};

export type ListRulesResponse = {
  rules: PaymentRule[];
};

export type GetRuleResponse = {
  rule: PaymentRule;
};

export type ActivateRuleResponse = {
  rule: PaymentRule;
};

export type RunRuleRequest = {
  mode?: RunMode;
  userAddress?: string;
};

export type RunRuleResponse = {
  rule: PaymentRule;
  execution: RuleExecution;
  canExecute: boolean;
  transaction?: PreparedTransaction;
  reason?: string;
};
