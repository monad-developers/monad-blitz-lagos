type LogLevel = "info" | "warn" | "error" | "debug"

function timestamp() {
  return new Date().toISOString()
}

function format(level: LogLevel, module: string, message: string, data?: unknown) {
  const base = `[${timestamp()}] [${level.toUpperCase()}] [${module}] ${message}`
  if (data !== undefined) {
    return `${base} ${JSON.stringify(data)}`
  }
  return base
}

export function createLogger(module: string) {
  return {
    info: (msg: string, data?: unknown) => console.log(format("info", module, msg, data)),
    warn: (msg: string, data?: unknown) => console.warn(format("warn", module, msg, data)),
    error: (msg: string, data?: unknown) => console.error(format("error", module, msg, data)),
    debug: (msg: string, data?: unknown) => {
      if (process.env.NODE_ENV !== "production") {
        console.debug(format("debug", module, msg, data))
      }
    },
  }
}
