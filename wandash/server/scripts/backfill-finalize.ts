/**
 * Backfill script: finalizes winners on-chain for all completed games
 * that have round results but no resultHash yet.
 *
 * Usage:
 *   cd wandash/server
 *   npx tsx scripts/backfill-finalize.ts
 */
import { prisma } from "../src/lib/prisma"
import { submitFinalizeWinners, getWalletClient } from "../src/chain/client"
import { createLogger } from "../src/lib/logger"

const log = createLogger("BackfillFinalize")

async function main() {
  // Verify signer is configured
  const wallet = getWalletClient()
  if (!wallet || !wallet.account) {
    log.error("No SIGNER_PRIVATE_KEY configured — cannot finalize. Set it in .env")
    process.exit(1)
  }
  log.info("Signer address", { address: wallet.account.address })

  // Find all completed games without a resultHash
  const unfinalized = await prisma.game.findMany({
    where: { status: "completed", resultHash: null },
    include: { roundResults: true },
  })

  if (unfinalized.length === 0) {
    log.info("No unfinalized completed games found — nothing to do.")
    await prisma.$disconnect()
    return
  }

  log.info(`Found ${unfinalized.length} unfinalized game(s)`)

  for (const game of unfinalized) {
    // Aggregate per-address payouts from round results
    const payouts = new Map<string, bigint>()
    for (const rr of game.roundResults) {
      const prize = BigInt(rr.prizePerWinner || "0")
      for (const addr of rr.winnerAddresses) {
        const lower = addr.toLowerCase()
        payouts.set(lower, (payouts.get(lower) || 0n) + prize)
      }
    }

    if (payouts.size === 0) {
      log.warn("Skipping game with no winners", { gameId: game.id, giveawayId: game.giveawayId })
      continue
    }

    const winnerAddresses = Array.from(payouts.keys()) as `0x${string}`[]
    const amounts = Array.from(payouts.values())

    log.info("Finalizing game", {
      gameId: game.id,
      giveawayId: game.giveawayId,
      winners: winnerAddresses,
      amounts: amounts.map(String),
    })

    try {
      const txHash = await submitFinalizeWinners(
        game.giveawayId as `0x${string}`,
        winnerAddresses,
        amounts
      )

      if (txHash) {
        await prisma.game.update({
          where: { id: game.id },
          data: { resultHash: txHash },
        })
        log.info("Finalized successfully", { gameId: game.id, txHash })
      } else {
        log.warn("submitFinalizeWinners returned null", { gameId: game.id })
      }
    } catch (err: any) {
      log.error("Failed to finalize game", {
        gameId: game.id,
        giveawayId: game.giveawayId,
        error: err?.shortMessage || err?.message || String(err),
        cause: err?.cause?.shortMessage || err?.cause?.message,
      })
    }
  }

  await prisma.$disconnect()
  log.info("Backfill complete")
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
