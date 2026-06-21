import type { Part, TaskState } from "@a2a-js/sdk";
import type { ExecutionEvent } from "@/lib/a2a/execution-events";

export type UserMessageItem = {
  kind: "user-message";
  id: string;
  parts: Part[];
  metadata?: Record<string, string>;
  /** true when this message continues an input-required task */
  isInputResponse?: boolean;
  timestamp: number;
};

export type TaskStatusItem = {
  kind: "task-status";
  id: string; // taskId
  taskId: string;
  state: TaskState;
  statusMessage?: { parts: Part[] };
  timestamp: number;
};

export type ArtifactItem = {
  kind: "artifact";
  id: string; // artifactId
  taskId: string;
  name?: string;
  description?: string;
  parts: Part[];
  metadata?: Record<string, unknown>;
  isStreaming: boolean;
  timestamp: number;
};

export type AgentMessageItem = {
  kind: "agent-message";
  id: string; // messageId
  taskId?: string;
  parts: Part[];
  timestamp: number;
};

export type ToolCallItem = {
  kind: "tool-call";
  id: string; // runId
  toolName: string;
  query: string;
  resultCount?: number;
  phase: "running" | "done" | "error";
  imageUrl?: string;
  timestamp: number;
};

export type ChatItem =
  | UserMessageItem
  | TaskStatusItem
  | ArtifactItem
  | AgentMessageItem
  | ToolCallItem;

export interface Chat {
  id: string; // contextId
  title: string;
  agentUrl: string;
  agentName: string;
  lastMessage: string;
  timestamp: number;
  archived?: boolean;
  pinned?: boolean;
  sourceChatId?: string;
  items: ChatItem[];
  executionEvents: ExecutionEvent[];
}

export type ChatCloneMode = "prompt" | "full";

export interface ChatsState {
  chats: Chat[];
  activeChatId: string | null;
}
