# Deploying to Render.com

This repository can be deployed to Render as a Web Service. Below are recommended settings and troubleshooting steps to avoid the common "Port scan timeout" / "open ports on localhost" errors.

## Recommended (production) — use the Express server

This repo contains a small production server: `server.cjs`. It's configured to bind to `0.0.0.0` and read the port from `process.env.PORT`, which is what Render expects.

Render settings (Web Service):

- Service Type: Web Service
- Environment: Node (choose latest LTS, e.g. 18 or 20)
- Build Command: npm run build
- Start Command: npm start
- Root Directory: repository root

Notes:
- `npm start` runs `node server.cjs` (see `package.json`). `server.cjs` serves the static `dist/` folder and listens on `process.env.PORT` and `0.0.0.0`.
- Render automatically sets the `PORT` environment variable — don't hardcode ports.

## Alternative (not recommended for production) — Vite preview

If you choose to run Vite's preview server instead of the Express server, make sure Vite binds to all interfaces and uses Render's PORT.

Render settings (Web Service):

- Build Command: npm run build
- Start Command: npm run preview

Important: `package.json` preview script must pass host and port. This repo's `package.json` already uses:

```
vite preview --host 0.0.0.0 --port $PORT
```

This ensures Render's port scanner sees an open port on `0.0.0.0`.

## Common issues & fixes

- Port scan timeout / no open ports detected on 0.0.0.0
  - Cause: the running process is only listening on `localhost` / `127.0.0.1` instead of `0.0.0.0`.
  - Fix: Use `server.cjs` (it already binds `0.0.0.0`) or ensure `vite preview` is started with `--host 0.0.0.0 --port $PORT`.

- "Detected open ports on localhost — did you mean to bind one of these to 0.0.0.0?"
  - This is Render's port scanner telling you the process is listening only on the loopback interface. Change the start command or server binding as above.

- `Error: Cannot find module 'express'` when starting server locally
  - Render runs `npm install` automatically during deploy. Locally, run:

```powershell
npm install
```

- TypeScript/`process` type errors in local development
  - These are developer-time diagnostics. If you want to silence `process` type errors, add `@types/node` to devDependencies:

```powershell
npm i -D @types/node
```

## Local quick test (PowerShell)

- Build and preview (simulate Render PORT):

```powershell
$env:PORT=3000; npm run build
$env:PORT=3000; npm run preview
```

- Build and run production server:

```powershell
npm install
$env:PORT=3001; npm run build
$env:PORT=3001; npm start
```

Visit the printed Local/Network address in your browser to confirm the server is reachable.

## Environment variables you might set on Render

- VITE_BASE_PATH — only if you host under a subpath (GitHub Pages, etc.)
- Any API keys or optional variables used by your app

## Summary

- Preferred: use `npm start` (runs `server.cjs`) — it binds to `0.0.0.0` and uses Render's `PORT`.
- If using Vite preview, ensure `--host 0.0.0.0 --port $PORT` is used in the preview start command.

If you'd like, I can also add a short Render-specific checklist into `README.md` or automate a `.render.yaml` manifest. Tell me which and I'll add it.
