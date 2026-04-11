// ============================================================
// AI ENGINE — Autonomous Financial Intelligence
// Observe behavior → compute decisions → output parameters
// for ExecutionMiddleware.sol (via AIOracle.sol)
// NEVER touches contracts directly.
// ============================================================
"use strict";

const RuleType = { ROUNDUP: 0, PERCENTAGE: 1, FIXED: 2 };

const AI_CONFIG = {
  ANALYSIS_WINDOW_DAYS:  30,
  LIQUIDITY_FLOOR_RATIO: 1.5,
  MIN_SAVINGS_BPS:        50,   // 0.5%
  MAX_SAVINGS_BPS:      2000,   // 20% — mirrors AIOracle.MAX_AI_SAVINGS_BPS
  ROUNDUP_UNITS:        [100n, 500n, 1000n, 5000n, 10000n],
  HIGH_VOLATILITY_CV:    0.6,
  LOW_VOLATILITY_CV:     0.2,
  HIGH_LIQUIDITY_RISK:   0.3,
  LOW_LIQUIDITY_RISK:    0.1,
};

// ─── 1. DATA INGESTION ────────────────────────────────────────────────────────

async function fetchTransactionHistory(userAddress, rpcUrl, windowDays = 30) {
  const latestBlock  = await getLatestBlock(rpcUrl);
  const blocksPerDay = 86400; // ~1s blocks on Monad
  const fromBlock    = Math.max(0, latestBlock - blocksPerDay * windowDays);

  // Use eth_getLogs to find ETH transfers involving this address.
  // For a production indexer (Goldsky/Ponder) replace this with a REST call.
  const [sentRes, recvRes] = await Promise.all([
    rpcCall(rpcUrl, "eth_getBlockByNumber", ["latest", false]),
    // Approximate: fetch recent blocks and filter — replace with indexer in prod
    fetchRecentTxsFromBlocks(userAddress, rpcUrl, fromBlock, latestBlock),
  ]);

  return recvRes;
}

async function fetchRecentTxsFromBlocks(userAddress, rpcUrl, fromBlock, toBlock) {
  // Lightweight approach: sample up to 200 recent blocks
  // In production replace with: indexer REST API or eth_getLogs on Transfer events
  const txs = [];
  const addr = userAddress.toLowerCase();
  const sampleSize = Math.min(200, toBlock - fromBlock);
  const step = Math.max(1, Math.floor((toBlock - fromBlock) / sampleSize));

  for (let b = toBlock; b > fromBlock && txs.length < 500; b -= step) {
    try {
      const block = await rpcCall(rpcUrl, "eth_getBlockByNumber", [
        "0x" + b.toString(16), true,
      ]);
      if (!block || !block.transactions) continue;
      for (const tx of block.transactions) {
        if (tx.from?.toLowerCase() === addr || tx.to?.toLowerCase() === addr) {
          txs.push({
            hash:       tx.hash,
            timestamp:  parseInt(block.timestamp, 16) * 1000,
            value:      BigInt(tx.value || "0x0"),
            from:       tx.from?.toLowerCase(),
            to:         tx.to?.toLowerCase(),
            isIncoming: tx.to?.toLowerCase() === addr,
          });
        }
      }
    } catch (_) { /* skip bad blocks */ }
  }
  return txs;
}

async function getLatestBlock(rpcUrl) {
  const res = await rpcCall(rpcUrl, "eth_blockNumber", []);
  return parseInt(res, 16);
}

