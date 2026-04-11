import { QueryClient } from "@tanstack/react-query";
import { MONAD_TESTNET } from "@paypilot/shared";
import { defineChain } from "viem";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

export const monadTestnet = defineChain({
  id: MONAD_TESTNET.id,
  name: MONAD_TESTNET.name,
  network: MONAD_TESTNET.network,
  nativeCurrency: MONAD_TESTNET.nativeCurrency,
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_MONAD_RPC_URL || MONAD_TESTNET.rpcUrl],
    },
    public: {
      http: [import.meta.env.VITE_MONAD_RPC_URL || MONAD_TESTNET.rpcUrl],
    },
  },
});

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(import.meta.env.VITE_MONAD_RPC_URL || MONAD_TESTNET.rpcUrl),
  },
});

export const queryClient = new QueryClient();
