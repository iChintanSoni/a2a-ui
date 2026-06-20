# Architecture

This document covers the internal structure of a2a-ui: how state flows from
the A2A protocol through Redux slices to the React UI, how data is persisted,
and how the four hooks compose into the embeddable stack.

---

## Overview

```
Browser
  ├─ React UI (Next.js App Router pages + components)
  │    └─ Reads from / dispatches to → Redux store
  │
  ├─ Redux store (in-memory, hydrated from IndexedDB on load)
  │    ├─ agents   — connected agents, auth, compliance
  │    ├─ chats    — message history, artifacts, execution events
  │    ├─ qa       — suites and run history
  │    └─ workbench — presets and settings
  │
  ├─ IndexedDB (via `idb`)
  │    └─ Persists agents, chats, qa, workbench across page loads
  │
  └─ A2A SDK client (@a2a-js/sdk)
       └─ Sends messages over REST or JSON-RPC to agent servers
            └─ CORS proxy: /api/proxy for cross-origin requests
```

---

## Redux Slices

The Redux store is created by `createA2AStore()` in
[`lib/store.ts`](../lib/store.ts). Four slices:

### `agentsSlice` — [`lib/features/agents/agentsSlice.ts`](../lib/features/agents/agentsSlice.ts)

Owns: the list of connected agents and their per-agent configuration.

| State field | Type | Description |
|-------------|------|-------------|
| `agents` | `Agent[]` | All connected agents |
| `activeAgentId` | `string \| null` | Currently selected agent in the library |

Key actions: `addAgent`, `removeAgent`, `updateAgentAuth`, `updateAgentCard`,
`updateAgentStatus`, `updateAgentHeaders`, `toggleAgentFavorite`,
`setAgentA2UIEnabled`

### `chatsSlice` — [`lib/features/chats/chatsSlice.ts`](../lib/features/chats/chatsSlice.ts)

Owns: conversation history — messages, task statuses, artifacts, tool calls,
and execution events for every chat session.

| State field | Type | Description |
|-------------|------|-------------|
| `chats` | `Chat[]` | All saved conversations |
| `activeChatId` | `string \| null` | Currently open conversation |

A `Chat` contains an ordered `items` array of `ChatItem` discriminated unions:

- `UserMessageItem` — outgoing message from the user
- `TaskStatusItem` — task state transition
- `ArtifactItem` — artifact chunk or completed artifact
- `AgentMessageItem` — non-task agent message
- `ToolCallItem` — tool invocation record

Plus a parallel `executionEvents` array of `ExecutionEvent` objects used by
the Event Explorer.

Key actions: `addChat`, `addUserMessage`, `applyStatusUpdate`,
`applyArtifactUpdate`, `applyToolCall`, `applyAgentMessage`,
`appendExecutionEvent`, `sanitizeStaleStreaming`, `cloneChat`,
`setChatArchived`, `setChatPinned`, `renameChat`

### `qaSlice` — [`lib/features/qa/qaSlice.ts`](../lib/features/qa/qaSlice.ts)

Owns: QA suites and run history.

| State field | Type | Description |
|-------------|------|-------------|
| `suites` | `QaSuite[]` | All saved test suites |
| `runs` | `QaSuiteRun[]` | Run history (max 100 entries, oldest dropped) |

Key actions: `saveQaSuite`, `removeQaSuite`, `recordQaRun`, `clearQaRunHistory`

### `workbenchSlice` — [`lib/features/workbench/workbenchSlice.ts`](../lib/features/workbench/)

Owns: per-agent settings that don't belong in the agent card — prompt presets,
default metadata, and task filter presets.

Key actions: `savePromptPreset`, `removePromptPreset`, `markPromptPresetUsed`,
`setAgentDefaultMetadata`, `saveTaskFilterPreset`, `removeTaskFilterPreset`

---

## IndexedDB Persistence

[`lib/persistence.ts`](../lib/persistence.ts) manages four object stores in a
single IndexedDB database (`a2a-ui`):

| Store | Persists |
|-------|---------|
| `agents` | `agentsSlice` state |
| `chats` | `chatsSlice` state |
| `qa` | `qaSlice` state |
| `workbench` | `workbenchSlice` state |

### Hydration on load

