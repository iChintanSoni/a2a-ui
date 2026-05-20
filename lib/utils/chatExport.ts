import type { Part } from "@a2a-js/sdk";
import {
  createExecutionEventFromLog,
  getTaskTimelineStages,
  getTransportSummary,
  type ExecutionEvent,
  type TaskTimelineStage,
} from "@/lib/a2a/execution-events";
import type {
  AgentMessageItem,
  ArtifactItem,
  Chat,
  ChatItem,
  TaskStatusItem,
  ToolCallItem,
  UserMessageItem,
} from "@/lib/features/chats/chatsSlice";
import type { ValidationWarning } from "@/lib/utils/compliance";
import { maskSecrets, type LogEntry } from "@/lib/utils/debugInterceptor";

const TRACE_EXPORT_VERSION = 1;
const MAX_PAYLOAD_STRING_LENGTH = 12_000;
const MAX_MARKDOWN_BLOCK_LENGTH = 8_000;
const MAX_ARRAY_ITEMS = 100;
const MAX_OBJECT_DEPTH = 8;

export type ChatTraceFormat = "markdown" | "json";

export interface ChatTraceInput {
  chat: Chat;
  logs?: LogEntry[];
  validationWarnings?: ValidationWarning[];
  generatedAt?: string;
}

export interface ChatTraceTranscriptEntry {
  index: number;
  kind: ChatItem["kind"];
  id: string;
  timestamp: number;
  timestampIso: string;
  title: string;
  role?: "user" | "agent";
  taskId?: string;
  text?: string;
  metadata?: unknown;
  parts?: unknown[];
  state?: string;
  statusMessage?: string;
  artifact?: {
    id: string;
    name?: string;
    description?: string;
    isStreaming: boolean;
  };
  tool?: {
    runId: string;
    name: string;
    query: string;
    phase: ToolCallItem["phase"];
    resultCount?: number;
  };
}

export interface ChatTraceTask {
  taskId: string;
  firstSeenAt: number;
  firstSeenAtIso: string;
  latestState?: string;
  timeline: Array<Omit<TaskTimelineStage, "timestamp"> & { timestamp: number; timestampIso: string }>;
  states: Array<{
    state: string;
    timestamp: number;
    timestampIso: string;
    message?: string;
  }>;
  artifactIds: string[];
  messageIds: string[];
  toolRunIds: string[];
  eventIds: string[];
}

export interface ChatTraceArtifact {
  id: string;
  taskId: string;
  name?: string;
  description?: string;
  timestamp: number;
  timestampIso: string;
  isStreaming: boolean;
  partCount: number;
  modalities: Record<string, number>;
  text?: string;
  metadata?: unknown;
  parts: unknown[];
}

export interface ChatTraceEvent extends Omit<ExecutionEvent, "details"> {
  timestampIso: string;
  details?: unknown;
}

export interface ChatTraceExport {
  version: typeof TRACE_EXPORT_VERSION;
  generatedAt: string;
  chat: {
    id: string;
    title: string;
    agentName: string;
    agentUrl: string;
    lastMessage: string;
    timestamp: number;
    timestampIso: string;
    archived: boolean;
    pinned: boolean;
    sourceChatId?: string;
    itemCount: number;
    executionEventCount: number;
  };
  summary: {
    userMessageCount: number;
    agentMessageCount: number;
    taskStatusCount: number;
    artifactCount: number;
    toolCallCount: number;
    taskCount: number;
    executionEventCount: number;
    transportEventCount: number;
    transportErrorCount: number;
    averageTransportDurationMs: number | null;
    validationWarningCount: number;
    debugLogCount: number;
    warningEventCount: number;
    errorEventCount: number;
    traceUnavailable: boolean;
    includesLiveDebugLogs: boolean;
  };
  transcript: ChatTraceTranscriptEntry[];
  tasks: ChatTraceTask[];
  artifacts: ChatTraceArtifact[];
  events: ChatTraceEvent[];
  protocol?: {
    transportsDetected: string[];
    debugLogCount: number;
    debugLogs: unknown[];
    failedRequests: unknown[];
    failedEvents: ChatTraceEvent[];
    validationWarnings: unknown[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function timestampIso(timestamp: number | undefined): string {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return "unknown";
  return new Date(timestamp).toISOString();
}

function truncateString(value: string, maxLength = MAX_PAYLOAD_STRING_LENGTH): string {
  if (value.length <= maxLength) return value;
  const omitted = value.length - maxLength;
  return `${value.slice(0, maxLength)}\n[truncated ${omitted} characters]`;
}

function capValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return truncateString(value);
  if (value == null || typeof value !== "object") return value;
  if (depth >= MAX_OBJECT_DEPTH) return "[truncated: max object depth]";

  if (Array.isArray(value)) {
    const visible = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((entry) => capValue(entry, depth + 1));
    if (value.length > MAX_ARRAY_ITEMS) {
      visible.push({
        __truncated: true,
        omittedItems: value.length - MAX_ARRAY_ITEMS,
      });
    }
    return visible;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, capValue(entry, depth + 1)]),
  );
}

