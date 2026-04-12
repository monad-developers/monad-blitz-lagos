import type { Request, Response } from "express";
import { gameService } from "./game.service";
import { gameIdParam, giveawayIdParam, joinGameSchema } from "./game.schema";
import type { GameStatus, MiniGameType } from "@prisma/client";
import { formatUnits } from "viem";
import { getCurrentRoundConfig } from "../rounds";

export const gameController = {
  async getById(req: Request, res: Response) {
    const { id } = gameIdParam.parse(req.params);
    const game = await gameService.findById(id);
    if (!game) return res.status(404).json({ error: "Game not found" });
    return res.json(game);
  },

  async getByGiveawayId(req: Request, res: Response) {
    const { giveawayId } = giveawayIdParam.parse(req.params);
    const game = await gameService.findByGiveawayId(giveawayId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    return res.json({
      ...game,
      totalRewards: formatUnits(BigInt(game.totalRewards), 18).toString(),
      rewardsDisbursed: formatUnits(BigInt(game.rewardsDisbursed), 18).toString(),
    });
  },

  async list(req: Request, res: Response) {
    const status = req.query.status as GameStatus | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const games = await gameService.list(status, limit, offset);
    return res.json(games);
  },

  /** GET /api/games/:id/status — returns status, playerCount, startTime */
  async getStatus(req: Request, res: Response) {
    const { id } = gameIdParam.parse(req.params);
    const status = await gameService.getGameStatus(id);
    if (!status) return res.status(404).json({ error: "Game not found" });
    return res.json(status);
  },

  /** POST /api/games/:id/join — register interest / join game */
  async join(req: Request, res: Response) {
    const { id } = gameIdParam.parse(req.params);
    const parsed = joinGameSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const game = await gameService.findById(id);
    if (!game) return res.status(404).json({ error: "Game not found" });
    if (game.status === "completed" || game.status === "cancelled") {
      return res
        .status(400)
        .json({ error: "Game is no longer accepting players" });
    }

    const pg = await gameService.joinGame(
      id,
      parsed.data.walletAddress,
      parsed.data.displayName,
    );
    return res.status(200).json(pg);
  },

  async getPlayers(req: Request, res: Response) {
    const { id } = gameIdParam.parse(req.params);
    const players = await gameService.getPlayers(id);
    return res.json(players);
  },

  /** GET /api/games/:id/round-config — current round config (quiz questions etc.) */
  async getRoundConfig(req: Request, res: Response) {
    const { id } = gameIdParam.parse(req.params);
    const game = await gameService.findById(id);
    if (!game) return res.status(404).json({ error: "Game not found" });
    if (game.status !== "active" || !game.currentGame) {
      return res.json({ config: null, round: game.currentRound, gameType: game.currentGame });
    }
    const config = getCurrentRoundConfig(id, game.currentGame as MiniGameType);
    console.log({ config });
    return res.json({
      config,
      round: game.currentRound,
      gameType: game.currentGame,
    });
  },
};
