"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { Message, TaskArtifactUpdateEvent, TaskStatusUpdateEvent } from "@a2a-js/sdk";
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
import { buildOutgoingMessage, encodeAttachments } from "@/lib/a2a/message-utils";
import type {
  A2AContextConfig,
  A2AExternalMessageStore,
  A2ASessionPersistenceMode,
} from "@/lib/a2a/types";
import {
  createExecutionEventFromLog,
} from "@/lib/a2a/execution-events";
import { validateIncomingEvent, validateOutgoingMessage } from "@/lib/utils/compliance";
import { useA2AConnection } from "@/hooks/use-a2a-connection";
import { useA2ADebug } from "@/hooks/use-a2a-debug";
import { useA2ASession } from "@/hooks/use-a2a-session";

type ChatAction =
  | ReturnType<typeof addChat>
  | ReturnType<typeof addUserMessage>
  | ReturnType<typeof applyStatusUpdate>
  | ReturnType<typeof applyArtifactUpdate>
  | ReturnType<typeof appendExecutionEvent>
  | ReturnType<typeof applyToolCall>
  | ReturnType<typeof applyAgentMessage>
  | ReturnType<typeof sanitizeStaleStreaming>
  | ReturnType<typeof hydrateChats>;

type MemoryStoreAction =
  | ChatAction
  | { type: "a2a/reset"; payload: Omit<Chat, "items" | "executionEvents"> };

