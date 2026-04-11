import { NextRequest, NextResponse } from "next/server";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { isChallengeActive, readHasPlayed } from "@/lib/contract/service";
import { addCorsHeaders, jsonCreated, methodNotAllowed, readJsonBody } from "@/lib/http";
import { withRoute } from "@/lib/route-handler";
import { sanitizeAddress } from "@/lib/security/sanitize";
import { startSessionSchema } from "@/lib/validation/schemas";
import { buildGameRounds } from "@/services/game-builder";
import { getChallengeMetadata } from "@/store/challenges-store";
import {
  createSession,
  getActiveSessionForPlayer,
  pruneExpiredSessions,
} from "@/store/sessions-store";

export const runtime = "nodejs";

export const POST = withRoute(
  async (request, context) => {
    const body = await readJsonBody(request);
    const parsed = startSessionSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid session start payload", parsed.error.flatten());
    }

    const challengeId = parsed.data.challengeId;
    const playerAddress = sanitizeAddress(parsed.data.playerAddress, "playerAddress");

    if (
      context.auth?.walletAddress &&
      context.auth.walletAddress.toLowerCase() !== playerAddress.toLowerCase()
    ) {
      throw new ValidationError("Authenticated wallet does not match playerAddress");
    }

    pruneExpiredSessions(Date.now());

    const challenge = getChallengeMetadata(challengeId);
    if (!challenge) {
      throw new NotFoundError("Challenge metadata not found");
    }

    const active = await isChallengeActive(BigInt(challengeId));
    if (!active) {
      throw new ValidationError("Challenge is not active");
    }

    const hasPlayed = await readHasPlayed(BigInt(challengeId), playerAddress);
    if (hasPlayed) {
      throw new ConflictError("Player has already played this challenge");
    }

    const currentSession = getActiveSessionForPlayer(challengeId, playerAddress);
    if (currentSession && !currentSession.submitted && currentSession.expiresAt > Date.now()) {
      throw new ConflictError("An active session already exists for this player");
    }

    const generated = buildGameRounds(challenge);

    const session = createSession({
      challengeId,
      playerAddress,
      expiresAt: Date.now() + generated.ttlMs,
      submitted: false,
      answers: generated.answers,
      rounds: generated.rounds,
    });

    return jsonCreated({
      sessionId: session.sessionId,
      brand: {
        name: challenge.name,
        logoPath: challenge.logoPath,
        tagline: challenge.tagline,
        brandFact: challenge.brandFact,
        brandColor: challenge.brandColor,
      },
      rounds: session.rounds,
      expiresAt: session.expiresAt,
    });
  },
  {
    auth: true,
    namespace: "session_start",
    rateLimit: 30,
  },
);

export const GET = async () => methodNotAllowed(["POST"]);

export const OPTIONS = async (request: NextRequest) => {
  return addCorsHeaders(request, new NextResponse(null, { status: 204 }));
};
