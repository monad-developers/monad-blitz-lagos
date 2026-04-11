import {
  CONDITION_TYPES,
  RULE_STATUSES,
  SCHEDULE_TYPES,
} from "../constants/statuses";

export type ScheduleType = (typeof SCHEDULE_TYPES)[number];
export type ConditionType = (typeof CONDITION_TYPES)[number];
export type RuleStatus = (typeof RULE_STATUSES)[number];

export type RuleCompletionField =
  | "recipientAddress"
  | "tokenAddress"
  | "amount"
  | "tokenSymbol";

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