async function getBalance(address, rpcUrl) {
  const res = await rpcCall(rpcUrl, "eth_getBalance", [address, "latest"]);
  return BigInt(res || "0x0");
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

// ─── 2. BEHAVIORAL ANALYSIS ───────────────────────────────────────────────────

function analyzeUserBehavior(txHistory, currentBalanceWei) {
  if (txHistory.length === 0) return defaultProfile(currentBalanceWei);

  const outgoing     = txHistory.filter(tx => !tx.isIncoming);
  const incoming     = txHistory.filter(tx => tx.isIncoming);
  const spendAmounts = outgoing.map(tx => Number(tx.value) / 1e18);
  const inAmounts    = incoming.map(tx => Number(tx.value) / 1e18);

  const avgSpend        = mean(spendAmounts);
  const cvSpend         = avgSpend > 0 ? stddev(spendAmounts) / avgSpend : 0;
  const avgIncome       = mean(inAmounts);
  const incomeStability = computeIncomeStability(incoming);
  const liquidityRisk   = estimateLiquidityRisk(txHistory, currentBalanceWei);
  const txFrequency     = outgoing.length / 30;

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
    gaps.push((sorted[i].timestamp - sorted[i - 1].timestamp) / 86400000);
  }
  const avgGap = mean(gaps);
  const cvGap  = avgGap > 0 ? stddev(gaps) / avgGap : 1;
  if (avgGap >= 25 && avgGap <= 32 && cvGap < 0.15) return 0.9;
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
    balance += tx.isIncoming ? -(Number(tx.value) / 1e18) : (Number(tx.value) / 1e18);
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

// ─── 3. DECISION ENGINE ───────────────────────────────────────────────────────

function computeSavingsRate(profile, goal) {
  const behaviorScore = profile.incomeStability * 0.6 + (1 - profile.liquidityRisk) * 0.4;
  let baseBps = Math.round(200 + behaviorScore * 1000); // 200–1200 bps

  let goalModifier = 1.0;
  if (goal) {
    const urgency = computeGoalUrgency(goal, profile);
    if      (urgency === "critical")  goalModifier = 1.6;
    else if (urgency === "high")      goalModifier = 1.3;
    else if (urgency === "ahead")     goalModifier = 0.7;
  }

  // Liquidity floor: throttle if balance < 1.5x monthly spend
  const floor = profile.avgMonthlySpend * AI_CONFIG.LIQUIDITY_FLOOR_RATIO;
  if (profile.currentBalance < floor) goalModifier *= 0.3;

  return Math.round(Math.min(
    AI_CONFIG.MAX_SAVINGS_BPS,
    Math.max(AI_CONFIG.MIN_SAVINGS_BPS, baseBps * goalModifier)
  ));
}

function computeRoundUpUnit(profile) {
  const avgWei = BigInt(Math.round(profile.avgTxSize * 1e18));
  if (avgWei === 0n) return AI_CONFIG.ROUNDUP_UNITS[0];
  for (const unit of AI_CONFIG.ROUNDUP_UNITS) {
    if (Number(unit) / Number(avgWei) <= 0.05) return unit;
  }
  return AI_CONFIG.ROUNDUP_UNITS[0];
}

function computeGoalUrgency(goal, profile) {
  const daysLeft   = (goal.targetDate - Date.now()) / 86400000;
  if (daysLeft <= 0) return "critical";
  const amountLeft = goal.targetAmount - goal.currentSaved;
  if (amountLeft <= 0) return "ahead";
  const requiredDaily  = amountLeft / daysLeft;
  const estimatedDaily = profile.avgMonthlyIncome
    * (profile.currentSavingsRateBps || 500) / 10000 / 30;
  if (estimatedDaily <= 0) return "critical";
  const ratio = estimatedDaily / requiredDaily;
  if (ratio >= 1.2) return "ahead";
  if (ratio >= 0.9) return "on_track";
  if (ratio >= 0.6) return "high";
  return "critical";
}

function computeYieldAllocation(profile) {
  switch (profile.riskProfile) {
    case "conservative": return { stablePct: 85, mediumPct: 12, highPct: 3 };
    case "moderate":     return { stablePct: 60, mediumPct: 30, highPct: 10 };
    case "aggressive":   return { stablePct: 35, mediumPct: 40, highPct: 25 };
    default:             return { stablePct: 80, mediumPct: 15, highPct: 5 };
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

// ─── 4. MAIN DECISION CYCLE ───────────────────────────────────────────────────

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
    ` liqRisk=${profile.liquidityRisk.toFixed(2)}`
  );

  const pauseSaving    = shouldPauseSaving(profile, goal);
  const savingsRateBps = pauseSaving ? 0 : computeSavingsRate(profile, goal);
  const roundUpUnit    = computeRoundUpUnit(profile);
  const yieldAlloc     = computeYieldAllocation(profile);
  const goalUrgency    = goal ? computeGoalUrgency(goal, profile) : null;

  const decision = {
    userAddress,
    timestamp:       Date.now(),
    ruleType:        RuleType.PERCENTAGE,
    savingsRateBps,
    roundUpUnit,
    pauseSaving,
    yieldAllocation: yieldAlloc,
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

// ─── 5. MATH UTILITIES ────────────────────────────────────────────────────────

function mean(arr) {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length);
}

// ─── 6. SELF-TEST (node ai/aiEngine.js) ──────────────────────────────────────

function runSelfTest() {
  console.log("[AI] Running self-test...");
  const fakeTxs = Array.from({ length: 20 }, (_, i) => ({
    hash: `0x${i}`, timestamp: Date.now() - i * 86400000,
    value: BigInt(Math.round((0.1 + Math.random() * 0.5) * 1e18)),
    from: "0xuser", to: "0xother", isIncoming: i % 5 === 0,
  }));
  const profile = analyzeUserBehavior(fakeTxs, BigInt(2e18));
  const rate    = computeSavingsRate(profile, null);
  console.log("[AI] Self-test profile:", profile.riskProfile, "rate:", rate, "bps");
  console.assert(rate >= 50 && rate <= 2000, "Rate out of bounds");
  console.log("[AI] Self-test passed.");
}

module.exports = {
  runAIDecisionCycle,
  analyzeUserBehavior,
  computeSavingsRate,
  computeRoundUpUnit,
  computeYieldAllocation,
  computeGoalUrgency,
  shouldPauseSaving,
  runSelfTest,
  AI_CONFIG,
  RuleType,
};
