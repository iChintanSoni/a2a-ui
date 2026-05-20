"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useChatSession } from "@/hooks/use-chat-session";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { SessionInfoBar } from "@/components/chat/SessionInfoBar";
import { DebugPanel } from "@/components/chat/DebugPanel";
import { EventExplorer } from "@/components/chat/EventExplorer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SquarePenIcon,
  BugIcon,
  DownloadIcon,
  ActivityIcon,
  CopyIcon,
  GitCompareArrowsIcon,
  RotateCcwIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Caption, Small, Muted } from "@/components/typography";
import { useToast } from "@/lib/toast";
import { addChat, cloneChat } from "@/lib/features/chats/chatsSlice";
import type {
  Chat,
  ArtifactItem,
  UserMessageItem,
} from "@/lib/features/chats/chatsSlice";
import { checkCompliance } from "@/lib/utils/compliance";
import { buildProtocolReport, protocolReportFilename } from "@/lib/utils/protocolReport";
import {
  buildChatTraceJson,
  buildChatTraceMarkdown,
  chatTraceFilename,
} from "@/lib/utils/chatExport";
import {
  markPromptPresetUsed,
  savePromptPreset,
  setAgentDefaultMetadata,
} from "@/lib/features/workbench/workbenchSlice";
import { consumeRerunDraft, queueRerunDraft } from "@/lib/features/chats/rerunDraft";
import { buildArtifactRevisionMessage } from "@/lib/features/chats/artifactRevision";

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage({ params }: PageProps) {
  const { chatId } = use(params);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const chat = useAppSelector((s) => s.chats.chats.find((c) => c.id === chatId));
  const agent = useAppSelector((s) =>
    s.agents.agents.find((a) => a.url === chat?.agentUrl)
  );
  const agentWorkbench = useAppSelector((s) =>
    chat ? s.workbench.agentSettings[chat.agentUrl] : undefined,
  );

  const { isStreaming, isInputRequired, error, transportMethod, logs, validationWarnings, cancelStream, sendMessage, newSession, clearLogs } =
    useChatSession(chatId);

  const [debugOpen, setDebugOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const { toast } = useToast();
  const lastUserMessage = useMemo(
    () => chat?.items.findLast((item): item is UserMessageItem => item.kind === "user-message"),
    [chat],
  );

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

  useEffect(() => {
    const rerun = consumeRerunDraft(chatId);
    if (!rerun) return;
    sendMessage(rerun.parts, rerun.metadata).catch((err) => {
      toast({
        type: "error",
        message: err instanceof Error ? err.message : "Unable to rerun prompt.",
      });
    });
  }, [chatId, sendMessage, toast]);

  const skillPromptStarters = useMemo(
    () =>
      (agent?.card.skills ?? []).flatMap((skill) =>
        (skill.examples ?? []).map((example, index) => ({
          id: `agent-example-${skill.id}-${index}`,
          label: example.slice(0, 40) || skill.name,
          text: example,
          createdAt: 0,
          useCount: 0,
        })),
      ),
    [agent?.card.skills],
  );

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
  const exportMarkdownTrace = () => {
    downloadFile(
      chatTraceFilename(chat, "markdown"),
      buildChatTraceMarkdown({ chat, logs, validationWarnings }),
      "text/markdown",
    );
  };
  const exportForensicJson = () => {
    downloadFile(
      chatTraceFilename(chat, "json"),
      JSON.stringify(buildChatTraceJson({ chat, logs, validationWarnings }), null, 2),
      "application/json",
    );
  };
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

  const cloneRun = () => {
    const nextChatId = crypto.randomUUID();
    dispatch(cloneChat({ chatId: chat.id, newChatId: nextChatId, mode: "prompt" }));
    router.push(`/dashboard/chat/${nextChatId}`);
  };

  const rerunMessage = (item: UserMessageItem) => {
    const nextChatId = crypto.randomUUID();
    dispatch(
      addChat({
        id: nextChatId,
        title: `New run · ${chat.title}`,
        agentUrl: chat.agentUrl,
        agentName: chat.agentName,
        lastMessage: "",
        timestamp: Date.now(),
        sourceChatId: chat.id,
      }),
    );
    queueRerunDraft(nextChatId, {
      parts: item.parts,
      metadata: item.metadata,
    });
    router.push(`/dashboard/chat/${nextChatId}`);
  };

  const submitArtifactRevision = async (item: ArtifactItem, revisedText: string) => {
    const revision = buildArtifactRevisionMessage(item, revisedText);
    await sendMessage(revision.parts, revision.metadata);
    toast({
      type: "success",
      message: `Revision sent for ${item.name ?? item.id}.`,
    });
  };

  const compareHref = chat.sourceChatId
    ? `/dashboard/compare?left=${chat.sourceChatId}&right=${chat.id}`
    : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-2 border-b px-3 py-3 sm:items-center sm:px-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <Small className="truncate leading-tight">{chat.title}</Small>
          <Caption className="truncate">{chat.agentName}</Caption>
        </div>

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              title="Export chat"
              aria-label="Export chat"
            >
              <DownloadIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportMarkdownTrace}>
              Export Markdown Trace
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportForensicJson}>
              Export Forensic JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAsJson(chat)}>
              Export Raw Chat State
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
          className={cn("size-8 shrink-0", eventsOpen && "bg-muted text-foreground")}
          onClick={() => {
            setEventsOpen((v) => !v);
            setDebugOpen(false);
          }}
          title="Toggle event explorer"
          aria-label="Toggle event explorer"
          aria-pressed={eventsOpen}
        >
          <ActivityIcon className="size-4" />
        </Button>

        {/* Debug */}
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-8 shrink-0", debugOpen && "bg-muted text-foreground")}
          onClick={() => {
            setDebugOpen((v) => !v);
            setEventsOpen(false);
          }}
          title="Toggle debug console (⌘⇧D)"
          aria-label="Toggle debug console"
          aria-pressed={debugOpen}
        >
          <BugIcon className="size-4" />
        </Button>

        {/* New Session */}
        <Button
          variant="outline"
          size="sm"
          onClick={cloneRun}
          disabled={isStreaming}
          className="shrink-0 gap-1.5 max-sm:px-2"
          title="Clone prompts into a fresh run"
        >
          <CopyIcon className="size-3.5" />
          <span className="hidden sm:inline">Clone Prompt</span>
        </Button>

        {lastUserMessage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => rerunMessage(lastUserMessage)}
            disabled={isStreaming}
            className="shrink-0 gap-1.5 max-sm:px-2"
            title="Rerun the latest prompt in a fresh run"
            aria-label="Rerun latest prompt in a fresh run"
          >
            <RotateCcwIcon className="size-3.5" />
            <span className="hidden sm:inline">Rerun Prompt</span>
          </Button>
        )}

        {compareHref && (
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5 max-sm:px-2" asChild>
            <Link href={compareHref}>
              <GitCompareArrowsIcon className="size-3.5" />
              <span className="hidden sm:inline">Compare Source</span>
            </Link>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={newSession}
          disabled={isStreaming}
          className="shrink-0 gap-1.5 max-sm:px-2"
          title="New session (⌘⇧N)"
          aria-label="New session"
        >
          <SquarePenIcon className="size-3.5" />
          <span className="hidden sm:inline">New Session</span>
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
      <ChatMessages
        chat={chat}
        a2uiEnabled={agent?.a2uiEnabled}
        onRetry={(item) => sendMessage(item.parts, item.metadata)}
        onRerunMessage={rerunMessage}
        onSubmitArtifactRevision={submitArtifactRevision}
      />

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onCancel={cancelStream}
        isStreaming={isStreaming}
        disabled={isStreaming}
        isInputRequired={isInputRequired}
        inputModes={inputModes}
        promptPresets={[...skillPromptStarters, ...(agentWorkbench?.promptPresets ?? [])]}
        defaultMetadata={agentWorkbench?.defaultMetadata}
        onSavePromptPreset={(text, metadata) => {
          if (!chat) return;
          dispatch(savePromptPreset({ agentUrl: chat.agentUrl, text, metadata }));
          toast({
            type: "success",
            message: "Saved prompt preset for this agent.",
          });
        }}
        onSaveDefaultMetadata={(metadata) => {
          if (!chat) return;
          dispatch(setAgentDefaultMetadata({ agentUrl: chat.agentUrl, metadata }));
          toast({
            type: "success",
            message: "Saved default metadata for this agent.",
          });
        }}
        onApplyPromptPreset={(presetId) => {
          if (!chat) return;
          dispatch(markPromptPresetUsed({ agentUrl: chat.agentUrl, presetId }));
        }}
      />

      {eventsOpen && (
        <EventExplorer
          events={chat.executionEvents}
          onClose={() => setEventsOpen(false)}
        />
      )}

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
