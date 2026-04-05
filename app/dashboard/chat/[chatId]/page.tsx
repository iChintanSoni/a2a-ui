"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import { useChatSession } from "@/hooks/use-chat-session";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { SessionInfoBar } from "@/components/chat/SessionInfoBar";
import { DebugPanel } from "@/components/chat/DebugPanel";
import { Button } from "@/components/ui/button";
import { SquarePenIcon, BugIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Caption, Small, Muted } from "@/components/typography";

interface PageProps {
  params: Promise<{ chatId: string }>;
}

export default function ChatPage({ params }: PageProps) {
  const { chatId } = use(params);
  const router = useRouter();

  const chat = useAppSelector((s) => s.chats.chats.find((c) => c.id === chatId));
  const agent = useAppSelector((s) =>
    s.agents.agents.find((a) => a.url === chat?.agentUrl)
  );

  const { isStreaming, isInputRequired, error, transportMethod, logs, sendMessage, newSession, clearLogs } =
    useChatSession(chatId);

  const [debugOpen, setDebugOpen] = useState(false);

  if (!chat) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Muted>Chat not found.</Muted>
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
          <Small className="truncate leading-tight">{chat.title}</Small>
          <Caption className="truncate">{chat.agentName}</Caption>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={cn("size-8 shrink-0", debugOpen && "bg-muted text-foreground")}
          onClick={() => setDebugOpen((v) => !v)}
          title="Toggle debug console"
        >
          <BugIcon className="size-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={newSession}
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

      {/* Messages */}
      <ChatMessages chat={chat} />

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isStreaming} isInputRequired={isInputRequired} inputModes={inputModes} />

      {/* Debug console */}
      {debugOpen && (
        <DebugPanel
          logs={logs}
          onClear={clearLogs}
          onClose={() => setDebugOpen(false)}
        />
      )}
    </div>
  );
}
