import { NextRequest, NextResponse } from "next/server";
import { keccak256, parseEther, stringToHex } from "viem";

import { ValidationError } from "@/lib/errors";
import { createChallengeOnChain } from "@/lib/contract/service";
import { addCorsHeaders, jsonCreated, methodNotAllowed, readJsonBody } from "@/lib/http";
import { withRoute } from "@/lib/route-handler";
import { sanitizeAddress, sanitizeHexHash, sanitizeText, sanitizeUrl } from "@/lib/security/sanitize";
import type { ChallengeMetadata } from "@/lib/types";
import { createGaslessChallengeSchema } from "@/lib/validation/schemas";
import { getBrandProfileByAddress } from "@/store/brands-store";
import { saveChallengeMetadata } from "@/store/challenges-store";

export const runtime = "nodejs";

export const POST = withRoute(
  async (request, context) => {
    const body = await readJsonBody(request);
    const parsed = createGaslessChallengeSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid gasless challenge payload", parsed.error.flatten());
    }

    if (!context.auth?.walletAddress) {
      throw new ValidationError("Authenticated wallet is required");
    }

    const brandAddress = sanitizeAddress(context.auth.walletAddress, "brandAddress");
    const storedProfile = getBrandProfileByAddress(brandAddress);

    const profile = storedProfile
      ? storedProfile
      : parsed.data.profile
        ? {
            userId: context.auth.userId,
            brandAddress,
            companyName: sanitizeText(parsed.data.profile.companyName, "companyName", 80),
            tagline: sanitizeText(parsed.data.profile.tagline, "tagline", 80),
            logoPath: sanitizeUrl(parsed.data.profile.logoPath, "logoPath"),
            brandFact: parsed.data.profile.brandFact
              ? sanitizeText(parsed.data.profile.brandFact, "brandFact", 160)
              : undefined,
            brandColor: parsed.data.profile.brandColor
              ? sanitizeText(parsed.data.profile.brandColor, "brandColor", 20)
              : undefined,
            category: sanitizeText(parsed.data.profile.category, "category", 40),
            website: parsed.data.profile.website
              ? sanitizeUrl(parsed.data.profile.website, "website")
              : undefined,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        : null;

    if (!profile) {
      throw new ValidationError("Brand profile not found. Save profile before creating challenge.");
    }

    const metadataHash = sanitizeHexHash(parsed.data.metadataHash, "metadataHash");
    const computed = keccak256(stringToHex(`${profile.companyName}${profile.logoPath}${profile.tagline}`));

    if (computed.toLowerCase() !== metadataHash.toLowerCase()) {
      throw new ValidationError("metadataHash mismatch for saved brand profile");
    }

    const createResult = await createChallengeOnChain(
      metadataHash,
      BigInt(parsed.data.duration),
      BigInt(parsed.data.winnerCount),
      parseEther(parsed.data.prizePool),
    );

    const challengeId = Number(createResult.challengeId);

    const challenge: ChallengeMetadata = {
      challengeId,
      name: profile.companyName,
      logoPath: profile.logoPath,
      tagline: profile.tagline,
      brandFact: profile.brandFact,
      brandColor: profile.brandColor,
      category: profile.category,
      brandAddress,
      prizePool: parsed.data.prizePool,
      duration: parsed.data.duration,
      metadataHash,
      winnerCount: parsed.data.winnerCount,
      started: false,
      createdAt: Date.now(),
    };

    saveChallengeMetadata(challenge);

    return jsonCreated({
      ok: true,
      challengeId,
      createTxHash: createResult.txHash,
    });
  },
  {
    auth: true,
    namespace: "challenge_create_gasless",
    rateLimit: 20,
  },
);

export const GET = async () => methodNotAllowed(["POST"]);

export const OPTIONS = async (request: NextRequest) => {
  return addCorsHeaders(request, new NextResponse(null, { status: 204 }));
};
