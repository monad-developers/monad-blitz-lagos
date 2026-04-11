import { randomUUID } from "node:crypto";
import {
  DEFAULT_TOKEN_SYMBOL,
  type ConditionType,
  getTokenDefaults,
  parsedRuleDraftSchema,
  type ParsedRuleDraft,
  type ParsingSource,
  type ScheduleType,
} from "../shared";
import { isAddress } from "viem";
import { env } from "../config/env";

const ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/;
const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type DraftSeed = {
  name?: string;
  recipientAddress?: string;
  recipientLabel?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
  amount?: string;
  scheduleType?: ScheduleType;
  scheduleValue?: string;
  conditionType?: ConditionType;
  conditionValue?: string;
  notes?: string[];
};

function titleCase(input: string) {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function compactAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function buildRuleName(
  amount: string,
  tokenSymbol: string,
  scheduleType: ScheduleType,
  recipientAddress: string,
  recipientLabel?: string,
) {
  const scheduleLabel = scheduleType.replace("_", " ");
  const recipientLabelOrAddress = recipientLabel
    ? titleCase(recipientLabel)
    : recipientAddress
      ? compactAddress(recipientAddress)
      : "recipient";

  return `${titleCase(scheduleLabel)} ${amount} ${tokenSymbol.toUpperCase()} to ${recipientLabelOrAddress}`;
}

function detectSchedule(prompt: string): { scheduleType: ScheduleType; scheduleValue?: string } {
  const lowerPrompt = prompt.toLowerCase();

  for (const day of DAYS) {
    if (lowerPrompt.includes(`every ${day}`)) {
      return {
        scheduleType: "weekly",
        scheduleValue: titleCase(day),
      };
    }
  }

  if (lowerPrompt.includes("daily") || lowerPrompt.includes("every day")) {
    return {
      scheduleType: "daily",
      scheduleValue: "Every day",
    };
  }

  if (lowerPrompt.includes("monthly") || lowerPrompt.includes("every month")) {
    const ordinalMatch = lowerPrompt.match(/on the (\d{1,2})(?:st|nd|rd|th)?/);

    return {
      scheduleType: "monthly",
      scheduleValue: ordinalMatch?.[1] ?? "1",
    };
  }

  return {
    scheduleType: "one_time",
  };
}

function detectCondition(prompt: string): { conditionType: ConditionType; conditionValue?: string } {
  const lowerPrompt = prompt.toLowerCase();
  const match = lowerPrompt.match(
    /(?:if|when)\s+(?:my\s+)?balance(?:\s+is)?\s*(?:above|over|greater than|>|exceeds?)\s+([\d.]+)/,
  );

  if (match?.[1]) {
    return {
      conditionType: "balance_gt",
      conditionValue: match[1],
    };
  }

  if (lowerPrompt.includes("always")) {
    return {
      conditionType: "always",
    };
  }

  return {
    conditionType: "always",
  };
}

function extractAmountAndToken(prompt: string) {
  // Try: "send/pay 10 USDC" or "send/pay USDC 10" format
  const verbMatch = prompt.match(/(?:send|pay)\s+([\d.]+)\s+([a-zA-Z]{2,10})/i);

  if (verbMatch) {
    return {
      amount: verbMatch[1],
      tokenSymbol: verbMatch[2].toUpperCase(),
    };
  }

  // Try: "10 USDC" anywhere in the prompt (for more flexible parsing)
  const amountTokenMatch = prompt.match(/(\d+(?:\.\d+)?)\s+([A-Z]{2,10})/);

  if (amountTokenMatch) {
    return {
      amount: amountTokenMatch[1],
      tokenSymbol: amountTokenMatch[2].toUpperCase(),
    };
  }

  return {
    amount: "",
    tokenSymbol: "",
  };
}

function extractRecipientLabel(prompt: string) {
  const labelMatch = prompt.match(/to\s+(.+?)(?:\s+(?:every|if|when)\b|$)/i);

  if (!labelMatch?.[1]) {
    return "";
  }

  const value = labelMatch[1].trim();

  if (!value || value.toLowerCase() === "this wallet" || ADDRESS_REGEX.test(value)) {
    return "";
  }

  return value.replace(/[.]+$/, "");
}

export function finalizeParsedRule(
  seed: DraftSeed,
  prompt: string,
  userAddress = "",
  parsingSource: ParsingSource,
): ParsedRuleDraft {
  const missingFields = new Set<"recipientAddress" | "tokenAddress" | "amount" | "tokenSymbol">();
  const notes = [...(seed.notes ?? [])];
  const normalizedTokenSymbol = (seed.tokenSymbol || DEFAULT_TOKEN_SYMBOL).toUpperCase();
  const tokenDefaults = getTokenDefaults(normalizedTokenSymbol);

  const recipientAddress =
    seed.recipientAddress && isAddress(seed.recipientAddress) ? seed.recipientAddress : "";
  const amount = seed.amount?.trim() || "0";
  const tokenAddress =
    seed.tokenAddress?.trim() ||
    (normalizedTokenSymbol === "USDC" ? env.MONAD_USDC_TOKEN_ADDRESS : tokenDefaults?.address ?? "");
  const scheduleType = seed.scheduleType ?? "one_time";

  if (!recipientAddress) {
    missingFields.add("recipientAddress");
    notes.push("Add a recipient wallet address before activating this rule.");
  }

  if (!seed.amount?.trim()) {
    missingFields.add("amount");
    notes.push("Add an amount so the rule can be executed safely.");
  }

  if (!seed.tokenSymbol?.trim()) {
    missingFields.add("tokenSymbol");
    notes.push("Choose a token symbol such as MON or USDC.");
  }

  if (normalizedTokenSymbol !== "MON" && !tokenAddress) {
    missingFields.add("tokenAddress");
    notes.push(`Set the Monad testnet token address for ${normalizedTokenSymbol} before running the rule.`);
  }

  const rule = parsedRuleDraftSchema.parse({
    id: randomUUID(),
    name:
      seed.name?.trim() ||
      buildRuleName(amount, normalizedTokenSymbol, scheduleType, recipientAddress, seed.recipientLabel),
    userAddress,
    recipientAddress,
    tokenSymbol: normalizedTokenSymbol,
    tokenAddress,
    amount,
    scheduleType,
    scheduleValue: seed.scheduleValue?.trim() || undefined,
    conditionType: seed.conditionType ?? "always",
    conditionValue: seed.conditionValue?.trim() || undefined,
    status: "draft",
    rawPrompt: prompt,
    createdAt: new Date().toISOString(),
    needsCompletion: missingFields.size > 0,
    missingFields: Array.from(missingFields),
    parsingSource,
    notes: Array.from(new Set(notes)),
  });

  return rule;
}

export function buildHeuristicParsedRule(prompt: string, userAddress = "") {
  const recipientAddress = prompt.match(ADDRESS_REGEX)?.[0];
  const recipientLabel = extractRecipientLabel(prompt);
  const amountAndToken = extractAmountAndToken(prompt);
  const schedule = detectSchedule(prompt);
  const condition = detectCondition(prompt);

  return finalizeParsedRule(
    {
      recipientAddress,
      recipientLabel,
      amount: amountAndToken.amount,
      tokenSymbol: amountAndToken.tokenSymbol,
      scheduleType: schedule.scheduleType,
      scheduleValue: schedule.scheduleValue,
      conditionType: condition.conditionType,
      conditionValue: condition.conditionValue,
    },
    prompt,
    userAddress,
    "heuristic",
  );
}
