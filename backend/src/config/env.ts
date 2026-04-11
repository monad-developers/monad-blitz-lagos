import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { MONAD_TESTNET } from "@paypilot/shared";

const currentDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(currentDir, "../..");

loadEnv({ path: resolve(backendRoot, "../.env") });
loadEnv({ path: resolve(backendRoot, ".env"), override: true });

function resolveDatabasePath(input?: string) {
  if (!input) {
    return resolve(backendRoot, "data/paypilot.db");
  }

  return input.startsWith("/") ? input : resolve(backendRoot, input);
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8787),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().default(resolve(backendRoot, "data/paypilot.db")),
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  MONAD_RPC_URL: z.string().url().default(MONAD_TESTNET.rpcUrl),
  MONAD_CHAIN_ID: z.coerce.number().default(MONAD_TESTNET.id),
  MONAD_USDC_TOKEN_ADDRESS: z.string().default(""),
  AUTO_PAY_AGENT_ADDRESS: z.string().default(""),
  DEMO_EXECUTOR_PRIVATE_KEY: z.string().default(""),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
  DATABASE_URL: resolveDatabasePath(process.env.DATABASE_URL),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  MONAD_RPC_URL: process.env.MONAD_RPC_URL,
  MONAD_CHAIN_ID: process.env.MONAD_CHAIN_ID,
  MONAD_USDC_TOKEN_ADDRESS: process.env.MONAD_USDC_TOKEN_ADDRESS,
  AUTO_PAY_AGENT_ADDRESS: process.env.AUTO_PAY_AGENT_ADDRESS,
  DEMO_EXECUTOR_PRIVATE_KEY: process.env.DEMO_EXECUTOR_PRIVATE_KEY,
});

export const allowedOrigins = env.FRONTEND_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export { backendRoot };
