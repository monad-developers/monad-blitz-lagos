import { QueryClient } from "@tanstack/react-query";
import { MONAD_TESTNET } from "../shared";
import { defineChain } from "viem";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { clientEnv } from "../config/env";

export const monadTestnet = defineChain({
  id: MONAD_TESTNET.id,
  name: MONAD_TESTNET.name,
  network: MONAD_TESTNET.network,
  nativeCurrency: MONAD_TESTNET.nativeCurrency,
  rpcUrls: {
    default: {
      http: [clientEnv.monadRpcUrl],
    },
    public: {
      http: [clientEnv.monadRpcUrl],
    },
  },
});

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(clientEnv.monadRpcUrl),
  },
});

export const queryClient = new QueryClient();
