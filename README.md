# PayPilot

PayPilot is a hackathon MVP for AI-assisted crypto payment automation on Monad testnet.

The user connects a wallet, writes a natural-language payment rule, previews the parsed JSON, saves the rule, and then simulates or manually executes it. The backend keeps the rule logic and condition checks off-chain for speed, while the frontend wallet signs the final transaction for semi-automatic safety.

## Stack

- Frontend: React, Vite, TypeScript, wagmi, viem
- Backend: Node.js, TypeScript, Hono, Zod, PostgreSQL, Drizzle
- Contracts: Solidity, Hardhat
- Shared: reusable types, Zod schemas, constants

## Monad defaults

- Network: Monad Testnet
- RPC URL: `https://testnet-rpc.monad.xyz`
- Chain ID: `10143`

## Repository layout

```txt
paypilot/
├── frontend/
├── backend/
├── contracts/
├── shared/
├── docs/
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

The full scaffold tree is documented in [docs/folder-structure.md](/Users/mac/Desktop/hackathons/monad_blitz/pay-pilot/docs/folder-structure.md).

## Quick start

1. Copy the env template.

```bash
cp .env.example .env
```

2. Install dependencies for every project.

```bash
npm run install:all
```

3. Start the local Postgres database.

```bash
npm run db:up
```

4. Start the backend.

```bash
npm run dev:backend
```

5. In another terminal, start the frontend.

```bash
npm run dev:frontend
```

6. Run the contract tests when you want to validate the on-chain demo layer.

```bash
npm run test:contracts
```

## Root helper scripts

- `npm run install:shared`
- `npm run install:backend`
- `npm run install:frontend`
- `npm run install:contracts`
- `npm run install:all`
- `npm run db:up`
- `npm run db:down`
- `npm run db:logs`
- `npm run db:push`
- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run build`
- `npm run test:contracts`

## Backend API

- `GET /health`
- `POST /ai/parse-rule`
- `POST /rules`
- `GET /rules`
- `GET /rules/:id`
- `POST /rules/:id/activate`
- `POST /rules/:id/run`

### Parse flow

- If `OPENAI_API_KEY` is available, the backend asks OpenAI for strict JSON output.
- If no key is configured or the AI request fails, the parser falls back to a deterministic heuristic parser so the demo still works.

### Run flow

- `simulate`: checks conditions and returns a prepared transaction summary without sending anything
- `prepare`: checks conditions and returns the exact transaction payload the frontend wallet should sign
- `execute`: optionally broadcasts from the backend only when `DEMO_EXECUTOR_PRIVATE_KEY` is set

## Frontend flow

- Connect wallet
- Enter a natural-language rule
- Parse it through the backend
- Review the preview card
- Save the rule
- Activate it
- Simulate or run it from the browser wallet

## Contracts

The contract layer is intentionally minimal:

- `AutoPayAgent.sol` handles native and ERC-20 payment execution for demo use
- `MockUSDC.sol` provides a mintable 6-decimal token for testing

Useful commands:

```bash
cd contracts
npm run build
npm run test
npm run deploy
npm run demo
```

## Notes

- This MVP skips authentication to reduce setup time.
- The local Postgres database runs through Docker Compose on `localhost:5432`.
- The backend creates its tables automatically on startup and can also be synced with `npm run db:push`.
- Rules are stored off-chain and only transaction execution touches the chain.
- For USDC rules, set `MONAD_USDC_TOKEN_ADDRESS` once you know the Monad testnet token address you want to demo with.
