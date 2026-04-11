import { Hono } from "hono";
import { MONAD_TESTNET } from "../../shared";

export const healthRoutes = new Hono().get("/", (c) =>
  c.json({
    status: "ok" as const,
    service: "paypilot-backend",
    network: MONAD_TESTNET.name,
    chainId: MONAD_TESTNET.id,
    timestamp: new Date().toISOString(),
  }),
);
