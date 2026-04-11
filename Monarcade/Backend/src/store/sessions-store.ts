import { randomUUID } from "node:crypto";

import type { GameSession } from "@/lib/types";

const sessionsById = new Map<string, GameSession>();
const activeSessionByChallengeAndPlayer = new Map<string, string>();

const key = (challengeId: number, playerAddress: string) => `${challengeId}:${playerAddress.toLowerCase()}`;

export const createSession = (session: Omit<GameSession, "sessionId">) => {
  const sessionId = randomUUID();
  const value: GameSession = {
    ...session,
    sessionId,
  };

  sessionsById.set(sessionId, value);
  activeSessionByChallengeAndPlayer.set(key(value.challengeId, value.playerAddress), sessionId);

  return value;
};

export const getSession = (sessionId: string) => {
  return sessionsById.get(sessionId) ?? null;
};

export const getActiveSessionForPlayer = (challengeId: number, playerAddress: string) => {
  const sessionId = activeSessionByChallengeAndPlayer.get(key(challengeId, playerAddress));
  if (!sessionId) {
    return null;
  }

  return sessionsById.get(sessionId) ?? null;
};

export const markSessionSubmitted = (sessionId: string) => {
  const session = sessionsById.get(sessionId);
  if (!session) {
    return null;
  }

  const updated: GameSession = {
    ...session,
    submitted: true,
  };

  sessionsById.set(sessionId, updated);
  activeSessionByChallengeAndPlayer.delete(key(updated.challengeId, updated.playerAddress));

  return updated;
};

export const pruneExpiredSessions = (nowMs: number) => {
  for (const [sessionId, session] of sessionsById.entries()) {
    if (session.expiresAt > nowMs) {
      continue;
    }

    sessionsById.delete(sessionId);
    activeSessionByChallengeAndPlayer.delete(key(session.challengeId, session.playerAddress));
  }
};

export const clearSessions = () => {
  sessionsById.clear();
  activeSessionByChallengeAndPlayer.clear();
};
