import type { LogEntry } from "@/lib/utils/debugInterceptor";

export type ExecutionEventKind =
  | "outgoing-message"
  | "transport"
  | "validation"
  | "task-status"
  | "artifact-update"
  | "tool-call"
  | "agent-message";

export type ExecutionEventLevel = "info" | "warning" | "error";

export interface ExecutionEvent {
  id: string;
  chatId: string;
  kind: ExecutionEventKind;
  level: ExecutionEventLevel;
  timestamp: number;
  summary: string;
  requestId?: string;
  taskId?: string;
  messageId?: string;
  artifactId?: string;
  runId?: string;
  traceId?: string | null;
  spanId?: string | null;
  parentSpanId?: string | null;
  details?: Record<string, unknown>;
}

export interface ExecutionEventFilters {
  kind?: ExecutionEventKind | "all";
  requestId?: string;
  taskId?: string;
}

export interface TaskTimelineStage {
  key: string;
  label: string;
  level: ExecutionEventLevel;
  timestamp: number;
}

function normalizeCorrelationId(value: string | number | null | undefined): string | undefined {
  if (value == null) return undefined;
  return String(value);
}

function summarizeLogEntry(entry: LogEntry): string {
  if (entry.type === "validation") {
    const count = Array.isArray(entry.payload) ? entry.payload.length : 1;
    return `${count} validation warning${count === 1 ? "" : "s"}`;
  }

  const status =
    entry.transport?.status != null ? `${entry.transport.status}` : undefined;
  const duration =
    entry.transport?.durationMs != null ? `${entry.transport.durationMs}ms` : undefined;
  const parts = [entry.method, status, duration].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");

  if (entry.type === "error") return `${entry.method} failed`;
  return entry.method;
}

export function createExecutionEventFromLog(chatId: string, entry: LogEntry): ExecutionEvent {
  const requestId = normalizeCorrelationId(entry.transport?.jsonRpcId);
  const logKind = entry.type === "validation" ? "validation" : "transport";
  const level: ExecutionEventLevel =
    entry.type === "error" ||
    (entry.transport?.status != null && (entry.transport.status < 200 || entry.transport.status >= 400))
      ? "error"
      : entry.type === "validation"
        ? "warning"
        : "info";

  return {
    id: crypto.randomUUID(),
    chatId,
    kind: logKind,
    level,
    timestamp: entry.timestamp,
    summary: summarizeLogEntry(entry),
    requestId,
    traceId: null,
    spanId: null,
    parentSpanId: null,
    details: {
      logType: entry.type,
      method: entry.method,
      payload: entry.payload,
      transport: entry.transport,
    },
  };
}

export function filterExecutionEvents(
  events: ExecutionEvent[],
  filters: ExecutionEventFilters,
): ExecutionEvent[] {
  const kind = filters.kind ?? "all";
  const requestId = filters.requestId?.trim();
  const taskId = filters.taskId?.trim();

  return events.filter((event) => {
    if (kind !== "all" && event.kind !== kind) return false;
    if (requestId && event.requestId !== requestId) return false;
    if (taskId && event.taskId !== taskId) return false;
    return true;
  });
}

export function getTransportSummary(events: ExecutionEvent[]) {
  const transportEvents = events.filter((event) => event.kind === "transport");
  const durations = transportEvents
    .map((event) => {
      const details = event.details?.transport;
      if (!details || typeof details !== "object" || !("durationMs" in details)) return null;
      const duration = (details as { durationMs?: unknown }).durationMs;
      return typeof duration === "number" ? duration : null;
    })
    .filter((value): value is number => value != null);

  return {
    total: transportEvents.length,
    errors: transportEvents.filter((event) => event.level === "error").length,
    avgDurationMs:
      durations.length > 0
        ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
        : null,
  };
}

export function getTaskTimelineStages(
  events: ExecutionEvent[],
  taskId: string,
): TaskTimelineStage[] {
  const stages = new Map<string, TaskTimelineStage>();

  for (const event of events) {
    if (event.taskId !== taskId) continue;

    if (event.kind === "task-status") {
      const state = event.details?.state;
      if (typeof state !== "string") continue;

      const labelMap: Record<string, string> = {
        submitted: "Submitted",
        working: "Working",
        "input-required": "Input Required",
        completed: "Completed",
        failed: "Failed",
        canceled: "Canceled",
        rejected: "Rejected",
        "auth-required": "Auth Required",
        unknown: "Unknown",
      };
      if (!stages.has(state)) {
        stages.set(state, {
          key: state,
          label: labelMap[state] ?? state,
          level: event.level,
          timestamp: event.timestamp,
        });
      }
      continue;
    }

    if (event.kind === "tool-call") {
      const phase = event.details?.phase;
      if (phase === "running" && !stages.has("tool-started")) {
        stages.set("tool-started", {
          key: "tool-started",
          label: "Tool Started",
          level: event.level,
          timestamp: event.timestamp,
        });
      }
      if ((phase === "done" || phase === "error") && !stages.has("tool-finished")) {
        stages.set("tool-finished", {
          key: "tool-finished",
          label: phase === "error" ? "Tool Failed" : "Tool Finished",
          level: event.level,
          timestamp: event.timestamp,
        });
      }
      continue;
    }

    if (
      event.kind === "artifact-update" &&
      !stages.has("artifact-streamed")
    ) {
      stages.set("artifact-streamed", {
        key: "artifact-streamed",
        label: "Artifact Streamed",
        level: event.level,
        timestamp: event.timestamp,
      });
    }
  }

  return [...stages.values()].sort((a, b) => a.timestamp - b.timestamp);
}
