import { MONAD_TESTNET } from "../constants/network";
import { EXECUTION_STATUSES, RUN_MODES } from "../constants/statuses";

export type RunMode = (typeof RUN_MODES)[number];
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

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
