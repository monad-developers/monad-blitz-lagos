import WebSocket from "ws"
import { z } from "zod"
import { connectionMap } from "./connection-map"
import { WsMessageType } from "./messages"
import { gameService } from "../modules/games"
import { handleGameAction, getCurrentRoundConfig } from "../modules/rounds"
import { createLogger } from "../lib/logger"
import type { MiniGameType } from "@prisma/client"

const log = createLogger("WsHandlers")

const joinGameSchema = z.object({
  type: z.literal(WsMessageType.JOIN_GAME),
  giveawayId: z.string().min(1),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  displayName: z.string().optional(),
})

const leaveGameSchema = z.object({
  type: z.literal(WsMessageType.LEAVE_GAME),
})

const playerActionSchema = z.object({
  type: z.literal(WsMessageType.PLAYER_ACTION),
  action: z.string(),
  payload: z.unknown().optional(),
})

export async function handleMessage(ws: WebSocket, raw: string) {
  let msg: any
  try {
    msg = JSON.parse(raw)
  } catch {
    return connectionMap.send(ws, { type: WsMessageType.ERROR, message: "Invalid JSON" })
  }

  switch (msg.type) {
    case WsMessageType.JOIN_GAME:
      return handleJoinGame(ws, msg)
    case WsMessageType.LEAVE_GAME:
      return handleLeaveGame(ws)
    case WsMessageType.PLAYER_ACTION:
      return handlePlayerAction(ws, msg)
    // Game-specific actions
    case WsMessageType.ROLL_DICE:
      return handleMiniGameAction(ws, "ROLL_DICE", msg.payload)
    case WsMessageType.TAP:
      return handleMiniGameAction(ws, "TAP", msg.payload)
    case WsMessageType.ANSWER:
      return handleMiniGameAction(ws, "ANSWER", msg.payload)
    default:
      return connectionMap.send(ws, {
        type: WsMessageType.ERROR,
        message: `Unknown message type: ${msg.type}`,
      })
  }
}

/**
 * Phase 3: Player connects and sends JOIN_GAME with giveawayId.
 * - Look up game by giveawayId
 * - Register/upsert player as "online" in DB
 * - Join the WS room for that game
 * - Broadcast PLAYER_JOINED to room
 * - Send JOINED_GAME ack + current game state to the player
 */
async function handleJoinGame(ws: WebSocket, msg: unknown) {
  const parsed = joinGameSchema.safeParse(msg)
  if (!parsed.success) {
    return connectionMap.send(ws, {
      type: WsMessageType.ERROR,
      message: "Invalid JOIN_GAME payload",
      details: parsed.error.flatten(),
    })
  }

  const { giveawayId, walletAddress, displayName } = parsed.data

  // Find game by giveawayId
  const game = await gameService.findByGiveawayId(giveawayId)
  if (!game) {
    return connectionMap.send(ws, { type: WsMessageType.ERROR, message: "Game not found for this giveawayId" })
  }

  if (game.status === "completed" || game.status === "cancelled") {
    return connectionMap.send(ws, { type: WsMessageType.ERROR, message: "Game is no longer active" })
  }

  // Register WS connection + join room
  connectionMap.register(ws, walletAddress)
  connectionMap.joinRoom(ws, game.id)

  // Upsert player in DB and set online
  const pg = await gameService.joinGame(game.id, walletAddress, displayName)

  const onlineCount = await gameService.getOnlinePlayerCount(game.id)

  // Broadcast to others in room
  connectionMap.broadcast(
    game.id,
    {
      type: WsMessageType.PLAYER_JOINED,
      walletAddress,
      displayName: pg.player.displayName,
      onlineCount,
    },
    ws
  )

  // Ack to the joining player with full game state
  const config = game.status === "active" && game.currentGame
    ? getCurrentRoundConfig(game.id, game.currentGame as MiniGameType)
    : null

  connectionMap.send(ws, {
    type: WsMessageType.JOINED_GAME,
    gameId: game.id,
    giveawayId: game.giveawayId,
    status: game.status,
    currentRound: game.currentRound,
    currentGame: game.currentGame,
    nextGame: game.nextGame,
    allowedGames: game.allowedGames,
    startTime: game.startTime.toISOString(),
    cooldownEndsAt: game.cooldownEndsAt ? game.cooldownEndsAt.toISOString() : null,
    onlineCount,
    config,
  })

  log.info("Player joined game via WS", { gameId: game.id, walletAddress })
}

