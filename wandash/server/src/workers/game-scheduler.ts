import cron from "node-cron"
import { gameService } from "../modules/games"
import { pollForNewGiveaways } from "../modules/indexer"
import { startFirstRound, resumeActiveGames } from "../modules/rounds"
import { connectionMap, WsMessageType } from "../websocket"
import { createLogger } from "../lib/logger"

const log = createLogger("GameScheduler")

/**
 * Phase 1: Poll subgraph every 10s for new giveaways → create upcoming games.
 * Phase 2: Check upcoming games whose startTime has passed → start game session.
 */
export function startGameScheduler() {
  // ── Phase 0: Resume any games that were in-flight before restart ──
  resumeActiveGames().catch((err) => {
    log.error("Failed to resume active games", err)
  })
  // ── Phase 1: Detect new giveaways from indexer ──
  const pollTask = cron.schedule("*/10 * * * * *", async () => {
    try {
      const count = await pollForNewGiveaways()
      if (count > 0) {
        log.info(`Created ${count} new upcoming game(s) from subgraph`)
      }
    } catch (err) {
      log.error("Subgraph poll error", err)
    }
  })

  // ── Phase 2: Start games whose startTime has passed ──
  const startTask = cron.schedule("*/10 * * * * *", async () => {
    try {
      const readyGames = await gameService.getUpcomingGamesReadyToStart()

      for (const game of readyGames) {
        log.info("Starting game session", { id: game.id, giveawayId: game.giveawayId })

        const started = await gameService.startGameSession(game.id)
        if (!started) continue

        // Broadcast GAME_STARTED to all connected players
        connectionMap.broadcastAll(game.id, {
          type: WsMessageType.GAME_STARTED,
          gameId: game.id,
          giveawayId: game.giveawayId,
          allowedGames: started.allowedGames,
        })

        // Start the first round via the round engine
        await startFirstRound(game.id)

        log.info("Game is now active", {
          id: game.id,
        })
      }
    } catch (err) {
      log.error("Game start scheduler error", err)
    }
  })

  log.info("Game scheduler started (poll + start check every 10s)")
  return { pollTask, startTask }
}
