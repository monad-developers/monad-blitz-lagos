// ============================================================
// ORCHESTRATOR — Scheduler + HTTP API
// Ties aiEngine.js → contractInterface.js together.
// Runs full AI cycle on schedule; exposes HTTP for frontend.
// ============================================================
"use strict";

const http = require("http");
const { runAIDecisionCycle } = require("./aiEngine");
const { ContractInterface }  = require("./contractInterface");

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
  rpcUrl:           process.env.MONAD_RPC       || "https://testnet-rpc.monad.xyz",
  serverPrivateKey: process.env.SERVER_KEY,       // AI oracle wallet private key
  aiOracleAddress:  process.env.AI_ORACLE_ADDR,   // deployed AIOracle.sol address
  chainId:          10143,
  CYCLE_INTERVAL_MS: 24 * 60 * 60 * 1000,         // 24h default
  MIN_CYCLE_MS:       1 * 60 * 60 * 1000,          // 1h minimum
  PORT:              parseInt(process.env.PORT || "3001"),
};

// Validate required env vars at startup
if (!CONFIG.serverPrivateKey) {
  console.error("[Orchestrator] ERROR: SERVER_KEY env var required");
  process.exit(1);
}
if (!CONFIG.aiOracleAddress) {
  console.error("[Orchestrator] ERROR: AI_ORACLE_ADDR env var required");
  process.exit(1);
}

// ─── In-memory user registry ──────────────────────────────────────────────────
// Production: replace with Postgres/Redis
// { address → { goal, lastCycleAt, currentSavingsRateBps, lastDecision, lastResult } }
const userRegistry = new Map();

// ─── Singleton contract interface ─────────────────────────────────────────────

let _iface = null;
function getInterface() {
  if (!_iface) _iface = new ContractInterface(CONFIG);
  return _iface;
}

// ─── Core: run one user cycle ─────────────────────────────────────────────────

