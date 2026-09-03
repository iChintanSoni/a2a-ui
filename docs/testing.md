# Testing Guide

How testing works in a2a-ui: what runs where, the patterns already in the tree,
and the two rules that are easy to get wrong (QA parity and e2e scope).

For commands and the PR checklist, see [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## The layers

| Layer              | Runner                | Lives in | Scope                                                             |
| ------------------ | --------------------- | -------- | ----------------------------------------------------------------- |
| Unit / integration | Vitest (`happy-dom`)  | `tests/` | Everything: slices, utils, hooks, components, the CLI, the server |
| End-to-end smoke   | Playwright (chromium) | `e2e/`   | The app boots and the shell navigates — nothing deeper            |

```bash
npm test                                              # the whole Vitest suite
npm test -- tests/lib/features/qaAssertions.test.ts   # one file
npm test -- -t "assertion name"                       # one test by name
npm run test:watch
npm run test:coverage
npm run test:e2e                                      # Playwright starts its own dev server
```

[`vitest.config.ts`](../vitest.config.ts) enables `globals` (no
`import { describe }` needed, though existing files import explicitly and new
ones should match), sets the `happy-dom` environment, and loads
[`tests/setup.ts`](../tests/setup.ts) for `@testing-library/jest-dom` matchers.
Coverage is collected over `lib/**`, `hooks/**`, and `app/actions/**`. There is
no coverage threshold — the report is a tool, not a gate.

---

## Layout

`tests/` mirrors the source tree:

| Source                 | Test                                 |
| ---------------------- | ------------------------------------ |
| `lib/features/<name>/` | `tests/lib/features/<thing>.test.ts` |
| `lib/utils/<name>.ts`  | `tests/lib/utils/<name>.test.ts`     |
| `lib/a2a/<name>.ts`    | `tests/lib/a2a/<name>.test.ts`       |
| `lib/presets/`         | `tests/lib/presets/`                 |
| `hooks/`               | `tests/hooks/`                       |
| `components/`          | `tests/components/`                  |
| `bin/`                 | `tests/cli/`                         |
| `server/src/`          | `tests/server/`                      |

New logic in `lib/features/`, `lib/presets/`, `lib/utils/`, or `lib/a2a/` **must**
have a matching test file. Those four directories are where behaviour lives;
everything above them is composition.

`tests/server/` reaches into `server/src/` by relative path even though `server/`
is a separate npm package — that is deliberate, so agent-card changes are caught
by the root suite rather than only by the server's own typecheck.

---

## Patterns already in the tree

Copy these rather than inventing new harnesses.

### Reducers — call them directly

Slices are pure functions; import the reducer and call it with an action — no
store needed. See
[`tests/lib/features/chatsSlice.test.ts`](../tests/lib/features/chatsSlice.test.ts).

One caveat these tests do not cover: the IndexedDB write-back in
`app/StoreProvider.tsx` diffs the four slice roots **by reference**. Immer gives
you a fresh reference whenever a draft is touched, but a reducer that mutates
state reached from outside the draft will update the UI and silently fail to
persist. When a reducer takes that kind of shortcut, add
`expect(next.chats).not.toBe(prev.chats)` — nothing else in the suite catches
it.

### Hooks — render a probe component

There is no `renderHook` in this repo. Hooks are exercised through a small probe
component and `render` from `@testing-library/react`, which keeps the test
honest about effect timing and re-render behaviour. See
[`tests/hooks/use-a2a-connection.test.tsx`](../tests/hooks/use-a2a-connection.test.tsx):

```tsx
vi.mock("@/lib/utils/auth", () => ({ createClientFactory: vi.fn() }));

function AutoProbe() {
  useA2AConnection({ agentUrl: "http://localhost:3001", autoConnect: true });
  return null;
}
```

Connection-layer hooks mock `createClientFactory` and hand back a partial
`@a2a-js/sdk` `Client` — never hit a real agent from a unit test. `cleanup()` and
`vi.clearAllMocks()` in `afterEach`.

### Components — a real store, not a mocked one

Wrap in a real `makeStore()` and `<Provider>` (plus `ToastProvider` when the
component toasts). See
[`tests/components/preset-gallery.test.tsx`](../tests/components/preset-gallery.test.tsx):

```tsx
function renderWithStore(ui: React.ReactElement, store = makeStore()) {
  return { ...render(<Provider store={store}>{ui}</Provider>), store };
}
```

Query by role and accessible name (`getByRole("button", { name: … })`,
`getByLabelText`) rather than by test id — the query doubles as an accessibility
assertion.

### Accessibility

[`tests/accessibility/accessibility.test.tsx`](../tests/accessibility/accessibility.test.tsx)
is the shared home for a11y assertions: `aria-label` on icon-only buttons,
`focus-visible` classes on hover-revealed controls, accessible names on dialogs
and navigation. Extend it whenever you add an interactive surface — accessibility
is a hard PR requirement, not an appendix. See
[docs/accessibility.md](accessibility.md) for the standard itself.

---

## The QA parity rule

The QA harness exists twice on purpose:

- [`lib/features/qa/runner.ts`](../lib/features/qa/runner.ts) +
  [`assertions.ts`](../lib/features/qa/assertions.ts) — the browser runner used
  by the dashboard.
- The **inline fallback runner inside
  [`bin/qa-run.mjs`](../bin/qa-run.mjs)** — a duplicated plain-JS implementation.
  `npx a2a-ui qa-run` only imports the TypeScript runner when `tsx` resolves,
  which it does not in a plain `npx` install. **The fallback is the normal CLI
  path, not an edge case.**

So: **any change to assertion semantics or runner behaviour must be mirrored in
`bin/qa-run.mjs`, and both sides must be tested.** Otherwise the CLI silently
disagrees with the UI about whether a suite passed.

[`tests/cli/qa-run.test.ts`](../tests/cli/qa-run.test.ts) enforces this: it runs
the same cases through `evaluateAll` (inline) and
`evaluateQaAssertions` / `evaluateExpectedTaskState` (TypeScript) and asserts
both produce the same `assertionId` + `passed` verdicts. Extend it whenever you
add an assertion kind.

Known and deliberate divergences — keep this list and the parity test in sync:

- The inline runner **skips `json-path` assertions** entirely.
- Its result messages are shorter than the TypeScript ones (`"Matched /…/."`
  without the flags suffix). The parity test compares `passed` and `assertionId`
  only — never exact message text.

---

## E2E scope

`e2e/` is **smoke-only by policy**: the app boots, the shell renders, primary
navigation is reachable, and the mobile layout switches. Deep behaviour belongs
in Vitest, where it runs in ~2 seconds instead of a browser launch.

Playwright's `webServer` starts `npm run dev` itself — do not start one first
unless you want it reused (`reuseExistingServer` is on outside CI). Use
`PLAYWRIGHT_PORT=3100 npm run test:e2e` when :3000 is busy.

Adding a third smoke test is fine. Adding a suite of feature tests to `e2e/` is
not — move it to `tests/`.

---

## What must have a test

- Every Redux slice reducer and selector (`lib/features/*/`).
- QA assertions and the QA runner, on **both** sides (see the parity rule).
- Everything in `lib/utils/` and `lib/a2a/` — these are pure and cheap to cover.
- Every new interactive component, in `tests/accessibility/` at minimum.
- CLI argument parsing when `bin/*.mjs` grows a flag. Note that `bin/*.mjs` is
  externalized in `vitest.config.ts` so Node loads it natively — Vite's SSR
  transform cannot parse the shebang.
- `server/src/card.ts` changes, via `tests/server/agent-card.test.ts` — the demo
  agent card is expected to pass `checkCompliance` with zero failures.
