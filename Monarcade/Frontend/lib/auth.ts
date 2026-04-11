"use client";

import { getIdentityToken, usePrivy } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export interface AuthUser {
  id: string;
  email?: string;
  walletAddress?: string;
  userType?: "player" | "brand";
}

export interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userType: "player" | "brand" | undefined;
  login: (loginMethod?: "google" | "email") => void;
  logout: () => void;
  getAuthToken: () => Promise<string | null>;
}

const isHexAddress = (value: unknown): value is string =>
  typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);

const getAccountAddress = (account: unknown): string | undefined => {
  if (!account || typeof account !== "object") return undefined;
  const address = (account as { address?: unknown }).address;
  return isHexAddress(address) ? address : undefined;
};

const isSmartWalletAccount = (account: unknown): boolean => {
  if (!account || typeof account !== "object") return false;

  const candidates = [
    (account as { type?: unknown }).type,
    (account as { walletClientType?: unknown }).walletClientType,
    (account as { accountType?: unknown }).accountType,
    (account as { connectorType?: unknown }).connectorType,
  ];

  return candidates.some((candidate) =>
    typeof candidate === "string" && candidate.toLowerCase().includes("smart"),
  );
};

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const privy = usePrivy();
  const { client: smartWalletClient } = useSmartWallets();
  const [userType, setUserType] = useState<"player" | "brand" | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const stored = localStorage.getItem("monarcade_user_type");
    return stored === "player" || stored === "brand" ? stored : undefined;
  });

  useEffect(() => {
    const syncUserType = () => {
      const stored = localStorage.getItem("monarcade_user_type");
      setUserType(stored === "player" || stored === "brand" ? stored : undefined);
    };

    syncUserType();
    window.addEventListener("storage", syncUserType);
    window.addEventListener("monarcade-user-type-change", syncUserType as EventListener);

    return () => {
      window.removeEventListener("storage", syncUserType);
      window.removeEventListener("monarcade-user-type-change", syncUserType as EventListener);
    };
  }, []);

  const smartLinkedWalletAddress = privy.user?.linkedAccounts
    ?.filter((account) => isSmartWalletAccount(account))
    ?.map((account) => getAccountAddress(account))
    .find((address) => typeof address === "string");

  const activeSmartWalletAddress =
    smartWalletClient && typeof smartWalletClient === "object"
      ? getAccountAddress((smartWalletClient as { account?: unknown }).account)
      : undefined;

  const smartWalletAddress = activeSmartWalletAddress ?? smartLinkedWalletAddress;

  const user: AuthUser | null = privy.user
    ? {
        id: privy.user.id,
        email: privy.user.email?.address,
        walletAddress: smartWalletAddress,
        userType,
      }
    : null;

  const login = useCallback(
    (loginMethod?: "google" | "email") => {
      if (loginMethod === "google") {
        privy.login({ loginMethods: ["google"] });
      } else if (loginMethod === "email") {
        privy.login({ loginMethods: ["email"] });
      } else {
        privy.login();
      }
    },
    [privy],
  );

  const logout = useCallback(async () => {
    await privy.logout();
    localStorage.removeItem("monarcade_user_type");
    router.push("/");
  }, [privy, router]);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (!privy.ready || !privy.authenticated) {
      return null;
    }

    try {
      const identityToken = await getIdentityToken();
      if (identityToken) {
        return identityToken;
      }

      const accessToken = await privy.getAccessToken();
      return accessToken || null;
    } catch {
      // Token acquisition can fail during session refreshes; callers handle null tokens.
      return null;
    }
  }, [privy]);

  return {
    user,
    isLoading: !privy.ready,
    isAuthenticated: privy.authenticated,
    userType,
    login,
    logout,
    getAuthToken,
  };
}
