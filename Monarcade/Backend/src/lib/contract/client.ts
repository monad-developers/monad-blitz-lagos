import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { env } from "@/lib/env";
import { monadTestnet } from "@/lib/contract/chain";

const transport = http(env.NEXT_PUBLIC_MONAD_RPC);
const account = privateKeyToAccount(env.SERVER_SIGNER_PRIVATE_KEY as `0x${string}`);

export const contractAddress = env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport,
});

export const walletClient = createWalletClient({
  account,
  chain: monadTestnet,
  transport,
});

export const signerAddress = account.address;
