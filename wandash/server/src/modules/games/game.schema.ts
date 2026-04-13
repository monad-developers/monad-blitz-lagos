import { z } from "zod"
import type { MiniGameType } from "@prisma/client"

export const MINI_GAME_TYPES: MiniGameType[] = [
  "quiz",
  "tap_when_green",
  "tap_tap_tap",
  "dice_roll",
]

export const miniGameTypeSchema = z.enum(["quiz", "tap_when_green", "tap_tap_tap", "dice_roll"])

export const joinGameSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  displayName: z.string().max(50).optional(),
})

export const gameIdParam = z.object({
  id: z.string().min(1),
})

export const giveawayIdParam = z.object({
  giveawayId: z.string().min(1),
})
