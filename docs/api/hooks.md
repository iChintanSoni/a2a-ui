# Hooks Reference

The four headless hooks expose the full A2A client stack for use in your own
React application. They compose in a chain:

```
useA2ADebug          ← captures logs and validation warnings
  └─ useA2AConnection  ← manages the A2A client and agent card
       └─ useA2ASession  ← owns the context ID and stream state
            └─ useA2AMessages  ← orchestrates send/receive/persist
```

Each hook is a standalone unit and can be used independently, but
`useA2AMessages` expects the other three to be passed in as dependencies.

---

## `useA2AConnection`

Manages the A2A client lifecycle: connecting to an agent, fetching the agent
card, and handling auth and custom headers.

**Source:** [`hooks/use-a2a-connection.ts`](../../hooks/use-a2a-connection.ts)

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `agentUrl` | `string` | — | Base URL of the A2A server (**required**) |
| `auth` | `AuthConfig` | `{ type: "none" }` | Authentication configuration |
| `headers` | `CustomHeader[]` | `[]` | Extra headers sent with every request |
| `a2uiEnabled` | `boolean` | `false` | Send the A2UI extension header to request structured UI surfaces |
| `debug` | `ReturnType<typeof useA2ADebug>` | — | Debug hook instance for logging |
| `autoConnect` | `boolean` | `true` | Connect to the agent on mount |
| `autoLoadCard` | `boolean` | `false` | Also fetch the agent card on connect |
| `initialCard` | `AgentCard` | — | Pre-loaded card to use before the first fetch |

#### `AuthConfig`

```ts
type AuthConfig =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | { type: "api-key"; headerName: string; headerValue: string }
  | { type: "basic"; username: string; password: string };
```

#### `CustomHeader`

```ts
interface CustomHeader { key: string; value: string }
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `card` | `AgentCard \| null` | The fetched agent card, or `initialCard` while loading |
| `status` | `"idle" \| "connecting" \| "connected" \| "error"` | Connection state |
| `error` | `string \| null` | Last connection error message |
| `transportMethod` | `string \| null` | `"rest"` or `"json-rpc"` once connected |
| `getClient` | `() => Promise<Client>` | Returns the A2A SDK client, connecting if needed |
| `refreshAgentCard` | `() => Promise<AgentCard>` | Re-fetches the agent card |
| `cancelTask` | `(taskId: string) => Promise<void>` | Sends a cancel request for a running task |
| `resetConnection` | `() => void` | Clears the cached client and forces reconnect on next call |

### Example

```tsx
import { useA2AConnection } from "a2a-ui/hooks/use-a2a-connection";

function AgentStatus({ url }: { url: string }) {
  const { status, card, error } = useA2AConnection({
    agentUrl: url,
    auth: { type: "bearer", token: process.env.NEXT_PUBLIC_TOKEN! },
    autoConnect: true,
    autoLoadCard: true,
  });

  if (status === "connecting") return <span>Connecting…</span>;
  if (status === "error") return <span>Error: {error}</span>;
  return <span>{card?.name ?? "Unknown agent"} — {status}</span>;
}
```

---

## `useA2ASession`

Manages the conversation context ID and stream lifecycle (streaming flag,
abort controller, active task tracking).

**Source:** [`hooks/use-a2a-session.ts`](../../hooks/use-a2a-session.ts)

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `contextId` | `string` | — | Controlled context ID. If provided, the hook never generates its own ID. |
| `defaultContextId` | `string` | `crypto.randomUUID()` | Initial context ID when uncontrolled |
| `onNewSession` | `(contextId: string) => void` | — | Called when `newSession()` is invoked in controlled mode |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `contextId` | `string` | Current conversation context ID |
| `isStreaming` | `boolean` | `true` while a message stream is in flight |
| `activeTaskId` | `string \| null` | Task ID of the currently running task |
| `error` | `string \| null` | Last stream error |
| `newSession` | `() => void` | Generate a new context ID (starts a fresh conversation) |

### Example

```tsx
import { useA2ASession } from "a2a-ui/hooks/use-a2a-session";

