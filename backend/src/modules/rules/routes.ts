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
  .get("/", async (c) => c.json({ rules: await listRules() }))
  .post("/", async (c) => {
    const body = saveRuleRequestSchema.parse(await c.req.json());
    const savedRule = await saveRule(body.rule);

    return c.json({ rule: savedRule }, 201);
  })
  .get("/:id", async (c) => {
    const rule = await getRuleById(c.req.param("id"));

    if (!rule) {
      return c.json({ message: "Rule not found." }, 404);
    }

    return c.json({ rule });
  })
  .post("/:id/activate", async (c) => {
    const rule = await setRuleStatus(c.req.param("id"), "active");

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
