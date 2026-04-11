import { NextRequest, NextResponse } from "next/server";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { addCorsHeaders, jsonOk, methodNotAllowed, readJsonBody } from "@/lib/http";
import { withRoute } from "@/lib/route-handler";
import { submitSessionSchema } from "@/lib/validation/schemas";
import { computeRound1Score, computeRound2Score, computeRound3Score, computeRound4Score, computeRound5Score } from "@/services/scoring";
import { getSession, markSessionSubmitted, pruneExpiredSessions } from "@/store/sessions-store";
import { submitScoreOnChain } from "@/lib/contract/service";

export const runtime = "nodejs";

export const POST = withRoute(
  async (request, context) => {
    const body = await readJsonBody(request);
    const parsed = submitSessionSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid session submit payload", parsed.error.flatten());
    }

    pruneExpiredSessions(Date.now());

    const session = getSession(parsed.data.sessionId);
    if (!session) {
      throw new NotFoundError("Session not found or expired");
    }

    if (session.submitted) {
      throw new ValidationError("Session already submitted");
    }

    if (session.expiresAt <= Date.now()) {
      throw new ValidationError("Session expired");
    }

    if (
      context.auth?.walletAddress &&
      context.auth.walletAddress.toLowerCase() !== session.playerAddress.toLowerCase()
    ) {
      throw new ForbiddenError("Authenticated wallet cannot submit this session");
    }

    const r1Correct = parsed.data.r1.tappedIndex === session.answers.round1CorrectIndex;
    const r2Correct = parsed.data.r2.choiceIndex === session.answers.round2CorrectIndex;
    const r3Correct = parsed.data.r3.choiceIndex === session.answers.round3CorrectIndex;
    const r4Correct = parsed.data.r4.choiceIndex === session.answers.round4CorrectIndex;
    const r5Correct = parsed.data.r5.choiceIndex === session.answers.round5CorrectIndex;

    const r1Score = computeRound1Score(r1Correct, parsed.data.r1.timeMs);
    const r2Score = computeRound2Score(r2Correct, parsed.data.r2.timeMs);
    const r3Score = computeRound3Score(r3Correct, parsed.data.r3.timeMs);
    const r4Score = computeRound4Score(r4Correct, parsed.data.r4.timeMs);
    const r5Score = computeRound5Score(r5Correct, parsed.data.r5.timeMs);
    const total = r1Score + r2Score + r3Score + r4Score + r5Score;

    const chainResult = await submitScoreOnChain(
      BigInt(session.challengeId),
      session.playerAddress,
      BigInt(total),
    );

    markSessionSubmitted(session.sessionId);

    return jsonOk({
      score: total,
      r1Score,
      r2Score,
      r3Score,
      r4Score,
      r5Score,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber.toString(),
      event: chainResult.event,
    });
  },
  {
    auth: true,
    namespace: "session_submit",
    rateLimit: 30,
  },
);

export const GET = async () => methodNotAllowed(["POST"]);

export const OPTIONS = async (request: NextRequest) => {
  return addCorsHeaders(request, new NextResponse(null, { status: 204 }));
};
