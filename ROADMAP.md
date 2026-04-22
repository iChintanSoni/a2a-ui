# A2A UI Roadmap

`a2a-ui` already covers the core of an A2A developer workbench:

- multi-agent connection and auth
- agent card inspection and compliance checks
- persistent chat sessions with artifacts, tool calls, and debug logs
- workspace import/export
- a bundled Ollama-based demo server

The next step is not adding random surface area. It is turning the current app into a stronger platform:

1. reusable and embeddable
2. more observable
3. better for iteration and QA
4. ready for richer local-first workflows later

## Product Direction

The goal is to make `a2a-ui` the best local-first A2A workbench for:

- connecting to agents
- validating protocol behavior
- debugging transport and event flow
- inspecting task, artifact, and tool execution
- embedding A2A chat and inspection into other apps

## What We Should Optimize For

- Keep the current dashboard strong before chasing new modalities.
- Prefer structured observability over exposing chain-of-thought.
- Prefer local-first and secret-safe exports by default.
- Build extensibility in layers: hooks first, components second, integrations third.
- Treat browser-only local tool execution as a later step. Use a safer bridge model first.

## Current Strengths To Preserve

- per-agent auth and custom headers
- saved agents, tags, favorites, and workspace persistence
- agent card viewer with compliance reporting
- streaming chat with artifacts, statuses, and tool calls
- file attachments with MIME-aware filtering
- debug console with transport and validation logs
- JSON inspection and protocol report export
- conversation management and workspace import/export
- bundled demo server using Ollama and Tavily

## Priority Order

### Now

- embeddable core and headless state
- structured observability and trace-ready event model
- better task, event, and artifact workflows

### Next

- QA and regression tooling
- editable artifacts and compare-runs workflows
- A2UI and richer structured surfaces where protocol support exists

### Later

- local tool execution through a companion bridge
- richer modalities like voice and live media
- optional catalogs, sharing, and hosted collaboration features

## Implementation Phases

### Phase 1: Embeddable Core

Status:
Complete.

Objective:
Turn the current app from a dashboard-only product into a reusable A2A client foundation.

Why first:
This multiplies the value of the code already in the repo. It also makes every later feature usable in both the dashboard and an embeddable widget.

Deliverables:

- Extract session and transport behavior into stable hooks:
  - `useA2AConnection`
  - `useA2ASession`
  - `useA2AMessages`
  - `useA2ADebug`
- Separate headless session logic from page composition.
- Introduce an embeddable chat surface:
  - `A2AChat`
  - `A2AAgentCard`
  - `A2ADebugPanel`
- Add host-controlled props for:
  - agent URL
  - auth
  - headers
  - initial context metadata
  - session persistence mode
- Add a context injection API for host apps:
  - initial metadata
  - hidden system context
  - per-message context enrichers
- Keep the dashboard using the same primitives internally.

Repo areas:

- [hooks](/Users/chintansoni/Github/a2a-ui/hooks)
- [components/chat](/Users/chintansoni/Github/a2a-ui/components/chat)
- [lib/features](/Users/chintansoni/Github/a2a-ui/lib/features)
- [app/dashboard](/Users/chintansoni/Github/a2a-ui/app/dashboard)

Implementation steps:

1. Move chat session orchestration out of the route layer and into dedicated hooks.
2. Create a transport/session adapter interface so UI components stop depending on page-local orchestration.
3. Refactor current dashboard chat screen to consume the new hooks.
4. Add a minimal embeddable example page in-app or under a demo route.
5. Add tests around host-supplied auth, headers, and context injection.

Exit criteria:

- The dashboard and an embeddable chat widget both run on the same session primitives.
- Host apps can inject context without forking the dashboard.
- No regression in current workspace persistence or debug behavior.

### Phase 2: Structured Observability

Status:
Complete.

Objective:
Upgrade from request/response logging to a unified execution timeline across messages, tasks, artifacts, tool calls, validation warnings, and future traces.

Why second:
This is the biggest product-quality jump for developer users, and it builds directly on the current debug console.

Deliverables:

- Define a normalized event model for:
  - outgoing messages
  - transport requests and responses
  - validation warnings
  - task state changes
  - artifact updates
  - tool call lifecycle
  - trace/span links
- Add a dedicated event explorer view.
- Expand the debug console with:
  - correlation by task ID and request ID
  - header inspection with secret masking
  - latency and transport summaries
- Add a timeline view in chat:
  - submitted
  - working
  - tool started
  - tool finished
  - artifact streamed
  - completed
