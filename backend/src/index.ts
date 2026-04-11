import { serve } from "@hono/node-server";
import { MONAD_TESTNET } from "./shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { allowedOrigins, env } from "./config/env";
import { initDb } from "./db/init";
import { handleApiError } from "./middleware/error-handler";
import { checkOpenAIConfiguration } from "./modules/ai/ai.service";
import { aiRoutes } from "./modules/ai/routes";
import { docsRoutes } from "./modules/docs/routes";
import { healthRoutes } from "./modules/health/routes";
import { rulesRoutes } from "./modules/rules/routes";

async function startServer() {
  await initDb();
  void checkOpenAIConfiguration();

  const app = new Hono();

  app.use("*", logger());
  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin) {
          return allowedOrigins[0] ?? "*";
        }

        return allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? origin;
      },
    }),
  );

  app.get("/", (c) =>
    c.json({
      name: "PayPilot API",
      network: MONAD_TESTNET.name,
      endpoints: [
        "GET /health",
        "GET /docs",
        "GET /docs/openapi.json",
        "POST /ai/parse-rule",
        "POST /rules",
        "GET /rules",
        "GET /rules/:id",
        "POST /rules/:id/activate",
        "POST /rules/:id/run",
      ],
    }),
  );

  app.route("/health", healthRoutes);
  app.route("/docs", docsRoutes);
  app.route("/ai", aiRoutes);
  app.route("/rules", rulesRoutes);

  app.notFound((c) => c.json({ message: "Not found." }, 404));
  app.onError(handleApiError);

  serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      console.log(
        `PayPilot backend running at http://localhost:${info.port} on ${MONAD_TESTNET.name} (${MONAD_TESTNET.id})`,
      );
    },
  );
}

void startServer().catch((error) => {
  console.error("Failed to start PayPilot backend.", error);
  process.exit(1);
});
