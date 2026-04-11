const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: {
    type: "string",
  },
  description: "Rule identifier.",
} as const;

const errorSchema = {
  type: "object",
  properties: {
    message: {
      type: "string",
    },
    issues: {},
  },
  required: ["message"],
} as const;

const paymentRuleSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    userAddress: { type: "string" },
    recipientAddress: { type: "string" },
    tokenSymbol: { type: "string" },
    tokenAddress: { type: "string" },
    amount: { type: "string" },
    scheduleType: {
      type: "string",
      enum: ["one_time", "daily", "weekly", "monthly"],
    },
    scheduleValue: {
      type: "string",
    },
    conditionType: {
      type: "string",
      enum: ["balance_gt", "always"],
    },
    conditionValue: {
      type: "string",
    },
    status: {
      type: "string",
      enum: ["draft", "active", "paused", "executed", "failed"],
    },
    rawPrompt: { type: "string" },
    createdAt: {
      type: "string",
      format: "date-time",
    },
  },
  required: [
    "id",
    "name",
    "userAddress",
    "recipientAddress",
    "tokenSymbol",
    "tokenAddress",
    "amount",
    "scheduleType",
    "conditionType",
    "status",
    "rawPrompt",
    "createdAt",
  ],
} as const;

const parsedRuleDraftSchema = {
  allOf: [
    {
      $ref: "#/components/schemas/PaymentRule",
    },
    {
      type: "object",
      properties: {
        needsCompletion: {
          type: "boolean",
        },
        missingFields: {
          type: "array",
          items: {
            type: "string",
            enum: ["recipientAddress", "tokenAddress", "amount", "tokenSymbol"],
          },
        },
        parsingSource: {
          type: "string",
          enum: ["openai", "heuristic"],
        },
        notes: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      required: ["needsCompletion", "missingFields", "parsingSource", "notes"],
    },
  ],
} as const;

const ruleExecutionSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    ruleId: { type: "string" },
    txHash: {
      type: ["string", "null"],
    },
    status: {
      type: "string",
      enum: ["pending", "simulated", "prepared", "success", "failed"],
    },
    executedAt: {
      type: "string",
      format: "date-time",
    },
    errorMessage: {
      type: ["string", "null"],
    },
    mode: {
      type: "string",
      enum: ["simulate", "prepare", "execute"],
    },
  },
  required: ["id", "ruleId", "txHash", "status", "executedAt", "errorMessage", "mode"],
} as const;

const preparedTransactionSchema = {
  type: "object",
  properties: {
    to: { type: "string" },
    value: { type: "string" },
    data: { type: "string" },
    chainId: { type: "integer", const: 10143 },
    description: { type: "string" },
  },
  required: ["to", "value", "chainId", "description"],
} as const;

function jsonResponse(schema: Record<string, unknown>, description: string, example?: unknown) {
  return {
    description,
    content: {
      "application/json": {
        schema,
        ...(example !== undefined ? { example } : {}),
      },
    },
  };
}

function errorResponse(status: number, description: string, exampleMessage: string) {
  return [
    status,
    jsonResponse(
      {
        $ref: "#/components/schemas/ApiError",
      },
      description,
      {
        message: exampleMessage,
      },
    ),
  ] as const;
}