function createChatMeta(input: {
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

function memoryStoreReducer(state: ChatsState, action: MemoryStoreAction): ChatsState {
  if (action.type === "a2a/reset") {
    return {
      chats: [{ ...action.payload, items: [], executionEvents: [] }],
      activeChatId: action.payload.id,
    };
  }
  return chatsReducer(state, action);
}

function useMemoryMessageStore(options: {
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

interface UseA2AMessagesOptions {
  connection: ReturnType<typeof useA2AConnection>;
  debug: ReturnType<typeof useA2ADebug>;
  session: ReturnType<typeof useA2ASession>;
  agentName?: string;
  context?: A2AContextConfig;
  persistenceMode?: A2ASessionPersistenceMode;
  store?: A2AExternalMessageStore;
}

export function useA2AMessages({
  connection,
  debug,
  session,
  agentName,
  context,
  persistenceMode = "memory",
  store,
}: UseA2AMessagesOptions) {
  const memoryStore = useMemoryMessageStore({
    contextId: session.contextId,
    agentUrl: connection.agentUrl,
    agentName: agentName ?? connection.card?.name ?? "Agent",
    persistenceMode: persistenceMode === "external" ? "memory" : persistenceMode,
  });
  const messageStore = store ?? memoryStore;
  const processedLogsRef = useRef(0);
  const lastContextIdRef = useRef(session.contextId);

  const chat = messageStore.chat;
  const currentAgentName = agentName ?? connection.card?.name ?? chat?.agentName ?? "Agent";

  useEffect(() => {
    if (chat) return;
    messageStore.ensureChat(
      createChatMeta({
        contextId: session.contextId,
        agentUrl: connection.agentUrl,
        agentName: currentAgentName,
      }),
    );
  }, [chat, currentAgentName, messageStore, session.contextId, connection.agentUrl]);

  useEffect(() => {
    messageStore.sanitizeStaleStreaming(session.contextId);
  }, [messageStore, session.contextId]);

  useEffect(() => {
    if (lastContextIdRef.current !== session.contextId) {
      processedLogsRef.current = debug.logs.length;
      lastContextIdRef.current = session.contextId;
      return;
    }

    if (processedLogsRef.current > debug.logs.length) {
      processedLogsRef.current = 0;
    }

    const newLogs = debug.logs.slice(processedLogsRef.current);
    for (const entry of newLogs) {
      messageStore.appendExecutionEvent({
        chatId: session.contextId,
        event: createExecutionEventFromLog(session.contextId, entry),
      });
    }
    processedLogsRef.current = debug.logs.length;
  }, [debug.logs, messageStore, session.contextId]);

  const pendingInputTask = chat?.items
    .filter((item) => item.kind === "task-status")
    .findLast((item) => item.kind === "task-status");
  const isInputRequired = pendingInputTask?.state === "input-required";
  const inputRequiredTaskId = isInputRequired ? pendingInputTask.taskId : undefined;

  const cancelStream = useCallback(() => {
    session.cancelLocally();
    if (session.activeTaskId) {
      messageStore.applyStatusUpdate({
        chatId: session.contextId,
        taskId: session.activeTaskId,
        state: "canceled",
      });
      messageStore.appendExecutionEvent({
        chatId: session.contextId,
        event: {
          id: crypto.randomUUID(),
          chatId: session.contextId,
          kind: "task-status",
          level: "warning",
          timestamp: Date.now(),
          summary: "Task canceled",
          taskId: session.activeTaskId,
          traceId: null,
          spanId: null,
          parentSpanId: null,
          details: {
            state: "canceled",
            source: "user",
          },
        },
      });
      connection.cancelTask(session.activeTaskId).catch(() => {});
    }
    session.setActiveTaskId(null);
  }, [connection, messageStore, session]);

  const sendMessage = useCallback(
    async (text: string, metadata?: Record<string, string>, attachments?: File[]) => {
      if (!chat) return;

      session.beginStream();

      const messageId = crypto.randomUUID();
      const fileParts = attachments?.length ? await encodeAttachments(attachments) : [];

      messageStore.addUserMessage({
        chatId: session.contextId,
        id: messageId,
        text,
        attachments: fileParts.length > 0 ? fileParts : undefined,
        metadata: metadata && Object.keys(metadata).length > 0 ? metadata : undefined,
        isInputResponse: inputRequiredTaskId != null,
      });
      messageStore.appendExecutionEvent({
        chatId: session.contextId,
        event: {
          id: crypto.randomUUID(),
          chatId: session.contextId,
          kind: "outgoing-message",
          level: "info",
          timestamp: Date.now(),
          summary: inputRequiredTaskId ? "Input response submitted" : "Message submitted",
          taskId: inputRequiredTaskId,
          messageId,
          traceId: null,
          spanId: null,
          parentSpanId: null,
          details: {
            text,
            metadata,
            attachmentCount: fileParts.length,
            hiddenContextConfigured:
              Boolean(context?.hiddenSystemContext) ||
              Boolean(context?.messageContextEnrichers?.length),
          },
        },
      });

      try {
        const client = await connection.getClient();
        const outgoingMessage = await buildOutgoingMessage({
          text,
          messageId,
          contextId: session.contextId,
          agentUrl: connection.agentUrl,
          metadata,
          fileParts,
          inputTaskId: inputRequiredTaskId,
          context,
        });

        const outgoingWarnings = validateOutgoingMessage(outgoingMessage);
        debug.recordValidation("message/send", outgoingWarnings);

        const stream = client.sendMessageStream({ message: outgoingMessage });
        for await (const event of stream) {
          if (session.abortRef.current?.signal.aborted) break;

          const incomingWarnings = validateIncomingEvent(event);
          debug.recordValidation(
            String((event as { kind?: unknown }).kind ?? "incoming-event"),
            incomingWarnings,
          );

          if (event.kind === "status-update") {
            const statusEvent = event as TaskStatusUpdateEvent;
            session.setActiveTaskId(statusEvent.taskId);
            messageStore.applyStatusUpdate({
              chatId: session.contextId,
              taskId: statusEvent.taskId,
              state: statusEvent.status.state as
                | "submitted"
                | "working"
                | "input-required"
                | "completed"
                | "canceled"
                | "failed"
                | "rejected"
                | "auth-required"
                | "unknown",
              statusMessage: statusEvent.status.message
                ? { parts: statusEvent.status.message.parts }
                : undefined,
            });
            messageStore.appendExecutionEvent({
              chatId: session.contextId,
              event: {
                id: crypto.randomUUID(),
                chatId: session.contextId,
                kind: "task-status",
                level:
                  statusEvent.status.state === "failed" ||
                  statusEvent.status.state === "rejected"
                    ? "error"
                    : statusEvent.status.state === "input-required" ||
                        statusEvent.status.state === "auth-required"
                      ? "warning"
                      : "info",
                timestamp: Date.now(),
                summary: `Task ${statusEvent.status.state}`,
                taskId: statusEvent.taskId,
                traceId: null,
                spanId: null,
                parentSpanId: null,
                details: {
                  state: statusEvent.status.state,
                  message: statusEvent.status.message,
                },
              },
            });
            continue;
          }

          if (event.kind === "artifact-update") {
            const artifactEvent = event as TaskArtifactUpdateEvent;
            if (artifactEvent.artifact.name === "tool-call") {
              const dataPart = artifactEvent.artifact.parts[0];
              if (dataPart?.kind === "data") {
                const data = dataPart.data as {
                  phase: "running" | "done" | "error";
                  toolName: string;
                  query: string;
                  resultCount?: number;
                };
                messageStore.applyToolCall({
                  chatId: session.contextId,
                  runId: artifactEvent.artifact.artifactId,
                  toolName: data.toolName,
                  query: data.query,
                  resultCount: data.resultCount,
                  phase: data.phase,
                });
                messageStore.appendExecutionEvent({
                  chatId: session.contextId,
                  event: {
                    id: crypto.randomUUID(),
                    chatId: session.contextId,
                    kind: "tool-call",
                    level: data.phase === "error" ? "error" : "info",
                    timestamp: Date.now(),
                    summary:
                      data.phase === "running"
                        ? `${data.toolName} started`
                        : data.phase === "done"
                          ? `${data.toolName} finished`
                          : `${data.toolName} failed`,
                    taskId: artifactEvent.taskId,
                    artifactId: artifactEvent.artifact.artifactId,
                    runId: artifactEvent.artifact.artifactId,
                    traceId: null,
                    spanId: null,
                    parentSpanId: null,
                    details: {
                      phase: data.phase,
                      toolName: data.toolName,
                      query: data.query,
                      resultCount: data.resultCount,
                    },
                  },
                });
              }
              continue;
            }

            messageStore.applyArtifactUpdate({
              chatId: session.contextId,
              taskId: artifactEvent.taskId,
              artifactId: artifactEvent.artifact.artifactId,
              name: artifactEvent.artifact.name,
              description: artifactEvent.artifact.description,
              parts: artifactEvent.artifact.parts,
              metadata: artifactEvent.artifact.metadata,
              append: artifactEvent.append ?? false,
              lastChunk: artifactEvent.lastChunk ?? false,
            });
            messageStore.appendExecutionEvent({
              chatId: session.contextId,
              event: {
                id: crypto.randomUUID(),
                chatId: session.contextId,
                kind: "artifact-update",
                level: "info",
                timestamp: Date.now(),
                summary: artifactEvent.lastChunk
                  ? `${artifactEvent.artifact.name ?? "Artifact"} completed`
                  : `${artifactEvent.artifact.name ?? "Artifact"} updated`,
                taskId: artifactEvent.taskId,
                artifactId: artifactEvent.artifact.artifactId,
                traceId: null,
                spanId: null,
                parentSpanId: null,
                details: {
                  name: artifactEvent.artifact.name,
                  description: artifactEvent.artifact.description,
                  append: artifactEvent.append ?? false,
                  lastChunk: artifactEvent.lastChunk ?? false,
                  metadata: artifactEvent.artifact.metadata,
                },
              },
            });
            continue;
          }

          if (event.kind === "message") {
            const agentMessage = event as Message;
            if (agentMessage.role === "agent") {
              messageStore.applyAgentMessage({
                chatId: session.contextId,
                messageId: agentMessage.messageId,
                taskId: agentMessage.taskId,
                parts: agentMessage.parts,
              });
              messageStore.appendExecutionEvent({
                chatId: session.contextId,
                event: {
                  id: crypto.randomUUID(),
                  chatId: session.contextId,
                  kind: "agent-message",
                  level: "info",
                  timestamp: Date.now(),
                  summary: "Agent message received",
                  taskId: agentMessage.taskId,
                  messageId: agentMessage.messageId,
                  traceId: null,
                  spanId: null,
                  parentSpanId: null,
                  details: {
                    partCount: agentMessage.parts.length,
                  },
                },
              });
            }
          }
        }
      } catch (err) {
        if (!(err instanceof Error && err.name === "AbortError")) {
          session.setError(err instanceof Error ? err.message : String(err));
          connection.resetConnection();
          debug.recordError("sendMessageStream", err);
        }
      } finally {
        session.finishStream();
      }
    },
    [chat, connection, context, debug, inputRequiredTaskId, messageStore, session],
  );

  return {
    chat,
    items: chat?.items ?? [],
    isInputRequired,
    sendMessage,
    cancelStream,
  };
}
