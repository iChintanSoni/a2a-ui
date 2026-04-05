"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Client } from "@a2a-js/sdk/client";
import type {
  Message,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  Part,
} from "@a2a-js/sdk";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  addChat,
  addUserMessage,
  applyStatusUpdate,
  applyArtifactUpdate,
  applyToolCall,
  applyAgentMessage,
  type PartData,
} from "@/lib/features/chats/chatsSlice";
import { setActiveAgent } from "@/lib/features/agents/agentsSlice";
import { createClientFactory } from "@/lib/utils/auth";
import {
  DebugInterceptor,
  appendLog,
  type LogEntry,
} from "@/lib/utils/debugInterceptor";

export interface ChatSessionState {
  isStreaming: boolean;
  isInputRequired: boolean;
  error: string | null;
  transportMethod: string | null;
  logs: LogEntry[];
  sendMessage: (
    text: string,
    metadata?: Record<string, string>,
    attachments?: File[]
  ) => Promise<void>;
  newSession: () => void;
  clearLogs: () => void;
}

export function useChatSession(chatId: string): ChatSessionState {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const chat = useAppSelector((s) => s.chats.chats.find((c) => c.id === chatId));
  const agent = useAppSelector((s) =>
    s.agents.agents.find((a) => a.url === chat?.agentUrl)
  );

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transportMethod, setTransportMethod] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Stable log adder so the interceptor never needs to be re-created
  const addLogRef = useRef<(entry: LogEntry) => void>(() => {});
  addLogRef.current = (entry: LogEntry) =>
    setLogs((prev) => appendLog(prev, entry));

  // One interceptor per mount — routes through addLogRef
  const interceptorRef = useRef<DebugInterceptor>(
    new DebugInterceptor((entry) => addLogRef.current(entry))
  );

  // Cached SDK client — reset on error or new session
  const clientRef = useRef<Client | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const getClient = useCallback(async (): Promise<Client> => {
    if (clientRef.current) return clientRef.current;
    if (!agent) throw new Error("Agent not found");

    const factory = createClientFactory(agent.auth, agent.customHeaders, [
      interceptorRef.current,
    ]);
    const client = await factory.createFromUrl(agent.url);
    clientRef.current = client;

    const proto = (
      client as unknown as { transport?: { protocolName?: string } }
    ).transport?.protocolName ?? null;
    setTransportMethod(proto);

    return client;
  }, [agent]);

  // Derive whether the chat is currently awaiting user input
  const pendingInputTask = chat?.items
    .filter((it) => it.kind === "task-status")
    .findLast((it) => it.kind === "task-status") as
    | import("@/lib/features/chats/chatsSlice").TaskStatusItem
    | undefined;
  const isInputRequired = pendingInputTask?.state === "input-required";
  const inputRequiredTaskId = isInputRequired ? pendingInputTask?.taskId : undefined;

  const sendMessage = useCallback(
    async (text: string, metadata?: Record<string, string>, attachments?: File[]) => {
      if (!chat || !agent) return;
      setError(null);
      setIsStreaming(true);

      const messageId = crypto.randomUUID();

      // Encode files as base64 FileParts
      let fileParts: import("@/lib/features/chats/chatsSlice").FilePartData[] = [];
      if (attachments && attachments.length > 0) {
        fileParts = await Promise.all(
          attachments.map(
            (file) =>
              new Promise<import("@/lib/features/chats/chatsSlice").FilePartData>(
                (resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const dataUrl = reader.result as string;
                    const base64 = dataUrl.split(",")[1];
                    resolve({
                      kind: "file",
                      file: { name: file.name, mimeType: file.type, bytes: base64 },
                    });
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                }
              )
          )
        );
      }

      dispatch(
        addUserMessage({
          chatId,
          id: messageId,
          text,
          attachments: fileParts.length > 0 ? fileParts : undefined,
          metadata: metadata && Object.keys(metadata).length > 0 ? metadata : undefined,
          isInputResponse: inputRequiredTaskId != null,
        })
      );

      abortRef.current = new AbortController();

      try {
        const client = await getClient();

        const parts: Part[] = [
          { kind: "text", text },
          ...fileParts.map((fp) => ({
            kind: "file" as const,
            file: fp.file as import("@a2a-js/sdk").FilePart["file"],
          })),
        ];

        const stream = client.sendMessageStream({
          message: {
            kind: "message",
            messageId,
            role: "user",
            contextId: chatId,
            ...(inputRequiredTaskId ? { taskId: inputRequiredTaskId } : {}),
            ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
            parts,
          },
        });

        for await (const event of stream) {
          if (abortRef.current?.signal.aborted) break;

          if (event.kind === "status-update") {
            const ev = event as TaskStatusUpdateEvent;
            dispatch(
              applyStatusUpdate({
                chatId,
                taskId: ev.taskId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                state: ev.status.state as any,
                statusMessage: ev.status.message
                  ? { parts: ev.status.message.parts as PartData[] }
                  : undefined,
              })
            );
          } else if (event.kind === "artifact-update") {
            const ev = event as TaskArtifactUpdateEvent;
            if (ev.artifact.name === "tool-call") {
              const dataPart = ev.artifact.parts[0];
              if (dataPart?.kind === "data") {
                const d = dataPart.data as {
                  phase: "running" | "done" | "error";
                  toolName: string;
                  query: string;
                  resultCount?: number;
                };
                dispatch(
                  applyToolCall({
                    chatId,
                    runId: ev.artifact.artifactId,
                    toolName: d.toolName,
                    query: d.query,
                    resultCount: d.resultCount,
                    phase: d.phase,
                  })
                );
              }
            } else {
              dispatch(
                applyArtifactUpdate({
                  chatId,
                  taskId: ev.taskId,
                  artifactId: ev.artifact.artifactId,
                  name: ev.artifact.name,
                  description: ev.artifact.description,
                  parts: ev.artifact.parts as PartData[],
                  append: ev.append ?? false,
                  lastChunk: ev.lastChunk ?? false,
                })
              );
            }
          } else if (event.kind === "message") {
            const ev = event as Message;
            if (ev.role === "agent") {
              dispatch(
                applyAgentMessage({
                  chatId,
                  messageId: ev.messageId,
                  taskId: ev.taskId,
                  parts: ev.parts as PartData[],
                })
              );
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          const msg = err.message || "Something went wrong.";
          setError(msg);
          clientRef.current = null;
          setLogs((prev) =>
            appendLog(prev, {
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              type: "error",
              method: "sendMessageStream",
              payload: { message: msg },
            })
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [chat, agent, chatId, dispatch, getClient]
  );

  const newSession = useCallback(() => {
    if (!agent) return;
    dispatch(setActiveAgent(agent.url));
    const newChatId = crypto.randomUUID();
    dispatch(
      addChat({
        id: newChatId,
        title: `Chat with ${agent.card.name}`,
        agentUrl: agent.url,
        agentName: agent.card.name,
        lastMessage: "",
        timestamp: Date.now(),
      })
    );
    clientRef.current = null;
    setTransportMethod(null);
    router.push(`/dashboard/chat/${newChatId}`);
  }, [agent, dispatch, router]);

  return {
    isStreaming,
    isInputRequired,
    error,
    transportMethod,
    logs,
    sendMessage,
    newSession,
    clearLogs: () => setLogs([]),
  };
}
