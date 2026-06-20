# Getting Started

## Prerequisites

- **Node.js 20.9 or newer** — `node --version` to check
- **npm** — bundled with Node
- An A2A-compatible agent server, or the bundled demo server (see below)

---

## Run With npx (recommended)

The fastest way to start the dashboard. No clone required.

```bash
npx a2a-ui
```

Common options:

```bash
npx a2a-ui --port 3100          # listen on a different port
npx a2a-ui --open               # open the browser automatically
npx a2a-ui --port 3100 --open   # combine both
npx a2a-ui --hostname 0.0.0.0   # bind to all interfaces
```

The dashboard opens at `http://localhost:3000` (or the port you chose).

### All CLI flags

| Flag | Default | Description |
|------|---------|-------------|
| `-p`, `--port <port>` | `3000` | Port to listen on |
| `--hostname <host>` / `--host <host>` | `localhost` | Hostname to bind |
| `--open` | — | Open the browser after start |
| `--dev` | — | Run Next.js dev server (source mode) |
| `-v`, `--version` | — | Print the installed version |
| `-h`, `--help` | — | Show help |

---

## Run From Source

For contributors or when you want to modify the UI itself:

```bash
git clone https://github.com/iChintanSoni/a2a-ui.git
cd a2a-ui
npm install
npm run dev       # Next.js dev server with hot reload
```

Open `http://localhost:3000`.

---

## Run the Demo Server

The repo includes a sample A2A server in `server/` powered by [Ollama](https://ollama.com).
It demonstrates tool calls, artifact streaming, and A2UI structured surfaces.

```bash
cd server
cp .env.example .env   # edit OLLAMA_HOST / OLLAMA_LLM_MODEL if needed
npm install
npm run dev
```

The demo server listens on `http://localhost:3001`. Add it in the dashboard as `http://localhost:3001`.

Key environment variables in `server/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API base URL |
| `OLLAMA_LLM_MODEL` | `llama3.2` | Chat/reasoning model |
| `OLLAMA_IMAGE_MODEL` | `llava` | Vision model for image inputs |

---

## Run With Docker Compose

Starts both the dashboard and the demo server together.

```bash
cp .env.example .env
cp server/.env.example server/.env
docker compose up --build
```

| Service | URL |
|---------|-----|
| Dashboard | `http://localhost:3000` |
| Demo server | `http://localhost:3001` |

---

## First-Run Walkthrough

1. Open the dashboard. You'll land on the **Add Agent** screen.

   ![A2A UI home screen with add-agent flow](screenshots/01-home-add-agent.png)

2. Enter the agent URL (e.g. `http://localhost:3001`) and click **Connect**.

3. The dashboard fetches the agent card and navigates to the **Agent Library**.
   A green status dot and the agent's name confirm a successful connection.

4. Click **Chat** to open a new conversation and send your first prompt.

5. Watch the task stream in real time — status updates, artifacts, and tool calls
   appear as the agent works.

6. Open the **Debug panel** (`Cmd+Shift+D` / `Ctrl+Shift+D`) to see raw
   protocol events and any compliance warnings.

---

## Headless QA Runner

Export a suite from the QA Harness dashboard, then run it in CI:

```bash
npx a2a-ui qa-run --file my-suite.json
npx a2a-ui qa-run --file my-suite.json --agent-url http://staging:3001
npx a2a-ui qa-run --file my-suite.json --format junit --output results.xml
```

Exit code `0` = all cases passed. Exit code `1` = one or more failures.

See [QA Harness](features/qa-harness.md#headless-cli-runner) for full flag reference.

---

## Configuration Notes

- Agent credentials and workspace data are stored locally in the browser (IndexedDB).
  Nothing is sent to any server other than your own agents.
- Workspace import and export are JSON-based — use them to share setups across machines.
- File attachment options are filtered against the agent's declared input modes.
- The built-in proxy route (`/api/proxy`) allows browser clients to reach agents
  that would otherwise fail cross-origin requests.
