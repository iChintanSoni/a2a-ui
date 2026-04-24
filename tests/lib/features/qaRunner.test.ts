import { describe, expect, it } from "vitest";
import type { Client } from "@a2a-js/sdk/client";
import { executeQaSuite } from "@/lib/features/qa/runner";
import type { Agent } from "@/lib/features/agents/agentsSlice";
import type { QaSuite } from "@/lib/features/qa/types";

async function* fakeStream() {
  yield {
    kind: "status-update",
    taskId: "task-1",
    status: { state: "working" },
  };
  yield {
    kind: "message",
    role: "agent",
    messageId: "message-1",
    parts: [{ kind: "text", text: "QA ready" }],
  };
  yield {
    kind: "status-update",
    taskId: "task-1",
    status: { state: "completed" },
  };
}

const agent: Agent = {
  id: "agent-1",
  url: "https://agent.test",
  displayName: "Agent",
  status: "connected",
  auth: { type: "none" },
  customHeaders: [],
  card: {
    protocolVersion: "0.3.0",
    name: "Agent",
    description: "Test agent",
    url: "https://agent.test",
    version: "1",
    capabilities: {},
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
    skills: [],
  },
};

const suite: QaSuite = {
  id: "suite-1",
  name: "Smoke",
  agentUrl: agent.url,
  agentName: "Agent",
  createdAt: 1,
  updatedAt: 1,
  cases: [
    {
      id: "case-1",
      name: "Ready",
      prompt: "Are you ready?",
      attachments: [],
      metadata: { source: "test" },
      expectedTaskState: "completed",
      expectedOutputMode: "text",
      assertions: [
        {
          id: "assertion-1",
          kind: "content-regex",
          label: "Ready text",
          pattern: "ready",
          flags: "i",
        },
      ],
    },
  ],
};

describe("qa runner", () => {
  it("runs a suite against a client stream", async () => {
    const client = {
      sendMessageStream: () => fakeStream(),
    } as unknown as Client;

    const run = await executeQaSuite({ suite, agent, client });

    expect(run.passed).toBe(true);
    expect(run.caseResults).toHaveLength(1);
    expect(run.caseResults[0].finalTaskState).toBe("completed");
    expect(run.caseResults[0].assertionResults.every((result) => result.passed)).toBe(true);
  });
});
