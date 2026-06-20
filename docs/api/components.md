# Components Reference

A2A UI exports four embeddable React components. They all require a Redux
`<Provider>` wrapping them — see the [Embedding Guide](../embed.md) for setup.

---

## `A2AChat`

A complete chat UI that wires together all four hooks and renders messages,
artifacts, task status, a debug panel, and an event explorer.

**Source:** [`components/chat/A2AChat.tsx`](../../components/chat/A2AChat.tsx)

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `agentUrl` | `string` | — | A2A agent URL (**required**) |
| `auth` | `AuthConfig` | `{ type: "none" }` | Authentication config |
| `headers` | `CustomHeader[]` | `[]` | Extra request headers |
| `initialCard` | `AgentCard` | — | Pre-loaded card; skips initial card fetch |
| `initialContextId` | `string` | Auto-generated | Starting context ID |
| `persistenceMode` | `"memory" \| "none"` | `"memory"` | Message persistence strategy |
| `context` | `A2AContextConfig` | — | Context injected into every message |
| `a2uiEnabled` | `boolean` | `false` | Enable A2UI structured surface rendering |
| `title` | `string` | — | Optional title shown above the chat |
| `showDebugPanel` | `boolean` | `true` | Show/hide the debug panel toggle button |
| `showEventExplorer` | `boolean` | `true` | Show/hide the event explorer toggle button |

### Example

```tsx
import { A2AChat } from "a2a-ui/components/chat/A2AChat";

export default function MyPage() {
  return (
    <div style={{ height: "600px" }}>
      <A2AChat
        agentUrl="https://my-agent.example.com"
        auth={{ type: "bearer", token: process.env.NEXT_PUBLIC_AGENT_TOKEN! }}
        title="Support assistant"
        persistenceMode="memory"
      />
    </div>
  );
}
```

### Notes

- The component manages its own `useA2ADebug`, `useA2AConnection`,
  `useA2ASession`, and `useA2AMessages` instances internally.
- For full control over message state (e.g. routing messages through your
  own backend), use the hooks directly instead of this component.
- The debug panel and event explorer are hidden but still functional when
  `showDebugPanel={false}` / `showEventExplorer={false}`.

---

## `A2AAgentCard`

Displays the agent card returned by an agent's card endpoint: name,
description, version, skills, capabilities, and compliance summary.

**Source:** [`components/chat/A2AAgentCard.tsx`](../../components/chat/A2AAgentCard.tsx)

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `agentUrl` | `string` | — | URL of the A2A server (**required**) |
| `auth` | `AuthConfig` | `{ type: "none" }` | Auth config for fetching the card |
| `initialCard` | `AgentCard` | — | Pre-loaded card to display before fetching |
| `showRefresh` | `boolean` | `true` | Show a "Refresh" button to re-fetch the card |

### Example

```tsx
import { A2AAgentCard } from "a2a-ui/components/chat/A2AAgentCard";

export default function Sidebar() {
  return (
    <aside>
      <A2AAgentCard
        agentUrl="https://my-agent.example.com"
        showRefresh={false}
      />
    </aside>
  );
}
```

---

## `A2ADebugPanel`

Renders the HTTP log and validation warning list. Pair with `useA2ADebug` to
show real-time protocol traffic alongside a custom chat UI.

**Source:** [`components/chat/A2ADebugPanel.tsx`](../../components/chat/A2ADebugPanel.tsx)

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `logs` | `LogEntry[]` | — | Log entries from `useA2ADebug().logs` (**required**) |
| `validationWarnings` | `ValidationWarning[]` | — | Warnings from `useA2ADebug().validationWarnings` (**required**) |
| `onClear` | `() => void` | — | Called when the "Clear" button is clicked |

### Example

```tsx
import { useA2ADebug } from "a2a-ui/hooks/use-a2a-debug";
import { A2ADebugPanel } from "a2a-ui/components/chat/A2ADebugPanel";

function DevPanel() {
  const debug = useA2ADebug();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen((v) => !v)}>
        Debug ({debug.logs.length})
      </button>
      {open && (
        <A2ADebugPanel
          logs={debug.logs}
          validationWarnings={debug.validationWarnings}
          onClear={debug.clearLogs}
        />
      )}
    </>
  );
}
```

---

## `EventExplorer`

Renders the execution event timeline for a chat session. Events can be
filtered by kind, request ID, and task ID.

**Source:** [`components/chat/EventExplorer.tsx`](../../components/chat/EventExplorer.tsx)

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `events` | `ExecutionEvent[]` | — | Events from `chat.executionEvents` (**required**) |
| `defaultKindFilter` | `string` | `"all"` | Pre-select an event kind filter |
| `defaultRequestIdFilter` | `string` | — | Pre-select a request ID filter |

### Example

```tsx
import { EventExplorer } from "a2a-ui/components/chat/EventExplorer";
import { useA2AMessages } from "a2a-ui/hooks/use-a2a-messages";

function MyEventLog({ connection, debug, session }) {
  const { chat } = useA2AMessages({ connection, debug, session });

  return (
    <EventExplorer
      events={chat?.executionEvents ?? []}
      defaultKindFilter="task-status"
    />
  );
}
```

### Event kinds

| Kind | When it appears |
|------|----------------|
| `outgoing-message` | When the user sends a message |
| `task-status` | On each task state transition |
| `artifact-update` | When an artifact chunk arrives or completes |
| `tool-call` | When the agent invokes a tool |
| `agent-message` | When the agent sends a message (non-task) |
| `structured-ui` | When an A2UI surface is detected |
| `validation` | When a compliance warning is recorded |
| `error` | When a stream error occurs |
