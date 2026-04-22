import type { AgentCard, FilePart, Part, TaskState } from "@a2a-js/sdk";
import type { AuthConfig, CustomHeader } from "@/lib/features/agents/agentsSlice";
import type { Chat } from "@/lib/features/chats/chatsSlice";
import type { ExecutionEvent } from "@/lib/a2a/execution-events";
import type { LogEntry } from "@/lib/utils/debugInterceptor";
import type { ValidationWarning } from "@/lib/utils/compliance";

export type A2ASessionPersistenceMode = "memory" | "none" | "external";

export interface A2AMessageContextInput {
  text: string;
  contextId: string;
  agentUrl: string;
  metadata?: Record<string, string>;
}

export interface A2AMessageContextResult {
  metadata?: Record<string, string>;
  hiddenSystemContext?: string;
}

export type A2AMessageContextEnricher = (
  input: A2AMessageContextInput,
) => A2AMessageContextResult | Promise<A2AMessageContextResult>;

export interface A2AContextConfig {
  initialMetadata?: Record<string, string>;
  hiddenSystemContext?: string;
  messageContextEnrichers?: A2AMessageContextEnricher[];
}

export interface A2AHostConfig {
  agentUrl: string;
  auth?: AuthConfig;
  headers?: CustomHeader[];
  initialCard?: AgentCard;
  persistenceMode?: A2ASessionPersistenceMode;
  context?: A2AContextConfig;
}

export interface A2AExternalMessageStore {
  chat?: Chat;
  ensureChat: (chat: Omit<Chat, "items" | "executionEvents">) => void;
  sanitizeStaleStreaming: (contextId: string) => void;
  addUserMessage: (payload: {
    chatId: string;
    id: string;
    text: string;
    attachments?: FilePart[];
    metadata?: Record<string, string>;
    isInputResponse?: boolean;
  }) => void;
  applyStatusUpdate: (payload: {
    chatId: string;
    taskId: string;
    state: TaskState;
    statusMessage?: { parts: Part[] };
  }) => void;
  applyArtifactUpdate: (payload: {
    chatId: string;
    taskId: string;
    artifactId: string;
    name?: string;
    description?: string;
    parts: Part[];
    metadata?: Record<string, unknown>;
    append: boolean;
    lastChunk: boolean;
  }) => void;
  applyToolCall: (payload: {
    chatId: string;
    runId: string;
    toolName: string;
    query: string;
    resultCount?: number;
    phase: "running" | "done" | "error";
  }) => void;
  applyAgentMessage: (payload: {
    chatId: string;
    messageId: string;
    taskId?: string;
    parts: Part[];
  }) => void;
  appendExecutionEvent: (payload: {
    chatId: string;
    event: ExecutionEvent;
  }) => void;
}

export interface A2ADebugState {
  logs: LogEntry[];
  validationWarnings: ValidationWarning[];
  clearLogs: () => void;
}
