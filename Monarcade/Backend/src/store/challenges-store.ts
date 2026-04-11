import type { ChallengeMetadata } from "@/lib/types";
import { readStoreFile, writeStoreFile } from "@/store/persistence";

const STORE_FILE = "challenges-store.json";

const initialChallenges = readStoreFile<ChallengeMetadata[]>(STORE_FILE, []);
const challenges = new Map<number, ChallengeMetadata>(
  initialChallenges.map((challenge) => [challenge.challengeId, challenge]),
);

const persistChallenges = () => {
  writeStoreFile(STORE_FILE, [...challenges.values()]);
};

export const saveChallengeMetadata = (challenge: ChallengeMetadata) => {
  challenges.set(challenge.challengeId, challenge);
  persistChallenges();
  return challenge;
};

export const getChallengeMetadata = (challengeId: number) => {
  return challenges.get(challengeId) ?? null;
};

export const getChallengeMetadataByHash = (metadataHash: string) => {
  const normalizedHash = metadataHash.toLowerCase();
  return (
    [...challenges.values()].find(
      (challenge) => challenge.metadataHash.toLowerCase() === normalizedHash,
    ) ?? null
  );
};

export const resolveChallengeMetadata = (identifier: string) => {
  const numericId = Number(identifier);
  if (Number.isInteger(numericId) && numericId > 0) {
    const byId = getChallengeMetadata(numericId);
    if (byId) {
      return byId;
    }
  }

  if (/^0x[0-9a-fA-F]{64}$/.test(identifier)) {
    return getChallengeMetadataByHash(identifier);
  }

  return null;
};

export const updateChallengeMetadata = (
  challengeId: number,
  update: Partial<ChallengeMetadata>,
) => {
  const current = challenges.get(challengeId);
  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...update,
  };

  challenges.set(challengeId, next);
  persistChallenges();
  return next;
};

export const listChallenges = () => {
  return [...challenges.values()].sort((a, b) => b.createdAt - a.createdAt);
};

export const listActiveChallenges = (nowSec: number) => {
  return listChallenges().filter((challenge) => {
    if (!challenge.started || !challenge.endTime) {
      return false;
    }

    return nowSec < challenge.endTime;
  });
};

export const listPendingChallenges = () => {
  return listChallenges().filter((challenge) => !challenge.started);
};

export const clearChallenges = () => {
  challenges.clear();
  persistChallenges();
};
