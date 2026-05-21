---
name: a2a-ui
description: Use for broad work in the A2A UI repository, including repo orientation, local-first product behavior, package boundaries, commands, and safe implementation defaults.
metadata:
  short-description: Work in the A2A UI repo
---

# A2A UI Repo Workflow

## Product Shape

- A2A UI is a local-first Next.js workbench for building, testing, and debugging Agent2Agent protocol servers.
- The root package `a2a-ui` is the publishable npm CLI/web app. The `server/` package is a private optional demo A2A server.
- Preserve local-first behavior: agent credentials and workspace data should stay in browser storage unless the user explicitly asks for a backend flow.
- Treat protocol debugging, event visibility, task artifacts, QA checks, and workspace import/export as core product surfaces.

## Grounding

- Start with `package.json`, `README.md`, and the files closest to the request.
- Root app code lives in `app/`, `components/`, `hooks/`, `lib/`, `tests/`, and `e2e/`.
- Demo server code lives in `server/src/`; do not assume it is part of the published npm package.
- Use existing shadcn/Radix UI, Tailwind, lucide-react, Redux Toolkit, and Vitest patterns before introducing new libraries.

## Validation

- Prefer targeted tests first, then broader commands when the change crosses module boundaries.
- Common root checks: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- Server check: run `npm run typecheck` from `server/`.
- E2E smoke tests use Playwright: `npm run test:e2e`.

## Safety

- Never commit real `.env` values. Keep examples in `.env.example` and `server/.env.example` with empty or local-safe placeholders.
- Mask auth headers, API keys, and custom headers in debug exports and logs.
- Keep npm packaging changes aware of the `files` allowlist in root `package.json`.