function sanitizeForExport(value: unknown): unknown {
  return capValue(maskSecrets(value));
}

function stringifyJson(value: unknown, maxLength = MAX_MARKDOWN_BLOCK_LENGTH): string {
  try {
    return truncateString(JSON.stringify(sanitizeForExport(value), null, 2) ?? "null", maxLength);
  } catch {
    return "[unserializable value]";
  }
}

function fencedBlock(value: string, language = "text"): string {
  let fence = "```";
  while (value.includes(fence)) {
    fence += "`";
  }
  return `${fence}${language}\n${value}\n${fence}`;
}

function partToText(part: Part): string {
  if (part.kind === "text") return truncateString(part.text);

  if (part.kind === "data") {
    return stringifyJson(part.data);
  }

  const file = part.file as {
    name?: string;
    mimeType?: string;
    uri?: string;
    bytes?: string;
  };
  const name = file.name ?? "file";
  const mimeType = file.mimeType ?? "application/octet-stream";
  const source =
    typeof file.uri === "string"
      ? `uri: ${truncateString(file.uri, 500)}`
      : typeof file.bytes === "string"
        ? `embedded bytes: ${file.bytes.length} characters`
        : "embedded file";

  return `[File: ${name} (${mimeType}; ${source})]`;
}

function partsToExportText(parts: Part[]): string {
  return truncateString(
    parts
      .map(partToText)
      .filter((value) => value.trim().length > 0)
      .join("\n\n"),
  );
}

function sanitizeParts(parts: Part[]): unknown[] {
  return parts.map((part) => sanitizeForExport(part));
}

function summarizePartModalities(parts: Part[]): Record<string, number> {
  return parts.reduce<Record<string, number>>((summary, part) => {
    const key =
      part.kind === "file"
        ? `file:${part.file.mimeType ?? "application/octet-stream"}`
        : part.kind;
    summary[key] = (summary[key] ?? 0) + 1;
    return summary;
  }, {});
}

function textFromStatusMessage(item: TaskStatusItem): string | undefined {
  if (!item.statusMessage?.parts?.length) return undefined;
  const text = partsToExportText(item.statusMessage.parts);
  return text || undefined;
}

function transcriptTitle(item: ChatItem): string {
  switch (item.kind) {
    case "user-message":
      return item.isInputResponse ? "User input response" : "User message";
    case "agent-message":
      return "Agent message";
    case "task-status":
      return `Task ${item.state}`;
    case "artifact":
      return `Artifact ${item.name ?? item.id}`;
    case "tool-call":
      return `Tool ${item.toolName} ${item.phase}`;
  }
}

