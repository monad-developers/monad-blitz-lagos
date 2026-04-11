import { ethers } from "ethers";
import { AJOCHAIN_ABI } from "./abi.js";
import { askTreasurer } from "./llm.js";
import { logDecision } from "./logger.js";
import {
  buildMatchmakingPrompt,
  buildYieldDecisionPrompt,
  buildDefaultDecisionPrompt,
  buildRoundAdvancementPrompt,
} from "./prompts.js";

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet   = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.AJOCHAIN_ADDRESS, AJOCHAIN_ABI, wallet);

const POLL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? "15000");

// ─────────────────────────────────────────────────────────────────────────────
// Matchmaking
// ─────────────────────────────────────────────────────────────────────────────

async function runMatchmaking() {
  const allIntents = await contract.getAllIntents();

  const unmatched = allIntents
    .filter((i) => !i.matched && i.wallet !== ethers.ZeroAddress)
    .map((i) => ({
      wallet:             i.wallet,
      contributionAmount: i.contributionAmount.toString(),
      desiredGroupSize:   Number(i.desiredGroupSize),
      roundDuration:      Number(i.roundDuration),
    }));

  if (unmatched.length < 2) return;

  console.log(`[Matchmaking] ${unmatched.length} unmatched intents found`);

  const result = await askTreasurer(buildMatchmakingPrompt(unmatched));
  const groups  = Array.isArray(result.groups) ? result.groups : [];

  for (const g of groups) {
    try {
      const tx = await contract.createGroup(
        g.memberWallets,
        g.contributionAmount,
        g.roundDuration
      );
      const receipt = await tx.wait();

      logDecision({
        type:      "MATCHMAKING",
        groupId:   null,
        action:    "CREATE_GROUP",
        reasoning: g.reasoning,
        txHash:    receipt.hash,
      });

      console.log(`[Matchmaking] Group created — TX: ${receipt.hash}`);
    } catch (err) {
      console.error("[Matchmaking] Failed to create group:", err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Yield Management
// ─────────────────────────────────────────────────────────────────────────────

async function handleYield(group, members) {
  const nowTs = Math.floor(Date.now() / 1000);

  const result = await askTreasurer(
    buildYieldDecisionPrompt(
      {
        id:                 group.id.toString(),
        currentRound:       Number(group.currentRound),
        totalMembers:       Number(group.totalMembers),
        paidCount:          Number(group.paidCount),
        contributionAmount: group.contributionAmount.toString(),
        roundDeadline:      group.roundDeadline.toString(),
        fundStatus:         Number(group.fundStatus),
        yieldEarned:        group.yieldEarned.toString(),
      },
      members,
      nowTs
    )
  );

  const { action, reasoning } = result;

  if (action === "HOLD") {
    logDecision({ type: "YIELD", groupId: group.id, action: "HOLD", reasoning });
    return;
  }

  try {
    let tx;
    if (action === "DEPLOY") {
      tx = await contract.deployToYield(group.id);
    } else if (action === "WITHDRAW") {
      tx = await contract.withdrawFromYield(group.id);
    }

    const receipt = await tx.wait();
    logDecision({ type: "YIELD", groupId: group.id, action, reasoning, txHash: receipt.hash });
  } catch (err) {
    console.error(`[Yield] Error on group ${group.id}:`, err.message);
    logDecision({ type: "YIELD", groupId: group.id, action: `${action}_FAILED`, reasoning: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Round Advancement
// ─────────────────────────────────────────────────────────────────────────────

async function handleRoundAdvancement(group, members) {
  const allPaid = Number(group.paidCount) === Number(group.totalMembers);
  if (!allPaid) return;

  // Withdraw yield first if deployed
  if (Number(group.fundStatus) === 1) {
    try {
      const tx = await contract.withdrawFromYield(group.id);
      await tx.wait();
      logDecision({
        type:      "YIELD",
        groupId:   group.id,
        action:    "WITHDRAW",
        reasoning: "All members paid. Withdrawing from aPriori before advancing round.",
      });
    } catch (err) {
      console.error(`[Round] Withdraw failed for group ${group.id}:`, err.message);
      return; // don't advance if withdraw failed
    }
  }

  const result = await askTreasurer(
    buildRoundAdvancementPrompt(
      {
        id:                 group.id.toString(),
        currentRound:       Number(group.currentRound),
        totalMembers:       Number(group.totalMembers),
        paidCount:          Number(group.paidCount),
        contributionAmount: group.contributionAmount.toString(),
        yieldEarned:        group.yieldEarned.toString(),
      },
      members
    )
  );

  const { winner, reasoning } = result;

  try {
    const tx      = await contract.advanceRound(group.id, winner);
    const receipt = await tx.wait();
    logDecision({
      type:      "ROUND_ADVANCE",
      groupId:   group.id,
      action:    "ADVANCE",
      reasoning,
      txHash:    receipt.hash,
    });
    console.log(`[Round] Group ${group.id} round advanced. Winner: ${winner}`);
  } catch (err) {
    console.error(`[Round] Advance failed for group ${group.id}:`, err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Handling
// ─────────────────────────────────────────────────────────────────────────────

async function handleDefaults(group, members) {
  const nowTs = Math.floor(Date.now() / 1000);
  const pastDeadline = nowTs > Number(group.roundDeadline);
  if (!pastDeadline) return;

  const defaulters = members.filter((m) => !m.hasPaid && m.hasCollateral);
  if (defaulters.length === 0) return;

  for (const defaulter of defaulters) {
    const result = await askTreasurer(
      buildDefaultDecisionPrompt(
        {
          id:            group.id.toString(),
          currentRound:  Number(group.currentRound),
          totalMembers:  Number(group.totalMembers),
          roundDeadline: group.roundDeadline.toString(),
        },
        defaulter,
        members,
        nowTs
      )
    );

    const { action, reasoning } = result;

    logDecision({ type: "DEFAULT", groupId: group.id, action, reasoning });

    if (action !== "SLASH") continue;

    // Pick winner from members who did pay
    const payers = members.filter((m) => m.hasPaid);
    if (payers.length === 0) continue;

    // Use highest credit score among payers as winner
    const winner = payers.sort((a, b) => Number(b.creditScore) - Number(a.creditScore))[0].wallet;

    try {
      const tx      = await contract.handleDefault(group.id, defaulter.wallet, winner, reasoning);
      const receipt = await tx.wait();
      logDecision({
        type:      "DEFAULT",
        groupId:   group.id,
        action:    "SLASHED",
        reasoning,
        txHash:    receipt.hash,
      });
      console.log(`[Default] Slashed ${defaulter.wallet} in group ${group.id}. Winner: ${winner}`);
    } catch (err) {
      console.error(`[Default] Slash failed for group ${group.id}:`, err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Loop
// ─────────────────────────────────────────────────────────────────────────────

async function tick() {
  console.log(`\n[${new Date().toISOString()}] Treasurer tick`);

  try {
    // 1. Matchmaking
    await runMatchmaking();

    // 2. Process each active group
    const activeGroupIds = await contract.getAllActiveGroups();
    console.log(`[Loop] Active groups: ${activeGroupIds.length}`);

    for (const groupId of activeGroupIds) {
      const group   = await contract.getGroup(groupId);
      const members = await contract.getGroupMembers(groupId);

      const memberViews = members.map((m) => ({
        wallet:            m.wallet,
        hasPaid:           m.hasPaid,
        hasCollateral:     m.hasCollateral,
        hasReceivedPayout: m.hasReceivedPayout,
        creditScore:       Number(m.creditScore),
        defaultCount:      Number(m.defaultCount),
      }));

      // Check defaults first (past deadline)
      await handleDefaults(group, memberViews);

      // Then round advancement (all paid)
      await handleRoundAdvancement(group, memberViews);

      // Then yield decisions
      await handleYield(group, memberViews);
    }
  } catch (err) {
    console.error("[Loop] Unhandled error in tick:", err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry
// ─────────────────────────────────────────────────────────────────────────────

export async function startTreasurer() {
  console.log("AjoChain Treasurer starting...");
  console.log(`Contract: ${process.env.AJOCHAIN_ADDRESS}`);
  console.log(`Agent wallet: ${wallet.address}`);
  console.log(`Poll interval: ${POLL_MS}ms`);

  await tick(); // immediate first run

  setInterval(async () => {
    await tick();
  }, POLL_MS);
}
