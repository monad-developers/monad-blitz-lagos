import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1),
  PRIVY_APP_SECRET: z.string().min(1),
  SERVER_SIGNER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, "SERVER_SIGNER_PRIVATE_KEY must be a 32-byte hex string"),
  NEXT_PUBLIC_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid contract address"),
  NEXT_PUBLIC_MONAD_RPC: z.string().url(),
  PINATA_JWT: z.string().min(1),
  NEXT_PUBLIC_PINATA_GATEWAY_URL: z.string().url(),
  DISTRIBUTE_SECRET: z.string().min(10),
  PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(10000).default(500),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.format();
  console.error("Environment validation failed", formatted);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
