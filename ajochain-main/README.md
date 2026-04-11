# AjoChain

> Autonomous rotating savings on Monad — AI matches strangers, enforces rules, and earns yield on idle funds. No admin. No WhatsApp. No trust required.

---

## The Problem

Rotating savings — called **ajo** in Nigeria, **esusu** in Yoruba, **susu** in Ghana — is one of the most practiced financial systems in Africa. A group of people contribute a fixed amount every round, and each round one member takes the full pot. Simple. Effective. Decades old.

But it has three problems that have never been solved:

**Trust.** You can only do ajo with people you personally know. The moment a stranger is involved, the risk is too high. This limits group sizes and excludes people without existing social networks.

**Default risk.** When someone doesn't pay, the round winner suffers. There's no enforcement mechanism beyond social pressure. The group admin chases people on WhatsApp, mediates disputes, and sometimes covers shortfalls personally.

**Idle money.** Between when the group pays in and when the winner collects, the pooled funds sit doing nothing. Dead money. Nobody benefits from it.

---

## The Solution

AjoChain replaces the human trust layer with an AI agent that acts as the group's autonomous treasurer.

- **No trust needed** — the AI matches strangers into groups based on on-chain financial behavior, not personal relationships
- **No default risk** — every member locks collateral upfront; if someone defaults the AI handles it automatically and the winner still gets paid
- **No idle money** — between rounds the AI deploys pooled funds into aPriori (liquid staking on Monad) to earn yield automatically

The group runs itself.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                  │
│   Register Intent → Dashboard → Profile → Agent Log      │
└───────────────────────┬─────────────────────────────────┘
                        │ wagmi / viem
                        ▼
┌─────────────────────────────────────────────────────────┐
│               AjoChain Smart Contract (Monad)            │
│  Groups · Collateral · Rounds · Payouts · Credit Scores  │
└──────────────┬──────────────────────────┬───────────────┘
               │ reads state              │ executes decisions
               │                          │
               ▼                          ▼
┌─────────────────────────┐   ┌──────────────────────────┐
│      AI Agent (Node)    │   │   aPriori Liquid Staking  │
│  GPT-4o · ethers.js     │   │   MON → stMON → MON+yield │
│  polls every 15 seconds │   │   ~5-6% APY on Monad      │
└─────────────────────────┘   └──────────────────────────┘
```

### Three Components

**Smart Contract** — the protocol layer. Handles everything on-chain: group creation, collateral locking, contribution tracking, round advancement, payout distribution, default execution, and credit score updates. Deployed on Monad testnet.

**AI Agent** — the treasurer. A Node.js backend service that reads contract state every 15 seconds, calls GPT-4o with context about each group's current situation, receives a reasoned decision, and executes it by signing and broadcasting transactions on Monad. It never holds funds — it instructs the contract, which holds and moves everything.

**Frontend** — four screens. Register intent, group dashboard with live round status and yield, credit profile, and the agent's full reasoning log so anyone can see every decision the treasurer made and why.

---

## aPriori Integration

### What aPriori Is

[aPriori](https://apriori.finance) is a liquid staking protocol native to Monad. When you deposit MON into aPriori, it stakes that MON on the network on your behalf (helping validate transactions and earning staking rewards). In return it gives you **stMON** — a liquid token that represents your deposited MON plus the yield it's accumulating over time.

When you want your MON back, you hand back stMON and aPriori returns your original MON plus all rewards earned during that period. Currently around **5-6% APY**.

The critical property that makes this work for AjoChain: **withdrawal on Monad is near-instant** thanks to 0.4 second block times. On Ethereum, liquid staking withdrawals take hours or days — too slow and risky for a savings group with fixed payout deadlines. Monad's speed is what makes the yield piece viable.

### How the Yield Flow Works

```
Members pay 0.05 MON each
         ↓
AjoChain contract holds 0.25 MON (idle)
         ↓
Agent checks: 18 hours until payout, safe to deploy
Agent calls deployToYield() on contract
         ↓
Contract sends 0.25 MON → aPriori
Contract receives stMON back
         ↓
         (yield accrues in background)
         ↓
Agent checks: 45 minutes until payout, time to withdraw
Agent calls withdrawFromYield() on contract
         ↓
Contract sends stMON → aPriori
Contract receives 0.2503 MON back (original + yield)
         ↓
