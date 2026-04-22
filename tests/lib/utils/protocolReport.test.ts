import { describe, expect, it } from "vitest";
import type { AgentCard } from "@a2a-js/sdk";
import { buildProtocolReport } from "@/lib/utils/protocolReport";
import type { Agent } from "@/lib/features/agents/agentsSlice";
import type { Chat } from "@/lib/features/chats/chatsSlice";

const agent: Agent = {
  id: "agent-1",
  url: "https://agent.test",
  card: {
    name: "Demo Agent",
    description: "desc",
    url: "https://agent.test",
    version: "1.0.0",
    protocolVersion: "0.3.0",
    capabilities: {},
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
    skills: [],
  } satisfies AgentCard,
  status: "connected",
  auth: { type: "bearer", bearerToken: "secret-token" },
  customHeaders: [{ key: "X-Api-Key", value: "super-secret" }],
};

const chat: Chat = {
  id: "chat-1",
  title: "Test Chat",
  agentUrl: agent.url,
  agentName: agent.card.name,
  lastMessage: "hello",
  timestamp: 1,
  items: [],
  executionEvents: [
    {
      id: "evt-1",
      chatId: "chat-1",
      kind: "transport",
      level: "error",
      timestamp: 1,
      summary: "message/send · 401 · 30ms",
      requestId: "req-1",
      traceId: null,
      spanId: null,
      parentSpanId: null,
      details: {
        transport: {
          requestHeaders: {
            Authorization: "********",
          },
        },
      },
    },
  ],
};

describe("protocol reports", () => {
  it("includes normalized execution events and keeps masked data safe", () => {
    const report = buildProtocolReport({
      agent,
      chat,
      compliance: {
        checks: [],
        passCount: 0,
        failCount: 0,
        warningCount: 0,
      },
      logs: [
        {
          id: "log-1",
          timestamp: 1,
          type: "transport",
          method: "message/send",
          payload: {},
          transport: {
            status: 401,
            requestHeaders: {
              Authorization: "Bearer secret-token",
            },
          },
        },
      ],
      validationWarnings: [],
    });

    expect(report.executionEventCount).toBe(1);
    expect(report.executionEvents[0].requestId).toBe("req-1");
    expect(report.failedRequests).toHaveLength(1);
    expect(
      (report.failedRequests[0].transport?.requestHeaders as Record<string, string>).Authorization,
    ).toBe("********");
  });
});
