---
name: a2a-ui-server
description: Use when working on the private demo A2A server under server/, including LangChain/Ollama/Tavily wiring, A2A agent card behavior, env handling, and server typechecks.
metadata:
  short-description: Work on the demo server
---

# A2A UI Demo Server

## Scope

- `server/` is a private demo package named `a2a-server`; it is not published with the root npm package.
- Source files live in `server/src/`: `index.ts`, `agent.ts`, `card.ts`, and `env.ts`.
- The server is intended as an optional local A2A-compatible demo backed by Ollama and optional Tavily search.

## Environment

- Never commit `server/.env` or real provider keys.
- Keep `server/.env.example` safe with placeholders or local defaults only.
- Current scripts use Node transform types and env-file loading:
  - `npm run dev`
  - `npm run start`
  - `npm run typecheck`

## Implementation Defaults

- Keep the agent card truthful to the server capabilities.
- Validate env parsing in `server/src/env.ts` rather than scattering process-env reads.
- Prefer typed request/response handling and A2A SDK types over ad hoc JSON shapes.
- Keep provider-specific code isolated enough that Ollama, Tavily, or future model providers can be adjusted independently.

## Validation

- Install server dependencies from `server/` with `npm ci`.
- Run `npm run typecheck` from `server/` after server changes.
- If root UI behavior depends on demo server output, also run relevant root tests.
