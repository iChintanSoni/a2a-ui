import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// ─── Serializable A2A Part types ────────────────────────────────────────────

export type TextPartData = { kind: "text"; text: string };
export type FilePartData = {
  kind: "file";
  file: { name?: string; mimeType?: string } & ({ bytes: string } | { uri: string });
};
export type DataPartData = { kind: "data"; data: Record<string, unknown> };
export type PartData = TextPartData | FilePartData | DataPartData;

export type TaskState =
  | "submitted"
  | "working"
  | "input-required"
  | "completed"
  | "canceled"
  | "failed"
  | "rejected"
  | "auth-required"
  | "unknown";

// ─── Chat display item types ─────────────────────────────────────────────────

export type UserMessageItem = {
  kind: "user-message";
  id: string;
  text: string;
  attachments?: FilePartData[];
  metadata?: Record<string, string>;
  isInputResponse?: boolean; // true when this message continues an input-required task
  timestamp: number;
};

export type TaskStatusItem = {
  kind: "task-status";
  id: string; // taskId
  taskId: string;
  state: TaskState;
  statusMessage?: { parts: PartData[] };
  timestamp: number;
};

export type ArtifactItem = {
  kind: "artifact";
  id: string; // artifactId
  taskId: string;
  name?: string;
  description?: string;
  parts: PartData[];
  isStreaming: boolean;
  timestamp: number;
};

export type AgentMessageItem = {
  kind: "agent-message";
  id: string; // messageId
  taskId?: string;
  parts: PartData[];
  timestamp: number;
};

export type ToolCallItem = {
  kind: "tool-call";
  id: string; // runId
  toolName: string;
  query: string;
  resultCount?: number;
  phase: "running" | "done" | "error";
  timestamp: number;
};

export type ChatItem = UserMessageItem | TaskStatusItem | ArtifactItem | AgentMessageItem | ToolCallItem;

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface Chat {
  id: string; // contextId
  title: string;
  agentUrl: string;
  agentName: string;
  lastMessage: string;
  timestamp: number;
  items: ChatItem[];
}

export interface ChatsState {
  chats: Chat[];
  activeChatId: string | null;
}

