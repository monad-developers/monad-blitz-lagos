# Backend Deployment

## Requirements

- Node.js 20 or newer
- A PostgreSQL database reachable from the backend

## Environment

Use [`.env.example`](./.env.example) as the template for production variables.

Required in production:

- `DATABASE_URL`
- `FRONTEND_ORIGIN`
- `MONAD_RPC_URL`

Optional:

- `OPENAI_API_KEY`
- `MONAD_USDC_TOKEN_ADDRESS`
- `AUTO_PAY_AGENT_ADDRESS`
- `DEMO_EXECUTOR_PRIVATE_KEY`

## Node Deployment

```bash
npm ci
npm run build
npm run start
```

## Docker Deployment

```bash
docker build -t paypilot-backend .
docker run --env-file .env -p 8787:8787 paypilot-backend
```

## API Docs

- Swagger UI: `/docs`
- Raw OpenAPI spec: `/docs/openapi.json`
- Generated file in repo/image: `backend/openapi.json`
