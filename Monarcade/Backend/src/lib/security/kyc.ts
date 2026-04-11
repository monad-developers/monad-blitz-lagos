import type { NextRequest } from "next/server";

import type { AuthContext } from "@/lib/auth/privy";

const truthyValues = new Set(["true", "1", "yes", "verified"]);

export const isKycVerified = (request: NextRequest, auth?: AuthContext) => {
  const header = request.headers.get("x-kyc-verified")?.toLowerCase() ?? "";
  if (truthyValues.has(header)) {
    return true;
  }

  const claims = auth as unknown as {
    kycVerified?: boolean;
    verificationStatus?: string;
    kyc?: { verified?: boolean; status?: string };
  };

  if (claims?.kycVerified === true) {
    return true;
  }

  if (claims?.verificationStatus?.toLowerCase() === "verified") {
    return true;
  }

  if (claims?.kyc?.verified === true) {
    return true;
  }

  if (claims?.kyc?.status?.toLowerCase() === "verified") {
    return true;
  }

  return false;
};