Round winner claims 0.2503 MON instead of 0.25 MON
```

Members never interact with aPriori directly. From their perspective they just paid into the group and the winner received slightly more than the sum of contributions. The yield is automatic and invisible.

### What the AI Actually Decides

The agent does not pick stocks or trade. It makes one judgment call: **is it safe to deploy funds right now, or should we hold?**

The reasoning behind that call:

- How long until the next payout? If 18 hours away, deploying makes sense. If 20 minutes away, deploying is risky.
- Has everyone paid or is someone at risk of defaulting? If a member looks like they might default, keep funds liquid — you may need them quickly to handle collateral slashing.
- Are all contributions in? No point deploying half a pot.

This is treasury management — the same logic a CFO applies when deciding whether to put company cash in short-term instruments or keep it liquid. The AI does it autonomously for each group every 15 seconds.

### aPriori Contract (Monad Testnet)

```
0xb2f82D0f38dc453D596Ad40A37799446Cc89274A
```

Verify this address at [apriori.finance](https://apriori.finance) before deploying. It is set in `contracts/script/Deploy.s.sol`.

---

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Blockchain | Monad Testnet (EVM-compatible, 0.4s blocks) |
| Smart Contracts | Solidity 0.8.24, Foundry |
| Yield Protocol | aPriori liquid staking (stMON) |
| AI Agent | Node.js, GPT-4o (OpenAI), ethers.js v6 |
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Wallet | wagmi v2, RainbowKit, viem |

---

## Repository Structure

```
ajochain/
├── contracts/
│   ├── src/
│   │   ├── AjoChain.sol          # Core protocol contract
│   │   └── interfaces/
│   │       └── IApriori.sol      # aPriori interface
│   ├── test/
│   │   └── AjoChain.t.sol        # 8 tests, all passing
│   └── script/
│       └── Deploy.s.sol          # Deployment script
│
├── agent/
│   ├── src/
│   │   ├── treasurer.js          # Main autonomous loop
│   │   ├── llm.js                # GPT-4o integration
│   │   ├── prompts.js            # 4 prompt builders
│   │   ├── logger.js             # Decision logging
│   │   └── abi.js                # Contract ABI
│   ├── index.js                  # Entry point
│   ├── .env.example              # Environment template
│   └── reasoning.log.json        # Generated at runtime
│
└── frontend/
    ├── app/
    │   ├── page.tsx              # Register intent
    │   ├── dashboard/[groupId]/  # Group dashboard
    │   ├── profile/              # Credit profile
    │   ├── log/                  # Agent reasoning log
    │   └── api/log/              # API route serving log file
    ├── lib/
    │   ├── wagmi.ts              # Monad chain config
    │   └── contract.ts           # ABI + address
    └── components/
        └── Providers.tsx         # wagmi + RainbowKit wrapper
```

---

## Setup

### Prerequisites

- [Foundry](https://getfoundry.sh) installed
- Node.js 18+
- MetaMask or any EVM wallet
- MON on Monad testnet (faucet: [faucet.monad.xyz](https://faucet.monad.xyz))
- OpenAI API key (GPT-4o access)

---

### 1. Smart Contract

```bash
cd contracts

# Install dependencies
forge install

# Run tests
forge test -v

# Deploy to Monad testnet
# First create a .env file:
# PRIVATE_KEY=0x...         (deployer private key)
# AGENT_WALLET=0x...        (agent wallet address — separate from deployer)

forge script script/Deploy.s.sol \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast \
  --verify
```

Note the deployed contract address — you'll need it for the agent and frontend.

---

### 2. AI Agent

```bash
cd agent

# Install dependencies
npm install

# Create .env from template
cp .env.example .env
```

Fill in `agent/.env`:

```env
OPENAI_API_KEY=sk-...
AGENT_PRIVATE_KEY=0x...          # Agent wallet private key (separate from deployer)
RPC_URL=https://testnet-rpc.monad.xyz
AJOCHAIN_ADDRESS=0x...           # Deployed contract address
POLL_INTERVAL_MS=15000           # How often treasurer checks (15s recommended)
```

```bash
# Start the treasurer
npm start

# Or with auto-restart on file changes (development)
npm run dev
```

The agent will immediately begin polling. You'll see logs like:

```
AjoChain Treasurer starting...
Contract: 0x...
Agent wallet: 0x...
Poll interval: 15000ms

[2026-04-11T09:00:00Z] Treasurer tick
[Loop] Active groups: 0
[Matchmaking] 2 unmatched intents found
[2026-04-11T09:00:01Z] 🤝 MATCHMAKING | Group - | CREATE_GROUP
  Reasoning: Alice and Bob share the same contribution amount...
  TX: 0xabc...
```

Every decision is written to `agent/reasoning.log.json` and served to the frontend via `/api/log`.

---

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local from template
cp .env.local.example .env.local
```

Fill in `frontend/.env.local`:

```env
NEXT_PUBLIC_AJOCHAIN_ADDRESS=0x...   # Deployed contract address
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=ajochain-dev
```

```bash
npm run dev
# → http://localhost:3000
```

**Add Monad Testnet to MetaMask:**

| Field | Value |
|-------|-------|
| Network Name | Monad Testnet |
| RPC URL | https://testnet-rpc.monad.xyz |
| Chain ID | 10143 |
| Currency Symbol | MON |
| Block Explorer | https://testnet.monadexplorer.com |

