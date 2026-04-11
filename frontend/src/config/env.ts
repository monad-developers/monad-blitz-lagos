import { MONAD_TESTNET } from "../shared";

function requireClientEnv(name: string, value: string | undefined, fallback?: string) {
  const normalizedValue = value?.trim();

  if (normalizedValue) {
    return normalizedValue;
  }

  if (!import.meta.env.PROD && fallback) {
    return fallback;
  }

  throw new Error(`${name} is required for production frontend builds.`);
}

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

export const clientEnv = {
  apiUrl: trimTrailingSlash(
    requireClientEnv("VITE_API_URL", import.meta.env.VITE_API_URL, "http://localhost:8787"),
  ),
  monadRpcUrl: requireClientEnv(
    "VITE_MONAD_RPC_URL",
    import.meta.env.VITE_MONAD_RPC_URL,
    MONAD_TESTNET.rpcUrl,
  ),
} as const;