async function runCycleForUser(userAddress) {
  const entry = userRegistry.get(userAddress) || {};
  const now   = Date.now();

  if (entry.lastCycleAt && now - entry.lastCycleAt < CONFIG.MIN_CYCLE_MS) {
    return { skipped: true, reason: "rate_limited" };
  }

  try {
    const decision = await runAIDecisionCycle(
      userAddress,
      CONFIG.rpcUrl,
      entry.goal || null,
      entry.currentSavingsRateBps || 500,
    );

    const result = await getInterface().applyDecision(decision);

    userRegistry.set(userAddress, {
      ...entry,
      lastCycleAt:           now,
      currentSavingsRateBps: decision.savingsRateBps,
      lastDecision:          decision,
      lastResult:            result,
    });

    console.log(`[Orchestrator] Cycle complete for ${userAddress}`);
    return { success: true, decision, result };
  } catch (err) {
    console.error(`[Orchestrator] Cycle failed for ${userAddress}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

async function runAllCycles() {
  if (userRegistry.size === 0) return;
  console.log(`[Orchestrator] Batch cycle for ${userRegistry.size} users`);
  const results = await Promise.allSettled(
    [...userRegistry.keys()].map(addr => runCycleForUser(addr))
  );
  const ok   = results.filter(r => r.status === "fulfilled" && r.value?.success).length;
  const fail = results.length - ok;
  console.log(`[Orchestrator] Batch done: ${ok} ok, ${fail} failed`);
}

setInterval(runAllCycles, CONFIG.CYCLE_INTERVAL_MS);
console.log(`[Orchestrator] Scheduler started (${CONFIG.CYCLE_INTERVAL_MS / 3600000}h interval)`);

// ─── HTTP API ─────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const url    = new URL(req.url, `http://${req.headers.host}`);
  const path   = url.pathname;
  const method = req.method;

  try {
    // POST /register  { address, goal? }
    if (path === "/register" && method === "POST") {
      const { address, goal } = JSON.parse(await readBody(req));
      if (!address) return respond(res, 400, { error: "address required" });
      const key = address.toLowerCase();

      // Verify user has opted in on-chain before registering
      const opted = await getInterface().isAIEnabled(key);
      if (!opted) {
        return respond(res, 403, {
          error: "User must call AIOracle.enableAI() from their smart account first",
          aiOracleAddress: CONFIG.aiOracleAddress,
        });
      }

      userRegistry.set(key, { goal: goal || null, lastCycleAt: null, currentSavingsRateBps: 500 });
      const result = await runCycleForUser(key);
      return respond(res, 200, { registered: true, ...result });
    }

    // POST /goal  { address, goal: { targetAmount, targetDate, currentSaved } }
    if (path === "/goal" && method === "POST") {
      const { address, goal } = JSON.parse(await readBody(req));
      if (!address || !goal) return respond(res, 400, { error: "address and goal required" });
      const key = address.toLowerCase();
      if (!userRegistry.has(key)) return respond(res, 404, { error: "user not registered" });
      userRegistry.set(key, { ...userRegistry.get(key), goal });
      const result = await runCycleForUser(key);
      return respond(res, 200, { goalUpdated: true, ...result });
    }

    // POST /cycle/:address  — trigger on-demand (e.g. after user tx)
    if (path.startsWith("/cycle/") && method === "POST") {
      const addr = path.split("/cycle/")[1]?.toLowerCase();
      if (!addr) return respond(res, 400, { error: "address required" });
      if (!userRegistry.has(addr)) return respond(res, 404, { error: "user not registered" });
      return respond(res, 200, await runCycleForUser(addr));
    }

    // GET /status/:address
    if (path.startsWith("/status/") && method === "GET") {
      const addr  = path.split("/status/")[1]?.toLowerCase();
      const entry = userRegistry.get(addr);
      if (!entry) return respond(res, 404, { error: "user not registered" });

      // Enrich with live on-chain data
      const [rule, balance, aiEnabled] = await Promise.all([
        getInterface().getCurrentRule(addr),
        getInterface().getUserVaultBalance(addr),
        getInterface().isAIEnabled(addr),
      ]);

      return respond(res, 200, {
        address: addr,
        aiEnabled,
        onChainRule:           rule,
        vaultBalance:          balance,
        lastCycleAt:           entry.lastCycleAt,
        currentSavingsRateBps: entry.currentSavingsRateBps,
        goal:                  entry.goal,
        diagnostics:           entry.lastDecision?.diagnostics || null,
        decision: entry.lastDecision ? {
          savingsRateBps:  entry.lastDecision.savingsRateBps,
          pauseSaving:     entry.lastDecision.pauseSaving,
          yieldAllocation: entry.lastDecision.yieldAllocation,
        } : null,
      });
    }

    // GET /health
    if (path === "/health" && method === "GET") {
      return respond(res, 200, {
        status:       "ok",
        users:        userRegistry.size,
        aiOracle:     CONFIG.aiOracleAddress,
        rpc:          CONFIG.rpcUrl,
        uptime:       process.uptime(),
      });
    }

    respond(res, 404, { error: "not found" });
  } catch (err) {
    console.error(`[Orchestrator] HTTP error: ${err.message}`);
    respond(res, 500, { error: err.message });
  }
});

server.listen(CONFIG.PORT, () => {
  console.log(`[Orchestrator] HTTP API on port ${CONFIG.PORT}`);
  console.log(`[Orchestrator] AIOracle: ${CONFIG.aiOracleAddress}`);
});

function respond(res, status, body) {
  res.writeHead(status);
  res.end(JSON.stringify(body, null, 2));
}

function readBody(req) {
  return new Promise(resolve => {
    let data = "";
    req.on("data", c => { data += c; });
    req.on("end", () => resolve(data));
  });
}

module.exports = { runCycleForUser, userRegistry };
