// Simple structured logger — decisions are logged here and readable by frontend
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE  = path.join(__dirname, "../reasoning.log.json");

function loadLog() {
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveLog(entries) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(entries, null, 2));
}

export function logDecision({ type, groupId, action, reasoning, txHash = null }) {
  const entry = {
    id:        Date.now(),
    timestamp: new Date().toISOString(),
    type,      // YIELD | DEFAULT | ROUND_ADVANCE | MATCHMAKING
    groupId:   groupId?.toString() ?? null,
    action,
    reasoning,
    txHash,
  };

  const log = loadLog();
  log.unshift(entry); // newest first
  if (log.length > 200) log.pop();
  saveLog(log);

  const icon = action === "SLASH" ? "⚡" : action === "DEPLOY" ? "📈" : action === "WITHDRAW" ? "📤" : action === "ADVANCE" ? "🏆" : "🤔";
  console.log(`[${entry.timestamp}] ${icon} ${type} | Group ${groupId ?? "-"} | ${action}`);
  console.log(`  Reasoning: ${reasoning.slice(0, 120)}...`);
  if (txHash) console.log(`  TX: ${txHash}`);
}

export function getLog() {
  return loadLog();
}
