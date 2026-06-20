# Embedding Guide

A2A UI exports headless hooks and ready-made components that you can embed in
any React application. This guide walks you through integration from scratch.

---

## 1. Install

```bash
npm install a2a-ui
```

---

## 2. Set up the Redux store

The hooks and components share state through a Redux store. Create one from
the exported factory and wrap your app (or the relevant subtree) with a
`<Provider>`.

```tsx
// lib/a2a-store.ts
import { createA2AStore } from "a2a-ui/lib/store";
export const a2aStore = createA2AStore();

// app/layout.tsx (Next.js) or App.tsx (CRA / Vite)
import { Provider } from "react-redux";
import { a2aStore } from "@/lib/a2a-store";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Provider store={a2aStore}>{children}</Provider>
      </body>
    </html>
  );
}
```

---

## 3. Drop in the chat widget

The simplest integration: one component, no hooks needed.

```tsx
import { A2AChat } from "a2a-ui/components/chat/A2AChat";

export default function SupportPage() {
  return (
    <div style={{ height: "600px", display: "flex", flexDirection: "column" }}>
      <A2AChat
        agentUrl="https://your-agent.example.com"
        auth={{ type: "bearer", token: process.env.NEXT_PUBLIC_AGENT_TOKEN! }}
        title="Support assistant"
      />
    </div>
  );
}
```

See [Components Reference → A2AChat](api/components.md#a2achat) for all props.

---

## 4. Add the debug panel

Enable protocol visibility alongside the chat:

```tsx
import { A2AChat } from "a2a-ui/components/chat/A2AChat";

<A2AChat
  agentUrl="https://your-agent.example.com"
  showDebugPanel={true}      // default: true
  showEventExplorer={true}   // default: true
/>
```

Or render it separately using hooks:

```tsx
import { useState } from "react";
import { useA2ADebug } from "a2a-ui/hooks/use-a2a-debug";
import { useA2AConnection } from "a2a-ui/hooks/use-a2a-connection";
import { A2ADebugPanel } from "a2a-ui/components/chat/A2ADebugPanel";

function DevLayout({ agentUrl }) {
  const debug = useA2ADebug();
  const connection = useA2AConnection({ agentUrl, debug });
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div>
      {/* your custom chat UI using connection / debug */}
      <button onClick={() => setShowDebug((v) => !v)}>
        Debug ({debug.logs.length})
      </button>
      {showDebug && (
        <A2ADebugPanel
          logs={debug.logs}
          validationWarnings={debug.validationWarnings}
          onClear={debug.clearLogs}
        />
      )}
    </div>
  );
}
```

---

## 5. Authentication patterns

### Bearer token

```tsx
<A2AChat
  agentUrl="https://your-agent.example.com"
  auth={{ type: "bearer", token: "eyJhbGciOiJSUzI1NiJ9…" }}
/>
```

### API key

```tsx
<A2AChat
  agentUrl="https://your-agent.example.com"
  auth={{ type: "api-key", headerName: "X-API-Key", headerValue: "sk-…" }}
/>
```

### Basic auth

```tsx
<A2AChat
  agentUrl="https://your-agent.example.com"
  auth={{ type: "basic", username: "user", password: "p@ssw0rd" }}
/>
```

---

## 6. Custom persistence

By default, messages are kept in component memory (`persistenceMode="memory"`)
and cleared on unmount. To persist across page loads or route changes, supply
your own store:

```tsx
import { useA2AMessages } from "a2a-ui/hooks/use-a2a-messages";
import type { A2AExternalMessageStore } from "a2a-ui/lib/a2a/types";

// Build a store backed by your own state management / database
const myStore: A2AExternalMessageStore = {
  chat: undefined,
  ensureChat: (meta) => { /* create chat record */ },
  sanitizeStaleStreaming: (contextId) => { /* cleanup */ },
  addUserMessage: (payload) => { /* store message */ },
  applyStatusUpdate: (payload) => { /* update task state */ },
  applyArtifactUpdate: (payload) => { /* upsert artifact */ },
  applyToolCall: (payload) => { /* record tool call */ },
  applyAgentMessage: (payload) => { /* store agent message */ },
  appendExecutionEvent: (payload) => { /* append event */ },
};

function PersistentChat({ agentUrl }) {
  const debug = useA2ADebug();
  const connection = useA2AConnection({ agentUrl, debug });
  const session = useA2ASession();
  const { items, sendMessage } = useA2AMessages({
    connection, debug, session,
    persistenceMode: "external",
    store: myStore,
  });
  // render items …
}
```

---

## 7. Hooks-only (build your own UI)

Skip the components entirely and build on the hooks:

```tsx
import { useA2ADebug } from "a2a-ui/hooks/use-a2a-debug";
import { useA2AConnection } from "a2a-ui/hooks/use-a2a-connection";
import { useA2ASession } from "a2a-ui/hooks/use-a2a-session";
import { useA2AMessages } from "a2a-ui/hooks/use-a2a-messages";

function HeadlessChat({ agentUrl, auth }) {
  const debug = useA2ADebug();
  const connection = useA2AConnection({ agentUrl, auth, debug, autoConnect: true });
  const session = useA2ASession();
  const { items, isInputRequired, sendMessage, cancelStream } = useA2AMessages({
    connection, debug, session,
  });

  const [input, setInput] = useState("");
  const handleSend = () => {
    sendMessage([{ kind: "text", text: input }]);
    setInput("");
  };

  return (
    <div>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.kind === "task-status" && `Task: ${item.state}`}
            {item.kind === "agent-message" && item.parts.map((p) =>
              p.kind === "text" ? p.text : `[${p.kind}]`
            ).join("")}
          </li>
        ))}
      </ul>
      {isInputRequired && <p>⚠️ Agent needs input</p>}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

---

## 8. Live demo

Run the dashboard and navigate to the **Embed Demo** tab:

```bash
npx a2a-ui --open
```

The Embed Demo page shows a live `<A2AChat />` component alongside a
copy-paste React snippet pre-filled with the demo agent URL.

---

## Import paths

All public exports are importable from within the `a2a-ui` package:

```ts
// Hooks
import { useA2AConnection } from "a2a-ui/hooks/use-a2a-connection";
import { useA2ASession }    from "a2a-ui/hooks/use-a2a-session";
import { useA2AMessages }   from "a2a-ui/hooks/use-a2a-messages";
import { useA2ADebug }      from "a2a-ui/hooks/use-a2a-debug";

// Components
import { A2AChat }        from "a2a-ui/components/chat/A2AChat";
import { A2AAgentCard }   from "a2a-ui/components/chat/A2AAgentCard";
import { A2ADebugPanel }  from "a2a-ui/components/chat/A2ADebugPanel";
import { EventExplorer }  from "a2a-ui/components/chat/EventExplorer";

// Store
import { createA2AStore } from "a2a-ui/lib/store";

// Types
import type { AuthConfig, CustomHeader }       from "a2a-ui/lib/features/agents/agentsSlice";
import type { A2AContextConfig, A2ASessionPersistenceMode, A2AExternalMessageStore } from "a2a-ui/lib/a2a/types";
```
