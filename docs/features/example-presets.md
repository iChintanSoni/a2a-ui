# Example Agent Gallery & Workspace Presets

The **Example Agent Gallery** makes it easy for developers, researchers, and newcomers to explore **a2a-ui** instantly without needing to manually run or configure an external agent server first.

---

## 1. Overview

The gallery includes a curated collection of diverse Agent2Agent (A2A) protocol configurations demonstrating:

- **Local Development**: Connect to the bundled local reference server (`http://localhost:3001`).
- **Remote Interfaces**: Work with remote endpoints over HTTP+JSON or JSON-RPC.
- **Multimodality**: Image input, image generation (`image/png`), and A2UI structured UI surfaces (`application/vnd.a2ui+json`).
- **Authentication**: API-Key and Bearer header configurations.
- **Starter Chats**: Realistic pre-configured conversation histories, tasks, and prompt starters.

---

## 2. Bundled Presets

| Agent                       | Transport              | Key Capabilities & Skills                                       |
| --------------------------- | ---------------------- | --------------------------------------------------------------- |
| **Local Demo Agent**        | `JSONRPC`, `HTTP+JSON` | Chat & Search, Image Generation, A2UI Demo surfaces             |
| **Weather Scout Agent**     | `HTTP+JSON`            | Current conditions, 7-day forecast, severe climate alerts       |
| **Deep Research Agent**     | `JSONRPC`              | Multi-source literature review, citation & benchmark extraction |
| **Support Concierge Agent** | `JSONRPC`              | Customer incident triage, API-Key authentication (`X-API-Key`)  |

---

## 3. How to Use the Gallery in the UI

1. Click **Example Gallery** in the Workbench header, Agent Library, or Workspace toolbar.
2. Filter by category (**Local**, **Remote**, **Research**, **Productivity**) or search by skill name / keyword.
3. Click **Import Preset** to import an individual agent and its starter conversations into your active workspace.
4. Click **Import All Examples** to populate your workspace with all curated agents at once.

---

## 4. Contributing New Presets

To add a new example agent preset to the gallery:

1. Open [`lib/presets/data.ts`](file:///Users/chintansoni/Github/a2a-ui/lib/presets/data.ts).
2. Append a new entry conforming to `AgentPreset`:

```typescript
{
  id: "my-custom-agent",
  name: "My Custom Agent",
  category: "productivity", // "local" | "remote" | "research" | "productivity" | "demo"
  tags: ["custom", "nlp", "automation"],
  summary: "Brief one-line summary of what this agent does.",
  description: "Detailed description of the agent architecture and skills.",
  agent: {
    url: "https://my-agent.example.com/a2a",
    displayName: "My Custom Agent",
    tags: ["custom"],
    favorite: false,
    a2uiEnabled: true,
    status: "disconnected",
    auth: { type: "none" },
    customHeaders: [],
    card: {
      name: "My Custom Agent",
      description: "Full agent card description.",
      url: "https://my-agent.example.com/a2a",
      version: "1.0.0",
      protocolVersion: "0.3.0",
      preferredTransport: "JSONRPC",
      defaultInputModes: ["text/plain"],
      defaultOutputModes: ["text/plain"],
      capabilities: {
        streaming: true,
      },
      skills: [
        {
          id: "skill-1",
          name: "Summarizer",
          description: "Summarizes text documents.",
          tags: ["nlp"],
          examples: ["Summarize this document: ..."],
          inputModes: ["text/plain"],
          outputModes: ["text/plain"],
        },
      ],
    },
  },
  samplePrompts: ["Summarize this document: ..."],
  sampleChats: [],
}
```

3. Run the preset validation tests:

```bash
npm test -- tests/lib/presets/presetUtils.test.ts
```