- Add trace placeholders and linking fields now, even before a trace backend is integrated.
- Support protocol report export from the normalized event store.

Important product note:
Do not implement “thought expanders” or chain-of-thought views. Show structured execution data instead: spans, tools, retrieved docs, timings, and status transitions.

Repo areas:

- [components/chat/DebugPanel.tsx](/Users/chintansoni/Github/a2a-ui/components/chat/DebugPanel.tsx)
- [components/chat/ChatMessages.tsx](/Users/chintansoni/Github/a2a-ui/components/chat/ChatMessages.tsx)
- [lib/features/chats/chatsSlice.ts](/Users/chintansoni/Github/a2a-ui/lib/features/chats/chatsSlice.ts)
- [lib/utils/debugInterceptor.ts](/Users/chintansoni/Github/a2a-ui/lib/utils/debugInterceptor.ts)
- [lib/utils/protocolReport.ts](/Users/chintansoni/Github/a2a-ui/lib/utils/protocolReport.ts)

Implementation steps:

1. Create a normalized event schema in state.
2. Refactor current debug logging and task/artifact updates to emit into that schema.
3. Add event filtering and correlation views.
4. Extend exports and protocol reports to include normalized execution events.
5. Add tests for masking, correlation, and export shape.

Exit criteria:

- A developer can inspect a run end-to-end without reading raw logs only.
- Debug exports remain safe to share.
- Event correlation works across request, task, artifact, and tool updates.

### Phase 3: Workflow And Artifact Iteration

Status:
Complete.

Objective:
Make the app better for repeated agent development, not just one-off chats.

Why third:
Once the data model is reusable and observable, the next leverage is iteration speed.

Deliverables:

- Dedicated task explorer:
  - task ID
  - context ID
  - agent
  - state
  - related artifacts
  - validation warnings
- Run comparison view:
  - same prompt across two runs
  - output diff
  - artifact diff
  - timing comparison
- Editable artifact flows:
  - inline edit for text and markdown artifacts
  - submit diff or revised artifact back to the agent as context
- Better conversation workflows:
  - pin key chats
  - clone a session into a new run
  - rerun previous prompts
- Saved debugging presets:
  - favorite filters
  - repeatable test prompts
  - per-agent default metadata

Repo areas:

- [app/dashboard/conversations/page.tsx](/Users/chintansoni/Github/a2a-ui/app/dashboard/conversations/page.tsx)
- [components/chat/ArtifactBlock.tsx](/Users/chintansoni/Github/a2a-ui/components/chat/ArtifactBlock.tsx)
- [components/chat/TaskStatusRow.tsx](/Users/chintansoni/Github/a2a-ui/components/chat/TaskStatusRow.tsx)
- [lib/features/chats/chatsSlice.ts](/Users/chintansoni/Github/a2a-ui/lib/features/chats/chatsSlice.ts)

Implementation steps:

1. Add a task-centric index derived from existing chat/task state.
2. Add chat/session clone and rerun actions.
3. Introduce editable text artifact support first.
4. Add compare-runs UI for same-agent prompt regression checks.
5. Persist presets and task filters in IndexedDB.

Exit criteria:

- Developers can compare runs and iterate on outputs without leaving the app.
- Artifact revision is possible for at least text and markdown.
- The app supports task-oriented workflows, not just chat-oriented ones.

### Phase 4: QA Harness

Objective:
Let developers define repeatable agent checks and run them against local or remote agents.

Why before richer modalities:
This creates immediate value for engineering teams and makes `a2a-ui` useful in CI-adjacent workflows.

Deliverables:

- Test case builder:
  - prompt
  - attachments
  - metadata
  - expected task state
  - expected output mode
  - regex and JSON assertions
- Saved test suites per agent.
- Run history with pass/fail results.
- Exportable QA reports.
- Bundled smoke suite for the demo server.

Repo areas:

- new QA pages under `app/dashboard`
- [lib/features/chats](/Users/chintansoni/Github/a2a-ui/lib/features/chats)
- [lib/utils](/Users/chintansoni/Github/a2a-ui/lib/utils)
- [tests](/Users/chintansoni/Github/a2a-ui/tests)

Implementation steps:

1. Define a serializable test-case schema.
2. Reuse Phase 1 session primitives to run tests headlessly.
3. Build assertion helpers for status, content, artifact, and tool events.
4. Add run-history persistence and export.
5. Add demo test fixtures and CI-friendly sample docs.

Exit criteria:

