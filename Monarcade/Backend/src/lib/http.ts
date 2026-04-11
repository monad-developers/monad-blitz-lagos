import { NextRequest, NextResponse } from "next/server";

import { AppError, isAppError } from "@/lib/errors";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const toSafeJson = <T>(data: T): T => {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => (typeof value === "bigint" ? value.toString() : value)),
  ) as T;
};

export const jsonOk = <T>(data: T, init?: ResponseInit) => {
  const safeData = toSafeJson(data);

  return NextResponse.json(safeData, { status: init?.status ?? 200, ...init });
};

export const jsonCreated = <T>(data: T) => {
  const safeData = toSafeJson(data);

  return NextResponse.json(safeData, { status: 201 });
};

export const jsonError = (error: unknown) => {
  if (isAppError(error)) {
    const safeError = toSafeJson({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });

    return NextResponse.json(
      safeError,
      { status: error.statusCode },
    );
  }

  logger.error("Unhandled server error", {
    message: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    },
    { status: 500 },
  );
};

export const readJsonBody = async <T>(request: NextRequest): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ValidationError("Request body is required and must be valid JSON");
  }
};

export const methodNotAllowed = (allowed: string[]) => {
  return NextResponse.json(
    {
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Method not allowed",
        details: {
          allowed,
        },
      },
    },
    { status: 405 },
  );
};

const defaultAllowedOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "https://monarchade-backend.vercel.app",
  "https://monarchade.vercel.app"
]);

export const addCorsHeaders = (request: NextRequest, response: NextResponse) => {
  const requestOrigin = request.headers.get("origin");

  if (requestOrigin && defaultAllowedOrigins.has(requestOrigin)) {
    response.headers.set("Access-Control-Allow-Origin", requestOrigin);
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-kyc-verified, X-Requested-With",
  );
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
};

export const getClientIp = (request: NextRequest) => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
};

export const ensureMethod = (request: NextRequest, methods: string[]) => {
  if (!methods.includes(request.method)) {
    throw new AppError(405, "METHOD_NOT_ALLOWED", "Method not allowed", {
      allowed: methods,
    });
  }
};
