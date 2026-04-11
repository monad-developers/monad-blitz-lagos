import { NextRequest, NextResponse } from "next/server";
import { keccak256, stringToHex } from "viem";

import { ConflictError, ValidationError } from "@/lib/errors";
import { addCorsHeaders, jsonCreated, methodNotAllowed, readJsonBody } from "@/lib/http";
import { withRoute } from "@/lib/route-handler";
import { sanitizeAddress, sanitizeHexHash, sanitizeText, sanitizeUrl } from "@/lib/security/sanitize";
import type { ChallengeMetadata } from "@/lib/types";
import { registerChallengeSchema } from "@/lib/validation/schemas";
import { getChallengeMetadata, saveChallengeMetadata } from "@/store/challenges-store";

export const runtime = "nodejs";

export const POST = withRoute(
  async (request, context) => {
    const body = await readJsonBody(request);
    const parsed = registerChallengeSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid challenge register payload", parsed.error.flatten());
    }

    const existing = getChallengeMetadata(parsed.data.challengeId);
    if (existing) {
      throw new ConflictError("Challenge metadata already registered");
    }

    const name = sanitizeText(parsed.data.name, "name", 80);
    const logoPath = sanitizeUrl(parsed.data.logoPath, "logoPath");
    const tagline = sanitizeText(parsed.data.tagline, "tagline", 80);
    const metadataHash = sanitizeHexHash(parsed.data.metadataHash, "metadataHash");
    const computed = keccak256(stringToHex(`${name}${logoPath}${tagline}`));

    if (computed.toLowerCase() !== metadataHash.toLowerCase()) {
      throw new ValidationError("metadataHash mismatch");
    }

    const brandAddress = sanitizeAddress(parsed.data.brandAddress, "brandAddress");
    if (context.auth?.walletAddress && context.auth.walletAddress.toLowerCase() !== brandAddress.toLowerCase()) {
      throw new ValidationError("Authenticated wallet does not match brandAddress");
    }

    const challenge: ChallengeMetadata = {
      challengeId: parsed.data.challengeId,
      name,
      logoPath,
      tagline,
      brandFact: parsed.data.brandFact ? sanitizeText(parsed.data.brandFact, "brandFact", 160) : undefined,
      brandColor: parsed.data.brandColor ? sanitizeText(parsed.data.brandColor, "brandColor", 20) : undefined,
      category: sanitizeText(parsed.data.category, "category", 40),
      brandAddress,
      prizePool: parsed.data.prizePool,
      duration: parsed.data.duration,
      metadataHash,
      winnerCount: parsed.data.winnerCount,
      started: false,
      createdAt: Date.now(),
    };

    saveChallengeMetadata(challenge);

    return jsonCreated({ ok: true, challengeId: challenge.challengeId });
  },
  {
    auth: true,
    namespace: "challenge_register",
    rateLimit: 20,
  },
);

export const GET = async () => methodNotAllowed(["POST"]);

export const OPTIONS = async (request: NextRequest) => {
  return addCorsHeaders(request, new NextResponse(null, { status: 204 }));
};
