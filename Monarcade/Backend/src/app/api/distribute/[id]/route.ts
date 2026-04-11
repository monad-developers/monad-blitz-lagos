import { ForbiddenError, ValidationError } from "@/lib/errors";
import {
  distributeRewardsOnChain,
  readChallenge,
  readPlayerScore,
  readPlayers,
} from "@/lib/contract/service";
import { env } from "@/lib/env";
import { jsonOk, methodNotAllowed } from "@/lib/http";
import { withRoute } from "@/lib/route-handler";

export const runtime = "nodejs";

/**
 * Splits prize pool among winners.
 * Contract requires sum(amounts) === prizePool exactly — all funds must go out.
 *
 * 1 winner:  100%
 * 2 winners: 70% / 30% (first absorbs unclaimed 3rd-place share)
 * 3 winners: 50% / 30% / 20%
 * 4+ winners: equal split, remainder to first
 */
const splitPrize = (prizePool: bigint, winnerCount: number) => {
  if (winnerCount === 1) {
    return [prizePool];
  }

  if (winnerCount === 2) {
    const second = (prizePool * BigInt(30)) / BigInt(100);
    const first = prizePool - second;
    return [first, second];
  }

  if (winnerCount === 3) {
    const first = (prizePool * BigInt(50)) / BigInt(100);
    const second = (prizePool * BigInt(30)) / BigInt(100);
    const third = prizePool - first - second;
    return [first, second, third];
  }

  const base = prizePool / BigInt(winnerCount);
  const amounts = Array.from({ length: winnerCount }, () => base);
  const remainder = prizePool - base * BigInt(winnerCount);
  amounts[0] += remainder;
  return amounts;
};

export const POST = withRoute(
  async (request, context) => {
    const secret = request.headers.get("x-distribute-secret");
    if (!secret || secret !== env.DISTRIBUTE_SECRET) {
      throw new ForbiddenError("Invalid distribution secret");
    }

    const idParam = context.params?.id;
    const challengeId = Number(idParam);

    if (!Number.isInteger(challengeId) || challengeId <= 0) {
      throw new ValidationError("Invalid challenge id");
    }

    const challenge = await readChallenge(BigInt(challengeId));
    if (!challenge.exists) {
      throw new ValidationError("Challenge does not exist");
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const endTime = Number(challenge.endTime);

    if (endTime > nowSec) {
      throw new ValidationError("Challenge has not ended yet");
    }

    if (challenge.distributed) {
      throw new ValidationError("Rewards already distributed");
    }

    const players = await readPlayers(BigInt(challengeId));
    if (players.length === 0) {
      throw new ValidationError("No players to distribute rewards to");
    }

    const scoredPlayers = await Promise.all(
      players.map(async (player) => {
        const { score } = await readPlayerScore(BigInt(challengeId), player);
        return {
          address: player,
          score,
        };
      }),
    );

    const ranked = scoredPlayers
      .sort((a, b) => Number(b.score - a.score))
      .filter((entry) => entry.score > BigInt(0));

    if (ranked.length === 0) {
      throw new ValidationError("No valid scores for distribution");
    }

    const winnerCount = Number(challenge.winnerCount);
    const winners = ranked.slice(0, winnerCount);

    if (winners.length === 0) {
      throw new ValidationError("No winners found");
    }

    const amounts = splitPrize(challenge.prizePool, winners.length);

    const chainResult = await distributeRewardsOnChain(
      BigInt(challengeId),
      winners.map((winner) => winner.address),
      amounts,
    );

    return jsonOk({
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber.toString(),
      winners: winners.map((winner, index) => ({
        address: winner.address,
        score: winner.score.toString(),
        amount: amounts[index].toString(),
      })),
      event: chainResult.event,
    });
  },
  {
    namespace: "distribute_post",
    rateLimit: 15,
  },
);

export const GET = async () => methodNotAllowed(["POST"]);
