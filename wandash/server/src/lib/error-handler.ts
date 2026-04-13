import type { Request, Response, NextFunction } from "express"
import { createLogger } from "./logger"
import { ZodError } from "zod"

const log = createLogger("ErrorHandler")

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation error", details: err.flatten() })
  }

  log.error("Unhandled error", { message: err.message, stack: err.stack })
  return res.status(500).json({ error: "Internal server error" })
}
