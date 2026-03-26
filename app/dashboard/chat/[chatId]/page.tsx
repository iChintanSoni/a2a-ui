"use client";

import { use, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ClientFactory } from "@a2a-js/sdk/client";
import type { Client } from "@a2a-js/sdk/client";
import type {
  Message,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
} from "@a2a-js/sdk";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  addUserMessage,
  applyStatusUpdate,
  applyArtifactUpdate,
  applyToolCall,
  applyAgentMessage,
  type PartData,
} from "@/lib/features/chats/chatsSlice";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";

interface PageProps {
  params: Promise<{ chatId: string }>;
}

export default function ChatPage({ params }: PageProps) {
  const { chatId } = use(params);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const chat = useAppSelector((state) =>
    state.chats.chats.find((c) => c.id === chatId)
  );
  const agent = useAppSelector((state) =>
    state.agents.agents.find((a) => a.url === chat?.agentUrl)
  );

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<Client | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const getClient = useCallback(async (): Promise<Client> => {
    if (clientRef.current) return clientRef.current;
    if (!agent) throw new Error("Agent not found");
    const factory = new ClientFactory();
    const client = await factory.createFromUrl(agent.url);
    clientRef.current = client;
    return client;
  }, [agent]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!chat || !agent) return;
      setError(null);
      setIsStreaming(true);

      const messageId = crypto.randomUUID();
      dispatch(addUserMessage({ chatId, id: messageId, text }));

      abortRef.current = new AbortController();

      try {
        const client = await getClient();

        const stream = client.sendMessageStream({
          message: {
            kind: "message",
            messageId,
            role: "user",
            contextId: chatId,
            parts: [{ kind: "text", text }],
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
          setError(err.message || "Something went wrong.");
          // Invalidate cached client on connection errors
          clientRef.current = null;
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [chat, agent, chatId, dispatch, getClient]
  );

  if (!chat) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <p>Chat not found.</p>
        <button
          className="text-sm underline"
          onClick={() => router.push("/dashboard")}
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex flex-col">
          <span className="font-medium text-sm leading-tight">{chat.title}</span>
          <span className="text-xs text-muted-foreground">{chat.agentName}</span>
        </div>
      </div>

      {/* Messages */}
      <ChatMessages chat={chat} />

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
