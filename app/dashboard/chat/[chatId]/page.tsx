"use client";

import { use, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Client } from "@a2a-js/sdk/client";
import { createClientFactory } from "@/lib/utils/auth";
import {
  DebugInterceptor,
  appendLog,
  type LogEntry,
} from "@/lib/utils/debugInterceptor";
import type {
  Message,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
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
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { SessionInfoBar } from "@/components/chat/SessionInfoBar";
import { DebugPanel } from "@/components/chat/DebugPanel";
import { Button } from "@/components/ui/button";
import { SquarePenIcon, BugIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [transportMethod, setTransportMethod] = useState<string | null>(null);

  // ── Debug console state ────────────────────────────────────────────────────
  const [debugOpen, setDebugOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Stable log adder so the interceptor never needs to be re-created
  const addLogRef = useRef<(entry: LogEntry) => void>(() => {});
  addLogRef.current = (entry: LogEntry) =>
    setLogs((prev) => appendLog(prev, entry));

  // One interceptor per page mount — routes through addLogRef
  const interceptorRef = useRef<DebugInterceptor>(
    new DebugInterceptor((entry) => addLogRef.current(entry))
  );

  // ── Client caching ─────────────────────────────────────────────────────────
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

  // ── Send message ───────────────────────────────────────────────────────────
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
          const msg = err.message || "Something went wrong.";
          setError(msg);
          clientRef.current = null;
          // Surface the error in the debug log too
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

  // ── New session ────────────────────────────────────────────────────────────
  const handleNewSession = useCallback(() => {
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

  const inputModes = agent?.card.defaultInputModes ?? [];
  const outputModes = agent?.card.defaultOutputModes ?? [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium text-sm leading-tight">
            {chat.title}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {chat.agentName}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-8 shrink-0",
            debugOpen && "bg-muted text-foreground"
          )}
          onClick={() => setDebugOpen((v) => !v)}
          title="Toggle debug console"
        >
          <BugIcon className="size-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNewSession}
          disabled={isStreaming}
          className="shrink-0 gap-1.5"
        >
          <SquarePenIcon className="size-3.5" />
          New Session
        </Button>
      </div>

      {/* Session info bar */}
      <SessionInfoBar
        contextId={chatId}
        transportMethod={transportMethod}
        inputModes={inputModes}
        outputModes={outputModes}
      />

      {/* Messages — fills remaining space */}
      <ChatMessages chat={chat} />

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isStreaming} />

      {/* Debug console — sits at bottom, above nothing */}
      {debugOpen && (
        <DebugPanel
          logs={logs}
          onClear={() => setLogs([])}
          onClose={() => setDebugOpen(false)}
        />
      )}
    </div>
  );
}
