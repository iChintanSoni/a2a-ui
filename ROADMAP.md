# A2A UI Roadmap

This roadmap turns the repo comparison into a product and engineering plan for making this project the strongest open-source A2A UI: part inspector, part agent browser, part debugging workbench, and part rich interactive agent canvas.

## Product Positioning

Most competing repos are strong in one lane:

- `a2aproject/a2a-inspector`: protocol inspection and validation
- `a2a-community/a2a-ui`: polished chat plus Phoenix tracing
- `a2anet/a2a-ui`: clean A2A SDK browser model with contexts, tasks, artifacts, and tool calls
- `vishalmysore/simplea2ui`: A2UI rich interactive component rendering
- `pjordan/a2a-ui`: simple raw request playground
- `egor-baranov/a2a-ui`: product shell, auth, account, pricing, marketplace-style pages

Our goal is to combine the useful developer features into one coherent app:

> The best local-first A2A workbench for connecting, validating, debugging, tracing, and interacting with any A2A agent.

## Current Advantages To Preserve

- Per-agent authentication: none, bearer, API key, basic auth
- Per-agent custom HTTP headers
- Multiple saved agents with status indicators
- Agent settings route with display name, auth, headers, card re-fetch, share link, and remove flow
- A2A SDK client using JSON-RPC and REST transports
- Streaming chat with `contextId`, task status updates, artifacts, and agent messages
- File attachments with previews and MIME filtering from agent input modes
- Message metadata editor
- Tool-call rendering convention
- Debug console with request/response/error filtering
- Raw JSON inspection for chat items
- Chat export as JSON or Markdown
- IndexedDB persistence for agents and chats
- Built-in sample A2A server with LangChain, Gemini/Ollama paths, Tavily search, and image generation
- Vitest coverage for slices/auth/compliance utilities

## Strategic Pillars

### 1. Inspector-Grade Protocol Confidence

Make the app the fastest way to answer: "Is this agent actually A2A-compatible, and what exactly happened over the wire?"

Deliverables:

- Expand agent-card compliance beyond required field checks:
  - protocol version compatibility
  - transport interface validation
  - `additionalInterfaces` validation
  - default input/output mode consistency
  - skill input/output mode inheritance
  - auth/security scheme display if present
- Add message/task/event validation:
  - validate outgoing message parts before send
  - validate incoming status, artifact, message, and error events
  - surface warnings inline and in debug console
- Add raw transport visibility:
  - HTTP method, URL, status code, duration
  - resolved transport protocol
  - request/response headers with secrets masked
  - JSON-RPC id/method correlation
- Add a "Protocol Report" export:
  - agent card
  - compliance result
  - transports detected
  - failed requests and validation warnings

Why it matters:

This beats basic chat UIs and moves us closer to `a2a-inspector`, while keeping our stronger multi-agent/session UX.

### 2. Rich Interaction With A2UI

Support agents that return interactive UI surfaces, not just text and files.

Deliverables:

- Add an A2UI/Text mode toggle per chat or per agent.
- Send A2UI extension headers when enabled:
  - `X-A2A-Extensions: https://a2ui.org/a2a-extension/a2ui/v0.8`
- Detect A2UI data parts:
  - `metadata.mimeType === "application/json+a2ui"`
  - compatible variants in `data`/metadata payloads
- Render A2UI surfaces:
  - start with safe read-only rendering for common components
  - then add forms, buttons, selection controls, cards, lists, charts
- Send UI events back to the agent:
  - button clicks
  - form submissions
  - selection changes
  - component action payloads
- Add fixture examples:
  - flight booking
  - analytics dashboard
  - ecommerce product picker
  - graph/knowledge map

Why it matters:

This is the largest unique feature in `simplea2ui`. Adding it makes the project more than a chat client.

### 3. Trace And Observability Workbench

Make conversations inspectable at the agent/tool/span level.

Deliverables:

- Add Observability settings:
  - enable/disable tracing
  - Phoenix URL, default `http://localhost:6006`
  - project/session mapping strategy
- Add trace sidebar in chat:
  - spans for the current context/session
  - duration timeline
  - status/error badges
  - span attributes/details JSON
- Add Jaeger-style timeline view.
- Add graph view:
  - agent/tool/model relationships
  - parent-child spans
  - error highlighting
- Link chat items to trace spans when IDs/metadata match.
- Support manual refresh first, then polling/live mode.

Why it matters:

This closes the biggest gap with `a2a-community/a2a-ui` and pairs naturally with our debug console.

### 4. Advanced Request Playground

Add a raw protocol lab for unsupported methods and low-level debugging.

Deliverables:

- New "Playground" page or debug tab.
- Endpoint URL, method, headers, and JSON body editor.
- Presets:
  - fetch agent card
  - `message/send`
  - `message/stream`
  - task lookup
  - task cancel
- Response panel with:
  - status
  - headers
  - raw body
  - formatted JSON
  - copy/export
- Optional "Use selected agent credentials" toggle.

Why it matters:

This absorbs the useful simplicity of `pjordan/a2a-ui` without weakening the main chat experience.

### 5. Agent Library And Discovery

Turn "saved agents" into a usable local registry.

Deliverables:

- Dedicated agents page:
  - searchable list
  - filters by status, transport, skill tag, input/output modes
  - sort by name, last used, compliance score
- Agent detail page:
  - overview
  - skills
  - capabilities
  - compliance
  - recent chats
  - test actions
- Import/export workspace:
  - agents
  - settings
  - optional chats
  - secrets excluded by default
- Agent templates/examples:
  - local demo server
  - common sample agents
  - "add from share link"
- Optional public catalog later:
  - featured A2A agents
  - tags/categories
  - one-click add

Why it matters:

