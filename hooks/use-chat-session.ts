"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { addChat, addUserMessage, applyAgentMessage, applyArtifactUpdate, appendExecutionEvent, applyStatusUpdate, applyToolCall, sanitizeStaleStreaming } from "@/lib/features/chats/chatsSlice";
import { setActiveAgent } from "@/lib/features/agents/agentsSlice";
import type { A2AExternalMessageStore, OutgoingMessagePartInput } from "@/lib/a2a/types";
import { useA2AConnection } from "@/hooks/use-a2a-connection";
import { useA2ADebug } from "@/hooks/use-a2a-debug";
import { useA2AMessages } from "@/hooks/use-a2a-messages";
import { useA2ASession } from "@/hooks/use-a2a-session";

export interface ChatSessionState {
  isStreaming: boolean;
  isInputRequired: boolean;
  error: string | null;
  transportMethod: string | null;
  logs: ReturnType<typeof useA2ADebug>["logs"];
  validationWarnings: ReturnType<typeof useA2ADebug>["validationWarnings"];
  cancelStream: () => void;
  sendMessage: (
    parts: OutgoingMessagePartInput[],
    metadata?: Record<string, string>,
  ) => Promise<void>;
  newSession: () => void;
  clearLogs: () => void;
}

export function useChatSession(chatId: string): ChatSessionState {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const chat = useAppSelector((state) => state.chats.chats.find((entry) => entry.id === chatId));
  const agent = useAppSelector((state) =>
    state.agents.agents.find((entry) => entry.url === chat?.agentUrl),
  );

  const debug = useA2ADebug();
  const connection = useA2AConnection({
    agentUrl: agent?.url ?? "",
    auth: agent?.auth,
    headers: agent?.customHeaders,
    debug,
    autoConnect: Boolean(agent),
    initialCard: agent?.card,
  });
  const session = useA2ASession({
    contextId: chatId,
    onNewSession: (nextChatId) => {
      if (!agent) return;
      dispatch(setActiveAgent(agent.url));
      dispatch(
        addChat({
          id: nextChatId,
          title: `Chat with ${agent.card.name}`,
          agentUrl: agent.url,
          agentName: agent.card.name,
          lastMessage: "",
          timestamp: Number(new Date()),
        }),
      );
      connection.resetConnection();
      debug.clearLogs();
      router.push(`/dashboard/chat/${nextChatId}`);
    },
  });

  const store = useMemo<A2AExternalMessageStore | undefined>(() => {
    if (!chat) return undefined;
    return {
      chat,
      ensureChat: (payload) => dispatch(addChat(payload)),
      sanitizeStaleStreaming: (contextId) => dispatch(sanitizeStaleStreaming(contextId)),
      addUserMessage: (payload) => dispatch(addUserMessage(payload)),
      applyStatusUpdate: (payload) => dispatch(applyStatusUpdate(payload)),
      applyArtifactUpdate: (payload) => dispatch(applyArtifactUpdate(payload)),
      applyToolCall: (payload) => dispatch(applyToolCall(payload)),
      applyAgentMessage: (payload) => dispatch(applyAgentMessage(payload)),
      appendExecutionEvent: (payload) => dispatch(appendExecutionEvent(payload)),
    };
  }, [chat, dispatch]);

  const { isInputRequired, sendMessage, cancelStream } = useA2AMessages({
    connection,
    debug,
    session,
    agentName: agent?.card.name,
    persistenceMode: "external",
    store,
  });

  const safeSendMessage = useCallback<ChatSessionState["sendMessage"]>(
    async (parts, metadata) => {
      if (!chat || !agent) return;
      await sendMessage(parts, metadata);
    },
    [agent, chat, sendMessage],
  );

  return {
    isStreaming: session.isStreaming,
    isInputRequired,
    error: session.error,
    transportMethod: connection.transportMethod,
    logs: debug.logs,
    validationWarnings: debug.validationWarnings,
    cancelStream,
    sendMessage: safeSendMessage,
    newSession: session.newSession,
    clearLogs: debug.clearLogs,
  };
}