/**
 * Phase 3: Player disconnects socket or sends LEAVE_GAME.
 * - Set player status to "offline" in DB
 * - Leave WS room
 * - Broadcast PLAYER_LEFT
 */
async function handleLeaveGame(ws: WebSocket) {
  const conn = connectionMap.getConnection(ws)
  if (!conn?.gameId) return

  const gameId = conn.gameId

  // Set player offline in DB
  await gameService.setPlayerOffline(gameId, conn.walletAddress)
  connectionMap.leaveRoom(ws)

  const onlineCount = await gameService.getOnlinePlayerCount(gameId)

  connectionMap.broadcast(gameId, {
    type: WsMessageType.PLAYER_LEFT,
    walletAddress: conn.walletAddress,
    onlineCount,
  })

  log.info("Player left game via WS", { gameId, walletAddress: conn.walletAddress })
}

async function handlePlayerAction(ws: WebSocket, msg: unknown) {
  const parsed = playerActionSchema.safeParse(msg)
  if (!parsed.success) {
    return connectionMap.send(ws, {
      type: WsMessageType.ERROR,
      message: "Invalid PLAYER_ACTION payload",
    })
  }

  const conn = connectionMap.getConnection(ws)
  if (!conn?.gameId) {
    return connectionMap.send(ws, { type: WsMessageType.ERROR, message: "Not in a game" })
  }

  // Forward action to all players in the room (legacy passthrough)
  connectionMap.broadcast(conn.gameId, {
    type: WsMessageType.STATE_UPDATE,
    from: conn.walletAddress,
    action: parsed.data.action,
    payload: parsed.data.payload,
  })
}

/**
 * Handle socket disconnect: set player offline and notify room.
 */
export async function handleDisconnect(ws: WebSocket) {
  const conn = connectionMap.getConnection(ws)
  if (conn?.gameId) {
    await gameService.setPlayerOffline(conn.gameId, conn.walletAddress)

    const onlineCount = await gameService.getOnlinePlayerCount(conn.gameId)

    connectionMap.broadcast(conn.gameId, {
      type: WsMessageType.PLAYER_LEFT,
      walletAddress: conn.walletAddress,
      onlineCount,
    })
    log.info("Player disconnected", { gameId: conn.gameId, walletAddress: conn.walletAddress })
  }
  connectionMap.remove(ws)
}

/**
 * Route game-specific actions (ROLL_DICE, TAP, ANSWER) to the round engine.
 */
async function handleMiniGameAction(ws: WebSocket, action: string, payload: unknown) {
  const conn = connectionMap.getConnection(ws)
  if (!conn?.gameId) {
    return connectionMap.send(ws, { type: WsMessageType.ERROR, message: "Not in a game" })
  }

  // Look up the game's current mini-game type
  const game = await gameService.findById(conn.gameId)
  if (!game || game.status !== "active" || !game.currentGame) {
    return connectionMap.send(ws, { type: WsMessageType.ERROR, message: "No active round" })
  }

  const result = handleGameAction(
    conn.gameId,
    game.currentGame as MiniGameType,
    conn.walletAddress,
    action,
    payload
  )

  if (!result) return

  // Send response to the acting player
  if (result.response) {
    connectionMap.send(ws, result.response)
  }

  // Broadcast to room if needed
  if (result.broadcast) {
    connectionMap.broadcastAll(conn.gameId, result.broadcast)
  }
}
