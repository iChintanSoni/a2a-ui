"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Message, TaskArtifactUpdateEvent, TaskStatusUpdateEvent } from "@a2a-js/sdk";
import { getTextPartsText } from "@/lib/a2a/parts";
import { buildOutgoingMessage, normalizeOutgoingParts } from "@/lib/a2a/message-utils";
import type { A2AContextConfig, A2AExternalMessageStore, OutgoingMessagePartInput } from "@/lib/a2a/types";
import { createExecutionEventFromLog } from "@/lib/a2a/execution-events";
import { validateIncomingEvent, validateOutgoingMessage } from "@/lib/utils/compliance";
import { getErrorMessage, isAbortError } from "@/lib/utils/error";
import { isToolCallData } from "@/lib/utils/type-guards";
import { useA2AConnection } from "@/hooks/use-a2a-connection";
import { useA2ADebug } from "@/hooks/use-a2a-debug";
import { useA2ASession } from "@/hooks/use-a2a-session";
import {
  createChatMeta,
  countA2UISurfaces,
  summarizePartModalities,
  useMemoryMessageStore,
} from "@/hooks/use-a2a-messages-reducer";
import type { A2ASessionPersistenceMode } from "@/lib/a2a/types";

interface UseA2AMessagesOptions {
  connection: ReturnType<typeof useA2AConnection>;
  debug: ReturnType<typeof useA2ADebug>;
  session: ReturnType<typeof useA2ASession>;
  agentName?: string;
  context?: A2AContextConfig;
  persistenceMode?: A2ASessionPersistenceMode;
  store?: A2AExternalMessageStore;
}

