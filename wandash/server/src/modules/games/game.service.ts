import { prisma } from "../../lib/prisma"
import { createLogger } from "../../lib/logger"
import type { GameStatus, MiniGameType } from "@prisma/client"

const log = createLogger("GameService")

// Map gameStyle strings from subgraph metadata → allowed MiniGameTypes
function resolveAllowedGames(gameStyles: string[]): MiniGameType[] {
  const mapping: Record<string, MiniGameType[]> = {
    quick: ["tap_when_green", "tap_tap_tap"],
    skill: ["quiz"],
    luck: ["dice_roll"],
  }
  const result = new Set<MiniGameType>()
  for (const style of gameStyles) {
    const games = mapping[style]
    if (games) games.forEach((g) => result.add(g))
  }
  // Default: allow all if none resolved
  if (result.size === 0) {
    return ["quiz", "tap_when_green", "tap_tap_tap", "dice_roll"]
  }
  return Array.from(result)
}

export interface CreateGameFromIndexer {
  giveawayId: string
  hostAddress: string
  token: string
  totalRewards: string
  numWinners: number
  startTime: number // unix seconds
  metadata: {
    title?: string
    description?: string
    gameStyle?: string[]
    [key: string]: unknown
  }
}

export const gameService = {
  /** Create a new Upcoming game from subgraph data */
  async createFromIndexer(input: CreateGameFromIndexer) {
    const allowedGames = resolveAllowedGames(input.metadata.gameStyle ?? [])

    const game = await prisma.game.create({
      data: {
        giveawayId: input.giveawayId,
        hostAddress: input.hostAddress.toLowerCase(),
        title: input.metadata.title || "Untitled Giveaway",
        description: input.metadata.description || "",
        token: input.token,
        totalRewards: input.totalRewards,
        numWinners: input.numWinners,
        startTime: new Date(input.startTime * 1000),
        allowedGames,
        metadata: input.metadata as any,
        status: "upcoming",
      },
    })
    log.info("Upcoming game created from indexer", { id: game.id, giveawayId: game.giveawayId })
    return game
  },

  async findById(id: string) {
    return prisma.game.findUnique({
      where: { id },
      include: { players: { include: { player: true } } },
    })
  },

  async findByGiveawayId(giveawayId: string) {
    return prisma.game.findUnique({
      where: { giveawayId },
      include: { players: { include: { player: true } } },
    })
  },

  async list(status?: GameStatus, limit = 50, offset = 0) {
    return prisma.game.findMany({
      where: status ? { status } : undefined,
      orderBy: { startTime: "asc" },
      take: limit,
      skip: offset,
      include: { _count: { select: { players: true } } },
    })
  },

  async updateStatus(id: string, status: GameStatus) {
    const data: any = { status }
    if (status === "completed") data.endTime = new Date()
    const game = await prisma.game.update({ where: { id }, data })
    log.info("Game status updated", { id, status })
    return game
  },

  /** Phase 2: start game session → active, round engine takes over */
  async startGameSession(id: string) {
    const game = await prisma.game.findUnique({ where: { id } })
    if (!game || game.status !== "upcoming") return null

    const updated = await prisma.game.update({
      where: { id },
      data: {
        status: "active",
      },
    })

    log.info("Game session started", { id })
    return updated
  },

  /** Get or create Player record by wallet, update displayName if provided */
  async getOrCreatePlayer(walletAddress: string, displayName?: string) {
    const addr = walletAddress.toLowerCase()
    let player = await prisma.player.findUnique({ where: { walletAddress: addr } })
    if (!player) {
      player = await prisma.player.create({
        data: { walletAddress: addr, displayName },
      })
      log.info("New player registered", { walletAddress: addr })
    } else if (displayName && displayName !== player.displayName) {
      player = await prisma.player.update({
        where: { id: player.id },
        data: { displayName },
      })
    }
    return player
  },

  /** Join a game — creates PlayerGame entry or reactivates existing */
  async joinGame(gameId: string, walletAddress: string, displayName?: string) {
    const player = await this.getOrCreatePlayer(walletAddress, displayName)

    // Upsert: if player was previously in this game, just update status
    const pg = await prisma.playerGame.upsert({
      where: { playerId_gameId: { playerId: player.id, gameId } },
      create: {
        playerId: player.id,
        gameId,
        status: "online",
      },
      update: {
        status: "online",
      },
      include: { player: true },
    })

    log.info("Player joined game", { gameId, walletAddress })
    return pg
  },

  /** Set player offline (disconnect) — data stays, status changes */
  async setPlayerOffline(gameId: string, walletAddress: string) {
    const addr = walletAddress.toLowerCase()
    const player = await prisma.player.findUnique({ where: { walletAddress: addr } })
    if (!player) {
      log.warn("setPlayerOffline: player not found", { gameId, walletAddress: addr })
      return
    }

    const result = await prisma.playerGame.updateMany({
      where: { playerId: player.id, gameId },
      data: { status: "offline" },
    })
    if (result.count === 0) {
      log.warn("setPlayerOffline: no PlayerGame record found", { gameId, walletAddress: addr })
      return
    }
    log.info("Player went offline", { gameId, walletAddress: addr })
  },

  async getPlayers(gameId: string) {
    return prisma.playerGame.findMany({
      where: { gameId },
      include: { player: true },
      orderBy: { joinedAt: "asc" },
    })
  },

  async getOnlinePlayers(gameId: string) {
    return prisma.playerGame.findMany({
      where: { gameId, status: "online" },
      include: { player: true },
    })
  },

  async getPlayerCount(gameId: string) {
    return prisma.playerGame.count({ where: { gameId } })
  },

  async getOnlinePlayerCount(gameId: string) {
    return prisma.playerGame.count({ where: { gameId, status: "online" } })
  },

  /** Get games ready to start (upcoming + startTime passed) */
  async getUpcomingGamesReadyToStart() {
    return prisma.game.findMany({
      where: {
        status: "upcoming",
        startTime: { lte: new Date() },
      },
    })
  },

  /** Get all known giveaway IDs to avoid re-creating */
  async getAllGiveawayIds(): Promise<Set<string>> {
    const games = await prisma.game.findMany({ select: { giveawayId: true } })
    return new Set(games.map((g) => g.giveawayId))
  },

  async setWinners(gameId: string, winnerAddresses: string[]) {
    return prisma.game.update({
      where: { id: gameId },
      data: { winners: winnerAddresses.map((a) => a.toLowerCase()) },
    })
  },

  async setResultHash(id: string, resultHash: string) {
    return prisma.game.update({
      where: { id },
      data: { resultHash },
    })
  },

  /** Get game status summary for API */
  async getGameStatus(gameId: string) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { _count: { select: { players: true } } },
    })
    if (!game) return null
    return {
      id: game.id,
      giveawayId: game.giveawayId,
      status: game.status,
      playerCount: game._count.players,
      startTime: game.startTime,
      currentRound: game.currentRound,
      currentGame: game.currentGame,
      nextGame: game.nextGame,
      cooldownEndsAt: game.cooldownEndsAt,
      totalRoundsPlayed: game.totalRoundsPlayed,
    }
  },
}
