import WebSocket from "ws"
import { createLogger } from "../lib/logger"

const log = createLogger("ConnectionMap")

interface Connection {
  ws: WebSocket
  walletAddress: string
  gameId: string | null
}

/** Maps WebSocket connections to player metadata, and provides game-room broadcasting */
class ConnectionMap {
  private connections = new Map<WebSocket, Connection>()
  private gameRooms = new Map<string, Set<WebSocket>>()

  register(ws: WebSocket, walletAddress: string) {
    this.connections.set(ws, { ws, walletAddress, gameId: null })
  }

  joinRoom(ws: WebSocket, gameId: string) {
    const conn = this.connections.get(ws)
    if (!conn) return

    // Leave previous room if any
    if (conn.gameId) {
      this.leaveRoom(ws)
    }

    conn.gameId = gameId
    if (!this.gameRooms.has(gameId)) {
      this.gameRooms.set(gameId, new Set())
    }
    this.gameRooms.get(gameId)!.add(ws)
  }

  leaveRoom(ws: WebSocket) {
    const conn = this.connections.get(ws)
    if (!conn?.gameId) return

    const room = this.gameRooms.get(conn.gameId)
    if (room) {
      room.delete(ws)
      if (room.size === 0) {
        this.gameRooms.delete(conn.gameId)
      }
    }
    const prevGameId = conn.gameId
    conn.gameId = null
    return prevGameId
  }

  remove(ws: WebSocket): Connection | undefined {
    const conn = this.connections.get(ws)
    if (conn?.gameId) {
      this.leaveRoom(ws)
    }
    this.connections.delete(ws)
    return conn
  }

  getConnection(ws: WebSocket): Connection | undefined {
    return this.connections.get(ws)
  }

  /** Send a message to all connections in a game room */
  broadcast(gameId: string, data: object, exclude?: WebSocket) {
    const room = this.gameRooms.get(gameId)
    if (!room) return

    const payload = JSON.stringify(data)
    for (const ws of room) {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      }
    }
  }

  /** Send a message to ALL connections in a game room (including sender) */
  broadcastAll(gameId: string, data: object) {
    const room = this.gameRooms.get(gameId)
    if (!room) return

    const payload = JSON.stringify(data)
    for (const ws of room) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      }
    }
  }

  /** Send a message to a specific connection */
  send(ws: WebSocket, data: object) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  getRoomSize(gameId: string): number {
    return this.gameRooms.get(gameId)?.size ?? 0
  }

  getActiveRooms(): string[] {
    return Array.from(this.gameRooms.keys())
  }
}

export const connectionMap = new ConnectionMap()
