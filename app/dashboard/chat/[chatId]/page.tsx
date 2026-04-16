"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import { useChatSession } from "@/hooks/use-chat-session";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { SessionInfoBar } from "@/components/chat/SessionInfoBar";
import { DebugPanel } from "@/components/chat/DebugPanel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SquarePenIcon, BugIcon, DownloadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Caption, Small, Muted } from "@/components/typography";
import { useToast } from "@/lib/toast";
import type { Chat, ArtifactItem, AgentMessageItem, TextPartData } from "@/lib/features/chats/chatsSlice";
import { checkCompliance } from "@/lib/utils/compliance";
import { buildProtocolReport, protocolReportFilename } from "@/lib/utils/protocolReport";

interface PageProps {
  params: Promise<{ chatId: string }>;
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAsJson(chat: Chat) {
  downloadFile(
    `${chat.title.replace(/[^a-z0-9]/gi, "_")}.json`,
    JSON.stringify(chat, null, 2),
    "application/json"
  );
}

function exportAsMarkdown(chat: Chat) {
  const lines: string[] = [
    `# ${chat.title}`,
    `*Agent: ${chat.agentName}*`,
    "",
  ];

  const textOf = (item: ArtifactItem | AgentMessageItem) =>
    item.parts
      .filter((p): p is TextPartData => p.kind === "text")
      .map((p) => p.text)
      .join("");

  for (const item of chat.items) {
    switch (item.kind) {
      case "user-message":
        lines.push(`**You:** ${item.text}`, "");
        break;
      case "artifact": {
        const text = textOf(item);
        if (text) lines.push(`**Agent:** ${text}`, "");
        break;
      }
      case "agent-message": {
        const text = textOf(item);
        if (text) lines.push(`**Agent:** ${text}`, "");
        break;
      }
      case "task-status":
        lines.push(`*[${item.state}]*`, "");
        break;
      case "tool-call":
        lines.push(`*Tool: ${item.toolName} — ${item.query}*`, "");
        break;
    }
  }

  downloadFile(
    `${chat.title.replace(/[^a-z0-9]/gi, "_")}.md`,
    lines.join("\n"),
    "text/markdown"
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage({ params }: PageProps) {
  const { chatId } = use(params);
  const router = useRouter();

  const chat = useAppSelector((s) => s.chats.chats.find((c) => c.id === chatId));
  const agent = useAppSelector((s) =>
    s.agents.agents.find((a) => a.url === chat?.agentUrl)
  );

  const { isStreaming, isInputRequired, error, transportMethod, logs, validationWarnings, cancelStream, sendMessage, newSession, clearLogs } =
    useChatSession(chatId);

  const [debugOpen, setDebugOpen] = useState(false);
  const { toast } = useToast();

  // Show error as an actionable toast
  useEffect(() => {
    if (!error) return;
    toast({
      type: "error",
      message: error,
      action: { label: "Open debug", onClick: () => setDebugOpen(true) },
    });
  }, [error]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts: Cmd/Ctrl+Shift+D → debug panel, Cmd/Ctrl+Shift+N → new session
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || !e.shiftKey) return;
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        setDebugOpen((v) => !v);
      } else if ((e.key === "n" || e.key === "N") && !isStreaming) {
        e.preventDefault();
        newSession();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isStreaming, newSession]);

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
  const compliance = agent ? checkCompliance(agent.card) : null;
  const exportProtocolReport = () => {
    if (!agent || !compliance) return;
    const report = buildProtocolReport({
      agent,
      chat,
      compliance,
      logs,
      validationWarnings,
    });
    downloadFile(
      protocolReportFilename(agent.displayName ?? agent.card.name),
      JSON.stringify(report, null, 2),
      "application/json"
    );
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <Small className="truncate leading-tight">{chat.title}</Small>
          <Caption className="truncate">{chat.agentName}</Caption>
        </div>

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" title="Export chat">
              <DownloadIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportAsJson(chat)}>
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAsMarkdown(chat)}>
              Export as Markdown
            </DropdownMenuItem>
            {agent && (
              <DropdownMenuItem onClick={exportProtocolReport}>
                Export Protocol Report
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Debug */}
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-8 shrink-0", debugOpen && "bg-muted text-foreground")}
          onClick={() => setDebugOpen((v) => !v)}
          title="Toggle debug console (⌘⇧D)"
        >
          <BugIcon className="size-4" />
        </Button>

        {/* New Session */}
        <Button
          variant="outline"
          size="sm"
          onClick={newSession}
          disabled={isStreaming}
          className="shrink-0 gap-1.5"
          title="New session (⌘⇧N)"
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
      <ChatMessages chat={chat} onRetry={sendMessage} />

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onCancel={cancelStream}
        isStreaming={isStreaming}
        disabled={isStreaming}
        isInputRequired={isInputRequired}
        inputModes={inputModes}
      />

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
