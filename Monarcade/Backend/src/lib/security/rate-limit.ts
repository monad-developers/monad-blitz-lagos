import { NextRequest } from "next/server";

import { RateLimitError } from "@/lib/errors";
import { getClientIp } from "@/lib/http";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 60;

export const enforceRateLimit = (
  request: NextRequest,
  namespace: string,
  limit = DEFAULT_LIMIT,
) => {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${namespace}:${ip}`;

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  if (current.count >= limit) {
    throw new RateLimitError();
  }

  current.count += 1;
  buckets.set(key, current);
};
