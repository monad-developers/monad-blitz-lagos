import { z } from "zod";
import { MONAD_TESTNET } from "../constants/network";
import { EXECUTION_STATUSES, RUN_MODES } from "../constants/statuses";

export const runModeSchema = z.enum(RUN_MODES);

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