const initialState: ChatsState = {
  chats: [],
  activeChatId: null,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findChat(state: ChatsState, chatId: string): Chat | undefined {
  return state.chats.find((c) => c.id === chatId);
}

// ─── Slice ───────────────────────────────────────────────────────────────────

export const chatsSlice = createSlice({
  name: "chats",
  initialState,
  reducers: {
    addChat: (state, action: PayloadAction<Omit<Chat, "items">>) => {
      const existing = state.chats.findIndex((c) => c.id === action.payload.id);
      const chat: Chat = { ...action.payload, items: [] };
      if (existing >= 0) {
        state.chats[existing] = { ...state.chats[existing], ...action.payload };
      } else {
        state.chats.unshift(chat);
        if (state.chats.length > 10) state.chats = state.chats.slice(0, 10);
      }
      state.activeChatId = action.payload.id;
    },

    setActiveChat: (state, action: PayloadAction<string | null>) => {
      state.activeChatId = action.payload;
    },

    removeChat: (state, action: PayloadAction<string>) => {
      state.chats = state.chats.filter((c) => c.id !== action.payload);
      if (state.activeChatId === action.payload) {
        state.activeChatId = state.chats.length > 0 ? state.chats[0].id : null;
      }
    },

    // ── Message actions ──────────────────────────────────────────────────────

    addUserMessage: (
      state,
      action: PayloadAction<{
        chatId: string;
        id: string;
        text: string;
        attachments?: FilePartData[];
        metadata?: Record<string, string>;
        isInputResponse?: boolean;
      }>
    ) => {
      const chat = findChat(state, action.payload.chatId);
      if (!chat) return;
      const item: UserMessageItem = {
        kind: "user-message",
        id: action.payload.id,
        text: action.payload.text,
        attachments: action.payload.attachments,
        metadata: action.payload.metadata,
        isInputResponse: action.payload.isInputResponse,
        timestamp: Date.now(),
      };
      chat.items.push(item);
      chat.lastMessage = action.payload.text;
      chat.timestamp = item.timestamp;
    },

    applyStatusUpdate: (
      state,
      action: PayloadAction<{
        chatId: string;
        taskId: string;
        state: TaskState;
        statusMessage?: { parts: PartData[] };
      }>
    ) => {
      const chat = findChat(state, action.payload.chatId);
      if (!chat) return;
      const now = Date.now();
      // Upsert: find existing status item for this task or add new one
      const idx = chat.items.findLastIndex(
        (it) => it.kind === "task-status" && it.taskId === action.payload.taskId
      );
      const item: TaskStatusItem = {
        kind: "task-status",
        id: action.payload.taskId,
        taskId: action.payload.taskId,
        state: action.payload.state,
        statusMessage: action.payload.statusMessage,
        timestamp: now,
      };
      if (idx >= 0) {
        chat.items[idx] = item;
      } else {
        chat.items.push(item);
      }
    },

    applyArtifactUpdate: (
      state,
      action: PayloadAction<{
        chatId: string;
        taskId: string;
        artifactId: string;
        name?: string;
        description?: string;
        parts: PartData[];
        append: boolean;
        lastChunk: boolean;
      }>
    ) => {
      const chat = findChat(state, action.payload.chatId);
      if (!chat) return;
      const now = Date.now();
      const idx = chat.items.findLastIndex(
        (it) => it.kind === "artifact" && it.id === action.payload.artifactId
      );

      if (idx >= 0) {
        const existing = chat.items[idx] as ArtifactItem;
        if (action.payload.append) {
          // Merge incoming TextParts onto the last TextPart, push others
          for (const newPart of action.payload.parts) {
            if (newPart.kind === "text") {
              const lastPart = existing.parts[existing.parts.length - 1];
              if (lastPart?.kind === "text") {
                (lastPart as TextPartData).text += newPart.text;
              } else {
                existing.parts.push(newPart);
              }
            } else {
              existing.parts.push(newPart);
            }
          }
        } else {
          existing.parts = action.payload.parts;
          if (action.payload.name) existing.name = action.payload.name;
          if (action.payload.description) existing.description = action.payload.description;
        }
        existing.isStreaming = !action.payload.lastChunk;
        existing.timestamp = now;
      } else {
        const item: ArtifactItem = {
          kind: "artifact",
          id: action.payload.artifactId,
          taskId: action.payload.taskId,
          name: action.payload.name,
          description: action.payload.description,
          parts: action.payload.parts,
          isStreaming: !action.payload.lastChunk,
          timestamp: now,
        };
        chat.items.push(item);
      }
    },

    applyToolCall: (
      state,
      action: PayloadAction<{
        chatId: string;
        runId: string;
        toolName: string;
        query: string;
        resultCount?: number;
        phase: "running" | "done" | "error";
      }>
    ) => {
      const chat = findChat(state, action.payload.chatId);
      if (!chat) return;
      const idx = chat.items.findLastIndex(
        (it) => it.kind === "tool-call" && it.id === action.payload.runId
      );
      const item: ToolCallItem = {
        kind: "tool-call",
        id: action.payload.runId,
        toolName: action.payload.toolName,
        query: action.payload.query,
        resultCount: action.payload.resultCount,
        phase: action.payload.phase,
        timestamp: Date.now(),
      };
      if (idx >= 0) {
        chat.items[idx] = item;
      } else {
        chat.items.push(item);
      }
    },

    applyAgentMessage: (
      state,
      action: PayloadAction<{
        chatId: string;
        messageId: string;
        taskId?: string;
        parts: PartData[];
      }>
    ) => {
      const chat = findChat(state, action.payload.chatId);
      if (!chat) return;
      const item: AgentMessageItem = {
        kind: "agent-message",
        id: action.payload.messageId,
        taskId: action.payload.taskId,
        parts: action.payload.parts,
        timestamp: Date.now(),
      };
      chat.items.push(item);
    },
  },
});

export const {
  addChat,
  setActiveChat,
  removeChat,
  addUserMessage,
  applyStatusUpdate,
  applyArtifactUpdate,
  applyToolCall,
  applyAgentMessage,
} = chatsSlice.actions;

export default chatsSlice.reducer;
