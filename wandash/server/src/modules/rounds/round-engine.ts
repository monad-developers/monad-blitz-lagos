import type { MiniGameType } from "@prisma/client"
import { prisma } from "../../lib/prisma"
import { createLogger } from "../../lib/logger"
import { connectionMap, WsMessageType } from "../../websocket"
import {
  diceHandler,
  quizHandler,
  reactionHandler,
  tapTapHandler,
  markGoSignal,
  type MiniGameHandler,
  type RoundConfig,
} from "./games"

const log = createLogger("RoundEngine")

const COOLDOWN_DURATION_MS = 10_000 // 10 seconds between rounds
const MAX_EMPTY_ROUNDS = 10 // Cancel game if this many consecutive rounds have 0 winners

// ─── Handler registry ───

const handlers: Record<MiniGameType, MiniGameHandler> = {
  dice_roll: diceHandler,
  quiz: quizHandler,
  tap_when_green: reactionHandler,
  tap_tap_tap: tapTapHandler,
}

// ─── In-memory game rotation queues ───
// Key: gameId → shuffled array of remaining game types to play
const rotationQueues = new Map<string, MiniGameType[]>()

// ─── Track consecutive empty rounds per game ───
const emptyRoundStreak = new Map<string, number>()

// ─── Active round timers ───
const roundTimers = new Map<string, NodeJS.Timeout>()
const cooldownTimers = new Map<string, NodeJS.Timeout>()
const goSignalTimers = new Map<string, NodeJS.Timeout>()

/** Shuffle an array in place (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Pick the next game type from the rotation queue, re-shuffling when exhausted */
function pickNextGameType(gameId: string, allowedGames: MiniGameType[]): MiniGameType {
  // TODO: Remove this override once all game UIs are built
  return "quiz" as MiniGameType

//   let queue = rotationQueues.get(gameId)
//   if (!queue || queue.length === 0) {
//     queue = shuffle(allowedGames)
//     rotationQueues.set(gameId, queue)
//   }
//   return queue.shift()!
}

/** Peek at what comes after the current pick (for "next game" preview) */
function peekNextGameType(gameId: string, allowedGames: MiniGameType[]): MiniGameType | null {
  // TODO: Remove this override once all game UIs are built
  return "quiz" as MiniGameType

//   let queue = rotationQueues.get(gameId)
//   if (!queue || queue.length === 0) {
//     // Would re-shuffle, so just pick random
//     const shuffled = shuffle(allowedGames)
//     rotationQueues.set(gameId, shuffled)
//     queue = shuffled
//   }
//   return queue[0] ?? null
}



// ═══════════════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════════════

/**
 * Start the first round of a game.
 * Called by the scheduler when a game transitions from upcoming → active.
 */
export async function startFirstRound(gameId: string) {
  const game = await prisma.game.findUnique({ where: { id: gameId } })
  if (!game || game.status !== "active") return

  const gameType = pickNextGameType(gameId, game.allowedGames as MiniGameType[])
  const nextGame = peekNextGameType(gameId, game.allowedGames as MiniGameType[])

  await prisma.game.update({
    where: { id: gameId },
    data: {
      currentRound: 1,
      totalRoundsPlayed: 1,
      currentGame: gameType,
      nextGame,
    },
  })

  await broadcastRoundStart(gameId, 1, gameType)
}

/**
 * Start the next round after cooldown.
 */
export async function startNextRound(gameId: string) {
  const game = await prisma.game.findUnique({ where: { id: gameId } })
  if (!game || game.status !== "cooldown") return

  const roundNumber = game.currentRound + 1
  const gameType = pickNextGameType(gameId, game.allowedGames as MiniGameType[])
  const nextGame = peekNextGameType(gameId, game.allowedGames as MiniGameType[])

  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: "active",
      currentRound: roundNumber,
      totalRoundsPlayed: roundNumber,
      currentGame: gameType,
      nextGame,
      cooldownEndsAt: null,
    },
  })

  await broadcastRoundStart(gameId, roundNumber, gameType)
}

/**
 * Broadcast ROUND_START and schedule the round end timer.
 */
async function broadcastRoundStart(gameId: string, roundNumber: number, gameType: MiniGameType) {
  const handler = handlers[gameType]
  const config = handler.getConfig(gameId)

  const roundDuration = (config.roundDuration as number) || 30

  log.info("Round starting", { gameId, round: roundNumber, gameType, durationSec: roundDuration })

  connectionMap.broadcastAll(gameId, {
    type: WsMessageType.ROUND_START,
    round: roundNumber,
    gameType,
    config,
  })

  // For reaction game: schedule the GO_SIGNAL after the delay
  if (gameType === "tap_when_green") {
    const delay = (config.delay as number) || 3000
    const goTimer = setTimeout(() => {
      const sentAt = markGoSignal(gameId)
      if (sentAt) {
        connectionMap.broadcastAll(gameId, {
          type: WsMessageType.GO_SIGNAL,
          sentAt,
        })
        log.debug("GO_SIGNAL sent", { gameId, sentAt })
      }
    }, delay)
    goSignalTimers.set(gameId, goTimer)
  }

  // Schedule round end
  const timer = setTimeout(() => {
    endRound(gameId).catch((err) => {
      log.error("Error ending round", err)
    })
  }, roundDuration * 1000)
  roundTimers.set(gameId, timer)
}

