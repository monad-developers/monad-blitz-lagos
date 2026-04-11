import type { Context } from "hono";
import { ZodError } from "zod";

export function handleApiError(error: unknown, c: Context) {
  if (error instanceof ZodError) {
    return c.json(
      {
        message: "Validation failed.",
        issues: error.flatten(),
      },
      400,
    );
  }

  console.error(error);

  return c.json(
    {
      message: error instanceof Error ? error.message : "Internal server error.",
    },
    500,
  );
}
