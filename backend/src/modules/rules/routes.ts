import { Hono } from "hono";
import { paymentRuleSchema, runModeSchema } from "@paypilot/shared";
import { z } from "zod";
import {
  getRuleById,
  listRules,
  runRuleById,
  saveRule,
  setRuleStatus,
} from "./rules.service";

const saveRuleRequestSchema = z.object({
  rule: paymentRuleSchema,
});

const runRuleRequestSchema = z.object({
  mode: runModeSchema.optional(),
  userAddress: z.string().optional(),
});

export const rulesRoutes = new Hono()
  .get("/", (c) => c.json({ rules: listRules() }))
  .post("/", async (c) => {
    const body = saveRuleRequestSchema.parse(await c.req.json());
    const savedRule = saveRule(body.rule);

    return c.json({ rule: savedRule }, 201);
  })
  .get("/:id", (c) => {
    const rule = getRuleById(c.req.param("id"));

    if (!rule) {
      return c.json({ message: "Rule not found." }, 404);
    }

    return c.json({ rule });
  })
  .post("/:id/activate", (c) => {
    const rule = setRuleStatus(c.req.param("id"), "active");

    if (!rule) {
      return c.json({ message: "Rule not found." }, 404);
    }

    return c.json({ rule });
  })
  .post("/:id/run", async (c) => {
    const body = runRuleRequestSchema.parse(await c.req.json().catch(() => ({})));
    const result = await runRuleById(c.req.param("id"), body);

    return c.json(result);
  });
