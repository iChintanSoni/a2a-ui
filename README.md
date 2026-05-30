# A2A UI

A2A UI is a local-first developer workbench for building, testing, and debugging
Agent2Agent (A2A) protocol servers.

It gives you a browser UI for connecting to agents, inspecting agent cards,
chatting through the A2A transport, reviewing structured execution events,
iterating on task outputs, and running repeatable QA checks. Built with Vite,
React, and Redux Toolkit; agent credentials and workspace data are stored locally
in the browser via IndexedDB.

## What You Can Do

- Connect to A2A agents over HTTP or HTTPS.
- Configure per-agent auth, custom headers, display names, tags, and favorites.
- Inspect agent cards, declared capabilities, skills, modalities, and protocol
  compliance results.
- Chat with agents using persistent sessions, file attachments, custom metadata,
  streaming task updates, artifacts, tool calls, and raw JSON inspection.
- Explore normalized execution events across requests, responses, tasks,
  artifacts, tool calls, validation warnings, and transport timing.
- Browse task history with correlated artifacts and warnings.
- Clone sessions, rerun prompts, edit text or markdown artifacts, and compare
  saved runs by prompt, output, artifact content, and timing.
- Save and run QA suites with expected task states, output modes, regex
  assertions, JSON-path assertions, run history, and exportable reports.
- Render supported A2UI structured surfaces and richer A2A message parts.
- Import and export workspaces for local backup or sharing.
- Try the included Ollama-powered demo A2A server.

## Dashboard Areas

- `Workbench` shows workspace metrics and entry points.
- `Agent Library` manages connected agents, status, tags, favorites, settings,
  cards, auth, headers, and compliance checks.
- `Conversations` manages saved chats, pinned runs, archived chats, exports,
  clones, and reruns.
- `Tasks` provides a task-oriented view of A2A runs, states, artifacts, and
  warnings.
- `Compare Runs` compares two saved conversations.
- `QA Harness` builds and executes repeatable agent test suites.
- `Embed Demo` demonstrates the headless hooks and embeddable chat components.

## Getting Started

### Prerequisites

- Node.js 20.9 or newer
- npm
- An A2A-compatible agent server, or the bundled demo server

### Run With npx

```bash
npx a2a-ui
npx a2a-ui --port 3100 --open
npx a2a-ui --dev
```

The `npx` command starts the UI only. The Ollama-powered demo A2A server is
available as a separate optional setup.

### Run The UI From Source

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Run The Demo Server

The repo includes a sample A2A server in `server/` backed by Ollama.

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

The demo server listens on [http://localhost:3001](http://localhost:3001) by
default. Configure `OLLAMA_HOST`, `OLLAMA_LLM_MODEL`, and `OLLAMA_IMAGE_MODEL` in
`server/.env` as needed.

### Run With Docker Compose

```bash
cp .env.example .env
cp server/.env.example server/.env
docker compose up --build
```

- UI: [http://localhost:3000](http://localhost:3000)
- Demo server: [http://localhost:3001](http://localhost:3001)

## Configuration Notes

- Agent credentials and workspace data are stored locally in the browser.
- Workspace import and export are JSON-based.
- Debug exports mask sensitive headers where possible.
- File attachment options are filtered against an agent's declared input modes.
- The same-origin `/api/proxy` route helps browser clients reach agents that
  would otherwise fail cross-origin requests. It runs inside the Vite dev server
  and inside the production host server (`host/serve.mjs`).
- Public env vars are prefixed with `VITE_` (e.g. `VITE_DEMO_AGENT_URL`).

## Development

### Scripts

- `npm run dev` starts the Vite development server (with the proxy middleware).
- `npm run build` type-checks and builds the production bundle to `dist/`.
- `npm run preview` serves the production build locally.
- `npm run start` runs the production host server (`host/serve.mjs`).
- `npm run lint` runs ESLint.
- `npm run typecheck` runs TypeScript without emitting files.
- `npm run format` formats the repo with Prettier.
- `npm run test` runs the Vitest suite.
- `npm run test:watch` runs Vitest in watch mode.
- `npm run test:coverage` runs tests with coverage.
- `npm run test:e2e` runs Playwright smoke tests.

### Project Structure

```text
a2a-ui/
├── index.html              # Vite entry HTML
├── src/
│   ├── main.tsx            # App bootstrap + providers + RouterProvider
│   ├── router.tsx          # React Router route tree
│   ├── routes/             # Pages (home, dashboard/*) and error boundary
│   ├── components/         # Dashboard, chat, and shared UI components
│   ├── hooks/              # Headless A2A connection, session, message, debug hooks
│   ├── providers/          # StoreProvider (Redux + IndexedDB hydration/persistence)
│   ├── lib/a2a/            # A2A message parts, modalities, A2UI, event helpers
│   ├── lib/features/       # Redux slices for agents, chats, QA, and workbench state
│   └── lib/utils/          # Auth, compliance, protocol reports, proxy, workspace helpers
├── host/                   # Production host server + shared /api/proxy logic
├── bin/                    # npx CLI entry point
├── server/                 # Bundled demo A2A server
└── src/tests/              # Vitest unit and integration tests
```

### Tech Stack

- Vite + React 19
- TypeScript
- React Router v7
- Tailwind CSS v4
- shadcn/ui and Radix UI
- Redux Toolkit and React Redux
- IndexedDB via `idb`
- `@a2a-js/sdk`
- Hono (production host server)
- Vitest, Testing Library, and Playwright

## Useful References

- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [Vite Documentation](https://vite.dev)
