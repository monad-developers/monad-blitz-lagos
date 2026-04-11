import {
  distributeRewardsOnChain,
  readChallenge,
  readPlayerScore,
  readPlayers,
} from "@/lib/contract/service";
import { logger } from "@/lib/logger";
import { listChallenges } from "@/store/challenges-store";

const SUBMIT_GRACE_SEC = 5 * 60; // 5 minutes — matches contract SUBMIT_GRACE
const CHECK_INTERVAL_MS = 30_000; // Check every 30 seconds
const distributedIds = new Set<number>();

const splitPrize = (prizePool: bigint, winnerCount: number) => {
  if (winnerCount === 1) return [prizePool];

  if (winnerCount === 2) {
    const second = (prizePool * BigInt(30)) / BigInt(100);
    return [prizePool - second, second];
  }

  if (winnerCount === 3) {
    const first = (prizePool * BigInt(50)) / BigInt(100);
    const second = (prizePool * BigInt(30)) / BigInt(100);
    return [first, second, prizePool - first - second];
  }

  const base = prizePool / BigInt(winnerCount);
  const amounts = Array.from({ length: winnerCount }, () => base);
  amounts[0] += prizePool - base * BigInt(winnerCount);
  return amounts;
};

async function tryDistribute(challengeId: number) {
  if (distributedIds.has(challengeId)) return;

  try {
    const challenge = await readChallenge(BigInt(challengeId));
    if (!challenge.exists || !challenge.started || challenge.distributed) {
      distributedIds.add(challengeId);
      return;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const endTime = Number(challenge.endTime);

    // Wait until endTime + grace period
    if (endTime + SUBMIT_GRACE_SEC > nowSec) return;

    const players = await readPlayers(BigInt(challengeId));
    if (players.length === 0) return;

    const scoredPlayers = await Promise.all(
      players.map(async (player) => {
        const { score } = await readPlayerScore(BigInt(challengeId), player);
        return { address: player, score };
      }),
    );

    const ranked = scoredPlayers
      .sort((a, b) => Number(b.score - a.score))
      .filter((entry) => entry.score > BigInt(0));

    if (ranked.length === 0) return;

    const winnerCount = Number(challenge.winnerCount);
    const winners = ranked.slice(0, winnerCount);
    const amounts = splitPrize(challenge.prizePool, winners.length);

    logger.info("Auto-distributing rewards", {
      challengeId: String(challengeId),
      winners: winners.length,
      prizePool: challenge.prizePool.toString(),
    });

    await distributeRewardsOnChain(
      BigInt(challengeId),
      winners.map((w) => w.address),
      amounts,
    );

    distributedIds.add(challengeId);

    logger.info("Auto-distribution complete", {
      challengeId: String(challengeId),
      winners: winners.map((w, i) => ({
        address: w.address,
        score: w.score.toString(),
        amount: amounts[i].toString(),
      })),
    });
  } catch (error) {
    logger.error("Auto-distribution failed", {
      challengeId: String(challengeId),
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

async function checkAllChallenges() {
  const challenges = listChallenges();
  const nowSec = Math.floor(Date.now() / 1000);

  for (const challenge of challenges) {
    if (!challenge.started) continue;
    if (distributedIds.has(challenge.challengeId)) continue;

    const endTime = challenge.endTime ?? 0;
    if (endTime + SUBMIT_GRACE_SEC > nowSec) continue;

    await tryDistribute(challenge.challengeId);
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startAutoDistributor() {
  if (intervalId) return;

  logger.info("Auto-distributor started", { intervalMs: CHECK_INTERVAL_MS });

  // Run immediately on start, then every 30 seconds
  void checkAllChallenges();
  intervalId = setInterval(() => void checkAllChallenges(), CHECK_INTERVAL_MS);
}

export function stopAutoDistributor() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