/**
 * End the current round: compute winners, record results, decide next step.
 */
export async function endRound(gameId: string) {
  // Clean up timers
  clearRoundTimers(gameId)

  const game = await prisma.game.findUnique({ where: { id: gameId } })
  if (!game || game.status !== "active") return

  const gameType = game.currentGame as MiniGameType
  if (!gameType) return

  const handler = handlers[gameType]
  const result = handler.computeWinners(gameId)

  // Calculate prize per winner (each win pays one share: totalRewards / numWinners)
  const totalRewardsBig = BigInt(game.totalRewards)
  const prizePerWinnerBig = game.numWinners > 0
    ? totalRewardsBig / BigInt(game.numWinners)
    : 0n
  const prizePerWinner = prizePerWinnerBig.toString()

  // Cap round winners by remaining prize money — repeat winners eat the pool
  const remaining = totalRewardsBig - BigInt(game.rewardsDisbursed)
  const maxAffordable = prizePerWinnerBig > 0n ? Number(remaining / prizePerWinnerBig) : 0
  const roundWinners = result.winners.slice(0, maxAffordable)

  // Record round result (may have 0 winners if pool exhausted mid-round)
  await prisma.roundResult.create({
    data: {
      gameId,
      roundNumber: game.currentRound,
      gameType,
      winnerAddresses: roundWinners.map((w) => w.toLowerCase()),
      prizePerWinner,
    },
  })

  // Track unique winners for the "enough distinct winners" completion check
  const existingWinners = new Set(game.winners.map((w) => w.toLowerCase()))
  const newUniqueWinners: string[] = []
  for (const addr of roundWinners) {
    const lower = addr.toLowerCase()
    if (!existingWinners.has(lower)) {
      existingWinners.add(lower)
      newUniqueWinners.push(lower)
    }
  }

  const allUniqueWinners = [...game.winners, ...newUniqueWinners]
  const disbursed = BigInt(game.rewardsDisbursed) + prizePerWinnerBig * BigInt(roundWinners.length)

  await prisma.game.update({
    where: { id: gameId },
    data: {
      winners: allUniqueWinners,
      rewardsDisbursed: disbursed.toString(),
    },
  })

  log.info("Round ended", {
    gameId,
    round: game.currentRound,
    roundWinners,
    newUniqueWinners: newUniqueWinners.length,
    totalUniqueWinners: existingWinners.size,
    totalDisbursed: disbursed.toString(),
    needed: game.numWinners,
  })

  // Broadcast ROUND_END to all players
  connectionMap.broadcastAll(gameId, {
    type: WsMessageType.ROUND_END,
    round: game.currentRound,
    gameType,
    winners: roundWinners.map((w) => w.toLowerCase()),
    prizePerWinner,
  })

  // Game completes when:
  // 1. Enough distinct winners found, OR
  // 2. Not enough remaining funds for even one more prize
  // 3. Too many consecutive empty rounds (no players participating)
  const remainingAfterRound = totalRewardsBig - disbursed

  // Track consecutive empty rounds
  if (roundWinners.length === 0) {
    emptyRoundStreak.set(gameId, (emptyRoundStreak.get(gameId) || 0) + 1)
  } else {
    emptyRoundStreak.set(gameId, 0)
  }
  const streak = emptyRoundStreak.get(gameId) || 0

  if (existingWinners.size >= game.numWinners || remainingAfterRound < prizePerWinnerBig) {
    await completeGame(gameId)
  } else if (streak >= MAX_EMPTY_ROUNDS) {
    log.warn("Cancelling game: too many consecutive empty rounds", { gameId, streak })
    await cancelGame(gameId)
  } else {
    await enterCooldown(gameId)
  }
}

/**
 * Enter cooldown before the next round.
 */
