import { NotFoundError, ValidationError } from "@/lib/errors";
import { refundBrandOnChain, readChallenge } from "@/lib/contract/service";
import { jsonOk, methodNotAllowed } from "@/lib/http";
import { withRoute } from "@/lib/route-handler";
import { getChallengeMetadata } from "@/store/challenges-store";
import { readPlayers } from "@/lib/contract/service";
import { readPlayerScore } from "@/lib/contract/service";

export const runtime = "nodejs";

export const POST = withRoute(
  async (request, context) => {
    const challengeIdParam = context.params?.id;
    const challengeId = Number(challengeIdParam);

    if (!Number.isInteger(challengeId) || challengeId <= 0) {
      throw new ValidationError("Invalid challenge id");
    }

    const metadata = getChallengeMetadata(challengeId);
    if (!metadata) {
      throw new NotFoundError("Challenge metadata not found");
    }

    if (
      context.auth?.walletAddress &&
      context.auth.walletAddress.toLowerCase() !== metadata.brandAddress.toLowerCase()
    ) {
      throw new ValidationError("Authenticated wallet cannot refund this challenge");
    }

    const onChain = await readChallenge(BigInt(challengeId));
    if (!onChain.exists) {
      throw new NotFoundError("Challenge does not exist on-chain");
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const hasStarted = onChain.started;
    const ended = Number(onChain.endTime) > 0 && Number(onChain.endTime) <= nowSec;

    if (!hasStarted) {
      const result = await refundBrandOnChain(BigInt(challengeId));
      return jsonOk({
        ok: true,
        txHash: result.txHash,
        blockNumber: result.blockNumber.toString(),
        refundedReason: "pending",
      });
    }

    if (!ended) {
      throw new ValidationError("Challenge has not ended yet");
    }

    const players = await readPlayers(BigInt(challengeId));
    const scored = await Promise.all(
      players.map(async (player) => {
        const { score } = await readPlayerScore(BigInt(challengeId), player);
        return score;
      }),
    );

    if (scored.some((score) => score > BigInt(0))) {
      throw new ValidationError("Refund not allowed after submissions exist");
    }

    const refundDelaySeconds = 48 * 60 * 60;
    if (nowSec < Number(onChain.endTime) + refundDelaySeconds) {
      throw new ValidationError("Refund available only after 48 hours from end time");
    }

    const result = await refundBrandOnChain(BigInt(challengeId));

    return jsonOk({
      ok: true,
      txHash: result.txHash,
      blockNumber: result.blockNumber.toString(),
      refundedReason: "expired",
    });
  },
  {
    auth: true,
    namespace: "challenge_refund",
    rateLimit: 15,
  },
);

export const GET = async () => methodNotAllowed(["POST"]);
