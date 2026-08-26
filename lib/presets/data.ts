import type { AgentPreset } from "./types";

export const CURATED_AGENT_PRESETS: AgentPreset[] = [
  {
    id: "local-demo-agent",
    name: "Local Demo Agent",
    category: "local",
    tags: ["local", "demo", "search", "creative", "a2ui"],
    summary:
      "Built-in full-featured demo server running on localhost with search, image generation, and A2UI support.",
    description:
      "A complete reference implementation configured for the bundled demo server (`npm run dev` in `server/`). Supports dual JSON-RPC and REST interfaces, multimodality, and live streaming.",
    agent: {
      url: "http://localhost:3001",
      displayName: "Local Demo Agent",
      tags: ["local", "demo", "multimodal"],
      favorite: true,
      a2uiEnabled: true,
      status: "disconnected",
      auth: { type: "none" },
      customHeaders: [],
      card: {
        name: "Local Demo Agent",
        description:
          "Conversational A2A reference agent with web search, image input, image generation, and A2UI demo surfaces.",
        url: "http://localhost:3001/a2a/jsonrpc",
        version: "1.0.0",
        protocolVersion: "0.3.0",
        preferredTransport: "JSONRPC",
        defaultInputModes: ["text/plain", "image/*"],
        defaultOutputModes: ["text/plain", "image/png", "application/vnd.a2ui+json"],
        capabilities: {
          streaming: true,
          stateTransitionHistory: true,
        },
        additionalInterfaces: [
          { url: "http://localhost:3001/a2a/jsonrpc", transport: "JSONRPC" },
          { url: "http://localhost:3001/a2a/rest", transport: "HTTP+JSON" },
        ],
        skills: [
          {
            id: "chat",
            name: "Chat & Search",
            description: "General conversational answering and live web search.",
            tags: ["chat", "search"],
            examples: [
              "What is the capital of France?",
              "Search for recent announcements about the Agent2Agent protocol",
            ],
            inputModes: ["text/plain", "image/*"],
            outputModes: ["text/plain"],
          },
          {
            id: "image-generation",
            name: "Image Generation",
            description: "Generate creative imagery from descriptive text prompts.",
            tags: ["image", "creative"],
            examples: [
              "Generate an image of a cybernetic observatory at dawn",
              "Render a minimalist diagram of microservices",
            ],
            inputModes: ["text/plain"],
            outputModes: ["image/png"],
          },
          {
            id: "a2ui-demo",
            name: "A2UI Structured Surface",
            description: "Render interactive, read-only UI components using standard A2UI schemas.",
            tags: ["a2ui", "structured-ui"],
            examples: [
              "Show me an A2UI demo surface with system telemetry",
              "Render a server health status card",
            ],
            inputModes: ["text/plain"],
            outputModes: ["application/vnd.a2ui+json"],
          },
        ],
      },
    },
    samplePrompts: [
      "What is the capital of France?",
      "Search for recent announcements about the Agent2Agent protocol",
      "Generate an image of a cybernetic observatory at dawn",
      "Show me an A2UI demo surface with system telemetry",
    ],
    sampleChats: [
      {
        title: "Explore A2A Protocol",
        agentUrl: "http://localhost:3001",
        agentName: "Local Demo Agent",
        lastMessage:
          "Agent2Agent (A2A) enables interoperability between heterogeneous autonomous agents.",
        timestamp: Date.now() - 3600000,
        archived: false,
        pinned: true,
        executionEvents: [],
        items: [
          {
            id: "msg-1",
            kind: "user-message",
            timestamp: Date.now() - 3600000,
            parts: [
              { kind: "text", text: "What is the primary goal of the Agent2Agent protocol?" },
            ],
          },
          {
            id: "msg-2",
            kind: "agent-message",
            timestamp: Date.now() - 3590000,
            parts: [
              {
                kind: "text",
                text: "The primary goal of the Agent2Agent (A2A) protocol is to provide a standardized, transport-agnostic interface enabling autonomous AI agents to discover capabilities, exchange structured tasks, stream multimodal artifacts, and coordinate workflows securely across different platforms and runtimes.",
              },
            ],
          },
          {
            id: "task-1",
            kind: "task-status",
            taskId: "task-demo-01",
            state: "completed",
            timestamp: Date.now() - 3580000,
          },
        ],
      },
    ],
  },
  {
    id: "weather-scout-agent",
    name: "Weather Scout Agent",
    category: "remote",
    tags: ["remote", "weather", "forecasting", "alerts"],
    summary:
      "Remote weather intelligence agent providing forecasts, severe climate alerts, and radar synthesis.",
    description:
      "A remote meteorological agent demonstrating HTTP+JSON transport, parameter validation, structured table outputs, and proactive alert subscription models.",
    agent: {
      url: "https://weather-agent.a2a.dev/a2a",
      displayName: "Weather Scout",
      tags: ["remote", "meteorology", "forecasting"],
      favorite: false,
      a2uiEnabled: true,
      status: "disconnected",
      auth: { type: "none" },
      customHeaders: [],
      card: {
        name: "Weather Scout",
        description:
          "Specialized meteorology and climate intelligence agent delivering hyper-local forecasts and radar analysis.",
        url: "https://weather-agent.a2a.dev/a2a",
        version: "2.1.0",
        protocolVersion: "0.3.0",
        preferredTransport: "HTTP+JSON",
        defaultInputModes: ["text/plain"],
        defaultOutputModes: ["text/plain", "application/json"],
        capabilities: {
          streaming: true,
          stateTransitionHistory: true,
        },
        additionalInterfaces: [
          { url: "https://weather-agent.a2a.dev/a2a", transport: "HTTP+JSON" },
        ],
        skills: [
          {
            id: "current-weather",
            name: "Current Conditions",
            description:
              "Get real-time temperature, humidity, wind, and air quality index for any location.",
            tags: ["weather", "realtime"],
            examples: [
              "What is the weather in San Francisco right now?",
              "Current conditions and air quality in Berlin",
            ],
            inputModes: ["text/plain"],
            outputModes: ["text/plain", "application/json"],
          },
          {
            id: "forecast-7day",
            name: "7-Day Forecast",
            description: "Multi-day meteorological forecast with precipitation probabilities.",
            tags: ["forecast", "planning"],
            examples: [
              "Give me the 7-day weather outlook for Tokyo",
              "Will it rain in London this weekend?",
            ],
            inputModes: ["text/plain"],
            outputModes: ["text/plain"],
          },
          {
            id: "severe-alerts",
            name: "Severe Weather Alerts",
            description:
              "Check active meteorological warnings, storm watches, and advisory advisories.",
            tags: ["safety", "alerts"],
            examples: ["Any active cyclone or blizzard warnings in the Northeast?"],
            inputModes: ["text/plain"],
            outputModes: ["text/plain"],
          },
        ],
      },
    },
    samplePrompts: [
      "What is the weather in San Francisco right now?",
      "Give me the 7-day weather outlook for Tokyo",
      "Any active cyclone or blizzard warnings in the Northeast?",
    ],
    sampleChats: [
      {
        title: "Tokyo 7-Day Forecast",
        agentUrl: "https://weather-agent.a2a.dev/a2a",
        agentName: "Weather Scout",
        lastMessage: "Tokyo Forecast: Highs near 22°C with mild cloud cover throughout the week.",
        timestamp: Date.now() - 7200000,
        archived: false,
        pinned: false,
        executionEvents: [],
        items: [
          {
            id: "w-msg-1",
            kind: "user-message",
            timestamp: Date.now() - 7200000,
            parts: [{ kind: "text", text: "What is the 7-day forecast for Tokyo?" }],
          },
          {
            id: "w-msg-2",
            kind: "agent-message",
            timestamp: Date.now() - 7190000,
            parts: [
              {
                kind: "text",
                text: "Here is the 7-day meteorological forecast for **Tokyo, Japan**:\n\n- **Monday**: 21°C / 14°C — Sunny with gentle breeze\n- **Tuesday**: 22°C / 15°C — Partly cloudy\n- **Wednesday**: 19°C / 13°C — Light showers in the afternoon (60% chance)\n- **Thursday**: 20°C / 12°C — Clear and dry\n- **Friday**: 23°C / 16°C — Mild sunshine\n- **Saturday**: 24°C / 17°C — Warm with scattered clouds\n- **Sunday**: 21°C / 15°C — Overcast with moderate winds",
              },
            ],
          },
          {
            id: "w-task-1",
            kind: "task-status",
            taskId: "task-weather-01",
            state: "completed",
            timestamp: Date.now() - 7180000,
          },
        ],
      },
    ],
  },
  {
    id: "deep-research-agent",
    name: "Deep Research Agent",
    category: "research",
    tags: ["research", "literature", "citations", "synthesis"],
    summary:
      "Academic and technical literature research agent producing structured markdown briefs with citations.",
    description:
      "A research-centric agent demonstrating multi-stage task execution, artifact generation, citations extraction, and comparative synthesis.",
    agent: {
      url: "https://research-agent.a2a.dev/a2a",
      displayName: "Deep Research",
      tags: ["research", "academic", "synthesis"],
      favorite: false,
      a2uiEnabled: false,
      status: "disconnected",
      auth: { type: "none" },
      customHeaders: [],
      card: {
        name: "Deep Research Agent",
        description:
          "Autonomous literature and technical synthesizer that compiles multi-source research dossiers.",
        url: "https://research-agent.a2a.dev/a2a",
        version: "1.4.2",
        protocolVersion: "0.3.0",
        preferredTransport: "JSONRPC",
        defaultInputModes: ["text/plain"],
        defaultOutputModes: ["text/plain", "text/markdown"],
        capabilities: {
          streaming: true,
          stateTransitionHistory: true,
        },
        additionalInterfaces: [{ url: "https://research-agent.a2a.dev/a2a", transport: "JSONRPC" }],
        skills: [
          {
            id: "literature-review",
            name: "Literature Review",
            description:
              "Scan scholarly preprints, conference proceedings, and RFCs on a targeted topic.",
            tags: ["academic", "papers"],
            examples: [
              "Conduct a literature review on consensus algorithms for distributed multi-agent systems",
            ],
            inputModes: ["text/plain"],
            outputModes: ["text/markdown"],
          },
          {
            id: "citation-extractor",
            name: "Citation & Benchmark Extractor",
            description: "Extract verifiable claims, metric tables, and BibTeX citations.",
            tags: ["citations", "benchmarks"],
            examples: ["Extract benchmark results comparing JSON-RPC vs gRPC latency"],
            inputModes: ["text/plain"],
            outputModes: ["text/markdown"],
          },
        ],
      },
    },
    samplePrompts: [
      "Conduct a literature review on consensus algorithms for distributed multi-agent systems",
      "Extract benchmark results comparing JSON-RPC vs gRPC latency",
    ],
    sampleChats: [
      {
        title: "Multi-Agent Consensus Survey",
        agentUrl: "https://research-agent.a2a.dev/a2a",
        agentName: "Deep Research Agent",
        lastMessage: "Generated research brief on Multi-Agent Consensus Mechanisms.",
        timestamp: Date.now() - 18000000,
        archived: false,
        pinned: false,
        executionEvents: [],
        items: [
          {
            id: "r-msg-1",
            kind: "user-message",
            timestamp: Date.now() - 18000000,
            parts: [
              {
                kind: "text",
                text: "Summarize recent paradigms in decentralized multi-agent coordination.",
              },
            ],
          },
          {
            id: "r-art-1",
            kind: "artifact",
            taskId: "task-research-01",
            isStreaming: false,
            timestamp: Date.now() - 17990000,
            name: "Decentralized-Coordination-Brief.md",
            description:
              "Synthesized review of token-bucket negotiation vs leader-election topologies.",
            parts: [
              {
                kind: "text",
                text: "# Decentralized Multi-Agent Coordination\n\n## 1. Topologies\n- **Hierarchical Delegation**: Orchestrator delegates subtasks to domain specialists.\n- **Peer Negotiation**: Direct Agent2Agent communication via mutual discovery cards.\n\n## 2. Key Challenges\n1. Latency overhead in nested multi-hop chains.\n2. Security boundaries & capability verification.\n3. Dynamic context compression across long-lived tasks.",
              },
            ],
          },
          {
            id: "r-task-1",
            kind: "task-status",
            taskId: "task-research-01",
            state: "completed",
            timestamp: Date.now() - 17980000,
          },
        ],
      },
    ],
  },
  {
    id: "support-concierge-agent",
    name: "Support Concierge Agent",
    category: "productivity",
    tags: ["support", "auth", "tickets", "triage"],
    summary: "Customer support triage agent configured with API Key authentication headers.",
    description:
      "An enterprise-ready customer support triage agent illustrating authentication configuration (`X-API-Key`), custom headers, and multi-tenant task routing.",
    agent: {
      url: "https://support-agent.a2a.dev/a2a",
      displayName: "Support Concierge",
      tags: ["support", "enterprise", "auth"],
      favorite: false,
      a2uiEnabled: true,
      status: "disconnected",
      auth: {
        type: "api-key",
        apiKeyHeader: "X-API-Key",
        apiKeyValue: "sample-demo-api-key-12345",
      },
      customHeaders: [{ key: "X-Tenant-ID", value: "tenant-dev-sandbox" }],
      card: {
        name: "Support Concierge",
        description:
          "Intelligent support triage agent with automated diagnostics, priority tagging, and ticket routing.",
        url: "https://support-agent.a2a.dev/a2a",
        version: "3.0.0",
        protocolVersion: "0.3.0",
        preferredTransport: "JSONRPC",
        defaultInputModes: ["text/plain"],
        defaultOutputModes: ["text/plain", "application/json"],
        capabilities: {
          streaming: true,
          stateTransitionHistory: true,
        },
        additionalInterfaces: [{ url: "https://support-agent.a2a.dev/a2a", transport: "JSONRPC" }],
        skills: [
          {
            id: "ticket-triage",
            name: "Ticket Triage",
            description:
              "Analyze incoming customer bug or incident descriptions and assign severity scores.",
            tags: ["triage", "incident"],
            examples: ["Triage incident: Client reports 500 error when uploading 50MB audio files"],
            inputModes: ["text/plain"],
            outputModes: ["text/plain", "application/json"],
          },
          {
            id: "knowledge-base",
            name: "Knowledge Base Search",
            description:
              "Retrieve recommended resolution articles from the technical support catalog.",
            tags: ["kb", "faq"],
            examples: ["Find troubleshooting steps for SSL handshake timeouts"],
            inputModes: ["text/plain"],
            outputModes: ["text/plain"],
          },
        ],
      },
    },
    samplePrompts: [
      "Triage incident: Client reports 500 error when uploading 50MB audio files",
      "Find troubleshooting steps for SSL handshake timeouts",
    ],
    sampleChats: [
      {
        title: "Triage Incident #5081",
        agentUrl: "https://support-agent.a2a.dev/a2a",
        agentName: "Support Concierge",
        lastMessage: "Incident prioritized as P1 with recommended root-cause diagnostic steps.",
        timestamp: Date.now() - 86400000,
        archived: false,
        pinned: false,
        executionEvents: [],
        items: [
          {
            id: "s-msg-1",
            kind: "user-message",
            timestamp: Date.now() - 86400000,
            parts: [
              {
                kind: "text",
                text: "Customer reports: 'Our webhook endpoints are intermittently timing out under high load.'",
              },
            ],
          },
          {
            id: "s-msg-2",
            kind: "agent-message",
            timestamp: Date.now() - 86390000,
            parts: [
              {
                kind: "text",
                text: "### Triage Assessment: Incident #5081\n\n- **Severity**: P2 (Elevated)\n- **Suspected Area**: Webhook retry queue exhaustion / concurrency limits\n- **Recommended Action**:\n  1. Inspect egress proxy connection pools.\n  2. Enable exponential backoff on failed attempts.\n  3. Verify whether target endpoints respond within 2000ms.",
              },
            ],
          },
          {
            id: "s-task-1",
            kind: "task-status",
            taskId: "task-support-01",
            state: "completed",
            timestamp: Date.now() - 86380000,
          },
        ],
      },
    ],
  },
];
