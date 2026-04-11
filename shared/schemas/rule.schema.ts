import { z } from "zod";
import {
  CONDITION_TYPES,
  RULE_STATUSES,
  SCHEDULE_TYPES,
} from "../constants/statuses";

export const scheduleTypeSchema = z.enum(SCHEDULE_TYPES);
export const conditionTypeSchema = z.enum(CONDITION_TYPES);
export const ruleStatusSchema = z.enum(RULE_STATUSES);

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
