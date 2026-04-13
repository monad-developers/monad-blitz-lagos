import {
  createPublicClient,
  createWalletClient,
  http,
  encodePacked,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  type PublicClient,
  type WalletClient,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { env } from "../config/env"
import { monadTestnet } from "./chain"
import { GIVEAWAY_ABI } from "./abi"
import { createLogger } from "../lib/logger"

const log = createLogger("ChainClient")

let publicClient: PublicClient
let walletClient: WalletClient | null = null

export function getPublicClient(): PublicClient {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(env.rpcUrl),
    })
  }
  return publicClient
}

export function getWalletClient(): WalletClient | null {
  if (!walletClient && env.signerPrivateKey) {
    const account = privateKeyToAccount(env.signerPrivateKey)
    walletClient = createWalletClient({
      account,
      chain: monadTestnet,
      transport: http(env.rpcUrl),
    })
    log.info("Wallet client initialized", { address: account.address })
  }
  return walletClient
}

/** Read giveaway state from the contract */
export async function readGiveaway(giveawayId: `0x${string}`) {
  const client = getPublicClient()
  const result = await client.readContract({
    address: env.contractAddress,
    abi: GIVEAWAY_ABI,
    functionName: "giveaways",
    args: [giveawayId],
  })
  return result
}

/**
 * Sign and submit a finalizeWinners transaction.
 * This is called asynchronously — it does not block gameplay.
 */
export async function submitFinalizeWinners(
  giveawayId: `0x${string}`,
  winners: `0x${string}`[],
  amounts: bigint[]
) {
  const wallet = getWalletClient()
  if (!wallet || !wallet.account) {
    log.warn("No signer configured — skipping on-chain finalization")
    return null
  }

  const account = wallet.account!

  // Build the payout hash and sign it
  const payoutHash = keccak256(
    encodeAbiParameters(
      parseAbiParameters("bytes32, address[], uint256[]"),
      [giveawayId, winners, amounts]
    )
  )

  const signature = await account.signMessage!({
    message: { raw: payoutHash },
  })

  // Submit the transaction
  const hash = await wallet.writeContract({
    address: env.contractAddress,
    abi: GIVEAWAY_ABI,
    functionName: "finalizeWinners",
    args: [giveawayId, winners, amounts, signature],
    chain: monadTestnet,
    account,
  })

  log.info("Submitted finalizeWinners tx", { giveawayId, txHash: hash })
  return hash
}

/**
 * Fire-and-forget: submit results to chain without blocking.
 * Logs errors but does not throw.
 */
export function submitResultAsync(
  giveawayId: `0x${string}`,
  winners: `0x${string}`[],
  amounts: bigint[]
) {
  submitFinalizeWinners(giveawayId, winners, amounts).catch((err) => {
    log.error("Async chain submission failed", {
      giveawayId,
      error: err instanceof Error ? err.message : String(err),
    })
  })
}
