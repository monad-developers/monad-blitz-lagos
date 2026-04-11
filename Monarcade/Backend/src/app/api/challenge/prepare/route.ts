import { keccak256, stringToHex } from "viem";

import { ValidationError } from "@/lib/errors";
import { jsonOk, methodNotAllowed, readJsonBody } from "@/lib/http";
import { withRoute } from "@/lib/route-handler";
import { sanitizeText, sanitizeUrl } from "@/lib/security/sanitize";
import { prepareChallengeSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = withRoute(
  async (request) => {
    const body = await readJsonBody(request);
    const parsed = prepareChallengeSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid challenge prepare payload", parsed.error.flatten());
    }

    const name = sanitizeText(parsed.data.name, "name", 80);
    const logoPath = sanitizeUrl(parsed.data.logoPath, "logoPath");
    const tagline = sanitizeText(parsed.data.tagline, "tagline", 80);

    const metadataHash = keccak256(stringToHex(`${name}${logoPath}${tagline}`));

    return jsonOk({ metadataHash });
  },
  {
    auth: true,
    namespace: "challenge_prepare",
    rateLimit: 30,
  },
);

export const GET = async () => methodNotAllowed(["POST"]);