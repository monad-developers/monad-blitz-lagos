// ============================================================
// CONTRACT INTERFACE — AI → On-Chain Bridge
// Takes AI decisions and writes them to AIOracle.sol,
// which relays to ExecutionMiddleware.sol.
// This is the ONLY place that signs and broadcasts transactions.
// ============================================================
"use strict";

const { ethers } = require("ethers");
const ADDRESSES   = require("./addresses");

// ─── ABIs ─────────────────────────────────────────────────────────────────────

const AI_ORACLE_ABI = [
  // reads
  "function applyDecision(address user, uint256 savingsRateBps, bool pause) external",
  "function aiEnabled(address user) external view returns (bool)",
  "function lastAIUpdate(address user) external view returns (uint256)",
  "function MIN_UPDATE_INTERVAL() external view returns (uint256)",
  "function MAX_AI_SAVINGS_BPS() external view returns (uint256)",
  "function aiOracleKey() external view returns (address)",
  "function middleware() external view returns (address)",
  // events
  "event AIDecisionApplied(address indexed user, uint256 savingsRateBps, bool paused)",
];

const MIDDLEWARE_ABI = [
  "function userRules(address user) external view returns (uint8 ruleType, uint256 value, uint256 minBalance, bool active)",
  "function aiOracle() external view returns (address)",
  "function processTransaction(address user, uint256 txAmount) external view returns (uint256)",
  "function setRuleFor(address user, uint8 ruleType, uint256 value, uint256 minBalance) external",
  "function pauseRuleFor(address user) external",
  "function commitSavings(address user, uint256 savingsAmount) external payable",
];

const VAULT_ABI = [
  "function balances(address user) external view returns (uint256)",
  "function totalDeposits() external view returns (uint256)",
  "function totalAllocated() external view returns (uint256)",
  "function checkInvariant() external view returns (bool)",
  "function allocateToStrategy(address strategy, uint256 amount) external",
  "function paused() external view returns (bool)",
];

const ROUTER_ABI = [
  "function approvedStrategies(address) external view returns (bool)",
  "function paused() external view returns (bool)",
  "function allocate(address strategy, uint256 amount) external payable",
];

// ─── Strategy registry ────────────────────────────────────────────────────────
// Populated from env or addresses.js after strategies are approved.
const STRATEGY_ADDRESSES = {
  stable: process.env.STRATEGY_STABLE || ADDRESSES.MOCK_STRATEGY,
  medium: process.env.STRATEGY_MEDIUM || "",
  high:   process.env.STRATEGY_HIGH   || "",
};

// ─── ContractInterface ────────────────────────────────────────────────────────

class ContractInterface {
  constructor(config) {
    this.provider   = new ethers.JsonRpcProvider(config.rpcUrl);
    // AI oracle server wallet — restricted key, no fund access
    this.wallet     = new ethers.Wallet(config.serverPrivateKey, this.provider);

    this.aiOracle   = new ethers.Contract(
      config.aiOracleAddress || ADDRESSES.AI_ORACLE,
      AI_ORACLE_ABI,
      this.wallet
    );
    this.middleware = new ethers.Contract(
      ADDRESSES.EXECUTION_MIDDLEWARE,
      MIDDLEWARE_ABI,
      this.provider  // read-only
    );
    this.vault      = new ethers.Contract(
      ADDRESSES.SAVINGS_VAULT,
      VAULT_ABI,
      this.wallet
    );
    this.router     = new ethers.Contract(
      ADDRESSES.STRATEGY_ROUTER,
      ROUTER_ABI,
      this.wallet    // needs signer — allocate() is a write
    );

    console.log(`[Interface] Connected — chain ${config.chainId || 10143}`);
    console.log(`[Interface] AIOracle: ${config.aiOracleAddress || ADDRESSES.AI_ORACLE}`);
  }

  // ── 1. Apply AI decision ──────────────────────────────────────────────────

