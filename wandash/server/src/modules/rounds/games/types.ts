import type { MiniGameType } from "@prisma/client"

/** Config sent to clients at round start */
export interface RoundConfig {
  gameType: MiniGameType
  [key: string]: unknown
}

/** Result of computing round winners */
export interface RoundWinnerResult {
  /** Wallet addresses of winners this round */
  winners: string[]
  /** Default number of winners this game type produces per round */
  maxWinnersPerRound: number
}

/** Every mini-game handler must implement this interface */
export interface MiniGameHandler {
  /** The game type this handler manages */
  readonly gameType: MiniGameType

  /**
   * Called at round start — returns config to broadcast to clients.
   * Also initializes any in-memory round state.
   */
  getConfig(gameId: string): RoundConfig

  /**
   * Handle a player action during the round.
   * Returns an optional response to send back to that player.
   */
  handleAction(
    gameId: string,
    walletAddress: string,
    action: string,
    payload: unknown
  ): { response?: object; broadcast?: object } | null

  /**
   * Called when the round time expires — compute and return winners.
   * Also cleans up in-memory state.
   */
  computeWinners(gameId: string): RoundWinnerResult

  /**
   * Clean up any in-memory state for a game (called on game end).
   */
  cleanup(gameId: string): void

  /**
   * Read-only access to current round config (for late-joining players).
   * Returns null if no active round state exists.
   */
  peekConfig?(gameId: string): RoundConfig | null
}
