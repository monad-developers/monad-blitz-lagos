import { PlayerStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { playerService } from "./player.service";
import { playerWalletParam } from "./player.schema";

export const playerController = {
    async list(req: Request, res: Response) {
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const offset = parseInt(req.query.offset as string) || 0;

        const players = await playerService.list(limit, offset);
        return res.json(players);
    },

    async playerByWallet(req: Request, res: Response) {
        const { wallet } = playerWalletParam.parse(req.params);
        const player = await playerService.findPlayerByWallet(wallet);
        return res.json(player);
    }
}