/** Manages A2A message send/receive lifecycle and keeps the message store in sync. */
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
  const chat = messageStore.chat;
  const currentAgentName = agentName ?? connection.card?.name ?? chat?.agentName ?? "Agent";
  const processedLogsRef = useRef(0);
  const lastContextIdRef = useRef(session.contextId);

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
          details: { state: "canceled", source: "user" },
        },
      });
      connection.cancelTask(session.activeTaskId).catch(() => {});
    }
    session.setActiveTaskId(null);
  }, [connection, messageStore, session]);

  const sendMessage = useCallback(
    async (partsInput: OutgoingMessagePartInput[], metadata?: Record<string, string>) => {
      if (!chat) return;

      const parts = await normalizeOutgoingParts(partsInput);
      if (parts.length === 0) return;

      session.beginStream();

      const messageId = crypto.randomUUID();
      const text = getTextPartsText(parts);
      const fileCount = parts.filter((p) => p.kind === "file").length;
      const dataCount = parts.filter((p) => p.kind === "data").length;
      const modalities = summarizePartModalities(parts);

      messageStore.addUserMessage({
        chatId: session.contextId,
        id: messageId,
        parts,
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
            partCount: parts.length,
            fileCount,
            dataCount,
            modalities,
            hiddenContextConfigured:
              Boolean(context?.hiddenSystemContext) ||
              Boolean(context?.messageContextEnrichers?.length),
          },
        },
      });

      try {
        const client = await connection.getClient();
        const outgoingMessage = await buildOutgoingMessage({
          parts,
          messageId,
          contextId: session.contextId,
          agentUrl: connection.agentUrl,
          metadata,
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
            await handleStatusUpdate(event as TaskStatusUpdateEvent, session, messageStore);
            continue;
          }

          if (event.kind === "artifact-update") {
            await handleArtifactUpdate(event as TaskArtifactUpdateEvent, session, messageStore, connection);
            continue;
          }

          if (event.kind === "message") {
            const agentMessage = event as Message;
            if (agentMessage.role === "agent") {
              handleAgentMessage(agentMessage, session, messageStore, connection);
            }
          }
        }
      } catch (err) {
        if (!isAbortError(err)) {
          session.setError(getErrorMessage(err));
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

// ── Event handlers ─────────────────────────────────────────────────────────

async function handleStatusUpdate(
  statusEvent: TaskStatusUpdateEvent,
  session: ReturnType<typeof useA2ASession>,
  messageStore: A2AExternalMessageStore,
) {
  session.setActiveTaskId(statusEvent.taskId);
  messageStore.applyStatusUpdate({
    chatId: session.contextId,
    taskId: statusEvent.taskId,
    state: statusEvent.status.state as
      | "submitted" | "working" | "input-required" | "completed"
      | "canceled" | "failed" | "rejected" | "auth-required" | "unknown",
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
        statusEvent.status.state === "failed" || statusEvent.status.state === "rejected"
          ? "error"
          : statusEvent.status.state === "input-required" || statusEvent.status.state === "auth-required"
            ? "warning"
            : "info",
      timestamp: Date.now(),
      summary: `Task ${statusEvent.status.state}`,
      taskId: statusEvent.taskId,
      traceId: null,
      spanId: null,
      parentSpanId: null,
      details: { state: statusEvent.status.state, message: statusEvent.status.message },
    },
  });
}

async function handleArtifactUpdate(
  artifactEvent: TaskArtifactUpdateEvent,
  session: ReturnType<typeof useA2ASession>,
  messageStore: A2AExternalMessageStore,
  connection: ReturnType<typeof useA2AConnection>,
) {
  if (artifactEvent.artifact.name === "tool-call") {
    const dataPart = artifactEvent.artifact.parts[0];
    if (dataPart?.kind === "data" && isToolCallData(dataPart.data)) {
      const data = dataPart.data;
      messageStore.applyToolCall({
        chatId: session.contextId,
        runId: artifactEvent.artifact.artifactId,
        toolName: data.toolName,
        query: data.query,
        resultCount: data.resultCount,
        phase: data.phase,
        imageUrl: data.imageUrl,
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
          details: { phase: data.phase, toolName: data.toolName, query: data.query, resultCount: data.resultCount },
        },
      });
    }
    return;
  }

  const structuredSurfaceCount = countA2UISurfaces(artifactEvent.artifact.parts);
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
        modalities: summarizePartModalities(artifactEvent.artifact.parts),
        append: artifactEvent.append ?? false,
        lastChunk: artifactEvent.lastChunk ?? false,
        metadata: artifactEvent.artifact.metadata,
      },
    },
  });
  if (structuredSurfaceCount > 0) {
    messageStore.appendExecutionEvent({
      chatId: session.contextId,
      event: {
        id: crypto.randomUUID(),
        chatId: session.contextId,
        kind: "structured-ui",
        level: "info",
        timestamp: Date.now(),
        summary: `${structuredSurfaceCount} structured UI surface${structuredSurfaceCount === 1 ? "" : "s"} detected`,
        taskId: artifactEvent.taskId,
        artifactId: artifactEvent.artifact.artifactId,
        traceId: null,
        spanId: null,
        parentSpanId: null,
        details: { source: "artifact", enabled: connection.a2uiEnabled, surfaceCount: structuredSurfaceCount },
      },
    });
  }
}

function handleAgentMessage(
  agentMessage: Message,
  session: ReturnType<typeof useA2ASession>,
  messageStore: A2AExternalMessageStore,
  connection: ReturnType<typeof useA2AConnection>,
) {
  const structuredSurfaceCount = countA2UISurfaces(agentMessage.parts);
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
      details: { partCount: agentMessage.parts.length, modalities: summarizePartModalities(agentMessage.parts) },
    },
  });
  if (structuredSurfaceCount > 0) {
    messageStore.appendExecutionEvent({
      chatId: session.contextId,
      event: {
        id: crypto.randomUUID(),
        chatId: session.contextId,
        kind: "structured-ui",
        level: "info",
        timestamp: Date.now(),
        summary: `${structuredSurfaceCount} structured UI surface${structuredSurfaceCount === 1 ? "" : "s"} detected`,
        taskId: agentMessage.taskId,
        messageId: agentMessage.messageId,
        traceId: null,
        spanId: null,
        parentSpanId: null,
        details: { source: "message", enabled: connection.a2uiEnabled, surfaceCount: structuredSurfaceCount },
      },
    });
  }
}
