import type { AgentCard } from "@a2a-js/sdk";

/**
 * A minimal, spec-complete v1.0 AgentCard. Protobuf-generated types require
 * every field, so building one inline in each test is 15 lines of noise.
 */
export function makeAgentCard(overrides: Partial<AgentCard> = {}): AgentCard {
  return {
    name: "Test Agent",
    description: "desc",
    version: "1.0.0",
    supportedInterfaces: [
      {
        url: "https://agent.test",
        protocolBinding: "JSONRPC",
        tenant: "",
        protocolVersion: "1.0",
      },
    ],
    provider: undefined,
    capabilities: { streaming: true, extensions: [] },
    securitySchemes: {},
    securityRequirements: [],
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
    skills: [],
    signatures: [],
    ...overrides,
  };
}

export function makeAgentSkill(
  overrides: Partial<AgentCard["skills"][number]> = {},
): AgentCard["skills"][number] {
  return {
    id: "s1",
    name: "Skill One",
    description: "Does stuff",
    tags: [],
    examples: [],
    inputModes: [],
    outputModes: [],
    securityRequirements: [],
    ...overrides,
  };
}
