import { defineChain, type Address } from "viem";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
export const CHAIN_ID = 10143;
export const MAX_ONCHAIN_CHALLENGES = 100;
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address | undefined;

export const MONAD_TESTNET = defineChain({
  id: CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_MONAD_RPC ?? "https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});

export const MONARCHADE_READ_ABI = [
  {
    type: "function",
    name: "challengeCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getChallenge",
    stateMutability: "view",
    inputs: [{ name: "challengeId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "brand", type: "address" },
          { name: "metadataHash", type: "bytes32" },
          { name: "prizePool", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "startTime", type: "uint256" },
          { name: "endTime", type: "uint256" },
          { name: "winnerCount", type: "uint256" },
          { name: "scoreCount", type: "uint256" },
          { name: "started", type: "bool" },
          { name: "distributed", type: "bool" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
] as const;
