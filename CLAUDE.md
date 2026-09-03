# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

`a2a-ui` is two things shipped from one repo:

1. **A local-first dashboard** — a Next.js App Router app for connecting to, chatting with, and debugging [Agent2Agent (A2A)](https://a2a-protocol.org/latest/specification/) protocol servers.
2. **An embeddable React library** — the same hooks (`hooks/`) and components (`components/chat/`) are published on npm so other apps can drop in A2A chat. See `docs/embed.md`.

It is also a CLI: `npx a2a-ui` boots the prebuilt standalone server (`bin/a2a-ui.mjs`), and `npx a2a-ui qa-run` runs QA suites headlessly (`bin/qa-run.mjs`).

Everything is browser-local. There is no backend besides the CORS proxy route; all state lives in Redux + IndexedDB in the user's browser.

## Commands

```bash
npm run dev            # Next.js dev server on :3000
npm run build          # next build + prepare:standalone (required before test:e2e in CI)
npm run lint           # eslint
npm run typecheck      # tsc --noEmit (root only — does NOT cover server/)
npm run format         # prettier --write .
npm test               # vitest run
npm run test:watch
npm run test:coverage

npm test -- tests/lib/features/qaAssertions.test.ts    # single test file
npm test -- -t "assertion name"                        # single test by name

npm run test:e2e       # Playwright; its webServer starts `npm run dev` on :3000 itself
PLAYWRIGHT_PORT=3100 npm run test:e2e                  # run e2e against a different port
```

The demo A2A agent lives in `server/` and is a **separate npm package with its own install and typecheck**:

```bash
cd server && npm install && cp .env.example .env && npm run dev   # :3001, needs Ollama
npm --prefix server run typecheck
```

`.husky/pre-commit` runs `lint`, `typecheck`, `npm --prefix server run typecheck`, and `test` on every commit — commits are slow by design. CI (`.github/workflows/ci.yml`) runs the same four plus `build` and `test:e2e`.

Releases are tag-driven: pushing `v<x.y.z>` triggers `.github/workflows/release.yml`, which fails unless the tag exactly matches `package.json` version. Bump the version on `main` first — see the `release` skill.

## Architecture

### The hook chain (the core abstraction)

Four hooks compose in a fixed dependency order; each is passed into the next as an option:

```
useA2ADebug   → collects fetch logs + protocol validation warnings
  ↓ debug
useA2AConnection → owns the @a2a-js/sdk Client, cached in a ref keyed by (agentUrl + auth + headers)
  ↓ connection
useA2AMessages ← useA2ASession (owns contextId + stream lifecycle)
```

`useA2AMessages` does the real work: normalize outgoing parts (resolving `File` → base64), build the A2A `Message`, consume the SSE stream, and route each event to the message store.

### Two message stores — this is the key design point

`useA2AMessages` writes through an `A2AExternalMessageStore` interface (`lib/a2a/types.ts`), not directly to Redux:

- **Embedded consumers** get the default in-memory store (`useMemoryMessageStore` in `hooks/use-a2a-messages-reducer.ts`) — a plain `useReducer`, no persistence.
- **The dashboard** passes `persistenceMode: "external"` with a store adapter that dispatches into the Redux `chatsSlice`. That adapter is `hooks/use-chat-session.ts` — it is the single bridge between the reusable hooks and the dashboard's Redux/IndexedDB world.

When changing message-handling logic, check whether it belongs in the shared hook (both paths) or in `use-chat-session.ts` (dashboard only).

### State and persistence

Store: `lib/store.ts` (`makeStore()`) with four slices — `agents`, `chats`, `qa`, `workbench`, each under `lib/features/<name>/`.

Persistence is **not** Redux middleware. `app/StoreProvider.tsx` reads IndexedDB via `lib/persistence.ts`, dispatches four `hydrate*` actions, and only then installs a `store.subscribe` that diffs the four slice roots by reference and writes changed ones back. Consequences:

- The app renders nothing until hydration resolves (`if (!store) return null`).
- Reducers must return new top-level references for changes to persist.
- IndexedDB schema changes need a version bump in `getDB()` in `lib/persistence.ts`, plus a migration (see `migrateItems` for the legacy `{text, attachments}` → `parts` conversion).
- `agents[].status` is runtime-only — it is reset to `"disconnected"` on load and re-probed by `StoreProvider`.

`Chat.items` is a discriminated union (`ChatItem`: user-message / task-status / artifact / agent-message / tool-call) plus a parallel `executionEvents` array that feeds the Event Explorer.

### A2A SDK v1.0 shapes

The app is on `@a2a-js/sdk` v1.0 and stores its types directly, so protobuf shapes reach Redux, IndexedDB, and the exports.

- **`Part` has no `kind`.** It is `{ content: { $case: "text" | "data" | "url" | "raw", value }, metadata, filename, mediaType }`. Build parts with the constructors in `lib/a2a/parts.ts` (`textPart`, `dataPart`, `urlFilePart`, `rawFilePart`) and read them with `getPartText` / `getPartData` / `isFilePart` — never hand-write the literal. Note `url` and `raw` are both "file"; `isFilePart` covers both.
- **`TaskState` and `Role` are numeric enums** (`TaskState.TASK_STATE_COMPLETED`). `0` is a real value, so guard with `=== undefined`, never truthiness. For anything user-visible or serialized to an execution event, use `taskStateLabel()` from `lib/a2a/legacy.ts` — `ExecutionEvent.details.state` carries the short kebab label (`"working"`), which is what `lib/a2a/execution-events.ts` and `compareRuns.ts` match on.
- **`AgentCard` has no `url`/`preferredTransport`/`protocolVersion`** — one ordered `supportedInterfaces[]` replaces them, first entry preferred. Read it through `lib/a2a/agent-card.ts`.
- **Streaming yields `StreamResponse`**, discriminated by `event.payload.$case` (`statusUpdate` / `artifactUpdate` / `message` / `task`), not by `event.kind`.
- **`lib/a2a/legacy.ts` reads v0.3 data.** IndexedDB migrates on load (schema v4); it also keeps QA-suite imports forgiving about task-state spellings. Do not add v0.3 shapes to new code — this module exists only for reading what is already stored.
- **`lib/utils/buffer-polyfill.ts` is load-bearing.** The SDK encodes and decodes file parts through `globalThis.Buffer`, which Next.js does not provide in the browser; without the polyfill every attachment throws. It is imported for its side effect by `lib/a2a/parts.ts` and `lib/utils/auth.ts`.

### CORS proxy

`lib/utils/auth.ts` detects cross-origin agent URLs (`shouldProxyRequest`) and rewrites requests through `app/api/proxy/route.ts`. The proxy strips hop-by-hop and browser-only headers but forwards auth headers verbatim — acceptable only because the dashboard is local-only. Keep it that way.

### QA harness

`lib/features/qa/runner.ts` (`executeQaSuite`) is the browser runner. `bin/qa-run.mjs` tries to `import()` that TypeScript file via `tsx`, but **falls back to a duplicated inline JS implementation** of the runner and assertions when `tsx` is not installed (the normal case for `npx a2a-ui`). Changes to assertion semantics in `lib/features/qa/assertions.ts` must be mirrored in `bin/qa-run.mjs` or the CLI silently diverges from the UI; `tests/cli/qa-run.test.ts` pins the two together. The inline runner deliberately skips `json-path` assertions.

## Conventions

- **TypeScript strict**, no implicit `any`. Path alias `@/*` → repo root.
- **Prettier** with `printWidth: 100`, double quotes, `arrowParens: "avoid"`, plus `prettier-plugin-tailwindcss`.
- **Comments explain _why_, never _what_.** Self-explanatory code over narration.
- **No new abstraction until the pattern repeats three times.** Prefer editing existing files over adding new ones.
- **Design** — semantic tokens only, never raw Tailwind colors; dense inspectable workbench, not a marketing surface. `docs/design.md`.
- **Testing** — `tests/` mirrors `lib/`; Vitest with `happy-dom`. `docs/testing.md` has the patterns and the QA parity rule.
- **Accessibility** — a hard PR requirement, not a nicety. `docs/accessibility.md`.
- **Git** — branch prefixes, Conventional Commits, signed commits, no `Co-Authored-By` trailers, never `--no-verify`. `CONTRIBUTING.md`.

## Gotchas

- **`server/` is excluded from the root `tsconfig.json`.** `npm run typecheck` will not catch errors there; run `npm --prefix server run typecheck`.
- **`package.json` `files` is an explicit allowlist.** A new top-level directory that consumers need (or a new `scripts/*.mjs` used at pack time) must be added there or it will not ship to npm.
- Dashboard pages are all `"use client"`; there are no server components beyond the layouts.
- **`server/` has its own copy of the SDK.** Bumping `@a2a-js/sdk` means bumping it in both `package.json` files, or `tests/server/agent-card.test.ts` fails with two incompatible `AgentCard` types.
- Adding a dashboard page means four edits, not one — route, sidebar, breadcrumb, and mobile nav. Use the `add-dashboard-page` skill.

## Project skills

`.claude/skills/` — `release` (tag/version invariants and npm Trusted Publishing), `add-dashboard-page` (the four-edit checklist plus slice/IndexedDB wiring), `run-app` (dashboard + demo agent + Ollama).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