function SessionBadge() {
  const { contextId, isStreaming, newSession } = useA2ASession();

  return (
    <div>
      <code>{contextId.slice(0, 8)}…</code>
      {isStreaming && <span> — streaming</span>}
      <button onClick={newSession}>New session</button>
    </div>
  );
}
```

---

## `useA2AMessages`

Orchestrates the full message lifecycle: sending prompts, receiving streamed
events, updating local state, and persisting to IndexedDB or an external store.

This hook composes `useA2AConnection`, `useA2ASession`, and `useA2ADebug` —
you must create those three hooks first and pass them in.

**Source:** [`hooks/use-a2a-messages.ts`](../../hooks/use-a2a-messages.ts)

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `connection` | `ReturnType<typeof useA2AConnection>` | — | Connection hook instance (**required**) |
| `debug` | `ReturnType<typeof useA2ADebug>` | — | Debug hook instance (**required**) |
| `session` | `ReturnType<typeof useA2ASession>` | — | Session hook instance (**required**) |
| `agentName` | `string` | From card | Override the agent display name in the chat history |
| `context` | `A2AContextConfig` | — | Context injected into every outgoing message |
| `persistenceMode` | `"memory" \| "none" \| "external"` | `"memory"` | Where messages are stored |
| `store` | `A2AExternalMessageStore` | — | Required when `persistenceMode` is `"external"` |

#### `A2AContextConfig`

```ts
interface A2AContextConfig {
  initialMetadata?: Record<string, string>;
  hiddenSystemContext?: string;
  messageContextEnrichers?: Array<(parts: Part[]) => Promise<Part[]>>;
}
```

#### `A2ASessionPersistenceMode`

| Mode | Behaviour |
|------|-----------|
| `"memory"` | In-component reducer — cleared on unmount |
| `"none"` | Same as memory but history is cleared when the context ID changes |
| `"external"` | Caller provides a `store` implementing `A2AExternalMessageStore` |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `chat` | `Chat \| undefined` | The full chat object including all items and events |
| `items` | `ChatItem[]` | Convenience shortcut for `chat?.items ?? []` |
| `isInputRequired` | `boolean` | `true` when the agent is waiting for user input |
| `sendMessage` | `(parts: OutgoingMessagePartInput[], metadata?: Record<string, string>) => Promise<void>` | Send a message and consume the stream |
| `cancelStream` | `() => void` | Abort the in-flight stream and cancel the active task |

### Example

```tsx
import { useA2AConnection } from "a2a-ui/hooks/use-a2a-connection";
import { useA2ASession } from "a2a-ui/hooks/use-a2a-session";
import { useA2ADebug } from "a2a-ui/hooks/use-a2a-debug";
import { useA2AMessages } from "a2a-ui/hooks/use-a2a-messages";

function MyChat({ agentUrl }: { agentUrl: string }) {
  const debug = useA2ADebug();
  const connection = useA2AConnection({ agentUrl, debug });
  const session = useA2ASession();
  const { items, isInputRequired, sendMessage, cancelStream } = useA2AMessages({
    connection,
    debug,
    session,
  });

  const [input, setInput] = useState("");

  return (
    <div>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.kind}</li>
        ))}
      </ul>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={() => { sendMessage([{ kind: "text", text: input }]); setInput(""); }}>
        Send
      </button>
      {session.isStreaming && <button onClick={cancelStream}>Cancel</button>}
    </div>
  );
}
```

---

## `useA2ADebug`

Captures HTTP request/response logs and protocol validation warnings from the
A2A client. Pass the returned object to `useA2AConnection` and
`useA2AMessages` to activate logging.

**Source:** [`hooks/use-a2a-debug.ts`](../../hooks/use-a2a-debug.ts)

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `logs` | `LogEntry[]` | Chronological list of HTTP and validation log entries |
| `validationWarnings` | `ValidationWarning[]` | Protocol compliance warnings from outgoing and incoming messages |
| `interceptors` | `CallInterceptor[]` | Pass to `createClientFactory` to capture HTTP traffic |
| `onTransportLog` | `(entry: AppendLogInput) => void` | Low-level log appender |
| `clearLogs` | `() => void` | Clear all logs and warnings |

### Example

```tsx
import { useA2ADebug } from "a2a-ui/hooks/use-a2a-debug";
import { useA2AConnection } from "a2a-ui/hooks/use-a2a-connection";

function DebugAwareAgent({ agentUrl }: { agentUrl: string }) {
  const debug = useA2ADebug();
  const { status } = useA2AConnection({ agentUrl, debug });

  return (
    <div>
      <p>Status: {status} — {debug.logs.length} log entries</p>
      {debug.validationWarnings.length > 0 && (
        <p>{debug.validationWarnings.length} protocol warning(s)</p>
      )}
      <button onClick={debug.clearLogs}>Clear logs</button>
    </div>
  );
}
```