function buildTranscriptEntry(item: ChatItem, index: number): ChatTraceTranscriptEntry {
  const base = {
    index: index + 1,
    kind: item.kind,
    id: item.id,
    timestamp: item.timestamp,
    timestampIso: timestampIso(item.timestamp),
    title: transcriptTitle(item),
  };

  switch (item.kind) {
    case "user-message": {
      const entry: ChatTraceTranscriptEntry = {
        ...base,
        role: "user",
        text: partsToExportText(item.parts),
        parts: sanitizeParts(item.parts),
      };
      if (item.metadata) entry.metadata = sanitizeForExport(item.metadata);
      return entry;
    }
    case "agent-message":
      return {
        ...base,
        role: "agent",
        taskId: item.taskId,
        text: partsToExportText(item.parts),
        parts: sanitizeParts(item.parts),
      };
    case "task-status":
      return {
        ...base,
        taskId: item.taskId,
        state: item.state,
        statusMessage: textFromStatusMessage(item),
      };
    case "artifact": {
      const entry: ChatTraceTranscriptEntry = {
        ...base,
        taskId: item.taskId,
        text: partsToExportText(item.parts),
        parts: sanitizeParts(item.parts),
        artifact: {
          id: item.id,
          name: item.name,
          description: item.description,
          isStreaming: item.isStreaming,
        },
      };
      if (item.metadata) entry.metadata = sanitizeForExport(item.metadata);
      return entry;
    }
    case "tool-call":
      return {
        ...base,
        tool: {
          runId: item.id,
          name: item.toolName,
          query: truncateString(item.query),
          phase: item.phase,
          resultCount: item.resultCount,
        },
      };
  }
}

function eventMergeKey(event: ExecutionEvent): string {
  const method =
    isRecord(event.details) && typeof event.details.method === "string"
      ? event.details.method
      : "";
  const transport = isRecord(event.details) ? event.details.transport : undefined;
  const status =
    isRecord(transport) && typeof transport.status === "number" ? String(transport.status) : "";

  return [
    event.timestamp,
    event.kind,
    event.level,
    event.summary,
    event.requestId ?? "",
    event.taskId ?? "",
    method,
    status,
  ].join("|");
}

