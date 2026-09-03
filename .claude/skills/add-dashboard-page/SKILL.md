---
name: add-dashboard-page
description: Use when adding a new page to the a2a-ui dashboard, adding a nav entry, or adding a new Redux slice that has to survive a page reload. Adding a page is four navigation edits plus optional slice wiring, and missing one leaves the page unreachable or its state silently unpersisted.
---

# Adding a dashboard page

A new page is **never one file**. Skipping an edit does not break the build — it
just leaves the route unreachable or the breadcrumb blank, which is why this
checklist exists.

## 1. The route

`app/dashboard/<name>/page.tsx`, starting with `"use client"`. Every dashboard
page is a client component; there are no server components below the layouts.

Compose from `components/`, use `PageTitle` / `Muted` / `SectionTitle` from
[`components/typography.tsx`](../../../components/typography.tsx) for headings,
and read state through `useAppSelector` / `useAppDispatch` from `@/lib/hooks` —
never plain `react-redux` hooks. See
[`app/dashboard/qa/page.tsx`](../../../app/dashboard/qa/page.tsx) for the shape.

Add an `error.tsx` beside the page if it can throw on data it does not control;
`app/dashboard/error.tsx` already catches the general case.

## 2. The sidebar

[`components/app-sidebar.tsx`](../../../components/app-sidebar.tsx) — add an
entry to `workspaceItems` (things you look at) or `toolItems` (things you run),
with `title`, `href`, and a lucide `icon`. `exact: true` only for `/dashboard`
itself.

## 3. The breadcrumb

[`components/dashboard-breadcrumb.tsx`](../../../components/dashboard-breadcrumb.tsx) —
add the route to the `pageLabels` map. Use the same string as the sidebar
`title`. Dynamic segments need their own `pathname.match` branch above the map;
copy the agent-settings branch.

## 4. Mobile bottom nav — only if it belongs there

[`components/mobile-bottom-nav.tsx`](../../../components/mobile-bottom-nav.tsx)
holds **five** items and is a deliberate subset, not a mirror of the sidebar. Add
to it only when the page is something a phone user reaches constantly, and
remove something if you do. `active` uses `pathname.startsWith`, except
`/dashboard`, which is an equality check.

---

## If the page needs new persisted state

1. **Slice** — `lib/features/<name>/<name>Slice.ts`, plus a `hydrate<Name>`
   action that replaces the whole slice.
2. **Store** — register the reducer in
   [`lib/store.ts`](../../../lib/store.ts).
3. **IndexedDB** — in [`lib/persistence.ts`](../../../lib/persistence.ts): add
   the store to the `A2ASchema` interface, create it in `upgrade()`, **bump the
   version number in `openDB(...)`**, extend `loadPersistedState()`, and export a
   `persist<Name>()`.
4. **Hydration + write-back** — in
   [`app/StoreProvider.tsx`](../../../app/StoreProvider.tsx): dispatch the new
   `hydrate<Name>` action, and add a `prev<Name>` reference plus its branch to
   the `store.subscribe` listener. Persistence is that subscriber diffing slice
   roots by reference — **not** middleware. A reducer that does not produce a new
   top-level reference will update the UI and never persist.
5. **Migration** — if the shape of existing persisted data changes, write the
   conversion the way `migrateItems` handles the legacy
   `{text, attachments}` → `parts` format. A version bump without a migration
   drops user data.

Runtime-only fields (like `agents[].status`) must be reset on load rather than
trusted from IndexedDB.

---

## Tests and accessibility

- Slice reducers get `tests/lib/features/<name>Slice.test.ts`.
- Interactive components get assertions in
  [`tests/accessibility/accessibility.test.tsx`](../../../tests/accessibility/accessibility.test.tsx):
  `aria-label` on icon-only buttons, `focus-visible` on hover-revealed controls,
  accessible names on dialogs.
- Query by role and accessible name in component tests — the query doubles as
  the a11y assertion.
- `e2e/app-smoke.spec.ts` only needs touching if the primary navigation changed.

See [docs/testing.md](../../../docs/testing.md) and
[docs/design.md](../../../docs/design.md).

## Before you call it done

```bash
npm run lint && npm run typecheck && npm test
```

- [ ] Route renders and is reachable from the sidebar
- [ ] Breadcrumb shows the right label
- [ ] Mobile nav decision made deliberately (added, or consciously not)
- [ ] New slice hydrates and survives a reload — verify in the browser, not only
      in tests
- [ ] Both light and dark themes checked
