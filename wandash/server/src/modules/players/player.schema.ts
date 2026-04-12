import { z } from "zod"

export const playerWalletParam = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
})