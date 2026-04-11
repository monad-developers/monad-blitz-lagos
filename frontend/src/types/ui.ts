import type { RunRuleResponse } from "@paypilot/shared";

export type RuleRunState = {
  status: "idle" | "running" | "simulated" | "success" | "error";
  message?: string;
  txHash?: string;
  result?: RunRuleResponse;
};
