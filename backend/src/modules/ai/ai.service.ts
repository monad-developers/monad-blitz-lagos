import type { ParseRuleResponse } from "../../shared";
import { z } from "zod";
import { env } from "../../config/env";
import {
  buildHeuristicParsedRule,
  finalizeParsedRule,
} from "../../lib/heuristic-rule-parser";
import { PAYMENT_RULE_SYSTEM_PROMPT } from "./prompt-template";

const aiRuleDraftSchema = z.object({
  name: z.string().optional(),
  recipientAddress: z.string().optional(),
  tokenSymbol: z.string().optional(),
  tokenAddress: z.string().optional(),
  amount: z.string().optional(),
  scheduleType: z.enum(["one_time", "daily", "weekly", "monthly"]).optional(),
  scheduleValue: z.string().optional(),
  conditionType: z.enum(["balance_gt", "always"]).optional(),
  conditionValue: z.string().optional(),
  notes: z.array(z.string()).default([]),
});

const aiRuleDraftJsonSchema = {
  name: "payment_rule_parse",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string" },
      recipientAddress: { type: "string" },
      tokenSymbol: { type: "string" },
      tokenAddress: { type: "string" },
      amount: { type: "string" },
      scheduleType: {
        type: "string",
        enum: ["one_time", "daily", "weekly", "monthly"],
      },
      scheduleValue: { type: "string" },
      conditionType: {
        type: "string",
        enum: ["balance_gt", "always"],
      },
      conditionValue: { type: "string" },
      notes: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: [
      "name",
      "recipientAddress",
      "tokenSymbol",
      "tokenAddress",
      "amount",
      "scheduleType",
      "scheduleValue",
      "conditionType",
      "conditionValue",
      "notes",
    ],
  },
} as const;

function summarizeOpenAIError(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  return normalized.length > 200
    ? `${normalized.slice(0, 200)}...`
    : normalized;
}

function getOpenAIModelUrl() {
  return `${env.OPENAI_BASE_URL.replace(/\/$/, "")}/models/${encodeURIComponent(env.OPENAI_MODEL)}`;
}

export async function checkOpenAIConfiguration() {
  if (!env.OPENAI_API_KEY) {
    console.warn(
      "OpenAI is not configured: OPENAI_API_KEY is missing. The backend will use the heuristic parser.",
    );
    return false;
  }

  try {
    const response = await fetch(getOpenAIModelUrl(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      const errorText = summarizeOpenAIError(await response.text());
      console.warn(
        `OpenAI configuration check failed for model "${env.OPENAI_MODEL}": ${response.status} ${errorText || response.statusText}. The backend will use the heuristic parser until this is fixed.`,
      );
      return false;
    }

    console.log(
      `OpenAI is configured and reachable with model "${env.OPENAI_MODEL}".`,
    );
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(
      `OpenAI configuration check failed for model "${env.OPENAI_MODEL}": ${summarizeOpenAIError(message)}. The backend will use the heuristic parser until this is fixed.`,
    );
    return false;
  }
}

async function parseRuleWithOpenAI(prompt: string, userAddress = "") {
  const response = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      response_format: {
        type: "json_schema",
        json_schema: aiRuleDraftJsonSchema,
      },
      messages: [
        {
          role: "system",
          content: PAYMENT_RULE_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `User address: ${userAddress || "unknown"}\nPrompt: ${prompt}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI parse failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("OpenAI parse failed: empty completion content");
  }

  const parsed = aiRuleDraftSchema.parse(JSON.parse(content));

  return finalizeParsedRule(
    {
      name: parsed.name,
      recipientAddress: parsed.recipientAddress,
      tokenSymbol: parsed.tokenSymbol,
      tokenAddress: parsed.tokenAddress,
      amount: parsed.amount,
      scheduleType: parsed.scheduleType,
      scheduleValue: parsed.scheduleValue,
      conditionType: parsed.conditionType,
      conditionValue: parsed.conditionValue,
      notes: parsed.notes,
    },
    prompt,
    userAddress,
    "openai",
  );
}

export async function parseRulePrompt(
  prompt: string,
  userAddress = "",
): Promise<ParseRuleResponse> {
  if (!env.OPENAI_API_KEY) {
    console.log(
      "Falling back to heuristic parser because OpenAI is not configured.",
    );
    const fallbackRule = buildHeuristicParsedRule(prompt, userAddress);

    return {
      rule: fallbackRule,
      missingFields: fallbackRule.missingFields,
      needsCompletion: fallbackRule.needsCompletion,
      source: fallbackRule.parsingSource,
    };
  }

  try {
    const aiRule = await parseRuleWithOpenAI(prompt, userAddress);

    return {
      rule: aiRule,
      missingFields: aiRule.missingFields,
      needsCompletion: aiRule.needsCompletion,
      source: aiRule.parsingSource,
    };
  } catch (error) {
    console.warn("Falling back to heuristic parser:", error);

    const fallbackRule = buildHeuristicParsedRule(prompt, userAddress);

    return {
      rule: fallbackRule,
      missingFields: fallbackRule.missingFields,
      needsCompletion: fallbackRule.needsCompletion,
      source: fallbackRule.parsingSource,
    };
  }
}