  async applyDecision(decision) {
    console.log(`[Interface] Applying decision for ${decision.userAddress}`);
    const results = {};

    // Check user has opted in before attempting tx
    const opted = await this.aiOracle.aiEnabled(decision.userAddress);
    if (!opted) {
      console.warn(`[Interface] ${decision.userAddress} has not enabled AI — skipping`);
      return { skipped: true, reason: "ai_not_enabled" };
    }

    // Check rate-limit on-chain before sending (saves gas on revert)
    const lastUpdate = await this.aiOracle.lastAIUpdate(decision.userAddress);
    const minInterval = await this.aiOracle.MIN_UPDATE_INTERVAL();
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (now < lastUpdate + minInterval) {
      const waitSec = Number(lastUpdate + minInterval - now);
      console.warn(`[Interface] Rate-limited — ${waitSec}s until next update`);
      return { skipped: true, reason: "rate_limited", waitSec };
    }

    // Push decision through AIOracle → ExecutionMiddleware
    results.ruleTx = await this._applyOracleDecision(decision);

    // Rebalance yield if vault has idle funds
    const vaultBalance = await this.vault.balances(decision.userAddress);
    const REBALANCE_THRESHOLD = ethers.parseEther("0.01");
    if (vaultBalance > REBALANCE_THRESHOLD && !decision.pauseSaving) {
      results.allocationTxs = await this._rebalanceYield(
        vaultBalance,
        decision.yieldAllocation
      );
    }

    // Verify vault invariant
    results.invariantOk = await this.vault.checkInvariant();
    if (!results.invariantOk) {
      console.error("[Interface] CRITICAL: Vault invariant broken!");
    }

    results.timestamp = Date.now();
    return results;
  }

  async _applyOracleDecision(decision) {
    const safeBps = Math.min(decision.savingsRateBps, 2000);
    try {
      const tx      = await this.aiOracle.applyDecision(
        decision.userAddress,
        safeBps,
        decision.pauseSaving
      );
      const receipt = await tx.wait();
      console.log(
        `[Interface] AIOracle.applyDecision: ${safeBps}bps` +
        ` pause=${decision.pauseSaving} | tx: ${receipt.hash}`
      );
      return { hash: receipt.hash, bps: safeBps, paused: decision.pauseSaving };
    } catch (err) {
      console.error(`[Interface] applyDecision failed: ${err.message}`);
      throw err;
    }
  }

  async _rebalanceYield(vaultBalance, allocation) {
    const txs   = [];
    const total = allocation.stablePct + allocation.mediumPct + allocation.highPct;
    const splits = [
      { key: "stable", pct: allocation.stablePct },
      { key: "medium", pct: allocation.mediumPct },
      { key: "high",   pct: allocation.highPct   },
    ];

    // Check router is not paused before attempting any allocation
    const routerPaused = await this.router.paused();
    if (routerPaused) {
      console.warn("[Interface] StrategyRouter is paused — skipping rebalance");
      return txs;
    }

    for (const split of splits) {
      if (split.pct === 0) continue;
      const addr = STRATEGY_ADDRESSES[split.key];
      if (!addr) { console.warn(`[Interface] No address for ${split.key}`); continue; }

      const approved = await this.router.approvedStrategies(addr);
      if (!approved) { console.error(`[Interface] ${addr} not approved`); continue; }

      const amount = (vaultBalance * BigInt(split.pct)) / BigInt(total);
      if (amount === 0n) continue;

      try {
        // StrategyRouter.allocate() is payable — must send ETH with the call
        // Vault must first have ETH available (not all allocated to strategies)
        const tx      = await this.router.allocate(addr, amount, { value: amount });
        const receipt = await tx.wait();
        console.log(
          `[Interface] Allocated ${ethers.formatEther(amount)} MON` +
          ` to ${split.key} | tx: ${receipt.hash}`
        );
        txs.push({ strategy: split.key, amount: ethers.formatEther(amount), hash: receipt.hash });
      } catch (err) {
        console.error(`[Interface] allocate ${split.key} failed: ${err.message}`);
      }
    }
    return txs;
  }

  // ── 2. Read helpers ───────────────────────────────────────────────────────

  async getCurrentRule(userAddress) {
    const r = await this.middleware.userRules(userAddress);
    return { ruleType: Number(r.ruleType), value: Number(r.value), active: r.active };
  }

  async getUserVaultBalance(userAddress) {
    return ethers.formatEther(await this.vault.balances(userAddress));
  }

  async isAIEnabled(userAddress) {
    return this.aiOracle.aiEnabled(userAddress);
  }
}

module.exports = { ContractInterface, STRATEGY_ADDRESSES };
