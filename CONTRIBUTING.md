# Contributing

Thank you for contributing to a2a-ui. This guide covers local setup, the
development workflow, and how to submit a pull request.

---

## Prerequisites

- **Node.js 20.9 or newer** — `node --version` to check
- **npm** — bundled with Node
- **Git**
- Optional for the demo server: [Ollama](https://ollama.com) running locally

---

## Local Setup

```bash
# 1. Fork and clone
git clone https://github.com/<your-fork>/a2a-ui.git
cd a2a-ui

# 2. Install dependencies
npm install

# 3. Start the Next.js dev server
npm run dev
```

Open `http://localhost:3000`. The dashboard runs with hot reload.

### Run the demo server (optional)

```bash
cd server
cp .env.example .env    # edit OLLAMA_* if your Ollama config differs
npm install
npm run dev             # listens on http://localhost:3001
```

In the dashboard, add `http://localhost:3001` as an agent.

---

## Available Scripts

| Script | What it does |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build (standalone output) |
| `npm run start` | Start the production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript without emitting |
| `npm run format` | Prettier (writes files) |
| `npm test` | Vitest unit and integration tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Tests with coverage report |
| `npm run test:e2e` | Playwright smoke tests (requires built app) |

---

## Branch Naming

| Prefix | When to use |
|--------|------------|
| `feat/` | New feature or capability |
| `fix/` | Bug fix |
| `docs/` | Documentation-only change |
| `refactor/` | Code improvement without behaviour change |
| `test/` | Adding or fixing tests |
| `chore/` | Dependency updates, tooling, CI |

Examples: `feat/batch-evaluation`, `fix/qa-csv-export`, `docs/hooks-reference`

---

## Where to Find Things

| You want to change… | Look in… |
|---------------------|---------|
| A dashboard page | `app/dashboard/<name>/page.tsx` |
| A UI component | `components/` |
| A headless hook | `hooks/` |
| A Redux slice | `lib/features/<name>/` |
| A2A protocol helpers | `lib/a2a/` |
| Auth / compliance / export utils | `lib/utils/` |
| IndexedDB persistence | `lib/persistence.ts` |
| The Redux store factory | `lib/store.ts` |
| The CLI entrypoint | `bin/a2a-ui.mjs` |
| The headless QA runner | `bin/qa-run.mjs` |
| Unit tests | `tests/` |
| E2E smoke tests | `e2e/` |
| Demo A2A server | `server/` |

---

## Testing

### Unit / integration tests

```bash
npm test
```

Tests live in `tests/` and mirror the `lib/` structure. New logic in
`lib/features/`, `lib/utils/`, or `lib/a2a/` should have a corresponding test
file.

Run a specific test file:

```bash
npm test -- tests/lib/features/qaAssertions.test.ts
```

### Type checking

```bash
npm run typecheck
```

All new code must pass `tsc --noEmit` with no errors.

### E2E smoke tests

```bash
npm run build
npm run test:e2e
```

The Playwright config targets `http://localhost:3000`. The smoke test verifies
the app loads and the main navigation is present.

---

## Pull Request Checklist

Before opening a PR:

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] New logic has tests in `tests/`
- [ ] New UI pages are reachable from the sidebar
- [ ] The PR description explains *what* changed and *why*

The CI pipeline (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests,
e2e tests, and a build check on every PR.

---

## Code Style

- **TypeScript strict mode** is enabled — no implicit `any`.
- **Prettier** for formatting — run `npm run format` before committing.
- **No comments explaining what** the code does — code should be
  self-explanatory. Comments should explain *why* something is done a certain
  way, especially when it's non-obvious.
- **No new abstractions** unless the pattern repeats at least three times.
- **Prefer editing existing files** to creating new ones.
