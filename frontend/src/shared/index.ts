export const MONAD_TESTNET = {
  id: 10143,
  name: "Monad Testnet",
  network: "monad-testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
} as const;

export const RULE_STATUSES = ["draft", "active", "paused", "executed", "failed"] as const;
export const EXECUTION_STATUSES = ["pending", "simulated", "prepared", "success", "failed"] as const;
export const SCHEDULE_TYPES = ["one_time", "daily", "weekly", "monthly"] as const;
export const CONDITION_TYPES = ["balance_gt", "always"] as const;
export const RUN_MODES = ["simulate", "prepare", "execute"] as const;

export type ScheduleType = (typeof SCHEDULE_TYPES)[number];
export type ConditionType = (typeof CONDITION_TYPES)[number];
export type RuleStatus = (typeof RULE_STATUSES)[number];
export type RunMode = (typeof RUN_MODES)[number];
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];
export type RuleCompletionField = "recipientAddress" | "tokenAddress" | "amount" | "tokenSymbol";
export type ParsingSource = "openai" | "heuristic";

export type PaymentRule = {
  id: string;
  name: string;
  userAddress: string;
  recipientAddress: string;
  tokenSymbol: string;
  tokenAddress: string;
  amount: string;
  scheduleType: ScheduleType;
  scheduleValue?: string;
  conditionType: ConditionType;
  conditionValue?: string;
  status: RuleStatus;
  rawPrompt: string;
  createdAt: string;
};

export type ParsedRuleDraft = PaymentRule & {
  needsCompletion: boolean;
  missingFields: RuleCompletionField[];
  parsingSource: ParsingSource;
  notes: string[];
};

export type PreparedTransaction = {
  to: `0x${string}`;
  value: string;
  data?: `0x${string}`;
  chainId: (typeof MONAD_TESTNET)["id"];
  description: string;
};

export type RuleExecution = {
  id: string;
  ruleId: string;
  txHash: string | null;
  status: ExecutionStatus;
  executedAt: string;
  errorMessage: string | null;
  mode: RunMode;
};

export type ParseRuleRequest = {
  prompt: string;
  userAddress?: string;
};

export type ParseRuleResponse = {
  rule: ParsedRuleDraft;
  missingFields: RuleCompletionField[];
  needsCompletion: boolean;
  source: ParsingSource;
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
