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

| Script                  | What it does                                |
| ----------------------- | ------------------------------------------- |
| `npm run dev`           | Start Next.js dev server                    |
| `npm run build`         | Production build (standalone output)        |
| `npm run start`         | Start the production server                 |
| `npm run lint`          | ESLint                                      |
| `npm run typecheck`     | TypeScript without emitting                 |
| `npm run format`        | Prettier (writes files)                     |
| `npm test`              | Vitest unit and integration tests           |
| `npm run test:watch`    | Vitest in watch mode                        |
| `npm run test:coverage` | Tests with coverage report                  |
| `npm run test:e2e`      | Playwright smoke tests (requires built app) |

---

## Branch Naming

| Prefix      | When to use                               |
| ----------- | ----------------------------------------- |
| `feat/`     | New feature or capability                 |
| `fix/`      | Bug fix                                   |
| `docs/`     | Documentation-only change                 |
| `refactor/` | Code improvement without behaviour change |
| `test/`     | Adding or fixing tests                    |
| `chore/`    | Dependency updates, tooling, CI           |

Examples: `feat/batch-evaluation`, `fix/qa-csv-export`, `docs/hooks-reference`

---

## Commits

Commit subjects follow [Conventional Commits](https://www.conventionalcommits.org/):
`<type>(<optional scope>): <subject>`, imperative mood, no trailing period.

| Type       | Example                                                  |
| ---------- | -------------------------------------------------------- |
| `feat`     | `feat: add chat export in JSON and Markdown formats`     |
| `fix`      | `fix(server): bump js-yaml to patch a security advisory` |
| `docs`     | `docs: add release project skill`                        |
| `refactor` | `refactor: extract components, modularize server`        |
| `test`     | `test: cover the QA json-path assertion`                 |
| `chore`    | `chore(deps): bump next from 16.2.9 to 16.2.11`          |
| `ci`       | `ci: restrict GITHUB_TOKEN to contents:read`             |

Scope the change when it is confined to one area — `server` for `server/`,
`deps` / `deps-dev` for dependency bumps (what Dependabot emits), `docs` for a
documentation-only correction. Leave the scope off for changes that span the
dashboard.

The body explains _why_. Reference issues and PRs by number (`(#12)`) so the
generated release notes link back.

### Signing

Commits on this repo are GPG-signed (`git config commit.gpgsign true`). Verify
with `git log --show-signature -1`, and do not strip `-S` from a commit command
you are given. If you have no signing key configured, set one up rather than
committing unsigned — see
[GitHub's signing docs](https://docs.github.com/authentication/managing-commit-signature-verification).

### No `Co-Authored-By` trailers

Do not add `Co-Authored-By` (or other agent-attribution) trailers. Authorship is
the commit author; the trailers only add noise to the history and release notes.

### The pre-commit hook

`.husky/pre-commit` runs the full gauntlet on every commit:

```bash
npm run lint
npm run typecheck
npm --prefix server run typecheck
npm run test
```

Commits are slow by design — this is the same set CI runs, so a green commit is
a green CI run. **Do not bypass it with `--no-verify`.** If the hook is in your
way, fix the failure or split the commit; a red `main` blocks releases, because
`.github/workflows/release.yml` re-runs all of it before publishing.

### Releases

Releases are tag-driven and the tag must match `package.json` — bump the version
on `main` _before_ creating the tag. See
[`.claude/skills/release/SKILL.md`](.claude/skills/release/SKILL.md) for the full
procedure and the npm Trusted Publishing setup.

---

## Where to Find Things

| You want to change…              | Look in…                           |
| -------------------------------- | ---------------------------------- |
| A dashboard page                 | `app/dashboard/<name>/page.tsx`    |
| A UI component                   | `components/`                      |
| Curated agent presets            | `lib/presets/`                     |
| A headless hook                  | `hooks/`                           |
| A Redux slice                    | `lib/features/<name>/`             |
| A2A protocol helpers             | `lib/a2a/`                         |
| Auth / compliance / export utils | `lib/utils/`                       |
| IndexedDB persistence            | `lib/persistence.ts`               |
| The Redux store factory          | `lib/store.ts`                     |
| The CLI entrypoint               | `bin/a2a-ui.mjs`                   |
| The headless QA runner           | `bin/qa-run.mjs`                   |
| Accessibility standards          | `docs/accessibility.md`            |
| Preset gallery guide             | `docs/features/example-presets.md` |
| Unit tests                       | `tests/`                           |
| E2E smoke tests                  | `e2e/`                             |
| Demo A2A server                  | `server/`                          |

---

## Testing

### Unit / integration tests

```bash
npm test
```

Tests live in `tests/` and mirror the `lib/` structure. New logic in
`lib/features/`, `lib/presets/`, `lib/utils/`, or `lib/a2a/` should have a corresponding test
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
- [ ] New UI elements satisfy keyboard and screen-reader accessibility ([Accessibility Guide](docs/accessibility.md))
- [ ] New logic has tests in `tests/`
- [ ] New UI pages are reachable from the sidebar
- [ ] The PR description explains _what_ changed and _why_
- [ ] Commits are signed and follow [Conventional Commits](#commits)

The CI pipeline (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests,
e2e tests, and a build check on every PR.

---

## Code Style

- **TypeScript strict mode** is enabled — no implicit `any`.
- **Prettier** for formatting — run `npm run format` before committing.
- **No comments explaining what** the code does — code should be
  self-explanatory. Comments should explain _why_ something is done a certain
  way, especially when it's non-obvious.
- **No new abstractions** unless the pattern repeats at least three times.
- **Prefer editing existing files** to creating new ones.
