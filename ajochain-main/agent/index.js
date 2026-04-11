import "dotenv/config";
import { startTreasurer } from "./src/treasurer.js";

startTreasurer().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
