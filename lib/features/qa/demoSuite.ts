import type { Agent } from "@/lib/features/agents/agentsSlice";
import type { QaSuite } from "@/lib/features/qa/types";

export function createDemoSmokeSuite(agent: Agent): QaSuite {
  const now = Date.now();
  const agentName = agent.displayName ?? agent.card.name;
  return {
    id: crypto.randomUUID(),
    agentUrl: agent.url,
    agentName,
    name: `${agentName} smoke suite`,
    description: "Basic QA checks for the bundled demo agent flow.",
    createdAt: now,
    updatedAt: now,
    cases: [
      {
        id: crypto.randomUUID(),
        name: "Returns a helpful text response",
        prompt: "Reply with one concise sentence confirming you are ready for A2A QA.",
        attachments: [],
        metadata: { source: "a2a-ui-qa-smoke" },
        expectedTaskState: "completed",
        expectedOutputMode: "text",
        assertions: [
          {
            id: crypto.randomUUID(),
            kind: "content-regex",
            label: "Mentions QA or ready",
            pattern: "qa|ready",
            flags: "i",
          },
        ],
      },
    ],
  };
}
