import type { AgentCard, AuthConfig, CustomHeader } from "@/lib/features/agents/agentsSlice";
import type { Chat } from "@/lib/features/chats/chatsSlice";
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
  ensureChat: (chat: Omit<Chat, "items">) => void;
  sanitizeStaleStreaming: (contextId: string) => void;
  addUserMessage: (payload: {
    chatId: string;
    id: string;
    text: string;
    attachments?: import("@/lib/features/chats/chatsSlice").FilePartData[];
    metadata?: Record<string, string>;
    isInputResponse?: boolean;
  }) => void;
  applyStatusUpdate: (payload: {
    chatId: string;
    taskId: string;
    state: import("@/lib/features/chats/chatsSlice").TaskState;
    statusMessage?: { parts: import("@/lib/features/chats/chatsSlice").PartData[] };
  }) => void;
  applyArtifactUpdate: (payload: {
    chatId: string;
    taskId: string;
    artifactId: string;
    name?: string;
    description?: string;
    parts: import("@/lib/features/chats/chatsSlice").PartData[];
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
    parts: import("@/lib/features/chats/chatsSlice").PartData[];
  }) => void;
}

export interface A2ADebugState {
  logs: LogEntry[];
  validationWarnings: ValidationWarning[];
  clearLogs: () => void;
}
