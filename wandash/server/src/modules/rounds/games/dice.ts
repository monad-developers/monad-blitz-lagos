import type { MiniGameHandler, RoundConfig, RoundWinnerResult } from "./types"
import { createLogger } from "../../../lib/logger"

const log = createLogger("DiceGame")

interface PlayerDiceState {
  rolls: number[][]  // each roll is [die1, die2]
  total: number
  rollsCompleted: number
}

interface DiceRoundState {
  players: Map<string, PlayerDiceState>
  maxRolls: number
  diceCount: number
}

const roundStates = new Map<string, DiceRoundState>()

function rollDice(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1)
}

export const diceHandler: MiniGameHandler = {
  gameType: "dice_roll",

  getConfig(gameId: string): RoundConfig {
    const state: DiceRoundState = {
      players: new Map(),
      maxRolls: 3,
      diceCount: 2,
    }
    roundStates.set(gameId, state)

    return {
      gameType: "dice_roll",
      maxRolls: state.maxRolls,
      diceCount: state.diceCount,
      roundDuration: 30, // seconds
    }
  },

  handleAction(gameId, walletAddress, action, _payload) {
    if (action !== "ROLL_DICE") return null

    const state = roundStates.get(gameId)
    if (!state) return null

    // Init player state if first roll
    if (!state.players.has(walletAddress)) {
      state.players.set(walletAddress, { rolls: [], total: 0, rollsCompleted: 0 })
    }

    const ps = state.players.get(walletAddress)!
    if (ps.rollsCompleted >= state.maxRolls) {
      return {
        response: {
          type: "DICE_RESULT",
          error: "All rolls used",
          rollNumber: ps.rollsCompleted,
          total: ps.total,
        },
      }
    }

    const values = rollDice(state.diceCount)
    const rollTotal = values.reduce((a, b) => a + b, 0)
    ps.rolls.push(values)
    ps.total += rollTotal
    ps.rollsCompleted++

    log.debug("Dice roll", { gameId, walletAddress, values, rollTotal, cumulative: ps.total })

    return {
      response: {
        type: "DICE_RESULT",
        values,
        rollTotal,
        rollNumber: ps.rollsCompleted,
        total: ps.total,
        rollsRemaining: state.maxRolls - ps.rollsCompleted,
      },
    }
  },

  computeWinners(gameId): RoundWinnerResult {
    const state = roundStates.get(gameId)
    if (!state || state.players.size === 0) {
      roundStates.delete(gameId)
      return { winners: [], maxWinnersPerRound: 1 }
    }

    // Highest total wins. Tiebreak: fewer rolls used, then random.
    const sorted = Array.from(state.players.entries())
      .sort((a, b) => {
        if (b[1].total !== a[1].total) return b[1].total - a[1].total
        return a[1].rollsCompleted - b[1].rollsCompleted // fewer rolls = better
      })

    const winners = [sorted[0][0]]
    log.info("Dice round winner", { gameId, winner: winners[0], topScore: sorted[0][1].total })
    roundStates.delete(gameId)

    return { winners, maxWinnersPerRound: 1 }
  },

  cleanup(gameId) {
    roundStates.delete(gameId)
  },
}
