import { z } from "zod";
import { Hono } from "hono";
import { parseRulePrompt } from "./ai.service";

const parseRuleRequestSchema = z.object({
  prompt: z.string().min(4),
  userAddress: z.string().optional(),
});

export const aiRoutes = new Hono().post("/parse-rule", async (c) => {
  const body = parseRuleRequestSchema.parse(await c.req.json());
  const result = await parseRulePrompt(body.prompt, body.userAddress);

  return c.json(result);
});