async function enterCooldown(gameId: string) {
  const cooldownEndsAt = new Date(Date.now() + COOLDOWN_DURATION_MS)
  const game = await prisma.game.findUnique({ where: { id: gameId } })
  if (!game) return

  const nextGame = peekNextGameType(gameId, game.allowedGames as MiniGameType[])

  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: "cooldown",
      cooldownEndsAt,
      nextGame,
    },
  })

  // Broadcast cooldown start
  connectionMap.broadcastAll(gameId, {
    type: WsMessageType.COOLDOWN_START,
    cooldownEndsAt: cooldownEndsAt.toISOString(),
    nextGame,
    cooldownDuration: COOLDOWN_DURATION_MS,
  })

  log.info("Cooldown started", { gameId, cooldownEndsAt: cooldownEndsAt.toISOString(), nextGame })

  // Schedule next round
  const timer = setTimeout(() => {
    startNextRound(gameId).catch((err) => {
      log.error("Error starting next round", err)
    })
  }, COOLDOWN_DURATION_MS)
  cooldownTimers.set(gameId, timer)
}

/**
 * Complete the game — broadcast GAME_END, optionally submit on-chain.
 */
async function completeGame(gameId: string) {
  clearAllTimers(gameId)

  const game = await prisma.game.update({
    where: { id: gameId },
    data: {
      status: "completed",
      endTime: new Date(),
      cooldownEndsAt: null,
    },
    include: { roundResults: true },
  })

  // Clean up all game handler state
  for (const handler of Object.values(handlers)) {
    handler.cleanup(gameId)
  }
  rotationQueues.delete(gameId)
  emptyRoundStreak.delete(gameId)

  // Aggregate per-address payouts from all round results.
  // Same player winning multiple rounds accumulates prizes.
  const payouts = new Map<string, bigint>()
  for (const rr of game.roundResults) {
    const prize = BigInt(rr.prizePerWinner || "0")
    for (const addr of rr.winnerAddresses) {
      const lower = addr.toLowerCase()
      payouts.set(lower, (payouts.get(lower) || 0n) + prize)
    }
  }

  const winnerPayouts = Array.from(payouts.entries()).map(([address, amount]) => ({
    address,
    amount: amount.toString(),
  }))

  connectionMap.broadcastAll(gameId, {
    type: WsMessageType.GAME_END,
    gameId,
    giveawayId: game.giveawayId,
    winners: winnerPayouts,
    totalRounds: game.totalRoundsPlayed,
  })

  log.info("Game completed", {
    gameId,
    uniqueWinners: payouts.size,
    totalRounds: game.totalRoundsPlayed,
    payouts: winnerPayouts,
  })

  // On-chain submission with per-address aggregated amounts
  try {
    const { submitFinalizeWinners } = await import("../../chain/client")
    const winnerAddresses = winnerPayouts.map((w) => w.address as `0x${string}`)
    const amounts = winnerPayouts.map((w) => BigInt(w.amount))

    log.info("Attempting on-chain finalization", {
      gameId,
      giveawayId: game.giveawayId,
      winnerAddresses,
      amounts: amounts.map(String),
    })

    const txHash = await submitFinalizeWinners(game.giveawayId as `0x${string}`, winnerAddresses, amounts)
    if (txHash) {
      await prisma.game.update({
        where: { id: gameId },
        data: { resultHash: txHash },
      })
      log.info("On-chain finalization submitted", { gameId, txHash })
    } else {
      log.warn("submitFinalizeWinners returned null — no signer configured?", { gameId })
    }
  } catch (err: any) {
    log.error("Failed to submit on-chain result", {
      gameId,
      error: err?.shortMessage || err?.message || String(err),
      cause: err?.cause?.shortMessage || err?.cause?.message,
    })
  }
}

/**
 * Cancel a game that has been running with no participants.
 * No on-chain finalization needed since no payouts exist.
 */
async function cancelGame(gameId: string) {
  clearAllTimers(gameId)

  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: "cancelled",
      endTime: new Date(),
      cooldownEndsAt: null,
    },
  })

  // Clean up all game handler state
  for (const handler of Object.values(handlers)) {
    handler.cleanup(gameId)
  }
  rotationQueues.delete(gameId)
  emptyRoundStreak.delete(gameId)

  connectionMap.broadcastAll(gameId, {
    type: WsMessageType.GAME_END,
    gameId,
    winners: [],
    totalRounds: 0,
    cancelled: true,
  })

  log.info("Game cancelled due to inactivity", { gameId })
}

/**
 * Route a player action to the correct game handler.
 * Returns { response?, broadcast? } or null.
 */
export function handleGameAction(
  gameId: string,
  gameType: MiniGameType,
  walletAddress: string,
  action: string,
  payload: unknown
) {
  const handler = handlers[gameType]
  if (!handler) return null
  return handler.handleAction(gameId, walletAddress, action, payload)
}

/**
 * Get the current round config for a game (used when a player joins mid-round).
 * Falls back to creating fresh state if none exists (e.g. after server restart).
 */
export function getCurrentRoundConfig(gameId: string, gameType: MiniGameType): RoundConfig | null {
  const handler = handlers[gameType]
  if (!handler) return null
  // Try read-only peek first (preserves existing round state)
  if (handler.peekConfig) {
    const existing = handler.peekConfig(gameId)
    if (existing) return existing
  }
  // No in-memory state — create fresh config (happens after server restart)
  return handler.getConfig(gameId)
}

