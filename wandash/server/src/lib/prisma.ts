import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env";

const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
  ssl: env.nodeEnv === "production" || env.databaseUrl.includes(".render.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

export const prisma = new PrismaClient({ adapter });