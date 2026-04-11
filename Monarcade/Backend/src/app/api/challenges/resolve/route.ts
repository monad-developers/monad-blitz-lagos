import { keccak256, stringToHex } from "viem";

import { ValidationError } from "@/lib/errors";
import { jsonOk, methodNotAllowed } from "@/lib/http";
import { withRoute } from "@/lib/route-handler";
import { getBrandProfileByAddress, listBrandProfiles } from "@/store/brands-store";
import { listChallenges } from "@/store/challenges-store";

export const runtime = "nodejs";

const isMetadataHash = (value: string) => /^0x[0-9a-fA-F]{64}$/.test(value);
const isAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value);

export const GET = withRoute(
  async (request) => {
    const metadataHashParam = (request.nextUrl.searchParams.get("metadataHash") ?? "").trim();
    const brandAddressParam = (request.nextUrl.searchParams.get("brandAddress") ?? "").trim();
    if (!isMetadataHash(metadataHashParam)) {
      throw new ValidationError("Invalid metadataHash query param");
    }

    if (brandAddressParam && !isAddress(brandAddressParam)) {
      throw new ValidationError("Invalid brandAddress query param");
    }

    const normalizedHash = metadataHashParam.toLowerCase();

    const challenge = listChallenges().find(
      (entry) => entry.metadataHash.toLowerCase() === normalizedHash,
    );

    if (challenge) {
      return jsonOk({
        found: true,
        source: "challenge-store",
        metadata: {
          name: challenge.name,
          logoPath: challenge.logoPath,
          tagline: challenge.tagline,
        },
      });
    }

    const profile = listBrandProfiles().find((entry) => {
      const computed = keccak256(stringToHex(`${entry.companyName}${entry.logoPath}${entry.tagline}`));
      return computed.toLowerCase() === normalizedHash;
    });

    if (!profile) {
      if (brandAddressParam) {
        const brandProfile = getBrandProfileByAddress(brandAddressParam);
        if (brandProfile) {
          return jsonOk({
            found: true,
            source: "brand-profile-address",
            metadata: {
              name: brandProfile.companyName,
              logoPath: brandProfile.logoPath,
              tagline: brandProfile.tagline,
            },
          });
        }

        const latestChallengeForBrand = listChallenges()
          .filter((entry) => entry.brandAddress.toLowerCase() === brandAddressParam.toLowerCase())
          .sort((a, b) => b.createdAt - a.createdAt)[0];

        if (latestChallengeForBrand) {
          return jsonOk({
            found: true,
            source: "challenge-brand-address",
            metadata: {
              name: latestChallengeForBrand.name,
              logoPath: latestChallengeForBrand.logoPath,
              tagline: latestChallengeForBrand.tagline,
            },
          });
        }
      }

      return jsonOk({ found: false, metadata: null });
    }

    return jsonOk({
      found: true,
      source: "brand-profile-store",
      metadata: {
        name: profile.companyName,
        logoPath: profile.logoPath,
        tagline: profile.tagline,
      },
    });
  },
  {
    namespace: "challenges_resolve",
    rateLimit: 120,
  },
);

export const POST = async () => methodNotAllowed(["GET"]);