// ═══════════════════════════════════════════════════════════
//  STARTUP RECOVERY
// ═══════════════════════════════════════════════════════════

/**
 * Resume games that were in-flight when the server restarted.
 * - Active games: round timer was lost → end the round immediately.
 * - Cooldown games: if cooldown expired → start next round; else schedule it.
 */
export async function resumeActiveGames() {
  // 1. Retry on-chain finalization for completed games that never got finalized
  const unfinalizedGames = await prisma.game.findMany({
    where: { status: "completed", resultHash: null },
    include: { roundResults: true },
  })

  for (const game of unfinalizedGames) {
    try {
      const payouts = new Map<string, bigint>()
      for (const rr of game.roundResults) {
        const prize = BigInt(rr.prizePerWinner || "0")
        for (const addr of rr.winnerAddresses) {
          const lower = addr.toLowerCase()
          payouts.set(lower, (payouts.get(lower) || 0n) + prize)
        }
      }

      if (payouts.size === 0) {
        log.warn("Completed game has no round winners to finalize", { gameId: game.id })
        continue
      }

      const winnerPayouts = Array.from(payouts.entries())
      const winnerAddresses = winnerPayouts.map(([addr]) => addr as `0x${string}`)
      const amounts = winnerPayouts.map(([, amt]) => amt)

      log.info("Retrying on-chain finalization for completed game", {
        gameId: game.id,
        giveawayId: game.giveawayId,
        winners: winnerAddresses,
        amounts: amounts.map(String),
      })

      const { submitFinalizeWinners } = await import("../../chain/client")
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
        log.info("On-chain finalization retry succeeded", { gameId: game.id, txHash })
      }
    } catch (err: any) {
      log.error("On-chain finalization retry failed", {
        gameId: game.id,
        error: err?.shortMessage || err?.message || String(err),
        cause: err?.cause?.shortMessage || err?.cause?.message,
      })
    }
  }

  // 2. Resume in-flight games
  const stuckGames = await prisma.game.findMany({
    where: { status: { in: ["active", "cooldown"] } },
  })

  if (stuckGames.length === 0) return

  log.info(`Resuming ${stuckGames.length} in-flight game(s) after restart`)

  for (const game of stuckGames) {
    try {
      // Fix stale nextGame values
      const correctNext = peekNextGameType(game.id, game.allowedGames as MiniGameType[])
      if (game.nextGame !== correctNext) {
        await prisma.game.update({
          where: { id: game.id },
          data: { nextGame: correctNext },
        })
      }

      if (game.status === "active") {
        // Round timer was lost — end the round now
        log.info("Recovering active game: ending stale round", {
          gameId: game.id,
          round: game.currentRound,
        })
        await endRound(game.id)
      } else if (game.status === "cooldown") {
        const now = Date.now()
        const cooldownEnd = game.cooldownEndsAt ? game.cooldownEndsAt.getTime() : 0

        if (cooldownEnd <= now) {
          // Cooldown already expired — start next round immediately
          log.info("Recovering cooldown game: cooldown expired, starting next round", {
            gameId: game.id,
          })
          await startNextRound(game.id)
        } else {
          // Cooldown still ongoing — schedule the next round
          const remaining = cooldownEnd - now
          log.info("Recovering cooldown game: scheduling next round", {
            gameId: game.id,
            remainingMs: remaining,
          })
          const timer = setTimeout(() => {
            startNextRound(game.id).catch((err) => {
              log.error("Error starting next round (recovery)", err)
            })
          }, remaining)
          cooldownTimers.set(game.id, timer)
        }
      }
    } catch (err) {
      log.error("Error recovering game", { gameId: game.id, error: err })
    }
  }
}

// ─── Timer cleanup ───

function clearRoundTimers(gameId: string) {
  const rt = roundTimers.get(gameId)
  if (rt) { clearTimeout(rt); roundTimers.delete(gameId) }
  const gt = goSignalTimers.get(gameId)
  if (gt) { clearTimeout(gt); goSignalTimers.delete(gameId) }
}

function clearAllTimers(gameId: string) {
  clearRoundTimers(gameId)
  const ct = cooldownTimers.get(gameId)
  if (ct) { clearTimeout(ct); cooldownTimers.delete(gameId) }
}

/** Called on server shutdown to clean up all timers */
export function shutdownRoundEngine() {
  for (const [gameId] of roundTimers) clearRoundTimers(gameId)
  for (const [gameId] of cooldownTimers) {
    const ct = cooldownTimers.get(gameId)
    if (ct) clearTimeout(ct)
  }
  roundTimers.clear()
  cooldownTimers.clear()
  goSignalTimers.clear()
  rotationQueues.clear()
  log.info("Round engine shut down")
}
