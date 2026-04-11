# PayPilot Folder Structure

```txt
paypilot/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── db/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── ai/
│   │   │   ├── engine/
│   │   │   ├── health/
│   │   │   ├── payments/
│   │   │   └── rules/
│   │   ├── types/
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── drizzle.config.ts
├── contracts/
│   ├── contracts/
│   │   ├── AutoPayAgent.sol
│   │   └── MockUSDC.sol
│   ├── scripts/
│   │   ├── demo.ts
│   │   └── deploy.ts
│   ├── test/
│   │   └── AutoPayAgent.test.ts
│   ├── hardhat.config.ts
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   └── folder-structure.md
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── forms/
│   │   │   ├── rules/
│   │   │   └── wallet/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── shared/
│   ├── constants/
│   │   ├── network.ts
│   │   ├── statuses.ts
│   │   └── tokens.ts
│   ├── schemas/
│   │   ├── payment.schema.ts
│   │   └── rule.schema.ts
│   ├── types/
│   │   ├── api.ts
│   │   ├── payment.ts
│   │   └── rule.ts
│   ├── index.ts
│   ├── package.json
│   └── tsconfig.json
├── .env.example
├── .gitignore
├── package.json
└── README.md
```
