import { NextRequest, NextResponse } from "next/server";

import { requirePrivyAuth, type AuthContext } from "@/lib/auth/privy";
import { addCorsHeaders, jsonError } from "@/lib/http";
import { logger } from "@/lib/logger";
import { ForbiddenError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";

type RouteContext = {
  auth?: AuthContext;
  params?: Record<string, string>;
};

type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<NextResponse>;

type RouteOptions = {
  auth?: boolean;
  rateLimit?: number;
  namespace: string;
};

export const withRoute = (handler: RouteHandler, options: RouteOptions) => {
  return async (
    request: NextRequest,
    routeContext?: { params?: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    const startedAt = Date.now();

    try {
      enforceRateLimit(request, options.namespace, options.rateLimit ?? 60);

      const context: RouteContext = {};
      if (routeContext?.params) {
        context.params = await routeContext.params;
      }
      if (options.auth) {
        context.auth = await requirePrivyAuth(request);
      }

      const response = await handler(request, context);

      logger.info("API success", {
        namespace: options.namespace,
        method: request.method,
        path: request.nextUrl.pathname,
        status: response.status,
        durationMs: Date.now() - startedAt,
      });

      return addCorsHeaders(request, response);
    } catch (error) {
      const response = jsonError(error);
      logger.warn("API failure", {
        namespace: options.namespace,
        method: request.method,
        path: request.nextUrl.pathname,
        status: response.status,
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return addCorsHeaders(request, response);
    }
  };
};
