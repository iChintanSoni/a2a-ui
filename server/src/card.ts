import type { AgentCard } from "@a2a-js/sdk";

export function createAgentCard(baseUrl: string): AgentCard {
  const jsonRpcUrl = `${baseUrl}/a2a/jsonrpc`;
  const restUrl = `${baseUrl}/a2a/rest`;

  return {
    name: "Chat Agent",
    description: "A conversational A2A agent with search, image input, image generation, and A2UI demo surfaces.",
    url: jsonRpcUrl,
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
      { url: jsonRpcUrl, transport: "JSONRPC" },
      { url: restUrl, transport: "HTTP+JSON" },
    ],
    skills: [
      {
        id: "chat",
        name: "Chat",
        description: "Answer conversational prompts and use web search when current information is needed.",
        tags: ["chat", "search"],
        examples: ["What is the capital of France?", "Search for the latest news on AI"],
        inputModes: ["text/plain", "image/*"],
        outputModes: ["text/plain"],
      },
      {
        id: "image-generation",
        name: "Image Generation",
        description: "Generate an image from a text prompt.",
        tags: ["image", "generation", "creative"],
        examples: ["Generate an image of a sunset over mountains", "Draw a futuristic city at night"],
        inputModes: ["text/plain"],
        outputModes: ["image/png"],
      },
      {
        id: "a2ui-demo",
        name: "A2UI Demo",
        description: "Return a read-only structured UI fixture for renderer testing.",
        tags: ["a2ui", "structured-ui", "demo"],
        examples: ["Show me an A2UI demo surface", "Render a structured status summary"],
        inputModes: ["text/plain"],
        outputModes: ["application/vnd.a2ui+json"],
      },
    ],
  };
}
