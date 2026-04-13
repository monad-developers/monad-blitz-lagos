import { PlayerStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export const playerService = {
    async list(limit = 50, offset = 0) {
        return prisma.player.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
        })
    },

    async findPlayerByWallet(wallet: string) {
        return prisma.player.findUnique({
            where: { walletAddress: wallet },
            include: { games: { include: { game: false } } },
        })
    }
}