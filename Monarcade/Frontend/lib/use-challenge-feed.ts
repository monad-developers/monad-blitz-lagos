"use client";

import { useEffect, useState } from "react";
import type { BackendChallenge } from "@/lib/challenge-source";
import { fetchOnChainChallenges, fetchPublicChallenges } from "@/lib/challenge-source";

type UseChallengeFeedResult = {
  entries: BackendChallenge[];
  isLoading: boolean;
  error: string | null;
};

export const useChallengeFeed = (): UseChallengeFeedResult => {
  const [entries, setEntries] = useState<BackendChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChallenges = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const apiResult = await fetchPublicChallenges();
        const byId = new Map<number, BackendChallenge>();

        for (const challenge of apiResult.entries ?? []) {
          byId.set(challenge.challengeId, challenge);
        }

        const onChainEntries = await fetchOnChainChallenges();
        for (const challenge of onChainEntries) {
          const existing = byId.get(challenge.challengeId);
          if (!existing) {
            byId.set(challenge.challengeId, challenge);
            continue;
          }

          byId.set(challenge.challengeId, {
            ...challenge,
            ...existing,
            metadataHash: existing.metadataHash ?? challenge.metadataHash,
            started: existing.started || challenge.started,
            startTime: existing.startTime ?? challenge.startTime,
            endTime: existing.endTime ?? challenge.endTime,
            logoPath: existing.logoPath ?? challenge.logoPath,
            brandAddress: existing.brandAddress ?? challenge.brandAddress,
          });
        }

        setEntries(Array.from(byId.values()).sort((a, b) => b.challengeId - a.challengeId));
      } catch (loadError) {
        console.error("Failed to load challenges", loadError);
        setEntries([]);
        setError("Failed to load challenges.");
      } finally {
        setIsLoading(false);
      }
    };

    loadChallenges();
  }, []);

  return { entries, isLoading, error };
};