export function createOpenApiDocument(serverOrigin = "/") {
  return {
    openapi: "3.1.0",
    info: {
      title: "PayPilot Backend API",
      version: "0.1.0",
      description:
        "REST API for AI-assisted rule parsing, rule storage, and Monad testnet payment execution.",
    },
    servers: [
      {
        url: serverOrigin,
      },
    ],
    tags: [
      {
        name: "System",
      },
      {
        name: "AI",
      },
      {
        name: "Rules",
      },
    ],
    paths: {
      "/": {
        get: {
          tags: ["System"],
          summary: "Get API metadata",
          responses: {
            200: jsonResponse(
              {
                type: "object",
                properties: {
                  name: { type: "string" },
                  network: { type: "string" },
                  endpoints: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["name", "network", "endpoints"],
              },
              "API metadata.",
            ),
          },
        },
      },
      "/health": {
        get: {
          tags: ["System"],
          summary: "Get backend health",
          responses: {
            200: jsonResponse(
              {
                type: "object",
                properties: {
                  status: { type: "string", const: "ok" },
                  service: { type: "string" },
                  network: { type: "string" },
                  chainId: { type: "integer" },
                  timestamp: { type: "string", format: "date-time" },
                },
                required: ["status", "service", "network", "chainId", "timestamp"],
              },
              "Health payload.",
            ),
          },
        },
      },
      "/ai/parse-rule": {
        post: {
          tags: ["AI"],
          summary: "Parse a natural-language payment rule",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    prompt: {
                      type: "string",
                      minLength: 4,
                    },
                    userAddress: {
                      type: "string",
                    },
                  },
                  required: ["prompt"],
                },
                example: {
                  prompt:
                    "Pay 5 USDC to 0x1111111111111111111111111111111111111111 every week if my balance is above 50",
                  userAddress: "0x2222222222222222222222222222222222222222",
                },
              },
            },
          },
          responses: {
            200: jsonResponse(
              {
                type: "object",
                properties: {
                  rule: { $ref: "#/components/schemas/ParsedRuleDraft" },
                  missingFields: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["recipientAddress", "tokenAddress", "amount", "tokenSymbol"],
                    },
                  },
                  needsCompletion: { type: "boolean" },
                  source: {
                    type: "string",
                    enum: ["openai", "heuristic"],
                  },
                },
                required: ["rule", "missingFields", "needsCompletion", "source"],
              },
              "Parsed rule draft.",
            ),
            ...Object.fromEntries([
              errorResponse(400, "Invalid request body.", "Validation failed."),
              errorResponse(500, "Unexpected backend error.", "Internal server error."),
            ]),
          },
        },
      },
      "/rules": {
        get: {
          tags: ["Rules"],
          summary: "List saved rules",
          responses: {
            200: jsonResponse(
              {
                type: "object",
                properties: {
                  rules: {
                    type: "array",
                    items: { $ref: "#/components/schemas/PaymentRule" },
                  },
                },
                required: ["rules"],
              },
              "Saved rules.",
            ),
            ...Object.fromEntries([errorResponse(500, "Unexpected backend error.", "Internal server error.")]),
          },
        },
        post: {
          tags: ["Rules"],
          summary: "Create or update a rule",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    rule: { $ref: "#/components/schemas/PaymentRule" },
                  },
                  required: ["rule"],
                },
              },
            },
          },
          responses: {
            201: jsonResponse(
              {
                type: "object",
                properties: {
                  rule: { $ref: "#/components/schemas/PaymentRule" },
                },
                required: ["rule"],
              },
              "Saved rule.",
            ),
            ...Object.fromEntries([
              errorResponse(400, "Invalid request body.", "Validation failed."),
              errorResponse(500, "Unexpected backend error.", "Internal server error."),
            ]),
          },
        },
      },
      "/rules/{id}": {
        get: {
          tags: ["Rules"],
          summary: "Get a rule by id",
          parameters: [idParam],
          responses: {
            200: jsonResponse(
              {
                type: "object",
                properties: {
                  rule: { $ref: "#/components/schemas/PaymentRule" },
                },
                required: ["rule"],
              },
              "Requested rule.",
            ),
            ...Object.fromEntries([
              errorResponse(404, "Rule was not found.", "Rule not found."),
              errorResponse(500, "Unexpected backend error.", "Internal server error."),
            ]),
          },
        },
      },
      "/rules/{id}/activate": {
        post: {
          tags: ["Rules"],
          summary: "Activate a rule",
          parameters: [idParam],
          responses: {
            200: jsonResponse(
              {
                type: "object",
                properties: {
                  rule: { $ref: "#/components/schemas/PaymentRule" },
                },
                required: ["rule"],
              },
              "Activated rule.",
            ),
            ...Object.fromEntries([
              errorResponse(404, "Rule was not found.", "Rule not found."),
              errorResponse(500, "Unexpected backend error.", "Internal server error."),
            ]),
          },
        },
      },
      "/rules/{id}/run": {
        post: {
          tags: ["Rules"],
          summary: "Run, simulate, or prepare a rule execution",
          parameters: [idParam],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    mode: {
                      type: "string",
                      enum: ["simulate", "prepare", "execute"],
                    },
                    userAddress: {
                      type: "string",
                    },
                  },
                },
                example: {
                  mode: "simulate",
                  userAddress: "0x2222222222222222222222222222222222222222",
                },
              },
            },
          },
          responses: {
            200: jsonResponse(
              {
                type: "object",
                properties: {
                  rule: { $ref: "#/components/schemas/PaymentRule" },
                  execution: { $ref: "#/components/schemas/RuleExecution" },
                  canExecute: { type: "boolean" },
                  transaction: { $ref: "#/components/schemas/PreparedTransaction" },
                  reason: { type: "string" },
                },
                required: ["rule", "execution", "canExecute"],
              },
              "Execution result.",
            ),
            ...Object.fromEntries([
              errorResponse(400, "Invalid request body.", "Validation failed."),
              errorResponse(500, "Unexpected backend error.", "Rule not found."),
            ]),
          },
        },
      },
    },
    components: {
      schemas: {
        ApiError: errorSchema,
        PaymentRule: paymentRuleSchema,
        ParsedRuleDraft: parsedRuleDraftSchema,
        RuleExecution: ruleExecutionSchema,
        PreparedTransaction: preparedTransactionSchema,
      },
    },
  } as const;
}