---

## How a Group Works End-to-End

1. **Register** — user visits the app, connects wallet, sets contribution amount, group size, and round frequency. Registers intent on-chain.

2. **Matchmaking** — the AI agent scans all unmatched intents, finds compatible people (same contribution, same group size, same frequency), and calls `createGroup()` on the contract with its reasoning logged publicly.

3. **Lock Collateral** — matched members see the group dashboard, read the agent's matchmaking reasoning, and lock collateral (2x contribution amount). Once all members lock, the group goes live automatically.

4. **Pay Each Round** — each round members call `payContribution()`. The agent watches. If all members pay early, the agent advances the round immediately rather than waiting for the deadline — faster payouts, more time for yield.

5. **Yield** — once contributions are in, the agent decides whether to deploy to aPriori based on time until payout and group risk profile. Funds earn staking yield. The agent withdraws before payout time.

6. **Payout** — agent selects the round winner (rotates through members, ordered by credit score) and calls `advanceRound()`. Winner receives all contributions plus any yield earned.

7. **Defaults** — if the deadline passes and a member hasn't paid, the agent assesses the situation: first offense or repeat? How long past deadline? It decides to wait or slash. If it slashes, the defaulter's collateral covers the winner's payout. Credit score drops. All reasoning is logged publicly.

8. **Complete** — after all members have received one payout, the group closes. Credit scores are updated. Clean members build trust scores that improve their matchmaking priority in future groups.

---

## Contract Interface (Key Functions)

### User-Callable

```solidity
// Register intent for matchmaking
function registerIntent(uint256 contributionAmount, uint8 desiredGroupSize, uint256 roundDuration) external

// Lock collateral to join a matched group (payable — send collateral amount)
function lockCollateral(uint256 groupId) external payable

// Pay your contribution for the current round (payable — send contribution amount)
function payContribution(uint256 groupId) external payable
```

### Agent-Only

```solidity
// Create a group from matched intents
function createGroup(address[] calldata memberWallets, uint256 contributionAmount, uint256 roundDuration) external returns (uint256 groupId)

// Deploy idle group funds to aPriori for yield
function deployToYield(uint256 groupId) external

// Withdraw group funds from aPriori before payout
function withdrawFromYield(uint256 groupId) external

// Advance round and pay winner
function advanceRound(uint256 groupId, address winner) external

// Slash defaulter's collateral and pay winner
function handleDefault(uint256 groupId, address defaulter, address winner, string calldata reason) external
```

### View Functions

```solidity
function getGroup(uint256 groupId) external view returns (GroupView memory)
function getGroupMembers(uint256 groupId) external view returns (MemberView[] memory)
function getMember(uint256 groupId, address wallet) external view returns (MemberView memory)
function getAllActiveGroups() external view returns (uint256[] memory)
function getAllIntents() external view returns (Intent[] memory)
function getIdleFunds(uint256 groupId) external view returns (uint256)
function getMemberGroups(address wallet) external view returns (uint256[] memory)
```

---

## Demo Script (3 Minutes)

**Setup:** 3 wallets (Alice, Bob, Charlie) each funded with MON on Monad testnet. Agent running.

1. Alice and Bob register intent — same contribution (0.05 MON), group size 3, daily rounds
2. Charlie registers same intent
3. Agent detects 3 matching intents — show matchmaking reasoning on screen
4. All 3 accept, lock collateral — group goes live
5. All 3 pay Round 1 — agent detects full payment, advances early, deploys to aPriori
6. Show yield accumulating in real time on the dashboard
7. Round 2 — Bob doesn't pay immediately. Agent identifies late-payer pattern, waits. Bob eventually pays. Round advances normally.
8. Round 3 — drain Charlie's wallet. Agent detects real default, reasons through it (first offense, wallet emptied), slashes collateral, Charlie's collateral covers the winner's payout. Charlie's credit score drops to 80 with public explanation.
9. Show agent reasoning log — every decision visible, full text, transaction hashes
10. Final point: the group ran itself. No admin. No WhatsApp. No trust needed.

---

## Why Monad

**Speed.** 0.4 second block times means round advancement, yield deployment, and default handling feel instant. On Ethereum this would take minutes and cost too much for small contributions.

**Cost.** Micro-contributions — the kind everyday ajo members make — are only economically viable with low gas fees. Monad makes small group savings practical at scale.

**Parallelism.** The AI treasurer monitors multiple groups simultaneously and executes multiple transactions. Monad's parallel execution handles this without congestion.

aPriori withdrawal being near-instant is a direct consequence of Monad's speed. That's what makes the yield piece possible — on any other chain the withdrawal latency would make it too risky to deploy group funds.

---

## One Line Pitch

> AjoChain brings Africa's most trusted savings tradition on-chain — removing the human bottleneck and replacing it with an AI that never sleeps, never plays favourites, and always pays.
