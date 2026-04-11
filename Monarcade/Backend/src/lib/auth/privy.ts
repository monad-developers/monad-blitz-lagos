import { NextRequest } from "next/server";
import { PrivyClient } from "@privy-io/node";

import { env } from "@/lib/env";
import { UnauthorizedError } from "@/lib/errors";

const privy = new PrivyClient({
  appId: env.NEXT_PUBLIC_PRIVY_APP_ID,
  appSecret: env.PRIVY_APP_SECRET,
});

export type AuthContext = {
  userId: string;
  walletAddress?: string;
};

const isEvmAddress = (value: string | undefined): value is `0x${string}` => {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
};

const extractWalletAddressFromIdentityUser = (identityUser: unknown): string | undefined => {
  const user = identityUser as {
    wallet?: { address?: string };
    linkedAccounts?: Array<{
      address?: string;
      type?: string;
      wallet_address?: string;
      walletAddress?: string;
      chain_id?: string;
    }>;
    linked_accounts?: Array<{
      address?: string;
      type?: string;
      wallet_address?: string;
      walletAddress?: string;
      chain_id?: string;
    }>;
  };

  if (isEvmAddress(user?.wallet?.address)) {
    return user.wallet.address;
  }

  const accounts = user?.linked_accounts ?? user?.linkedAccounts ?? [];

  const addressFromAccount = accounts
    .filter((account) => account.type === "wallet" || account.type === "smart_wallet")
    .map((account) => account.address ?? account.wallet_address ?? account.walletAddress)
    .find((address) => isEvmAddress(address));

  return addressFromAccount;
};

// Cache verified tokens for 5 minutes to avoid hitting Privy API on every request.
// At 1000 concurrent users, this prevents Privy rate limiting.
const tokenCache = new Map<string, { auth: AuthContext; expiresAt: number }>();
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;

export const requirePrivyAuth = async (request: NextRequest): Promise<AuthContext> => {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    throw new UnauthorizedError("Missing bearer token");
  }

  // Check cache first — skip Privy API if token was recently verified
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.auth;
  }

  try {
    const access = await privy.utils().auth().verifyAccessToken(token);
    const auth: AuthContext = { userId: access.user_id };
    tokenCache.set(token, { auth, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
    return auth;
  } catch {
    try {
      const identityUser = await privy.utils().auth().verifyIdentityToken(token);
      const auth: AuthContext = {
        userId: identityUser.id,
        walletAddress: extractWalletAddressFromIdentityUser(identityUser),
      };
      tokenCache.set(token, { auth, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
      return auth;
    } catch {
      throw new UnauthorizedError("Invalid auth token");
    }
  }
};
