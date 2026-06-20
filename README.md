# A2A UI

A local-first developer workbench for building, testing, and debugging
[Agent2Agent (A2A)](https://a2a-protocol.org/latest/specification/) protocol servers.
Connect agents, run interactive chats, inspect execution events, compare runs,
automate QA suites, and embed the same chat primitives in your own app.

```bash
npx a2a-ui           # start the dashboard on port 3000
npx a2a-ui --open    # start and open in the default browser
npx a2a-ui --port 3100 --open
```

## Documentation

| Section | Description |
|---------|-------------|
| [Getting Started](docs/getting-started.md) | Install, run, demo server, Docker, first-run walkthrough |
| **Dashboard features** | |
| [Workbench](docs/features/workbench.md) | Metrics hub, workspace import/export |
| [Agent Library](docs/features/agent-library.md) | Connect, search, filter, and manage agents |
| [Agent Settings](docs/features/agent-settings.md) | Auth, headers, compliance, card inspection |
| [Chat](docs/features/chat.md) | Send messages, stream artifacts, debug, export |
| [Conversations](docs/features/conversations.md) | Search, clone, batch export, archive |
| [Tasks](docs/features/tasks.md) | Task-centric view, state filter, artifacts, presets |
| [QA Harness](docs/features/qa-harness.md) | Build suites, assert, parametrize, run headlessly |
| [Compare Runs](docs/features/compare-runs.md) | Side-by-side prompt/output/artifact/timing diff |
| **Embeddable API** | |
| [Embedding Guide](docs/embed.md) | Step-by-step integration into your own app |
| [Hooks Reference](docs/api/hooks.md) | `useA2AConnection`, `useA2ASession`, `useA2AMessages`, `useA2ADebug` |
| [Components Reference](docs/api/components.md) | `A2AChat`, `A2AAgentCard`, `A2ADebugPanel`, `EventExplorer` |
| **Internals** | |
| [Architecture](docs/architecture.md) | Redux slices, IndexedDB, hook chain, event flow |
| [Contributing](CONTRIBUTING.md) | Local setup, branch naming, tests, submitting a PR |

## Useful References

- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [Next.js Documentation](https://nextjs.org/docs)
