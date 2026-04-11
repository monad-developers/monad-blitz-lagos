export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const SUPPORTED_TOKENS = {
  MON: {
    symbol: "MON",
    address: ZERO_ADDRESS,
    decimals: 18,
    isNative: true,
  },
  USDC: {
    symbol: "USDC",
    address: "",
    decimals: 6,
    isNative: false,
  },
} as const;

export const DEFAULT_TOKEN_SYMBOL = "USDC";

export function getTokenDefaults(symbol?: string) {
  if (!symbol) {
    return SUPPORTED_TOKENS[DEFAULT_TOKEN_SYMBOL];
  }

  return SUPPORTED_TOKENS[symbol.toUpperCase() as keyof typeof SUPPORTED_TOKENS] ?? null;
}
