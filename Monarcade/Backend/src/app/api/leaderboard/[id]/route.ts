import { NotFoundError, ValidationError } from "@/lib/errors";
import { readLeaderboardFromEvents } from "@/lib/contract/service";
import { jsonOk, methodNotAllowed } from "@/lib/http";
import { parsePagination, paginate } from "@/lib/pagination";
import { withRoute } from "@/lib/route-handler";
import { getChallengeMetadata } from "@/store/challenges-store";

export const runtime = "nodejs";

export const GET = withRoute(
  async (request, context) => {
    const idParam = context.params?.id;
    const challengeId = Number(idParam);

    if (!Number.isInteger(challengeId) || challengeId <= 0) {
      throw new ValidationError("Invalid challenge id");
    }

    const metadata = getChallengeMetadata(challengeId);
    if (!metadata) {
      throw new NotFoundError("Challenge metadata not found");
    }

    // Single event log query instead of N+1 contract reads.
    // For 100 players this is 1 RPC call instead of 101.
    const entries = await readLeaderboardFromEvents(BigInt(challengeId));

    const ranked = entries.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    const { page, pageSize } = parsePagination(request.nextUrl.searchParams);
    const { items, pagination } = paginate(ranked, page, pageSize);

    return jsonOk({
      challengeId,
      challenge: {
        name: metadata.name,
        logoPath: metadata.logoPath,
        prizePool: metadata.prizePool,
      },
      entries: items,
      total: ranked.length,
      pagination,
    });
  },
  {
    namespace: "leaderboard_get",
    rateLimit: 120,
  },
);

export const POST = async () => methodNotAllowed(["GET"]);
