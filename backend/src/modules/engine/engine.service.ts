import type { PaymentRule } from "../../shared";
import { isAddress } from "viem";
import { getRuleBalance } from "../payments/payments.service";

export type RuleEvaluation = {
  canExecute: boolean;
  reason?: string;
};

export async function evaluateRuleCondition(
  rule: PaymentRule,
  senderAddress?: string,
): Promise<RuleEvaluation> {
  const activeAddress = senderAddress || rule.userAddress;

  if (!activeAddress || !isAddress(activeAddress)) {
    return {
      canExecute: false,
      reason: "Connect a wallet or save the rule with a sender address before running it.",
    };
  }

  if (!rule.recipientAddress) {
    return {
      canExecute: false,
      reason: "This rule still needs a recipient wallet address.",
    };
  }

  if (rule.conditionType === "always") {
    return {
      canExecute: true,
      reason: "The rule has no balance guard, so it can run immediately.",
    };
  }

  const threshold = Number(rule.conditionValue ?? "0");

  if (!Number.isFinite(threshold)) {
    return {
      canExecute: false,
      reason: "The balance condition could not be parsed.",
    };
  }

  const balance = await getRuleBalance(activeAddress, rule);
  const currentBalance = Number(balance.formatted);

  if (currentBalance > threshold) {
    return {
      canExecute: true,
      reason: `Current ${rule.tokenSymbol} balance ${balance.formatted} is above ${threshold}.`,
    };
  }

  return {
    canExecute: false,
    reason: `Current ${rule.tokenSymbol} balance ${balance.formatted} is not above ${threshold}.`,
  };
}