- A developer can save and rerun the same agent test suite.
- Results are understandable without digging through raw logs.
- The harness works against the bundled demo server.

### Phase 5: A2UI And Structured Rich Surfaces

Objective:
Support interactive, structured agent-rendered UI where the protocol or extension supports it.

Why here:
This is valuable, but it should sit on top of a stronger reusable and observable foundation.

Deliverables:

- A2UI capability toggle per agent or session.
- Extension header support.
- Detection and rendering of supported structured UI payloads.
- Safe renderer for read-only surfaces first.
- Event dispatch back to the agent for interactive controls later.
- Example fixtures and demo flows.

Repo areas:

- [components/chat/PartRenderer.tsx](/Users/chintansoni/Github/a2a-ui/components/chat/PartRenderer.tsx)
- [components/chat/ArtifactBlock.tsx](/Users/chintansoni/Github/a2a-ui/components/chat/ArtifactBlock.tsx)
- [server/src/agent.ts](/Users/chintansoni/Github/a2a-ui/server/src/agent.ts)

Implementation steps:

1. Add structured payload detection and logging.
2. Ship read-only rendering for a small supported subset.
3. Add interactive controls only after event contracts are clear.
4. Add demo-server fixtures for local development.
5. Add tests for payload parsing and event dispatch.

Exit criteria:

- Structured agent UI can be rendered safely.
- Interactive controls work for a constrained supported subset.

### Phase 6: Local Tool Execution Bridge

Objective:
Enable local-first tool execution without turning the browser into an unsafe general-purpose runtime.

Why later:
This is strategically important but architecturally heavy. It needs a stronger trust and execution model than the current app.

Recommendation:
Do not start with browser-only MCP. Start with a local bridge or companion process.

Deliverables:

- Define a local tool bridge protocol.
- Add UI-level registration for local tool providers.
- Support tool request interception and approval UX.
- Execute approved tools through the local bridge.
- Stream tool results back into the A2A session.
- Add clear security prompts and audit history.

Possible shapes:

- desktop companion app
- localhost bridge service
- signed local CLI helper

Repo areas:

- new local-bridge package or companion app
- [app/api/proxy/route.ts](/Users/chintansoni/Github/a2a-ui/app/api/proxy/route.ts)
- [components/chat](/Users/chintansoni/Github/a2a-ui/components/chat)

Implementation steps:

1. Write the trust model and approval UX first.
2. Implement a minimal localhost bridge with one safe tool.
3. Add user approval and audit logging.
4. Add tool result streaming into the existing artifact/event model.
5. Expand tool types only after the approval model is solid.

Exit criteria:

- Sensitive local data stays local by default.
- Users can see and approve what runs locally.
- Local execution integrates with existing observability surfaces.

### Phase 7: Rich Modalities

Objective:
Add voice and richer live media only after the workbench foundation is solid.

Deliverables:

- voice input and output mapping to declared modes
- streaming audio transport support where agents provide it
- richer artifact editing for diagrams, tables, and code

Exit criteria:

- New modalities fit the same session, observability, and export model.

## Suggested Sequencing By Quarter

### Milestone A

- Phase 1 complete
- Phase 2 in MVP form

Result:
`a2a-ui` becomes both a strong dashboard and a reusable A2A frontend foundation.

### Milestone B

- Phase 2 complete
- Phase 3 complete
- Phase 4 started

Result:
`a2a-ui` becomes a real agent development workbench, not just a client.

### Milestone C

- Phase 4 complete
- Phase 5 MVP

Result:
The product supports both QA workflows and richer structured agent interactions.

### Milestone D

- Phase 6 exploration
- Phase 7 only if demanded by users

Result:
The platform expands carefully into local-first execution and richer modalities.

## Near-Term Execution Checklist

- [x] Refactor chat/session logic into reusable hooks
- [x] Create an internal embeddable `A2AChat` component
- [x] Define a normalized execution event schema
- [x] Correlate debug logs, tasks, artifacts, and tool calls
- [x] Add an event explorer view
- [x] Add a task explorer view
- [x] Add run clone and rerun actions
- [x] Add compare-runs support
- [ ] Define QA test-case schema
- [ ] Build saved test suites and run history
- [ ] Add A2UI payload detection and renderer MVP
- [ ] Write local tool bridge trust model before implementation

## Explicit Non-Goals For The Next Phase

- exposing model chain-of-thought
- building a marketplace before the workbench is stronger
- browser-only unrestricted local tool execution
- prioritizing voice ahead of embeddability and observability
