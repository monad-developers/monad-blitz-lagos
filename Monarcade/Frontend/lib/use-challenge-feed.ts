"use client";

import { useEffect, useState } from "react";
import type { BackendChallenge } from "@/lib/challenge-source";
import { fetchPublicChallenges } from "@/lib/challenge-source";

type UseChallengeFeedResult = {
  entries: BackendChallenge[];
  isLoading: boolean;
  error: string | null;
};

/**
 * Fetches challenges from the backend API only.
 * The backend enriches entries with on-chain state (prizePool, started, etc.)
 * so the frontend no longer needs to make direct RPC calls.
 */
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
        const sorted = (apiResult.entries ?? []).sort(
          (a, b) => b.challengeId - a.challengeId,
        );
        setEntries(sorted);
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
