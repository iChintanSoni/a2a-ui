import { describe, expect, it } from "vitest";
import { compareRuns } from "@/lib/features/chats/compareRuns";
import type { Chat } from "@/lib/features/chats/chatsSlice";

function makeChat(overrides: Partial<Chat>): Chat {
  return {
    id: "chat-1",
    title: "Run A",
    agentUrl: "https://agent.test",
    agentName: "Demo Agent",
    lastMessage: "What is the forecast?",
    timestamp: 1,
    items: [],
    executionEvents: [],
    ...overrides,
  };
}

describe("compareRuns", () => {
  it("compares prompt, output, artifacts, and timing", () => {
    const left = makeChat({
      items: [
        {
          kind: "user-message",
          id: "u1",
          parts: [{ kind: "text", text: "What is the forecast?" }],
          timestamp: 1,
        },
        {
          kind: "agent-message",
          id: "a1",
          parts: [{ kind: "text", text: "Sunny" }],
          timestamp: 2,
        },
        {
          kind: "artifact",
          id: "artifact-1",
          taskId: "task-1",
          name: "forecast.md",
          parts: [{ kind: "text", text: "Sunny\nWarm" }],
          isStreaming: false,
          timestamp: 3,
        },
      ],
      executionEvents: [
        {
          id: "evt-1",
          chatId: "chat-1",
          kind: "outgoing-message",
          level: "info",
          timestamp: 10,
          summary: "Message submitted",
          traceId: null,
          spanId: null,
          parentSpanId: null,
        },
        {
          id: "evt-2",
          chatId: "chat-1",
          kind: "task-status",
          level: "info",
          timestamp: 30,
          summary: "Task completed",
          taskId: "task-1",
          traceId: null,
          spanId: null,
          parentSpanId: null,
          details: { state: "completed" },
        },
      ],
    });

    const right = makeChat({
      id: "chat-2",
      title: "Run B",
      items: [
        {
          kind: "user-message",
          id: "u2",
          parts: [{ kind: "text", text: "What is the forecast?" }],
          timestamp: 1,
        },
        {
          kind: "agent-message",
          id: "a2",
          parts: [{ kind: "text", text: "Rainy" }],
          timestamp: 2,
        },
        {
          kind: "artifact",
          id: "artifact-2",
          taskId: "task-2",
          name: "forecast.md",
          parts: [{ kind: "text", text: "Rainy\nCool" }],
          isStreaming: false,
          timestamp: 3,
        },
      ],
      executionEvents: [
        {
          id: "evt-3",
          chatId: "chat-2",
          kind: "outgoing-message",
          level: "info",
          timestamp: 10,
          summary: "Message submitted",
          traceId: null,
          spanId: null,
          parentSpanId: null,
        },
        {
          id: "evt-4",
          chatId: "chat-2",
          kind: "task-status",
          level: "info",
          timestamp: 40,
          summary: "Task completed",
          taskId: "task-2",
          traceId: null,
          spanId: null,
          parentSpanId: null,
          details: { state: "completed" },
        },
      ],
    });

    const comparison = compareRuns(left, right);

    expect(comparison.sameAgent).toBe(true);
    expect(comparison.samePrompt).toBe(true);
    expect(comparison.outputDiff.changed).toBe(true);
    expect(comparison.durationDeltaMs).toBe(10);
    expect(comparison.artifactComparisons).toHaveLength(1);
    expect(comparison.artifactComparisons[0].diff.changed).toBe(true);
  });
});
