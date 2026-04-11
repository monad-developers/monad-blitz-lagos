import { NotFoundError, ValidationError } from "@/lib/errors";
import { readChallenge } from "@/lib/contract/service";
import { jsonOk, methodNotAllowed } from "@/lib/http";
import { withRoute } from "@/lib/route-handler";
import { resolveChallengeMetadata } from "@/store/challenges-store";

export const runtime = "nodejs";

export const GET = withRoute(
  async (_request, context) => {
    const idParam = context.params?.id;
    if (!idParam || typeof idParam !== "string") {
      throw new ValidationError("Invalid challenge identifier");
    }

    const metadata = resolveChallengeMetadata(idParam);
    if (!metadata) {
      throw new NotFoundError("Challenge metadata not found");
    }

    const challengeId = metadata.challengeId;
    const onChain = await readChallenge(BigInt(challengeId));

    return jsonOk({
      challengeId,
      metadata,
      chain: {
        brand: onChain.brand,
        metadataHash: onChain.metadataHash,
        prizePool: onChain.prizePool.toString(),
        deadline: onChain.deadline.toString(),
        startTime: onChain.startTime.toString(),
        endTime: onChain.endTime.toString(),
        winnerCount: onChain.winnerCount.toString(),
        scoreCount: onChain.scoreCount.toString(),
        started: onChain.started,
        distributed: onChain.distributed,
        exists: onChain.exists,
      },
    });
  },
  {
    namespace: "challenge_get",
    rateLimit: 100,
  },
);

export const POST = async () => methodNotAllowed(["GET"]);
