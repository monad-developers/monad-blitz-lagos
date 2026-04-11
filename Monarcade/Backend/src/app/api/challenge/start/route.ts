import { NextRequest, NextResponse } from "next/server";
import { ValidationError } from "@/lib/errors";
import { readChallenge } from "@/lib/contract/service";
import { addCorsHeaders, jsonOk, methodNotAllowed, readJsonBody } from "@/lib/http";
import { withRoute } from "@/lib/route-handler";
import { startChallengeSchema } from "@/lib/validation/schemas";
import { getChallengeMetadata, updateChallengeMetadata } from "@/store/challenges-store";

export const runtime = "nodejs";

export const POST = withRoute(
  async (request, context) => {
    const body = await readJsonBody(request);
    const parsed = startChallengeSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid challenge start payload", parsed.error.flatten());
    }

    const challengeId = parsed.data.challengeId;
    const metadata = getChallengeMetadata(challengeId);
    const onChain = await readChallenge(BigInt(challengeId));
    if (!onChain.exists) {
      throw new ValidationError("Challenge not found on-chain");
    }

    const ownerAddress = metadata?.brandAddress ?? onChain.brand;
    if (context.auth?.walletAddress && context.auth.walletAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
      throw new ValidationError("Authenticated wallet cannot start this challenge");
    }

    if (!onChain.started) {
      throw new ValidationError("Challenge has not been started on-chain yet");
    }

    const updated = updateChallengeMetadata(challengeId, {
      started: true,
      startTime: Number(onChain.startTime),
      endTime: Number(onChain.endTime),
    });

    return jsonOk({
      ok: true,
      challengeId,
      startTime: updated?.startTime ?? Number(onChain.startTime),
      endTime: updated?.endTime ?? Number(onChain.endTime),
    });
  },
  {
    auth: true,
    namespace: "challenge_start",
    rateLimit: 20,
  },
);

export const GET = async () => methodNotAllowed(["POST"]);

export const OPTIONS = async (request: NextRequest) => {
  return addCorsHeaders(request, new NextResponse(null, { status: 204 }));
};
