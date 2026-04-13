import { createLogger } from "../../lib/logger"

const log = createLogger("LobbyManager")

export interface LobbyPlayer {
  walletAddress: string
  displayName?: string
  joinedAt: number
}

interface Lobby {
  gameId: string
  players: Map<string, LobbyPlayer>
}

/** In-memory lobby state for ultra-fast real-time player coordination */
class LobbyManager {
  private lobbies = new Map<string, Lobby>()

  create(gameId: string): Lobby {
    if (this.lobbies.has(gameId)) {
      return this.lobbies.get(gameId)!
    }
    const lobby: Lobby = { gameId, players: new Map() }
    this.lobbies.set(gameId, lobby)
    log.info("Lobby created", { gameId })
    return lobby
  }

  join(gameId: string, walletAddress: string, displayName?: string): LobbyPlayer | null {
    let lobby = this.lobbies.get(gameId)
    if (!lobby) {
      lobby = this.create(gameId)
    }

    const key = walletAddress.toLowerCase()
    if (lobby.players.has(key)) {
      return lobby.players.get(key)!
    }

    const player: LobbyPlayer = {
      walletAddress: key,
      displayName,
      joinedAt: Date.now(),
    }
    lobby.players.set(key, player)
    log.debug("Player joined lobby", { gameId, walletAddress: key })
    return player
  }

  leave(gameId: string, walletAddress: string): boolean {
    const lobby = this.lobbies.get(gameId)
    if (!lobby) return false

    const key = walletAddress.toLowerCase()
    const removed = lobby.players.delete(key)
    if (removed) {
      log.debug("Player left lobby", { gameId, walletAddress: key })
    }
    return removed
  }

  getPlayers(gameId: string): LobbyPlayer[] {
    const lobby = this.lobbies.get(gameId)
    if (!lobby) return []
    return Array.from(lobby.players.values())
  }

  getPlayerCount(gameId: string): number {
    return this.lobbies.get(gameId)?.players.size ?? 0
  }

  hasPlayer(gameId: string, walletAddress: string): boolean {
    return this.lobbies.get(gameId)?.players.has(walletAddress.toLowerCase()) ?? false
  }

  destroy(gameId: string): void {
    this.lobbies.delete(gameId)
    log.info("Lobby destroyed", { gameId })
  }

  getActiveLobbies(): string[] {
    return Array.from(this.lobbies.keys())
  }
}

export const lobbyManager = new LobbyManager()