When the Next.js app first mounts, the Redux store dispatches four `hydrate*`
actions (one per slice) with the data read from IndexedDB. The `hydrateAgents`,
`hydrateChats`, `hydrateQa`, and `hydrateWorkbench` reducers replace the
initial empty state with the persisted data.

### Writes

Every Redux action that mutates relevant state triggers a debounced write-back
to IndexedDB. This happens in the Redux middleware defined in `lib/store.ts`.

### Legacy migration

On first load with old data, `persistence.ts` runs a migration that converts
the legacy `{ text, attachments }` message format to the current `parts` array
format. New schema versions are handled by bumping the IndexedDB version number.

---

## Hook Architecture

The four hooks form a dependency chain:

```
useA2ADebug
  ↓ (passed as `debug` option)
useA2AConnection
  ↓ (passed as `connection` option)
useA2AMessages ← useA2ASession (passed as `session` option)
```

### Why this composition?

- **`useA2ADebug`** is stateless toward the connection — it just collects logs.
  Separating it means the connection hook doesn't depend on log state, which
  would cause unnecessary reconnects when logs update.
- **`useA2AConnection`** manages the SDK `Client` instance. It's stable across
  re-renders because the client is cached in a `useRef` and only recreated when
  the `configKey` (agentUrl + auth + headers) changes.
- **`useA2ASession`** owns the `contextId` and stream lifecycle. It's separate
  so callers can provide a controlled `contextId` (e.g. loaded from a URL
  param) without the connection hook needing to know about it.
- **`useA2AMessages`** does the heavy lifting: building outgoing messages,
  consuming the stream, dispatching Redux actions, and calling the external
  store if configured.

---

## Message Flow

A single user message goes through this sequence:

1. **User calls `sendMessage([{ kind: "text", text: "…" }])`** — from
   `useA2AMessages`
2. `normalizeOutgoingParts` resolves any `File` objects to base64 data URIs
3. `messageStore.addUserMessage()` dispatches `chats/addUserMessage` to Redux
4. `buildOutgoingMessage` constructs the A2A `Message` object with parts,
   context ID, metadata, and any hidden context enrichers
5. `client.sendMessageStream({ message })` opens an SSE stream to the agent
6. For each event in the stream:
   - `status-update` → `chats/applyStatusUpdate`
   - `artifact-update` → `chats/applyArtifactUpdate` (append semantics for
     chunked artifacts)
   - `message` (agent role) → `chats/applyAgentMessage`
   - All events → `chats/appendExecutionEvent`
7. Redux middleware writes the updated `chats` slice to IndexedDB
8. React re-renders the chat timeline from the updated `items` array

---

## CORS Proxy

[`app/api/proxy/route.ts`](../app/api/proxy/) is a Next.js API route that
forwards requests to agent URLs that would otherwise fail browser CORS checks.

The proxy is used automatically when the target agent URL's origin differs from
the dashboard origin. Sensitive headers are forwarded as-is (the dashboard is
local-only, so there's no server-side secret leakage).

In the A2A SDK client factory (`lib/utils/auth.ts`), `shouldProxyRequest()`
detects cross-origin targets and rewrites the URL to go through `/api/proxy`.

---

## Adding a New Dashboard Page

Follow this checklist when adding a new section to the dashboard:

1. **Create the route** — add a folder under `app/dashboard/<name>/` with a
   `page.tsx` that includes `"use client"` at the top.

2. **Add to the sidebar** — open
   [`components/app-sidebar.tsx`](../components/app-sidebar.tsx) and add a
   `SidebarMenuButton` entry with the correct href and icon.

3. **Add Redux actions if needed** — if the page needs new persistent state,
   add actions to the relevant slice or create a new slice in
   `lib/features/<name>/`.

4. **Wire persistence if needed** — if a new slice is added, add an object
   store to the IndexedDB schema in `lib/persistence.ts` and dispatch a
   `hydrate*` action on app load.

5. **Add a breadcrumb** — update
   [`components/dashboard-breadcrumb.tsx`](../components/dashboard-breadcrumb.tsx)
   with the new path and label.

6. **Write tests** — add Vitest unit tests for any slice logic in
   `tests/lib/features/<name>.test.ts`.
