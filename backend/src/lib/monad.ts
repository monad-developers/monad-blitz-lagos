import { MONAD_TESTNET } from "@paypilot/shared";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { env } from "../config/env";

export const monadTestnetChain = defineChain({
  id: MONAD_TESTNET.id,
  name: MONAD_TESTNET.name,
  network: MONAD_TESTNET.network,
  nativeCurrency: MONAD_TESTNET.nativeCurrency,
  rpcUrls: {
    default: {
      http: [env.MONAD_RPC_URL],
    },
    public: {
      http: [env.MONAD_RPC_URL],
    },
  },
});

export const publicClient = createPublicClient({
  chain: monadTestnetChain,
  transport: http(env.MONAD_RPC_URL),
});

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

function normalizePrivateKey(privateKey: string): `0x${string}` {
  return (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`;
}

export function getDemoWalletClient() {
  if (!env.DEMO_EXECUTOR_PRIVATE_KEY) {
    return null;
  }

  const account = privateKeyToAccount(normalizePrivateKey(env.DEMO_EXECUTOR_PRIVATE_KEY));
  const walletClient = createWalletClient({
    account,
    chain: monadTestnetChain,
    transport: http(env.MONAD_RPC_URL),
  });

  return { account, walletClient };
}
