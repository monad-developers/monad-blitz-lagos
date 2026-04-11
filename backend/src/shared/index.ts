import { z } from "zod";

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

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const SUPPORTED_TOKENS = {
  MON: {
    symbol: "MON",
    address: ZERO_ADDRESS,
    decimals: 18,
    isNative: true,
  },
  USDC: {
    symbol: "USDC",
    address: "",
    decimals: 6,
    isNative: false,
  },
} as const;

export const DEFAULT_TOKEN_SYMBOL = "USDC";

export function getTokenDefaults(symbol?: string) {
  if (!symbol) {
    return SUPPORTED_TOKENS[DEFAULT_TOKEN_SYMBOL];
  }

  return SUPPORTED_TOKENS[symbol.toUpperCase() as keyof typeof SUPPORTED_TOKENS] ?? null;
}

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

export type ParseRuleResponse = {
  rule: ParsedRuleDraft;
  missingFields: RuleCompletionField[];
  needsCompletion: boolean;
  source: ParsingSource;
};

export type RunRuleResponse = {
  rule: PaymentRule;
  execution: RuleExecution;
  canExecute: boolean;
  transaction?: PreparedTransaction;
  reason?: string;
};

export const scheduleTypeSchema = z.enum(SCHEDULE_TYPES);
export const conditionTypeSchema = z.enum(CONDITION_TYPES);
export const ruleStatusSchema = z.enum(RULE_STATUSES);
export const runModeSchema = z.enum(RUN_MODES);

export const paymentRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  userAddress: z.string().trim(),
  recipientAddress: z.string().trim(),
  tokenSymbol: z.string().min(1),
  tokenAddress: z.string().trim(),
  amount: z.string().min(1),
  scheduleType: scheduleTypeSchema,
  scheduleValue: z.string().optional(),
  conditionType: conditionTypeSchema,
  conditionValue: z.string().optional(),
  status: ruleStatusSchema,
  rawPrompt: z.string().min(1),
  createdAt: z.string().min(1),
});

export const ruleCompletionFieldSchema = z.enum([
  "recipientAddress",
  "tokenAddress",
  "amount",
  "tokenSymbol",
]);

export const parsedRuleDraftSchema = paymentRuleSchema.extend({
  needsCompletion: z.boolean(),
  missingFields: z.array(ruleCompletionFieldSchema),
  parsingSource: z.enum(["openai", "heuristic"]),
  notes: z.array(z.string()),
});

export const preparedTransactionSchema = z.object({
  to: z.custom<`0x${string}`>((value) => typeof value === "string" && value.startsWith("0x")),
  value: z.string().min(1),
  data: z
    .custom<`0x${string}`>((value) => value === undefined || (typeof value === "string" && value.startsWith("0x")))
    .optional(),
  chainId: z.literal(MONAD_TESTNET.id),
  description: z.string().min(1),
});

export const ruleExecutionSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  txHash: z.string().nullable(),
  status: z.enum(EXECUTION_STATUSES),
  executedAt: z.string().min(1),
  errorMessage: z.string().nullable(),
  mode: runModeSchema,
});
