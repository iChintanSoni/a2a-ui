import { describe, expect, it } from "vitest";
import type { Chat } from "@/lib/features/chats/chatsSlice";
import type { LogEntry } from "@/lib/utils/debugInterceptor";
import { buildChatTraceJson, buildChatTraceMarkdown, chatTraceFilename } from "@/lib/utils/chatExport";

const GENERATED_AT = "2026-05-20T12:00:00.000Z";

function makeTraceChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: "chat-1",
    title: "Chat with IBM Cloud Diagram Agent",
    agentUrl: "https://agent.test/a2a",
    agentName: "IBM Cloud Diagram Agent",
    lastMessage: "Create a small IBM Cloud diagram",
    timestamp: 1_000,
    archived: false,
    pinned: false,
    items: [
      {
        kind: "user-message",
        id: "msg-user-1",
        parts: [{ kind: "text", text: "Create a small IBM Cloud diagram" }],
        metadata: { traceToken: "secret-token", safe: "visible" },
        timestamp: 1_000,
      },
      {
        kind: "tool-call",
        id: "tool-run-1",
        toolName: "diagram_search",
        query: "public load balancer in vpc",
        resultCount: 2,
        phase: "done",
        timestamp: 1_700,
      },
      {
        kind: "artifact",
        id: "artifact-1",
        taskId: "task-1",
        name: "ibm-cloud-diagram.md",
        description: "Generated diagram markdown",
        parts: [{ kind: "text", text: "Diagram artifact with Load Balancer -> VSI" }],
        metadata: { usage: { total_tokens: 120 } },
        isStreaming: false,
        timestamp: 2_000,
      },
      {
        kind: "agent-message",
        id: "msg-agent-1",
        taskId: "task-1",
        parts: [{ kind: "text", text: "The diagram is ready." }],
        timestamp: 2_100,
      },
      {
        kind: "task-status",
        id: "task-1",
        taskId: "task-1",
        state: "completed",
        statusMessage: { parts: [{ kind: "text", text: "Completed successfully" }] },
        timestamp: 2_200,
      },
    ],
    executionEvents: [
      {
        id: "evt-transport-1",
        chatId: "chat-1",
        kind: "transport",
        level: "info",
        timestamp: 1_100,
        summary: "message/send - 200 - 31ms",
        requestId: "7",
        traceId: null,
        spanId: null,
        parentSpanId: null,
        details: {
          method: "message/send",
          transport: {
            httpMethod: "POST",
            jsonRpcMethod: "message/send",
            status: 200,
            durationMs: 31,
            requestHeaders: {
              Authorization: "Bearer secret-token",
            },
          },
        },
      },
      {
        id: "evt-validation-1",
        chatId: "chat-1",
        kind: "validation",
        level: "warning",
        timestamp: 1_150,
        summary: "1 validation warning",
        traceId: null,
        spanId: null,
        parentSpanId: null,
        details: {
          payload: [{ id: "part-kind", message: "Part kind is valid" }],
        },
      },
      {
        id: "evt-status-1",
        chatId: "chat-1",
        kind: "task-status",
        level: "info",
        timestamp: 1_200,
        summary: "Task working",
        taskId: "task-1",
        traceId: null,
        spanId: null,
        parentSpanId: null,
        details: { state: "working" },
      },
      {
        id: "evt-tool-1",
        chatId: "chat-1",
        kind: "tool-call",
        level: "info",
        timestamp: 1_600,
        summary: "diagram_search finished",
        taskId: "task-1",
        artifactId: "tool-run-1",
        runId: "tool-run-1",
        traceId: null,
        spanId: null,
        parentSpanId: null,
        details: {
          phase: "done",
          toolName: "diagram_search",
          query: "public load balancer in vpc",
          resultCount: 2,
        },
      },
    ],
    ...overrides,
  };
}

describe("chat trace export", () => {
  it("builds a readable markdown trace with transcript and under-the-hood context", () => {
    const markdown = buildChatTraceMarkdown({
      chat: makeTraceChat(),
      generatedAt: GENERATED_AT,
      validationWarnings: [
        {
          id: "part-kind",
          label: "Part kind",
          message: "Part kind is valid",
          path: "message.parts[0]",
        },
      ],
    });

    expect(markdown).toContain("# Chat with IBM Cloud Diagram Agent");
    expect(markdown).toContain("**You:**");
    expect(markdown).toContain("Create a small IBM Cloud diagram");
    expect(markdown).toContain("**Agent:**");
    expect(markdown).toContain("The diagram is ready.");
    expect(markdown).toContain("Diagram artifact with Load Balancer -> VSI");
    expect(markdown).toContain("Tool: diagram_search");
    expect(markdown).toContain("Task task-1");
    expect(markdown).toContain("request 7");
    expect(markdown).toContain("200 - 31ms");
    expect(markdown).toContain("Validation Warnings");
    expect(markdown).toContain("********");
    expect(markdown).not.toContain("Bearer secret-token");
  });

  it("builds sanitized forensic json with merged live logs and capped payloads", () => {
    const logs: LogEntry[] = [
      {
        id: "log-1",
        timestamp: 3_000,
        type: "transport",
        method: "message/send",
        payload: {
          apiKey: "super-secret",
          body: "x".repeat(13_000),
        },
        transport: {
          httpMethod: "POST",
          status: 401,
          durationMs: 44,
          jsonRpcId: 99,
          jsonRpcMethod: "message/send",
          requestHeaders: {
            Authorization: "Bearer super-secret",
          },
        },
      },
    ];

    const trace = buildChatTraceJson({
      chat: makeTraceChat(),
      logs,
      generatedAt: GENERATED_AT,
    });
    const serialized = JSON.stringify(trace);

    expect(trace.version).toBe(1);
    expect(trace.generatedAt).toBe(GENERATED_AT);
    expect(trace.summary.transportErrorCount).toBe(1);
    expect(trace.summary.includesLiveDebugLogs).toBe(true);
    expect(trace.protocol?.failedRequests).toHaveLength(1);
    expect(trace.events.some((event) => event.requestId === "99")).toBe(true);
    expect(serialized).toContain("********");
    expect(serialized).toContain("[truncated");
    expect(serialized).not.toContain("Bearer super-secret");
    expect(serialized).not.toContain("super-secret");
  });

  it("marks older chats with no execution events as trace-unavailable", () => {
    const chat = makeTraceChat({ executionEvents: [] });
    const trace = buildChatTraceJson({ chat, generatedAt: GENERATED_AT });
    const markdown = buildChatTraceMarkdown({ chat, generatedAt: GENERATED_AT });

    expect(trace.summary.traceUnavailable).toBe(true);
    expect(markdown).toContain("Trace history is unavailable for this chat.");
  });

  it("generates stable trace filenames", () => {
    expect(chatTraceFilename(makeTraceChat(), "markdown")).toBe(
      "Chat_with_IBM_Cloud_Diagram_Agent_trace.md",
    );
    expect(chatTraceFilename(makeTraceChat({ title: "!!!" }), "json")).toBe("chat_trace.json");
  });
});