export function collectChatTraceEvents(input: Pick<ChatTraceInput, "chat" | "logs">): ExecutionEvent[] {
  const events = [...input.chat.executionEvents];
  const seen = new Set(events.map(eventMergeKey));

  for (const log of input.logs ?? []) {
    const event = createExecutionEventFromLog(input.chat.id, log);
    const key = eventMergeKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    events.push(event);
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

function buildTraceEvent(event: ExecutionEvent): ChatTraceEvent {
  return {
    ...event,
    timestampIso: timestampIso(event.timestamp),
    details: event.details === undefined ? undefined : sanitizeForExport(event.details),
  };
}

function taskIdForItem(item: ChatItem): string | undefined {
  return "taskId" in item ? item.taskId : undefined;
}

function buildTaskTrace(chat: Chat, events: ExecutionEvent[], taskId: string): ChatTraceTask {
  const taskItems = chat.items.filter((item) => taskIdForItem(item) === taskId);
  const taskEvents = events.filter((event) => event.taskId === taskId);
  const firstSeenAt = Math.min(
    ...[
      ...taskItems.map((item) => item.timestamp),
      ...taskEvents.map((event) => event.timestamp),
    ].filter((timestamp) => Number.isFinite(timestamp)),
  );

  const eventStates = taskEvents
    .filter((event) => event.kind === "task-status")
    .map((event) => {
      const state = isRecord(event.details) ? event.details.state : undefined;
      const message = isRecord(event.details) ? event.details.message : undefined;
      return typeof state === "string"
        ? {
            state,
            timestamp: event.timestamp,
            timestampIso: timestampIso(event.timestamp),
            message: message === undefined ? undefined : stringifyJson(message, 2_000),
          }
        : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const itemStates = taskItems
    .filter((item): item is TaskStatusItem => item.kind === "task-status")
    .map((item) => ({
      state: item.state,
      timestamp: item.timestamp,
      timestampIso: timestampIso(item.timestamp),
      message: textFromStatusMessage(item),
    }));

  const states = [...eventStates, ...itemStates].sort((a, b) => a.timestamp - b.timestamp);
  const latestState = states.at(-1)?.state;
  const artifacts = taskItems.filter((item): item is ArtifactItem => item.kind === "artifact");
  const messages = taskItems.filter((item): item is AgentMessageItem => item.kind === "agent-message");
  const toolRunIds = Array.from(
    new Set(
      taskEvents
        .filter((event) => event.kind === "tool-call" && event.runId)
        .map((event) => event.runId as string),
    ),
  );

  return {
    taskId,
    firstSeenAt: Number.isFinite(firstSeenAt) ? firstSeenAt : 0,
    firstSeenAtIso: timestampIso(Number.isFinite(firstSeenAt) ? firstSeenAt : undefined),
    latestState,
    timeline: getTaskTimelineStages(events, taskId).map((stage) => ({
      ...stage,
      timestampIso: timestampIso(stage.timestamp),
    })),
    states,
    artifactIds: artifacts.map((item) => item.id),
    messageIds: messages.map((item) => item.id),
    toolRunIds,
    eventIds: taskEvents.map((event) => event.id),
  };
}

function collectTaskIds(chat: Chat, events: ExecutionEvent[]): string[] {
  const firstSeen = new Map<string, number>();
  const add = (taskId: string | undefined, timestamp: number) => {
    if (!taskId) return;
    const previous = firstSeen.get(taskId);
    if (previous == null || timestamp < previous) firstSeen.set(taskId, timestamp);
  };

  for (const item of chat.items) {
    add(taskIdForItem(item), item.timestamp);
  }
  for (const event of events) {
    add(event.taskId, event.timestamp);
  }

  return [...firstSeen.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([taskId]) => taskId);
}

function buildArtifactTrace(item: ArtifactItem): ChatTraceArtifact {
  const text = partsToExportText(item.parts);
  const artifact: ChatTraceArtifact = {
    id: item.id,
    taskId: item.taskId,
    name: item.name,
    description: item.description,
    timestamp: item.timestamp,
    timestampIso: timestampIso(item.timestamp),
    isStreaming: item.isStreaming,
    partCount: item.parts.length,
    modalities: summarizePartModalities(item.parts),
    parts: sanitizeParts(item.parts),
  };
  if (text) artifact.text = text;
  if (item.metadata) artifact.metadata = sanitizeForExport(item.metadata);
  return artifact;
}

function transportValue(event: ExecutionEvent, key: string): string | undefined {
  const transport = isRecord(event.details) ? event.details.transport : undefined;
  if (!isRecord(transport)) return undefined;
  const value = transport[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function collectTransportsDetected(logs: LogEntry[], events: ExecutionEvent[]): string[] {
  return Array.from(
    new Set(
      [
        ...logs.flatMap((log) => [
          log.transport?.protocol,
          log.transport?.jsonRpcMethod,
          log.transport?.httpMethod,
        ]),
        ...events.flatMap((event) => [
          transportValue(event, "protocol"),
          transportValue(event, "jsonRpcMethod"),
          transportValue(event, "httpMethod"),
        ]),
      ].filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );
}

function isFailedLog(log: LogEntry): boolean {
  return (
    log.type === "error" ||
    (log.transport?.status != null && (log.transport.status < 200 || log.transport.status >= 400))
  );
}

export function buildChatTraceJson(input: ChatTraceInput): ChatTraceExport {
  const logs = input.logs ?? [];
  const validationWarnings = input.validationWarnings ?? [];
  const events = collectChatTraceEvents(input);
  const transportSummary = getTransportSummary(events);
  const taskIds = collectTaskIds(input.chat, events);
  const items = input.chat.items;
  const validationEventCount = events.filter((event) => event.kind === "validation").length;
  const protocol =
    logs.length > 0 || validationWarnings.length > 0
      ? {
          transportsDetected: collectTransportsDetected(logs, events),
          debugLogCount: logs.length,
          debugLogs: logs.map((log) => sanitizeForExport(log)),
          failedRequests: logs.filter(isFailedLog).map((log) => sanitizeForExport(log)),
          failedEvents: events
            .filter((event) => event.kind === "transport" && event.level === "error")
            .map(buildTraceEvent),
          validationWarnings: validationWarnings.map((warning) => sanitizeForExport(warning)),
        }
      : undefined;

  return {
    version: TRACE_EXPORT_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    chat: {
      id: input.chat.id,
      title: input.chat.title,
      agentName: input.chat.agentName,
      agentUrl: input.chat.agentUrl,
      lastMessage: truncateString(input.chat.lastMessage),
      timestamp: input.chat.timestamp,
      timestampIso: timestampIso(input.chat.timestamp),
      archived: input.chat.archived ?? false,
      pinned: input.chat.pinned ?? false,
      sourceChatId: input.chat.sourceChatId,
      itemCount: input.chat.items.length,
      executionEventCount: input.chat.executionEvents.length,
    },
    summary: {
      userMessageCount: items.filter((item): item is UserMessageItem => item.kind === "user-message").length,
      agentMessageCount: items.filter((item): item is AgentMessageItem => item.kind === "agent-message").length,
      taskStatusCount: items.filter((item): item is TaskStatusItem => item.kind === "task-status").length,
      artifactCount: items.filter((item): item is ArtifactItem => item.kind === "artifact").length,
      toolCallCount: items.filter((item): item is ToolCallItem => item.kind === "tool-call").length,
      taskCount: taskIds.length,
      executionEventCount: events.length,
      transportEventCount: transportSummary.total,
      transportErrorCount: transportSummary.errors,
      averageTransportDurationMs: transportSummary.avgDurationMs,
      validationWarningCount: Math.max(validationWarnings.length, validationEventCount),
      debugLogCount: logs.length,
      warningEventCount: events.filter((event) => event.level === "warning").length,
      errorEventCount: events.filter((event) => event.level === "error").length,
      traceUnavailable: events.length === 0,
      includesLiveDebugLogs: logs.length > 0,
    },
    transcript: items.map(buildTranscriptEntry),
    tasks: taskIds.map((taskId) => buildTaskTrace(input.chat, events, taskId)),
    artifacts: items
      .filter((item): item is ArtifactItem => item.kind === "artifact")
      .map(buildArtifactTrace),
    events: events.map(buildTraceEvent),
    protocol,
  };
}

function formatOptionalJson(label: string, value: unknown, lines: string[]) {
  if (value == null) return;
  lines.push(`${label}:`, fencedBlock(stringifyJson(value), "json"), "");
}

function formatTranscriptEntry(entry: ChatTraceTranscriptEntry, lines: string[]) {
  lines.push(`### ${entry.index}. ${entry.title}`, "");
  lines.push(`- Time: ${entry.timestampIso}`);
  lines.push(`- ID: ${entry.id}`);
  if (entry.taskId) lines.push(`- Task ID: ${entry.taskId}`);
  if (entry.state) lines.push(`- State: ${entry.state}`);

  if (entry.tool) {
    lines.push(`- Tool: ${entry.tool.name}`);
    lines.push(`- Run ID: ${entry.tool.runId}`);
    lines.push(`- Phase: ${entry.tool.phase}`);
    if (entry.tool.resultCount != null) lines.push(`- Result count: ${entry.tool.resultCount}`);
    if (entry.tool.query) {
      lines.push("", "Query:", fencedBlock(entry.tool.query, "text"), "");
    } else {
      lines.push("");
    }
    return;
  }

  if (entry.artifact) {
    lines.push(`- Artifact ID: ${entry.artifact.id}`);
    if (entry.artifact.name) lines.push(`- Artifact name: ${entry.artifact.name}`);
    if (entry.artifact.description) lines.push(`- Description: ${entry.artifact.description}`);
    lines.push(`- Streaming: ${entry.artifact.isStreaming ? "yes" : "no"}`);
  }

  lines.push("");
  if (entry.role === "user") lines.push("**You:**");
  if (entry.role === "agent") lines.push("**Agent:**");
  if (entry.text) lines.push(fencedBlock(truncateString(entry.text, MAX_MARKDOWN_BLOCK_LENGTH), "text"), "");
  if (entry.statusMessage) {
    lines.push("Status message:", fencedBlock(entry.statusMessage, "text"), "");
  }
  formatOptionalJson("Metadata", entry.metadata, lines);
}

function formatTasks(trace: ChatTraceExport, lines: string[]) {
  lines.push("## Task Timelines", "");
  if (trace.tasks.length === 0) {
    lines.push(
      trace.summary.traceUnavailable
        ? "Trace history is unavailable for this chat."
        : "No task IDs were recorded for this chat.",
      "",
    );
    return;
  }

  for (const task of trace.tasks) {
    lines.push(`### Task ${task.taskId}`, "");
    lines.push(`- First seen: ${task.firstSeenAtIso}`);
    if (task.latestState) lines.push(`- Latest state: ${task.latestState}`);
    lines.push(`- Events: ${task.eventIds.length}`);
    if (task.artifactIds.length > 0) lines.push(`- Artifacts: ${task.artifactIds.join(", ")}`);
    if (task.messageIds.length > 0) lines.push(`- Agent messages: ${task.messageIds.join(", ")}`);
    if (task.toolRunIds.length > 0) lines.push(`- Tool runs: ${task.toolRunIds.join(", ")}`);
    lines.push("");

    if (task.timeline.length > 0) {
      lines.push("Timeline:");
      for (const stage of task.timeline) {
        lines.push(`- ${stage.timestampIso} - ${stage.label} (${stage.level})`);
      }
      lines.push("");
    }

    if (task.states.length > 0) {
      lines.push("Status history:");
      for (const state of task.states) {
        lines.push(`- ${state.timestampIso} - ${state.state}`);
        if (state.message) lines.push(fencedBlock(state.message, "text"));
      }
      lines.push("");
    }
  }
}

function formatTransport(trace: ChatTraceExport, lines: string[]) {
  const transportEvents = trace.events.filter((event) => event.kind === "transport");
  lines.push("## Transport And Requests", "");
  lines.push(`- Transport events: ${trace.summary.transportEventCount}`);
  lines.push(`- Transport errors: ${trace.summary.transportErrorCount}`);
  if (trace.summary.averageTransportDurationMs != null) {
    lines.push(`- Average duration: ${trace.summary.averageTransportDurationMs}ms`);
  }
  if (trace.protocol?.transportsDetected.length) {
    lines.push(`- Transports detected: ${trace.protocol.transportsDetected.join(", ")}`);
  }
  lines.push("");

  if (transportEvents.length === 0) {
    lines.push("No transport/request events were recorded.", "");
    return;
  }

  for (const event of transportEvents) {
    const ids = [
      event.requestId ? `request ${event.requestId}` : undefined,
      event.taskId ? `task ${event.taskId}` : undefined,
    ]
      .filter(Boolean)
      .join(", ");
    lines.push(`- ${event.timestampIso} - ${event.summary}${ids ? ` (${ids})` : ""}`);
  }
  lines.push("");
}

function formatValidation(trace: ChatTraceExport, lines: string[]) {
  const validationEvents = trace.events.filter((event) => event.kind === "validation");
  lines.push("## Validation Warnings", "");
  if (!trace.protocol?.validationWarnings.length && validationEvents.length === 0) {
    lines.push("No validation warnings were recorded.", "");
    return;
  }

  trace.protocol?.validationWarnings.forEach((warning, index) => {
    lines.push(`### Warning ${index + 1}`, "");
    lines.push(fencedBlock(stringifyJson(warning), "json"), "");
  });

  if (validationEvents.length > 0) {
    lines.push("Validation events:");
    for (const event of validationEvents) {
      lines.push(`- ${event.timestampIso} - ${event.summary}`);
    }
    lines.push("");
  }
}

function formatEvents(trace: ChatTraceExport, lines: string[]) {
  lines.push("## Event Appendix", "");
  if (trace.events.length === 0) {
    lines.push("Trace history is unavailable for this chat.", "");
    return;
  }

  for (const event of trace.events) {
    const ids = [
      event.requestId ? `request=${event.requestId}` : undefined,
      event.taskId ? `task=${event.taskId}` : undefined,
      event.messageId ? `message=${event.messageId}` : undefined,
      event.artifactId ? `artifact=${event.artifactId}` : undefined,
      event.runId ? `run=${event.runId}` : undefined,
    ]
      .filter(Boolean)
      .join(" ");
    lines.push(
      `- ${event.timestampIso} [${event.level}] ${event.kind}: ${event.summary}${
        ids ? ` (${ids})` : ""
      }`,
    );
    if (event.details !== undefined) {
      lines.push(fencedBlock(stringifyJson(event.details), "json"));
    }
  }
  lines.push("");
}

export function buildChatTraceMarkdown(input: ChatTraceInput): string {
  const trace = buildChatTraceJson(input);
  const lines: string[] = [
    `# ${trace.chat.title}`,
    "",
    `Generated: ${trace.generatedAt}`,
    `Agent: ${trace.chat.agentName}`,
    `Agent URL: ${trace.chat.agentUrl}`,
    `Chat ID: ${trace.chat.id}`,
    `Chat timestamp: ${trace.chat.timestampIso}`,
    "",
    "## Summary",
    "",
    `- Items: ${trace.chat.itemCount}`,
    `- User messages: ${trace.summary.userMessageCount}`,
    `- Agent messages: ${trace.summary.agentMessageCount}`,
    `- Tasks: ${trace.summary.taskCount}`,
    `- Artifacts: ${trace.summary.artifactCount}`,
    `- Tool calls: ${trace.summary.toolCallCount}`,
    `- Execution events: ${trace.summary.executionEventCount}`,
    `- Transport errors: ${trace.summary.transportErrorCount}`,
    `- Validation warnings: ${trace.summary.validationWarningCount}`,
    `- Live debug logs included: ${trace.summary.includesLiveDebugLogs ? "yes" : "no"}`,
    `- Trace coverage: ${trace.summary.traceUnavailable ? "unavailable" : "available"}`,
    "",
    "## Transcript",
    "",
  ];

  if (trace.transcript.length === 0) {
    lines.push("No visible chat items were recorded.", "");
  } else {
    trace.transcript.forEach((entry) => formatTranscriptEntry(entry, lines));
  }

  formatTasks(trace, lines);

  lines.push("## Artifacts", "");
  if (trace.artifacts.length === 0) {
    lines.push("No artifacts were recorded.", "");
  } else {
    for (const artifact of trace.artifacts) {
      lines.push(`### ${artifact.name ?? artifact.id}`, "");
      lines.push(`- Artifact ID: ${artifact.id}`);
      lines.push(`- Task ID: ${artifact.taskId}`);
      lines.push(`- Time: ${artifact.timestampIso}`);
      lines.push(`- Parts: ${artifact.partCount}`);
      lines.push(`- Streaming: ${artifact.isStreaming ? "yes" : "no"}`);
      lines.push(`- Modalities: ${Object.entries(artifact.modalities).map(([key, count]) => `${key}=${count}`).join(", ")}`);
      if (artifact.text) {
        lines.push("", fencedBlock(truncateString(artifact.text, MAX_MARKDOWN_BLOCK_LENGTH), "text"), "");
      }
      formatOptionalJson("Metadata", artifact.metadata, lines);
    }
  }

  formatTransport(trace, lines);
  formatValidation(trace, lines);
  formatEvents(trace, lines);

  return lines.join("\n").replace(/\n{4,}/g, "\n\n\n").trimEnd() + "\n";
}

function safeFilenameSegment(value: string): string {
  const normalized = value.trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  return normalized || "chat";
}

export function chatTraceFilename(chat: Pick<Chat, "title">, format: ChatTraceFormat): string {
  return `${safeFilenameSegment(chat.title)}_trace.${format === "markdown" ? "md" : "json"}`;
}