This borrows the useful marketplace direction from `egor-baranov/a2a-ui` without requiring account/billing complexity early.

### 6. Conversation, Task, And Event Management

Move beyond a sidebar of recent chats.

Deliverables:

- Dedicated conversations page:
  - all chats, not just last 10
  - search by title, agent, message text
  - delete/archive/rename
  - export selected chats
- Dedicated task list:
  - task ID
  - context ID
  - agent
  - status
  - timestamps
  - artifacts count
  - validation warnings
- Dedicated event list:
  - raw incoming/outgoing A2A events
  - filters by request, response, error, validation warning, task, artifact
- Conversation compare:
  - compare two runs against same prompt/agent
  - useful for agent regression testing

Why it matters:

This makes the app useful for real development and QA workflows, not only one-off demos.

### 7. Built-In Agent Test Harness

Give developers repeatable tests for their agents.

Deliverables:

- Test suite builder:
  - prompt
  - expected status
  - expected output mode
  - expected artifact type
  - optional regex/JSON assertions
- Run tests against a selected agent.
- Save run history.
- Export test report.
- Add smoke-test templates:
  - agent card loads
  - text chat works
  - streaming works
  - file input accepted/rejected correctly
  - task cancel works
  - auth failure handled cleanly

Why it matters:

None of the reference repos appear to provide a strong A2A agent QA workflow. This can become our standout feature.

### 8. Production Readiness

Make it easy to run, demo, and trust.

Deliverables:

- Dockerfile for UI.
- Dockerfile for bundled demo server.
- Docker Compose profile:
  - UI
  - demo A2A server
  - optional Phoenix
- Environment validation and documented `.env.example`.
- Error boundary around dashboard/chat.
- Secret masking everywhere:
  - auth forms
  - debug logs
  - exports
- CI:
  - lint
  - typecheck
  - test
  - build
- E2E smoke tests:
  - add demo agent
  - chat
  - inspect debug log
  - export chat

## Phased Plan

### Phase 0: Foundation Polish

Scope: 1-2 days

- Fix README/implementation drift:
  - either implement workspace import/export or remove the claim until implemented
  - verify chat title customization claim
- Add `.env.example` for UI and server.
- Add Docker support for current app/server.
- Add CI for lint, typecheck, tests, and build.
- Add simple error boundary for dashboard/chat routes.

Exit criteria:

- Fresh clone can run UI and demo server with documented commands.
- CI is green.
- README only claims features that exist.

### Phase 1: Better Inspector

Scope: 1 week

- Expand compliance validator.
- Add validation warnings for incoming events.
- Improve debug console with transport, duration, status, and masked headers.
- Add Protocol Report export.
- Add tests for compliance and debug masking.

Exit criteria:

- A developer can connect an agent and immediately see whether its card/events are valid.
- Debug logs can be shared without leaking secrets.

### Phase 2: Agent Library And Workspace

Scope: 1 week

- Dedicated agents page with search/filter/sort.
- Dedicated conversations page.
- Workspace import/export with secret-safe defaults.
- Rename/delete/archive chats.
- Agent tags/favorites.

Exit criteria:

- The app feels like a workbench for many agents and many sessions, not a single chat screen.

### Phase 3: A2UI Interactive Surfaces

Scope: 2-3 weeks

- Add A2UI mode toggle.
- Send extension header.
- Detect and render A2UI data parts.
- Implement event dispatch back to the agent.
- Add example fixtures and demo agent support.
- Add tests for mode/header behavior and component event payloads.

Exit criteria:

- A2UI-capable agents can show interactive UI components and receive user actions.

### Phase 4: Observability

Scope: 2 weeks

- Add Phoenix settings.
- Add trace sidebar.
- Add timeline view.
- Add graph view.
- Link trace spans to chat/debug events.
- Add Docker Compose option for Phoenix.

Exit criteria:

- A developer can inspect a chat at message, protocol, task, tool, and trace-span levels from one screen.

### Phase 5: Agent QA Harness

Scope: 2 weeks

- Add test-case builder.
- Add repeatable run execution.
- Add assertions for status/output/artifact/content.
- Add run history and report export.
- Add demo test pack for bundled server.

Exit criteria:

- The app can validate an agent before and after code changes.

### Phase 6: Public Polish And Differentiators

Scope: ongoing

- Add landing/demo page only after the core workbench is strong.
- Add sample agent catalog.
- Add shareable protocol reports.
- Add optional cloud-sync hooks later, keeping local-first behavior as default.
- Publish docs:
  - quickstart
  - connect an agent
  - debug an agent
  - A2UI guide
  - tracing guide
  - test harness guide

## Suggested Priority Order

1. Foundation polish and docs accuracy
2. Inspector-grade validation/debugging
3. Agent library and conversations/tasks/events pages
4. A2UI interactive rendering
5. Phoenix tracing
6. Agent QA harness
7. Catalog/marketplace/product-shell ideas

## Standout Features To Market

- "One UI for every A2A agent: chat, inspect, trace, test."
- Local-first workspace with saved agents, sessions, and debug history.
- Secret-safe protocol reports.
- A2UI rich component support.
- Agent QA harness for regression testing.
- Built-in demo A2A server for instant onboarding.

## Near-Term Implementation Checklist

- [ ] Add `.env.example` for UI/server
- [ ] Add Dockerfile and Docker Compose
- [ ] Add CI workflow
- [ ] Align README with current implementation
- [ ] Expand compliance checks
- [ ] Mask secrets in debug/export paths
- [ ] Add Protocol Report export
- [ ] Add agents list page
- [ ] Add conversations list page
- [ ] Add task/event explorer
- [ ] Add A2UI mode/header support
- [ ] Add A2UI renderer MVP
- [ ] Add Phoenix settings and trace sidebar MVP
- [ ] Add test harness MVP
