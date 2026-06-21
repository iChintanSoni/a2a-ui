"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";
import type { Part } from "@a2a-js/sdk";
import { modalityFamily } from "@/lib/a2a/modalities";
import { detectA2UISurface } from "@/lib/a2a/a2ui";
import chatsReducer, {
  addChat,
  addUserMessage,
  applyAgentMessage,
  applyArtifactUpdate,
  appendExecutionEvent,
  applyStatusUpdate,
  applyToolCall,
  hydrateChats,
  sanitizeStaleStreaming,
  type Chat,
  type ChatsState,
} from "@/lib/features/chats/chatsSlice";
import type { A2AExternalMessageStore, A2ASessionPersistenceMode } from "@/lib/a2a/types";

// ── Action union for the in-memory chat reducer ────────────────────────────

export type ChatAction =
  | ReturnType<typeof addChat>
  | ReturnType<typeof addUserMessage>
  | ReturnType<typeof applyStatusUpdate>
  | ReturnType<typeof applyArtifactUpdate>
  | ReturnType<typeof appendExecutionEvent>
  | ReturnType<typeof applyToolCall>
  | ReturnType<typeof applyAgentMessage>
  | ReturnType<typeof sanitizeStaleStreaming>
  | ReturnType<typeof hydrateChats>;

export type MemoryStoreAction =
  | ChatAction
  | { type: "a2a/reset"; payload: Omit<Chat, "items" | "executionEvents"> };

// ── Utilities ──────────────────────────────────────────────────────────────

export function createChatMeta(input: {
  contextId: string;
  agentUrl: string;
  agentName: string;
}): Omit<Chat, "items" | "executionEvents"> {
  return {
    id: input.contextId,
    title: `Chat with ${input.agentName}`,
    agentUrl: input.agentUrl,
    agentName: input.agentName,
    lastMessage: "",
    timestamp: Date.now(),
  };
}

export function getDataPartMimeType(part: Extract<Part, { kind: "data" }>): string | undefined {
  const metadata = (part as { metadata?: Record<string, unknown> }).metadata;
  if (!metadata) return undefined;
  return typeof metadata.mimeType === "string" ? metadata.mimeType : undefined;
}

export function countA2UISurfaces(parts: Part[]): number {
  return parts.reduce((count, part) => {
    if (part.kind !== "data") return count;
    return detectA2UISurface(part.data, getDataPartMimeType(part)) ? count + 1 : count;
  }, 0);
}

export function summarizePartModalities(parts: Part[]): Record<string, number> {
  return parts.reduce<Record<string, number>>((summary, part) => {
    const family =
      part.kind === "text"
        ? "text"
        : part.kind === "data"
          ? "data"
          : modalityFamily(part.file.mimeType ?? "application/octet-stream");
    summary[family] = (summary[family] ?? 0) + 1;
    return summary;
  }, {});
}

// ── Reducer ────────────────────────────────────────────────────────────────

export function memoryStoreReducer(state: ChatsState, action: MemoryStoreAction): ChatsState {
  if (action.type === "a2a/reset") {
    return {
      chats: [{ ...action.payload, items: [], executionEvents: [] }],
      activeChatId: action.payload.id,
    };
  }
  return chatsReducer(state, action);
}

// ── useMemoryMessageStore ──────────────────────────────────────────────────

/** Manages a per-session in-memory chat store backed by the chats reducer. */
export function useMemoryMessageStore(options: {
  contextId: string;
  agentUrl: string;
  agentName: string;
  persistenceMode: Exclude<A2ASessionPersistenceMode, "external">;
}): A2AExternalMessageStore {
  const [state, dispatch] = useReducer(memoryStoreReducer, {
    chats: [],
    activeChatId: null,
  });
  const previousContextRef = useRef<string | null>(null);
  const chat = state.chats.find((entry) => entry.id === options.contextId);

  useEffect(() => {
    const meta = createChatMeta({
      contextId: options.contextId,
      agentUrl: options.agentUrl,
      agentName: options.agentName,
    });
    if (
      options.persistenceMode === "none" &&
      previousContextRef.current &&
      previousContextRef.current !== options.contextId
    ) {
      dispatch({ type: "a2a/reset", payload: meta });
    } else if (
      !chat ||
      chat.agentUrl !== meta.agentUrl ||
      chat.agentName !== meta.agentName ||
      chat.title !== meta.title
    ) {
      dispatch(addChat(meta));
    }
    previousContextRef.current = options.contextId;
  }, [
    chat,
    options.agentName,
    options.agentUrl,
    options.contextId,
    options.persistenceMode,
  ]);

  return useMemo(
    () => ({
      chat,
      ensureChat: (meta) => dispatch(addChat(meta)),
      sanitizeStaleStreaming: (contextId) => dispatch(sanitizeStaleStreaming(contextId)),
      addUserMessage: (payload) => dispatch(addUserMessage(payload)),
      applyStatusUpdate: (payload) => dispatch(applyStatusUpdate(payload)),
      applyArtifactUpdate: (payload) => dispatch(applyArtifactUpdate(payload)),
      applyToolCall: (payload) => dispatch(applyToolCall(payload)),
      applyAgentMessage: (payload) => dispatch(applyAgentMessage(payload)),
      appendExecutionEvent: (payload) => dispatch(appendExecutionEvent(payload)),
    }),
    [chat],
  );
}
