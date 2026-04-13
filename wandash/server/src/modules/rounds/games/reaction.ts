import type { MiniGameHandler, RoundConfig, RoundWinnerResult } from "./types"
import { createLogger } from "../../../lib/logger"

const log = createLogger("ReactionGame")

interface ReactionRoundState {
  goSignalSentAt: number | null  // Date.now() when GO was sent
  delay: number                   // ms before GO signal
  players: Map<string, number>    // walletAddress → reaction time in ms
}

const roundStates = new Map<string, ReactionRoundState>()

export const reactionHandler: MiniGameHandler = {
  gameType: "tap_when_green",

  getConfig(gameId: string): RoundConfig {
    const delay = 2000 + Math.floor(Math.random() * 3000) // 2-5 seconds
    const state: ReactionRoundState = {
      goSignalSentAt: null,
      delay,
      players: new Map(),
    }
    roundStates.set(gameId, state)

    return {
      gameType: "tap_when_green",
      delay, // client uses this to show a "wait..." screen, then expects GO_SIGNAL
      roundDuration: 15, // total round seconds (incl wait + tap window)
    }
  },

  handleAction(gameId, walletAddress, action, _payload) {
    if (action !== "TAP") return null

    const state = roundStates.get(gameId)
    if (!state) return null

    const now = Date.now()

    if (!state.goSignalSentAt) {
      // Tapped too early (before GO signal)
      return {
        response: {
          type: "TAP_RESULT",
          tooEarly: true,
          reactionTime: null,
        },
      }
    }

    // Already tapped
    if (state.players.has(walletAddress)) {
      return {
        response: {
          type: "TAP_RESULT",
          error: "Already tapped",
          reactionTime: state.players.get(walletAddress),
        },
      }
    }

    const reactionTime = now - state.goSignalSentAt
    state.players.set(walletAddress, reactionTime)

    log.debug("Reaction tap", { gameId, walletAddress, reactionTime })

    return {
      response: {
        type: "TAP_RESULT",
        reactionTime,
        tooEarly: false,
      },
    }
  },

  computeWinners(gameId): RoundWinnerResult {
    const state = roundStates.get(gameId)
    if (!state || state.players.size === 0) {
      roundStates.delete(gameId)
      return { winners: [], maxWinnersPerRound: 2 }
    }

    // Fastest 2 reaction times win
    const sorted = Array.from(state.players.entries())
      .sort((a, b) => a[1] - b[1])

    const winners = sorted.slice(0, 2).map(([addr]) => addr)
    log.info("Reaction round winners", {
      gameId,
      winners,
      times: sorted.slice(0, 2).map(([, t]) => t),
    })
    roundStates.delete(gameId)

    return { winners, maxWinnersPerRound: 2 }
  },

  cleanup(gameId) {
    roundStates.delete(gameId)
  },
}

/**
 * Called by the round engine after the initial delay to mark GO and broadcast.
 * Returns the sentAt timestamp for the broadcast payload.
 */
export function markGoSignal(gameId: string): number | null {
  const state = roundStates.get(gameId)
  if (!state) return null
  state.goSignalSentAt = Date.now()
  return state.goSignalSentAt
}
