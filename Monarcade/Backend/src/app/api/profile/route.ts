import { NextRequest, NextResponse } from "next/server";
import { keccak256, stringToHex } from "viem";

import { NotFoundError, ValidationError } from "@/lib/errors";
import { addCorsHeaders, jsonCreated, jsonOk, methodNotAllowed, readJsonBody } from "@/lib/http";
import { withRoute } from "@/lib/route-handler";
import { sanitizeAddress, sanitizeText, sanitizeUrl } from "@/lib/security/sanitize";
import type { BrandProfile } from "@/lib/types";
import { brandProfileSchema } from "@/lib/validation/schemas";
import { getBrandProfileByAddress, getBrandProfileByUserId, saveBrandProfile } from "@/store/brands-store";

export const runtime = "nodejs";

export const GET = withRoute(
  async (_request, context) => {
    if (!context.auth?.userId) {
      throw new ValidationError("Authentication required");
    }

    // Look up by wallet address first, fall back to userId
    const profile = context.auth.walletAddress
      ? getBrandProfileByAddress(context.auth.walletAddress)
      : getBrandProfileByUserId(context.auth.userId);

    if (!profile) {
      throw new NotFoundError("Brand profile not found");
    }

    return jsonOk({ profile });
  },
  {
    auth: true,
    namespace: "brand_profile_get",
    rateLimit: 120,
  },
);

export const POST = withRoute(
  async (request, context) => {
    const body = await readJsonBody(request);
    const parsed = brandProfileSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid brand profile payload", parsed.error.flatten());
    }

    const auth = context.auth;
    if (!auth?.userId) {
      throw new ValidationError("Authentication required");
    }

    // Wallet address from request body (frontend sends it), or from auth context if available
    const rawAddress = parsed.data.brandAddress ?? auth.walletAddress;
    if (!rawAddress) {
      throw new ValidationError("brandAddress is required in request body");
    }

    const companyName = sanitizeText(parsed.data.companyName, "companyName", 80);
    const tagline = sanitizeText(parsed.data.tagline, "tagline", 80);
    const logoPath = sanitizeUrl(parsed.data.logoPath, "logoPath");
    const brandAddress = sanitizeAddress(rawAddress, "brandAddress");

    const profile: BrandProfile = {
      userId: auth.userId,
      brandAddress,
      companyName,
      tagline,
      logoPath,
      brandFact: parsed.data.brandFact
        ? sanitizeText(parsed.data.brandFact, "brandFact", 160)
        : undefined,
      brandColor: parsed.data.brandColor
        ? sanitizeText(parsed.data.brandColor, "brandColor", 20)
        : undefined,
      category: sanitizeText(parsed.data.category, "category", 40),
      website: parsed.data.website ? sanitizeUrl(parsed.data.website, "website") : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    saveBrandProfile(profile);

    const metadataHash = keccak256(stringToHex(`${companyName}${logoPath}${tagline}`));

    return jsonCreated({
      ok: true,
      profile,
      contractDraft: {
        metadataHash,
        duration: parsed.data.challengeDefaults?.duration ?? 3600,
        winnerCount: parsed.data.challengeDefaults?.winnerCount ?? 3,
        prizePool: parsed.data.challengeDefaults?.prizePool ?? "1",
      },
    });
  },
  {
    auth: true,
    namespace: "brand_profile_post",
    rateLimit: 20,
  },
);

export const PUT = async () => methodNotAllowed(["GET", "POST"]);

export const OPTIONS = async (request: NextRequest) => {
  return addCorsHeaders(request, new NextResponse(null, { status: 204 }));
};
