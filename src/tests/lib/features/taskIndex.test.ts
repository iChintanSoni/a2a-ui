import { describe, expect, it } from "vitest";
import type { Chat } from "@/lib/features/chats/chatsSlice";
import { buildTaskSummaries } from "@/lib/features/chats/taskIndex";

describe("buildTaskSummaries", () => {
  it("derives task summaries with artifacts, warnings, and timeline stages", () => {
    const chats: Chat[] = [
      {
        id: "chat-1",
        title: "Weather run",
        agentUrl: "https://agent.test",
        agentName: "Weather Agent",
        lastMessage: "What is the forecast?",
        timestamp: 1,
        items: [
          {
            kind: "task-status",
            id: "task-1",
            taskId: "task-1",
            state: "completed",
            statusMessage: {
              parts: [{ kind: "text", text: "Forecast ready" }],
            },
            timestamp: 20,
          },
          {
            kind: "artifact",
            id: "artifact-1",
            taskId: "task-1",
            name: "forecast.md",
            parts: [{ kind: "text", text: "# Forecast" }],
            isStreaming: false,
            timestamp: 25,
          },
        ],
        executionEvents: [
          {
            id: "event-1",
            chatId: "chat-1",
            kind: "task-status",
            level: "info",
            timestamp: 10,
            summary: "Task working",
            taskId: "task-1",
            traceId: null,
            spanId: null,
            parentSpanId: null,
            details: { state: "working" },
          },
          {
            id: "event-2",
            chatId: "chat-1",
            kind: "artifact-update",
            level: "info",
            timestamp: 15,
            summary: "Artifact updated",
            taskId: "task-1",
            artifactId: "artifact-1",
            traceId: null,
            spanId: null,
            parentSpanId: null,
            details: {},
          },
          {
            id: "event-3",
            chatId: "chat-1",
            kind: "validation",
            level: "warning",
            timestamp: 18,
            summary: "1 validation warning",
            taskId: "task-1",
            traceId: null,
            spanId: null,
            parentSpanId: null,
            details: {},
          },
        ],
      },
    ];

    const summaries = buildTaskSummaries(chats);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      chatId: "chat-1",
      contextId: "chat-1",
      taskId: "task-1",
      state: "completed",
      artifactCount: 1,
      artifactNames: ["forecast.md"],
      validationWarningCount: 1,
      latestStatusText: "Forecast ready",
    });
    expect(summaries[0].timelineStages.map((stage) => stage.key)).toEqual([
      "working",
      "artifact-streamed",
    ]);
  });

  it("includes artifact-only tasks with an unknown state", () => {
    const chats: Chat[] = [
      {
        id: "chat-2",
        title: "Artifact only run",
        agentUrl: "https://agent.test",
        agentName: "Weather Agent",
        lastMessage: "",
        timestamp: 1,
        items: [
          {
            kind: "artifact",
            id: "artifact-2",
            taskId: "task-2",
            name: "result.txt",
            parts: [{ kind: "text", text: "Done" }],
            isStreaming: false,
            timestamp: 5,
          },
        ],
        executionEvents: [],
      },
    ];

    const summaries = buildTaskSummaries(chats);

    expect(summaries).toHaveLength(1);
    expect(summaries[0].taskId).toBe("task-2");
    expect(summaries[0].state).toBe("unknown");
    expect(summaries[0].artifactCount).toBe(1);
  });
});
