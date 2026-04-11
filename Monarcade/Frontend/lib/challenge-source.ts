import { createPublicClient, formatEther, http } from "viem";
import {
  API_BASE_URL,
  CONTRACT_ADDRESS,
  MAX_ONCHAIN_CHALLENGES,
  MONAD_TESTNET,
  MONARCHADE_READ_ABI,
} from "@/lib/monad";

export type BackendChallenge = {
  challengeId: number;
  metadataHash?: string;
  name: string;
  logoPath?: string;
  brandAddress?: string;
  prizePool: string;
  started: boolean;
  startTime?: number;
  endTime?: number;
};

export type ChallengesApiResponse = {
  entries: BackendChallenge[];
};

export type ResolvedChallengeMetadata = {
  name: string;
  logoPath?: string;
  tagline?: string;
};

export const fetchPublicChallenges = async (): Promise<ChallengesApiResponse> => {
  const endpoint = `${API_BASE_URL}/challenges?status=all&pageSize=50`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const payload = (await response.json().catch(() => null)) as ChallengesApiResponse | null;
  if (Array.isArray(payload?.entries)) {
    return payload;
  }

  return { entries: [] };
};

export const resolveChallengeMetadata = async (
  metadataHash: `0x${string}`,
  brandAddress?: `0x${string}`,
): Promise<ResolvedChallengeMetadata | null> => {
  try {
    const query = new URLSearchParams({
      metadataHash,
    });

    if (brandAddress) {
      query.set("brandAddress", brandAddress);
    }

    const endpoint = `${API_BASE_URL}/challenges/resolve?${query.toString()}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => null)) as {
      metadata?: ResolvedChallengeMetadata;
    } | null;

    return payload?.metadata ?? null;
  } catch {
    return null;
  }
};

export const fetchOnChainChallenges = async (): Promise<BackendChallenge[]> => {
  const contractAddress = CONTRACT_ADDRESS;
  if (!contractAddress) {
    return [];
  }

  const publicClient = createPublicClient({
    chain: MONAD_TESTNET,
    transport: http(process.env.NEXT_PUBLIC_MONAD_RPC ?? "https://testnet-rpc.monad.xyz"),
  });

  const challengeCount = await publicClient.readContract({
    address: contractAddress,
    abi: MONARCHADE_READ_ABI,
    functionName: "challengeCount",
  });

  const latestId = Number(challengeCount);
  if (!Number.isFinite(latestId) || latestId <= 0) {
    return [];
  }

  const startId = Math.max(1, latestId - MAX_ONCHAIN_CHALLENGES + 1);
  const challengeIds = Array.from({ length: latestId - startId + 1 }, (_, index) => startId + index);

  const results: Array<BackendChallenge | null> = await Promise.all(
    challengeIds.map(async (challengeId): Promise<BackendChallenge | null> => {
      try {
        const challenge = await publicClient.readContract({
          address: contractAddress,
          abi: MONARCHADE_READ_ABI,
          functionName: "getChallenge",
          args: [BigInt(challengeId)],
        });

        if (!challenge.exists) {
          return null;
        }

        const prizePoolMon = Number(formatEther(challenge.prizePool));
        const prizePool = Number.isFinite(prizePoolMon) ? prizePoolMon.toFixed(4).replace(/\.?0+$/, "") : "0";
        const resolvedMetadata = await resolveChallengeMetadata(challenge.metadataHash, challenge.brand);

        return {
          challengeId,
          metadataHash: challenge.metadataHash,
          name: resolvedMetadata?.name || `Challenge #${challengeId}`,
          logoPath: resolvedMetadata?.logoPath,
          brandAddress: challenge.brand,
          prizePool,
          started: challenge.started,
          startTime: Number(challenge.startTime),
          endTime: Number(challenge.endTime),
        };
      } catch {
        return null;
      }
    }),
  );

  return results.filter((entry): entry is BackendChallenge => Boolean(entry));
};
