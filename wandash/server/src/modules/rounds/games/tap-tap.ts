import type { MiniGameHandler, RoundConfig, RoundWinnerResult } from "./types"
import { createLogger } from "../../../lib/logger"

const log = createLogger("TapTapGame")

interface TapTapRoundState {
  players: Map<string, number> // walletAddress → tap count
  duration: number // seconds
}

const roundStates = new Map<string, TapTapRoundState>()

export const tapTapHandler: MiniGameHandler = {
  gameType: "tap_tap_tap",

  getConfig(gameId: string): RoundConfig {
    const state: TapTapRoundState = {
      players: new Map(),
      duration: 10,
    }
    roundStates.set(gameId, state)

    return {
      gameType: "tap_tap_tap",
      duration: state.duration,
      roundDuration: state.duration + 2, // small buffer
    }
  },

  handleAction(gameId, walletAddress, action, _payload) {
    if (action !== "TAP") return null

    const state = roundStates.get(gameId)
    if (!state) return null

    const current = state.players.get(walletAddress) ?? 0
    state.players.set(walletAddress, current + 1)

    // Don't send a response for every tap to avoid flooding — client counts locally.
    // Only send periodic acks every 10 taps.
    if ((current + 1) % 10 === 0) {
      return {
        response: {
          type: "TAP_COUNT",
          count: current + 1,
        },
      }
    }

    return null
  },

  computeWinners(gameId): RoundWinnerResult {
    const state = roundStates.get(gameId)
    if (!state || state.players.size === 0) {
      roundStates.delete(gameId)
      return { winners: [], maxWinnersPerRound: 1 }
    }

    // Most taps wins — exactly 1 winner, tiebreak random
    const sorted = Array.from(state.players.entries())
      .sort((a, b) => b[1] - a[1])

    const winners = [sorted[0][0]]
    log.info("TapTap round winner", { gameId, winner: winners[0], topCount: sorted[0][1] })
    roundStates.delete(gameId)

    return { winners, maxWinnersPerRound: 1 }
  },

  cleanup(gameId) {
    roundStates.delete(gameId)
  },
}
