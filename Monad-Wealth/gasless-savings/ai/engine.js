// ============================================================
// AI LAYER — Autonomous Financial Intelligence Engine
// Stack: Node.js
// Role: Observe behavior → compute decisions → output parameters
//       for ExecutionMiddleware.sol and StrategyRouter.sol
// NEVER touches contracts directly — that is contracts.js's job.
// ============================================================

"use strict";

// ─── Rule type enum (mirrors ExecutionMiddleware.sol) ────────
const RuleType = { ROUNDUP: 0, PERCENTAGE: 1, FIXED: 2 };

// ─── Constants ───────────────────────────────────────────────
const AI_CONFIG = {
  ANALYSIS_WINDOW_DAYS:  30,
  LIQUIDITY_FLOOR_RATIO: 1.5,   // never save if balance < 1.5x monthly spend
  MIN_SAVINGS_BPS:       50,    // 0.5%  — matches contract MIN_SAVINGS guard
  MAX_SAVINGS_BPS:       2000,  // 20%   — matches contract MAX_PERCENTAGE_BPS
  ROUNDUP_UNITS: [100n, 500n, 1000n, 5000n, 10000n], // wei
  HIGH_VOLATILITY_CV:   0.6,
  LOW_VOLATILITY_CV:    0.2,
  HIGH_LIQUIDITY_RISK:  0.3,
  LOW_LIQUIDITY_RISK:   0.1,
};

// ─── 1. DATA INGESTION ───────────────────────────────────────

/**
 * Fetch and normalize transaction history for a user.
 * Uses eth_getLogs on the SavingsVault Deposited event to get
 * real on-chain activity, plus eth_getBalance for current balance.
 *
 * For richer history (all outgoing txs), swap the body of this
 * function for a Goldsky / Ponder indexer call.
 */
async function fetchTransactionHistory(userAddress, rpcUrl, windowDays = 30) {
  const latestBlock  = await getLatestBlock(rpcUrl);
  // Monad testnet: ~1s blocks
  const blocksPerDay = 86_400;
  const fromBlock    = Math.max(0, latestBlock - blocksPerDay * windowDays);

  // eth_getLogs is universally supported — no indexer required
  const logsRes = await rpcCall(rpcUrl, "eth_getLogs", [{
    fromBlock: "0x" + fromBlock.toString(16),
    toBlock:   "latest",
    address:   userAddress,   // filter by user's smart account address
  }]);

  const logs = logsRes || [];

  // Normalise: treat every log as an "outgoing" event for spend analysis
  // In production replace with a proper indexer that returns full tx list
  return logs.map(log => ({
    hash:       log.transactionHash,
    timestamp:  parseInt(log.blockNumber, 16) * 1000, // approx; use block ts in prod
    value:      BigInt(log.data || "0x0"),
    from:       userAddress.toLowerCase(),
    to:         log.address.toLowerCase(),
    isIncoming: false,
  }));
}

async function getLatestBlock(rpcUrl) {
  const result = await rpcCall(rpcUrl, "eth_blockNumber", []);
  return parseInt(result, 16);
}

async function getBalance(address, rpcUrl) {
  const result = await rpcCall(rpcUrl, "eth_getBalance", [address, "latest"]);
  return BigInt(result || "0x0");
}

async function rpcCall(rpcUrl, method, params) {
  const res = await fetch(rpcUrl, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`RPC ${method}: ${data.error.message}`);
  return data.result;
}

// ─── 2. BEHAVIORAL ANALYSIS ENGINE ───────────────────────────

/**
 * Compute a UserProfile from raw transaction history.
 */
function analyzeUserBehavior(txHistory, currentBalanceWei) {
  if (txHistory.length === 0) return defaultProfile(currentBalanceWei);

  const outgoing = txHistory.filter(tx => !tx.isIncoming);
  const incoming = txHistory.filter(tx =>  tx.isIncoming);

  const spendAmounts = outgoing.map(tx => Number(tx.value) / 1e18);
  const avgSpend     = mean(spendAmounts);
  const cvSpend      = avgSpend > 0 ? stddev(spendAmounts) / avgSpend : 0;

  const inAmounts       = incoming.map(tx => Number(tx.value) / 1e18);
  const avgIncome       = mean(inAmounts);
  const incomeStability = computeIncomeStability(incoming);
  const liquidityRisk   = estimateLiquidityRisk(txHistory, currentBalanceWei);
  const txFrequency     = outgoing.length / 30; // tx/day over window

  let riskProfile;
  if (cvSpend > AI_CONFIG.HIGH_VOLATILITY_CV || liquidityRisk > AI_CONFIG.HIGH_LIQUIDITY_RISK) {
    riskProfile = "conservative";
  } else if (cvSpend < AI_CONFIG.LOW_VOLATILITY_CV && liquidityRisk < AI_CONFIG.LOW_LIQUIDITY_RISK) {
    riskProfile = "aggressive";
  } else {
    riskProfile = "moderate";
  }

  return {
    avgTxSize:        avgSpend,
    avgMonthlySpend:  avgSpend * outgoing.length,
    avgMonthlyIncome: avgIncome * incoming.length,
    txFrequency,
    incomeStability,
    volatilityScore:  cvSpend,
    liquidityRisk,
    riskProfile,
    currentBalance:   Number(currentBalanceWei) / 1e18,
    analyzedAt:       Date.now(),
  };
}

