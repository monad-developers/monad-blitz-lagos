/** WebSocket message types shared between client and server */
export enum WsMessageType {
  // Client → Server
  JOIN_GAME = "JOIN_GAME",
  LEAVE_GAME = "LEAVE_GAME",
  PLAYER_ACTION = "PLAYER_ACTION",

  // Client → Server (game-specific)
  ROLL_DICE = "ROLL_DICE",
  TAP = "TAP",
  ANSWER = "ANSWER",

  // Server → Client
  JOINED_GAME = "JOINED_GAME",
  PLAYER_JOINED = "PLAYER_JOINED",
  PLAYER_LEFT = "PLAYER_LEFT",
  GAME_STATE = "GAME_STATE",
  GAME_STARTING = "GAME_STARTING",
  GAME_STARTED = "GAME_STARTED",
  ROUND_START = "ROUND_START",
  ROUND_END = "ROUND_END",
  COOLDOWN_START = "COOLDOWN_START",
  STATE_UPDATE = "STATE_UPDATE",
  PLAYER_ELIMINATED = "PLAYER_ELIMINATED",
  GAME_END = "GAME_END",
  ERROR = "ERROR",

  // Server → Client (game-specific)
  DICE_RESULT = "DICE_RESULT",
  GO_SIGNAL = "GO_SIGNAL",
  TAP_RESULT = "TAP_RESULT",
  TAP_COUNT = "TAP_COUNT",
  ANSWER_RESULT = "ANSWER_RESULT",
}

export interface WsMessage {
  type: WsMessageType | string
  [key: string]: unknown
}
