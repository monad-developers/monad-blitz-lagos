import { GAME_CONFIG } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";

const MAX_PTS = GAME_CONFIG.POINTS_PER_ROUND;

/**
 * Speed-weighted scoring: faster correct answers earn more points.
 * Formula: isCorrect ? max(0, floor((maxMs - timeMs) / maxMs * MAX_PTS)) : 0
 * Returns 0 to POINTS_PER_ROUND (60).
 */
const scoreSpeedRound = (isCorrect: boolean, timeMs: number, maxMs: number) => {
  if (!isCorrect) return 0;
  const raw = ((maxMs - timeMs) / maxMs) * MAX_PTS;
  return Math.max(0, Math.floor(raw));
};

export const computeRound1Score = (isCorrect: boolean, timeMs: number) => {
  if (!Number.isInteger(timeMs)) {
    throw new ValidationError("Round 1 timeMs must be an integer");
  }
  if (timeMs < GAME_CONFIG.ROUND_1_MIN_MS || timeMs > GAME_CONFIG.ROUND_1_MAX_MS) {
    throw new ValidationError("Round 1 timeMs is out of accepted range");
  }
  return scoreSpeedRound(isCorrect, timeMs, GAME_CONFIG.ROUND_1_MAX_MS);
};

export const computeRound2Score = (isCorrect: boolean, timeMs: number) => {
  if (!Number.isInteger(timeMs)) {
    throw new ValidationError("Round 2 timeMs must be an integer");
  }
  if (timeMs < 0 || timeMs > GAME_CONFIG.ROUND_2_TIMEOUT_MS) {
    throw new ValidationError("Round 2 timeMs is out of accepted range");
  }
  return scoreSpeedRound(isCorrect, timeMs, GAME_CONFIG.ROUND_2_TIMEOUT_MS);
};

export const computeRound3Score = (isCorrect: boolean, timeMs: number) => {
  if (!Number.isInteger(timeMs)) {
    throw new ValidationError("Round 3 timeMs must be an integer");
  }
  if (timeMs < 0 || timeMs > GAME_CONFIG.ROUND_3_TIMEOUT_MS) {
    throw new ValidationError("Round 3 timeMs is out of accepted range");
  }
  return scoreSpeedRound(isCorrect, timeMs, GAME_CONFIG.ROUND_3_TIMEOUT_MS);
};

export const computeRound4Score = (isCorrect: boolean, timeMs: number) => {
  if (!Number.isInteger(timeMs)) {
    throw new ValidationError("Round 4 timeMs must be an integer");
  }
  if (timeMs < 0 || timeMs > GAME_CONFIG.ROUND_4_TIMEOUT_MS) {
    throw new ValidationError("Round 4 timeMs is out of accepted range");
  }
  return scoreSpeedRound(isCorrect, timeMs, GAME_CONFIG.ROUND_4_TIMEOUT_MS);
};

export const computeRound5Score = (isCorrect: boolean, timeMs: number) => {
  if (!Number.isInteger(timeMs)) {
    throw new ValidationError("Round 5 timeMs must be an integer");
  }
  if (timeMs < 0 || timeMs > GAME_CONFIG.ROUND_5_TIMEOUT_MS) {
    throw new ValidationError("Round 5 timeMs is out of accepted range");
  }
  return scoreSpeedRound(isCorrect, timeMs, GAME_CONFIG.ROUND_5_TIMEOUT_MS);
};