function computeIncomeStability(incomingTxs) {
  if (incomingTxs.length < 2) return 0.3;
  const sorted = [...incomingTxs].sort((a, b) => a.timestamp - b.timestamp);
  const gaps   = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((sorted[i].timestamp - sorted[i - 1].timestamp) / 86_400_000); // days
  }
  const avgGap = mean(gaps);
  const cvGap  = avgGap > 0 ? stddev(gaps) / avgGap : 1;
  const isSalaryLike = avgGap >= 25 && avgGap <= 32 && cvGap < 0.15;
  if (isSalaryLike) return 0.9;
  return Math.max(0, Math.min(1, 1 - cvGap));
}

function estimateLiquidityRisk(txHistory, currentBalanceWei) {
  let balance = Number(currentBalanceWei) / 1e18;
  const sorted = [...txHistory].sort((a, b) => b.timestamp - a.timestamp);
  const avgSpend = mean(
    txHistory.filter(t => !t.isIncoming).map(t => Number(t.value) / 1e18)
  );
  const lowThreshold = avgSpend * 2;
  let lowCount = 0;
  for (const tx of sorted) {
    balance += tx.isIncoming
      ? -(Number(tx.value) / 1e18)
      :  (Number(tx.value) / 1e18);
    if (balance < lowThreshold) lowCount++;
  }
  return sorted.length > 0 ? lowCount / sorted.length : 0;
}

function defaultProfile(currentBalanceWei) {
  return {
    avgTxSize: 0, avgMonthlySpend: 0, avgMonthlyIncome: 0,
    txFrequency: 0, incomeStability: 0.5, volatilityScore: 0.5,
    liquidityRisk: 0.5, riskProfile: "conservative",
    currentBalance: Number(currentBalanceWei) / 1e18,
    analyzedAt: Date.now(),
  };
}

// ─── 3. DECISION ENGINE ───────────────────────────────────────

/**
 * Returns savings rate in basis points.
 * Clamped to [MIN_SAVINGS_BPS, MAX_SAVINGS_BPS] — mirrors contract guards.
 */
function computeSavingsRate(profile, goal) {
  const stabilityFactor = profile.incomeStability;
  const riskFactor      = 1 - profile.liquidityRisk;
  const behaviorScore   = stabilityFactor * 0.6 + riskFactor * 0.4;
  const baseBps         = Math.round(200 + behaviorScore * 1000); // 200–1200

  let goalModifier = 1.0;
  if (goal) {
    const urgency = computeGoalUrgency(goal, profile);
    if      (urgency === "critical")  goalModifier = 1.6;
    else if (urgency === "high")      goalModifier = 1.3;
    else if (urgency === "on_track")  goalModifier = 1.0;
    else if (urgency === "ahead")     goalModifier = 0.7;
  }

  // Liquidity floor: throttle if balance is thin
  const liquidityFloor = profile.avgMonthlySpend * AI_CONFIG.LIQUIDITY_FLOOR_RATIO;
  if (profile.currentBalance < liquidityFloor) goalModifier *= 0.3;

  return Math.round(Math.min(
    AI_CONFIG.MAX_SAVINGS_BPS,
    Math.max(AI_CONFIG.MIN_SAVINGS_BPS, baseBps * goalModifier)
  ));
}

/**
 * Pick the best round-up unit: largest unit that is ≤5% of avg tx size.
 */
function computeRoundUpUnit(profile) {
  if (profile.avgTxSize <= 0) return AI_CONFIG.ROUNDUP_UNITS[0];
  const avgWei = BigInt(Math.round(profile.avgTxSize * 1e18));
  for (const unit of [...AI_CONFIG.ROUNDUP_UNITS].reverse()) {
    if (Number(unit) / Number(avgWei) <= 0.05) return unit;
  }
  return AI_CONFIG.ROUNDUP_UNITS[0];
}

