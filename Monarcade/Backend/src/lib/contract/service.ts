import { parseEventLogs } from "viem";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { GAS, MAX_FEE_PER_GAS, PRIORITY_FEE } from "@/lib/constants";
import { monarchadeAbi } from "@/lib/contract/abi";
import { contractAddress, publicClient, signerAddress, walletClient } from "@/lib/contract/client";
import { parseContractError } from "@/lib/contract/errors";

export type ChainChallenge = {
  brand: `0x${string}`;
  metadataHash: `0x${string}`;
  prizePool: bigint;
  deadline: bigint;
  startTime: bigint;
  endTime: bigint;
  winnerCount: bigint;
  scoreCount: bigint;
  started: boolean;
  distributed: boolean;
  exists: boolean;
};

const contractError = (fallbackMessage: string, error?: unknown) => {
  const parsed = error ? parseContractError(error) : fallbackMessage;
  return new AppError(502, "CONTRACT_ERROR", parsed, error);
};

const isInsufficientFundsError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("insufficient funds for gas") ||
    message.includes("exceeds the balance of the account")
  );
};

export const readChallenge = async (challengeId: bigint): Promise<ChainChallenge> => {
  try {
    const challenge = await publicClient.readContract({
      abi: monarchadeAbi,
      address: contractAddress,
      functionName: "getChallenge",
      args: [challengeId],
    });

    return challenge as ChainChallenge;
  } catch (error) {
    logger.error("Failed to read challenge", {
      challengeId: challengeId.toString(),
      error: error instanceof Error ? error.message : "unknown",
    });
    throw contractError("Failed to read challenge", error);
  }
};

export const isChallengeActive = async (challengeId: bigint): Promise<boolean> => {
  try {
    const active = await publicClient.readContract({
      abi: monarchadeAbi,
      address: contractAddress,
      functionName: "isActive",
      args: [challengeId],
    });

    return Boolean(active);
  } catch (error) {
    logger.error("Failed to read challenge activity", {
      challengeId: challengeId.toString(),
      error: error instanceof Error ? error.message : "unknown",
    });
    throw contractError("Failed to read challenge activity", error);
  }
};

export const readPlayers = async (challengeId: bigint): Promise<`0x${string}`[]> => {
  try {
    const players = await publicClient.readContract({
      abi: monarchadeAbi,
      address: contractAddress,
      functionName: "getPlayers",
      args: [challengeId],
    });

    return players as `0x${string}`[];
  } catch (error) {
    throw contractError("Failed to read players", error);
  }
};

export const readPlayerScore = async (challengeId: bigint, player: `0x${string}`) => {
  try {
    const result = await publicClient.readContract({
      abi: monarchadeAbi,
      address: contractAddress,
      functionName: "getPlayerScore",
      args: [challengeId, player],
    });

    const [score, played] = result as [bigint, boolean];

    return { score, played };
  } catch (error) {
    throw contractError("Failed to read player score", error);
  }
};

export type LeaderboardEntry = {
  address: `0x${string}`;
  score: number;
  txHash?: `0x${string}`;
};

// Cache leaderboard for 5 seconds — barely noticeable vs chain's ~3s confirmation,
// but prevents RPC flooding when 1000 users poll the same leaderboard.
const leaderboardCache = new Map<string, { entries: LeaderboardEntry[]; expiresAt: number }>();

export const readLeaderboardFromEvents = async (
  challengeId: bigint,
): Promise<LeaderboardEntry[]> => {
  const key = challengeId.toString();
  const cached = leaderboardCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.entries;
  }

  try {
    const players = await readPlayers(challengeId);
    if (players.length === 0) return [];

    const entries = await Promise.all(
      players.map(async (player) => {
        const { score } = await readPlayerScore(challengeId, player);
        return {
          address: player,
          score: Number(score),
          txHash: undefined as `0x${string}` | undefined,
        };
      }),
    );

    const sorted = entries.sort((a, b) => b.score - a.score);
    leaderboardCache.set(key, { entries: sorted, expiresAt: Date.now() + 5000 });
    return sorted;
  } catch (error) {
    logger.error("Failed to read leaderboard", {
      challengeId: challengeId.toString(),
      error: error instanceof Error ? error.message : "unknown",
    });
    throw contractError("Failed to read leaderboard", error);
  }
};

export const readHasPlayed = async (challengeId: bigint, player: `0x${string}`) => {
  try {
    const played = await publicClient.readContract({
      abi: monarchadeAbi,
      address: contractAddress,
      functionName: "hasPlayed",
      args: [challengeId, player],
    });

    return Boolean(played);
  } catch (error) {
    throw contractError("Failed to read play status", error);
  }
};

