"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { ReactNode, useMemo } from "react";
import { MONAD_TESTNET } from "@/lib/monad";

interface PrivyWrapperProps {
  children: ReactNode;
}

const isLikelyValidPrivyAppId = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase().includes("your_privy")) return false;
  if (trimmed.toLowerCase().includes("placeholder")) return false;
  return trimmed.length >= 8;
};

export function PrivyWrapper({ children }: PrivyWrapperProps) {
  // Keep a stable local alias in case other config snippets still reference monadTestnet.
  const monadTestnet = MONAD_TESTNET;
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const bundlerUrl = process.env.NEXT_PUBLIC_PRIVY_BUNDLER_URL;
  const paymasterUrl = process.env.NEXT_PUBLIC_PRIVY_PAYMASTER_URL;

  const hasSmartWalletConfig = Boolean(bundlerUrl && paymasterUrl);
  const privyConfig = useMemo(
    () => ({
      loginMethods: ["google", "email"],
      defaultChain: monadTestnet,
      supportedChains: [monadTestnet],
      appearance: {
        theme: "light",
        accentColor: "#3B82F6", // Primary color from tailwind
      },
      embeddedWallets: {
        ethereum: {
          createOnLogin: "users-without-wallets",
        },
      },
      // Smart wallet config is not yet typed in this SDK surface, but is supported at runtime.
      smartWallets: hasSmartWalletConfig
        ? {
            enabled: true,
            smartWalletType: "kernel",
            configuredNetworks: [
              {
                chainId: monadTestnet.id.toString(),
                bundlerUrl: bundlerUrl!,
                paymasterUrl: paymasterUrl!,
              },
            ],
          }
        : { enabled: false },
    }),
    [hasSmartWalletConfig, bundlerUrl, monadTestnet, paymasterUrl],
  );

  if (!appId || !isLikelyValidPrivyAppId(appId)) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID}
      config={privyConfig as never}
    >
      <SmartWalletsProvider>{children}</SmartWalletsProvider>
    </PrivyProvider>
  );
}
