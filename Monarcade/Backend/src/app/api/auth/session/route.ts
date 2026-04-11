import { NextRequest, NextResponse } from "next/server";
import { requirePrivyAuth, AuthContext } from "@/lib/auth/privy";

/**
 * GET /api/auth/session
 * 
 * Returns the current user's session details after validating their Privy JWT token.
 * Requires: Authorization header with Bearer token
 */
export async function GET(request: NextRequest) {
  try {
    const authContext: AuthContext = await requirePrivyAuth(request);

    return NextResponse.json({
      user: {
        id: authContext.userId,
        walletAddress: authContext.walletAddress,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
