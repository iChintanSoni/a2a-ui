---
name: run-app
description: Use when asked to run, start, or screenshot a2a-ui, to verify a change in the real app, or to bring up the bundled demo A2A agent. Covers the dashboard on :3000, the demo server on :3001, connecting them, and what to do when Ollama is not available.
---

# Running a2a-ui locally

Two processes, independently useful:

| Process           | Port   | Needed for                                |
| ----------------- | ------ | ----------------------------------------- |
| Next.js dashboard | `3000` | Anything UI                               |
| Demo A2A agent    | `3001` | Exercising a real conversation end to end |

The dashboard alone is enough for most UI work — it starts with no agent
connected and no environment variables.

## Dashboard

```bash
npm install     # first run only
npm run dev     # http://localhost:3000
```

`/` redirects to `/dashboard`. All state is browser-local (Redux + IndexedDB),
so **a "fresh" app means clearing IndexedDB for `localhost:3000`**, not
restarting the server. When a change depends on hydration or persistence, reload
the page rather than relying on hot reload — `app/StoreProvider.tsx` renders
nothing until IndexedDB resolves, and that path only runs on mount.

Run against the production build instead when the bug might be build-only:

```bash
npm run build && npm run start
```

## Demo agent

`server/` is a **separate npm package** with its own `node_modules` and its own
typecheck. It needs [Ollama](https://ollama.com) running locally.

```bash
cd server
npm install              # first run only
cp .env.example .env     # PORT=3001, OLLAMA_HOST, model names
npm run dev              # http://localhost:3001
```

Defaults in `server/.env.example`: `OLLAMA_HOST=http://localhost:11434`,
`OLLAMA_LLM_MODEL=qwen3.5:4b`. Pull the model first (`ollama pull qwen3.5:4b`)
or the first request fails. `TAVILY_API_KEY` is optional — search skills degrade
without it. **Never commit `server/.env`.**

`npm run dev` there uses `node --experimental-transform-types`, so it runs the
TypeScript sources directly; Node 20.9+ is required.

## Connecting them

In the dashboard: **Add Agent** → the URL field is hard-coded to default to
`http://localhost:3001` in `components/add-agent.tsx`, so just confirm. The agent
card is fetched immediately; a red status means the demo server is not up or
Ollama is not reachable.

(`NEXT_PUBLIC_DEMO_AGENT_URL` exists, but only the embed demo page reads it —
changing it does not move the Add Agent default.)

Cross-origin agents are routed through `app/api/proxy/route.ts` automatically —
that is expected in the network tab, not a bug.

## No Ollama?

Do not block on it. Options, in order of preference:

1. Work against the UI alone — most changes are visible without a live agent.
2. Point at any other A2A-compatible agent URL; nothing about the dashboard is
   demo-server-specific.
3. Use the QA harness (`/dashboard/qa`) or `npx a2a-ui qa-run` against a reachable
   agent to drive traffic without typing.

## Everything at once

```bash
docker compose up
```

Brings up both containers (`ui` on 3000, `demo-server` on 3001). Both `.env`
files must exist first — `docker-compose.yml` declares them as `env_file`, so a
missing one fails the run.

## The published CLI

```bash
npx a2a-ui --port 3100 --open
```

Boots the prebuilt standalone server from `bin/a2a-ui.mjs`. Use it to check what
users actually get; it is not a substitute for `npm run dev` while developing.

## E2E and screenshots

Playwright starts its own dev server (`webServer` in `playwright.config.ts`) and
reuses an existing one outside CI. Do not hand-start a server for it unless you
want it reused.

```bash
npm run test:e2e
PLAYWRIGHT_PORT=3100 npm run test:e2e   # when :3000 is busy
```
