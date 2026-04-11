# Frontend Deployment

## Requirements

- Node.js 20 or newer
- A reachable deployed backend URL

## Environment

Use [`.env.example`](./.env.example) as the template.

Required for production builds:

- `VITE_API_URL`

Optional:

- `VITE_MONAD_RPC_URL`

## Static Build

```bash
npm ci
npm run build
```

Deploy the contents of `dist/` to your static host.

Because this is a client-routed React app, your host must rewrite unknown routes to `index.html`.

Examples:

- Render static site: add a rewrite from `/*` to `/index.html`
- Netlify: `_redirects` already included in `public/`

## Docker Deployment

```bash
docker build -t paypilot-frontend .
docker run -p 8080:8080 paypilot-frontend
```
