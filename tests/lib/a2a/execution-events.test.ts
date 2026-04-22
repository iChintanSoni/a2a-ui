import { describe, expect, it } from "vitest";
import {
  createExecutionEventFromLog,
  filterExecutionEvents,
  getTaskTimelineStages,
  getTransportSummary,
  type ExecutionEvent,
} from "@/lib/a2a/execution-events";

describe("execution events", () => {
  it("normalizes transport logs with request correlation", () => {
    const event = createExecutionEventFromLog("chat-1", {
      id: "log-1",
      timestamp: 100,
      type: "transport",
      method: "message/send",
      payload: { ok: true },
      transport: {
        jsonRpcId: 42,
        status: 200,
        durationMs: 35,
      },
    });

    expect(event.kind).toBe("transport");
    expect(event.requestId).toBe("42");
    expect(event.summary).toContain("35ms");
  });

  it("filters by task and request correlation ids", () => {
    const events: ExecutionEvent[] = [
      {
        id: "evt-1",
        chatId: "chat-1",
        kind: "transport",
        level: "info",
        timestamp: 1,
        summary: "transport",
        requestId: "req-1",
        taskId: "task-a",
        traceId: null,
        spanId: null,
        parentSpanId: null,
      },
      {
        id: "evt-2",
        chatId: "chat-1",
        kind: "task-status",
        level: "info",
        timestamp: 2,
        summary: "task",
        taskId: "task-b",
        traceId: null,
        spanId: null,
        parentSpanId: null,
      },
    ];

    expect(
      filterExecutionEvents(events, { kind: "all", requestId: "req-1", taskId: "task-a" }),
    ).toHaveLength(1);
    expect(
      filterExecutionEvents(events, { kind: "task-status", taskId: "task-b" }),
    ).toHaveLength(1);
  });

  it("derives timeline stages and transport summary", () => {
    const events: ExecutionEvent[] = [
      {
        id: "evt-1",
        chatId: "chat-1",
        kind: "task-status",
        level: "info",
        timestamp: 1,
        summary: "submitted",
        taskId: "task-1",
        traceId: null,
        spanId: null,
        parentSpanId: null,
        details: { state: "submitted" },
      },
      {
        id: "evt-2",
        chatId: "chat-1",
        kind: "tool-call",
        level: "info",
        timestamp: 2,
        summary: "tool start",
        taskId: "task-1",
        traceId: null,
        spanId: null,
        parentSpanId: null,
        details: { phase: "running" },
      },
      {
        id: "evt-3",
        chatId: "chat-1",
        kind: "artifact-update",
        level: "info",
        timestamp: 3,
        summary: "artifact",
        taskId: "task-1",
        traceId: null,
        spanId: null,
        parentSpanId: null,
      },
      {
        id: "evt-4",
        chatId: "chat-1",
        kind: "transport",
        level: "error",
        timestamp: 4,
        summary: "transport",
        traceId: null,
        spanId: null,
        parentSpanId: null,
        details: { transport: { durationMs: 120 } },
      },
    ];

    expect(getTaskTimelineStages(events, "task-1").map((stage) => stage.key)).toEqual([
      "submitted",
      "tool-started",
      "artifact-streamed",
    ]);
    expect(getTransportSummary(events)).toEqual({
      total: 1,
      errors: 1,
      avgDurationMs: 120,
    });
  });
});