export const submitScoreOnChain = async (
  challengeId: bigint,
  player: `0x${string}`,
  score: bigint,
) => {
  try {
    logger.info("Submitting score on chain", {
      challengeId: challengeId.toString(),
      player,
      score: score.toString(),
      signer: signerAddress,
    });

    const txHash = await walletClient.writeContract({
      abi: monarchadeAbi,
      address: contractAddress,
      functionName: "submitScore",
      args: [challengeId, player, score],
      account: walletClient.account,
      chain: walletClient.chain,
      gas: GAS.SUBMIT_SCORE,
      maxFeePerGas: MAX_FEE_PER_GAS,
      maxPriorityFeePerGas: PRIORITY_FEE,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    const parsed = parseEventLogs({
      abi: monarchadeAbi,
      logs: receipt.logs,
      eventName: "ScoreSubmitted",
    });

    return {
      txHash,
      blockNumber: receipt.blockNumber,
      event: parsed[0]?.args,
    };
  } catch (error) {
    logger.error("Failed to submit score", {
      challengeId: challengeId.toString(),
      player,
      error: error instanceof Error ? error.message : "unknown",
    });
    throw contractError("Failed to submit score on-chain", error);
  }
};

export const createChallengeOnChain = async (
  metadataHash: `0x${string}`,
  duration: bigint,
  winnerCount: bigint,
  prizePool: bigint,
) => {
  try {
    logger.info("Creating challenge on chain", {
      metadataHash,
      duration: duration.toString(),
      winnerCount: winnerCount.toString(),
      prizePool: prizePool.toString(),
      signer: signerAddress,
    });

    const txHash = await walletClient.writeContract({
      abi: monarchadeAbi,
      address: contractAddress,
      functionName: "createChallenge",
      args: [metadataHash, duration, winnerCount],
      value: prizePool,
      account: walletClient.account,
      chain: walletClient.chain,
      gas: GAS.CREATE_CHALLENGE,
      maxFeePerGas: MAX_FEE_PER_GAS,
      maxPriorityFeePerGas: PRIORITY_FEE,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const parsed = parseEventLogs({
      abi: monarchadeAbi,
      logs: receipt.logs,
      eventName: "ChallengeCreated",
    });

    const challengeCreatedArgs = parsed[0]?.args as
      | {
          challengeId?: bigint;
        }
      | undefined;
    const challengeId = challengeCreatedArgs?.challengeId;
    if (typeof challengeId !== "bigint") {
      throw new Error("ChallengeCreated event not found in transaction receipt");
    }

    return {
      txHash,
      blockNumber: receipt.blockNumber,
      challengeId,
      event: parsed[0]?.args,
    };
  } catch (error) {
    logger.error("Failed to create challenge", {
      metadataHash,
      error: error instanceof Error ? error.message : "unknown",
    });

    if (isInsufficientFundsError(error)) {
      throw new AppError(
        400,
        "INSUFFICIENT_SPONSOR_BALANCE",
        "Server sponsor wallet has insufficient MON to cover prize pool value and gas. Fund SERVER_SIGNER wallet and retry.",
        {
          signer: signerAddress,
          requiredPrizePoolWei: prizePool.toString(),
        },
      );
    }

    throw contractError("Failed to create challenge on-chain", error);
  }
};

export const startChallengeOnChain = async (challengeId: bigint) => {
  try {
    logger.info("Starting challenge on chain", {
      challengeId: challengeId.toString(),
      signer: signerAddress,
    });

    const txHash = await walletClient.writeContract({
      abi: monarchadeAbi,
      address: contractAddress,
      functionName: "startChallenge",
      args: [challengeId],
      account: walletClient.account,
      chain: walletClient.chain,
      gas: GAS.START_CHALLENGE,
      maxFeePerGas: MAX_FEE_PER_GAS,
      maxPriorityFeePerGas: PRIORITY_FEE,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    return {
      txHash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    logger.error("Failed to start challenge", {
      challengeId: challengeId.toString(),
      error: error instanceof Error ? error.message : "unknown",
    });
    throw contractError("Failed to start challenge on-chain", error);
  }
};

export const distributeRewardsOnChain = async (
  challengeId: bigint,
  winners: `0x${string}`[],
  amounts: bigint[],
) => {
  try {
    logger.info("Distributing rewards on chain", {
      challengeId: challengeId.toString(),
      winners,
      amounts: amounts.map((amount) => amount.toString()),
    });

    const txHash = await walletClient.writeContract({
      abi: monarchadeAbi,
      address: contractAddress,
      functionName: "distributeRewards",
      args: [challengeId, winners, amounts],
      account: walletClient.account,
      chain: walletClient.chain,
      gas: GAS.DISTRIBUTE_REWARDS(winners.length),
      maxFeePerGas: MAX_FEE_PER_GAS,
      maxPriorityFeePerGas: PRIORITY_FEE,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    const parsed = parseEventLogs({
      abi: monarchadeAbi,
      logs: receipt.logs,
      eventName: "RewardsDistributed",
    });

    return {
      txHash,
      blockNumber: receipt.blockNumber,
      event: parsed[0]?.args,
    };
  } catch (error) {
    logger.error("Failed to distribute rewards", {
      challengeId: challengeId.toString(),
      error: error instanceof Error ? error.message : "unknown",
    });
    throw contractError("Failed to distribute rewards", error);
  }
};

export const refundBrandOnChain = async (challengeId: bigint) => {
  try {
    logger.info("Refunding brand on chain", {
      challengeId: challengeId.toString(),
    });

    const txHash = await walletClient.writeContract({
      abi: monarchadeAbi,
      address: contractAddress,
      functionName: "refundBrand",
      args: [challengeId],
      account: walletClient.account,
      chain: walletClient.chain,
      gas: GAS.REFUND_BRAND,
      maxFeePerGas: MAX_FEE_PER_GAS,
      maxPriorityFeePerGas: PRIORITY_FEE,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    return {
      txHash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    logger.error("Failed to refund brand", {
      challengeId: challengeId.toString(),
      error: error instanceof Error ? error.message : "unknown",
    });
    throw contractError("Failed to refund brand on-chain", error);
  }
};
