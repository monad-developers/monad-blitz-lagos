// Monad charges gas LIMIT (not gas used), so hardcode limits to avoid
// estimateGas() round-trips and account for Monad's cold-opcode repricing.
export const GAS = {
  CREATE_CHALLENGE: BigInt(500_000),
  START_CHALLENGE: BigInt(200_000),
  SUBMIT_SCORE: BigInt(350_000),
  DISTRIBUTE_REWARDS: (winnerCount: number) =>
    BigInt(250_000) + BigInt(winnerCount * 80_000),
  REFUND_BRAND: BigInt(200_000),
} as const;

export const BASE_FEE = BigInt("100000000000"); // 100 gwei
export const PRIORITY_FEE = BigInt("2000000000"); // 2 gwei
export const MAX_FEE_PER_GAS = BASE_FEE + PRIORITY_FEE; // 102 gwei

export const GAME_CONFIG = {
  ROUND_COUNT: 5,
  POINTS_PER_ROUND: 60,
  ROUND_1_MIN_MS: 150,
  ROUND_1_MAX_MS: 5000,
  ROUND_2_TIMEOUT_MS: 10000,
  ROUND_3_TIMEOUT_MS: 15000,
  ROUND_4_TIMEOUT_MS: 15000,
  ROUND_5_TIMEOUT_MS: 10000,
  SESSION_TTL_MS: 3 * 60 * 1000,
  INTRO_MS: 5000,
  MAX_SCORE: 300,
} as const;

export const ALLOWED_UPLOAD_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "image/webp",
] as const;

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
