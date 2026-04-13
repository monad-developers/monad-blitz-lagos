import { Router } from "express"
import { gameController } from "./game.controller"
import { asyncHandler } from "../../lib/async-handler"

const router = Router()

router.get("/", asyncHandler(gameController.list))
router.get("/:id", asyncHandler(gameController.getById))
router.get("/:id/status", asyncHandler(gameController.getStatus))
router.get("/:id/players", asyncHandler(gameController.getPlayers))
router.get("/:id/round-config", asyncHandler(gameController.getRoundConfig))
router.get("/giveaway/:giveawayId", asyncHandler(gameController.getByGiveawayId))
router.post("/:id/join", asyncHandler(gameController.join))

export { router as gameRoutes }