function computeGoalUrgency(goal, profile) {
  const daysLeft   = (goal.targetDate - Date.now()) / 86_400_000;
  if (daysLeft <= 0) return "critical";
  const amountLeft = goal.targetAmount - goal.currentSaved;
  if (amountLeft <= 0) return "ahead";

  const requiredDaily       = amountLeft / daysLeft;
  const currentRateBps      = profile.currentSavingsRateBps || 500;
  const estimatedDailyMON   = profile.avgMonthlyIncome * currentRateBps / 10_000 / 30;
  if (estimatedDailyMON <= 0) return "critical";

  const paceRatio = estimatedDailyMON / requiredDaily;
  if (paceRatio >= 1.2) return "ahead";
  if (paceRatio >= 0.9) return "on_track";
  if (paceRatio >= 0.6) return "high";
  return "critical";
}

/**
 * Yield allocation percentages for StrategyRouter.
 * Returned as { stablePct, mediumPct, highPct } summing to 100.
 */
function computeYieldAllocation(profile) {
  switch (profile.riskProfile) {
    case "conservative": return { stablePct: 85, mediumPct: 12, highPct:  3 };
    case "moderate":     return { stablePct: 60, mediumPct: 30, highPct: 10 };
    case "aggressive":   return { stablePct: 35, mediumPct: 40, highPct: 25 };
    default:             return { stablePct: 80, mediumPct: 15, highPct:  5 };
  }
}

function shouldPauseSaving(profile, goal) {
  const floor = profile.avgMonthlySpend * AI_CONFIG.LIQUIDITY_FLOOR_RATIO;
  if (profile.currentBalance < floor * 0.5) return true;
  if (profile.liquidityRisk > 0.7) {
    const urgency = goal ? computeGoalUrgency(goal, profile) : null;
    if (!urgency || urgency === "ahead" || urgency === "on_track") return true;
  }
  return false;
}

// ─── 4. MAIN DECISION CYCLE ──────────────────────────────────

/**
 * Run a full AI decision cycle for one user.
 * Returns an AIDecision object — consumed by contracts.js.
 */
async function runAIDecisionCycle(userAddress, rpcUrl, goal = null, currentSavingsRateBps = 500) {
  console.log(`[AI] Running decision cycle for ${userAddress}`);

  const [txHistory, currentBalanceWei] = await Promise.all([
    fetchTransactionHistory(userAddress, rpcUrl),
    getBalance(userAddress, rpcUrl),
  ]);

  const profile = analyzeUserBehavior(txHistory, currentBalanceWei);
  profile.currentSavingsRateBps = currentSavingsRateBps;

  console.log(
    `[AI] Profile: risk=${profile.riskProfile}` +
    ` stability=${profile.incomeStability.toFixed(2)}` +
    ` liqRisk=${profile.liquidityRisk.toFixed(2)}` +
    ` balance=${profile.currentBalance.toFixed(4)} MON`
  );

  const pauseSaving    = shouldPauseSaving(profile, goal);
  const savingsRateBps = pauseSaving ? 0 : computeSavingsRate(profile, goal);
  const roundUpUnit    = computeRoundUpUnit(profile);
  const yieldAlloc     = computeYieldAllocation(profile);
  const goalUrgency    = goal ? computeGoalUrgency(goal, profile) : null;

  const decision = {
    userAddress,
    timestamp:    Date.now(),
    // → ExecutionMiddleware.setRule(ruleType, value, minBalance)
    ruleType:     RuleType.PERCENTAGE,
    savingsRateBps,
    roundUpUnit,
    pauseSaving,
    // → StrategyRouter allocation hints (off-chain advisory)
    yieldAllocation: yieldAlloc,
    // Diagnostics — logged / shown on dashboard, not sent on-chain
    diagnostics: {
      riskProfile:      profile.riskProfile,
      incomeStability:  profile.incomeStability,
      liquidityRisk:    profile.liquidityRisk,
      volatilityScore:  profile.volatilityScore,
      goalUrgency,
      currentBalance:   profile.currentBalance,
      avgMonthlySpend:  profile.avgMonthlySpend,
      avgMonthlyIncome: profile.avgMonthlyIncome,
      analyzedTxCount:  txHistory.length,
    },
  };

  console.log(
    `[AI] Decision: rate=${savingsRateBps}bps` +
    ` pause=${pauseSaving}` +
    ` yield=${JSON.stringify(yieldAlloc)}`
  );

  return decision;
}

// ─── 5. MATH UTILITIES ───────────────────────────────────────

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length);
}

// ─── EXPORTS ─────────────────────────────────────────────────
module.exports = {
  runAIDecisionCycle,
  analyzeUserBehavior,
  computeSavingsRate,
  computeRoundUpUnit,
  computeYieldAllocation,
  computeGoalUrgency,
  shouldPauseSaving,
  getBalance,
  AI_CONFIG,
  RuleType,
};
