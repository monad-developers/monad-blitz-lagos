import { NextRequest, NextResponse } from "next/server";
import { formatEther } from "viem";
import { parsePagination, paginate } from "@/lib/pagination";
import { addCorsHeaders, jsonOk, methodNotAllowed } from "@/lib/http";
import { withRoute } from "@/lib/route-handler";
import { readChallenge } from "@/lib/contract/service";
import { listActiveChallenges, listChallenges, listPendingChallenges } from "@/store/challenges-store";

export const runtime = "nodejs";

// Simple in-memory cache to avoid hitting RPC on every request
let enrichCache: { data: Record<number, object>; expiresAt: number } = { data: {}, expiresAt: 0 };
const CACHE_TTL_MS = 5000;

const enrichWithChainData = async (challengeId: number) => {
  try {
    const chain = await readChallenge(BigInt(challengeId));
    const prizePoolMon = Number(formatEther(chain.prizePool));
    return {
      prizePool: Number.isFinite(prizePoolMon) ? prizePoolMon.toFixed(4).replace(/\.?0+$/, "") : "0",
      started: chain.started,
      startTime: Number(chain.startTime),
      endTime: Number(chain.endTime),
      scoreCount: Number(chain.scoreCount),
      distributed: chain.distributed,
    };
  } catch {
    return null;
  }
};

export const GET = withRoute(
  async (request) => {
    const { searchParams } = request.nextUrl;
    const status = (searchParams.get("status") ?? "all").toLowerCase();
    const { page, pageSize } = parsePagination(searchParams);

    const nowSec = Math.floor(Date.now() / 1000);

    let items;
    if (status === "active") {
      items = listActiveChallenges(nowSec);
    } else if (status === "pending") {
      items = listPendingChallenges();
    } else {
      items = listChallenges();
    }

    // Enrich with on-chain data (cached for 5s)
    const now = Date.now();
    if (now > enrichCache.expiresAt) {
      const enriched: Record<number, object> = {};
      const results = await Promise.all(
        items.map(async (item) => ({
          id: item.challengeId,
          chain: await enrichWithChainData(item.challengeId),
        })),
      );
      for (const r of results) {
        if (r.chain) enriched[r.id] = r.chain;
      }
      enrichCache = { data: enriched, expiresAt: now + CACHE_TTL_MS };
    }

    const enrichedItems = items.map((item) => {
      const chain = enrichCache.data[item.challengeId] as {
        prizePool?: string;
        started?: boolean;
        startTime?: number;
        endTime?: number;
        scoreCount?: number;
        distributed?: boolean;
      } | undefined;
      if (!chain) return item;
      return {
        ...item,
        prizePool: chain.prizePool ?? item.prizePool,
        started: chain.started ?? item.started,
        startTime: chain.startTime ?? item.startTime,
        endTime: chain.endTime ?? item.endTime,
        scoreCount: chain.scoreCount,
        distributed: chain.distributed,
      };
    });

    const { items: paged, pagination } = paginate(enrichedItems, page, pageSize);

    return jsonOk({
      entries: paged,
      pagination,
      counts: {
        active: listActiveChallenges(nowSec).length,
        pending: listPendingChallenges().length,
      },
    });
  },
  {
    namespace: "challenges_list",
    rateLimit: 120,
  },
);

export const POST = async () => methodNotAllowed(["GET"]);

export const OPTIONS = async (request: NextRequest) => {
  return addCorsHeaders(request, new NextResponse(null, { status: 204 }));
};
