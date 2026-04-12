import { Router } from "express"
import { asyncHandler } from "../../lib/async-handler"
import { playerController } from "./player.controller"

const router = Router()

router.get("/", asyncHandler(playerController.list))
router.get("/:wallet", asyncHandler(playerController.playerByWallet))

export { router as playerRoutes }
