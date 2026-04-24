"use client";

import { useState } from "react";
import { ActivityIcon, BugIcon, SquarePenIcon } from "lucide-react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { SessionInfoBar } from "@/components/chat/SessionInfoBar";
import { A2ADebugPanel } from "@/components/chat/A2ADebugPanel";
import { EventExplorer } from "@/components/chat/EventExplorer";
import { Button } from "@/components/ui/button";
import { Muted, Small } from "@/components/typography";
import type { A2AContextConfig, A2ASessionPersistenceMode } from "@/lib/a2a/types";
import type { AgentCard } from "@a2a-js/sdk";
import type { AuthConfig, CustomHeader } from "@/lib/features/agents/agentsSlice";
import { useA2AConnection } from "@/hooks/use-a2a-connection";
import { useA2ADebug } from "@/hooks/use-a2a-debug";
import { useA2AMessages } from "@/hooks/use-a2a-messages";
import { useA2ASession } from "@/hooks/use-a2a-session";

interface A2AChatProps {
  agentUrl: string;
  auth?: AuthConfig;
  headers?: CustomHeader[];
  initialCard?: AgentCard;
  initialContextId?: string;
  persistenceMode?: Exclude<A2ASessionPersistenceMode, "external">;
  context?: A2AContextConfig;
  a2uiEnabled?: boolean;
  title?: string;
  showDebugPanel?: boolean;
  showEventExplorer?: boolean;
}

export function A2AChat({
  agentUrl,
  auth,
  headers,
  initialCard,
  initialContextId,
  persistenceMode = "memory",
  context,
  a2uiEnabled = false,
  title,
  showDebugPanel = true,
  showEventExplorer = true,
}: A2AChatProps) {
  const debug = useA2ADebug();
  const connection = useA2AConnection({
    agentUrl,
    auth,
    headers,
    a2uiEnabled,
    debug,
    autoConnect: true,
    initialCard,
  });
  const session = useA2ASession({ defaultContextId: initialContextId });
  const { chat, isInputRequired, sendMessage, cancelStream } = useA2AMessages({
    connection,
    debug,
    session,
    agentName: initialCard?.name,
    context,
    persistenceMode,
  });
  const [debugOpen, setDebugOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const effectiveDebugOpen = showDebugPanel && (debugOpen || session.error != null);

  const inputModes = connection.card?.defaultInputModes ?? initialCard?.defaultInputModes ?? [];
  const outputModes = connection.card?.defaultOutputModes ?? initialCard?.defaultOutputModes ?? [];

  if (!chat) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-xl border bg-card p-6">
        <Muted>Preparing chat session...</Muted>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <Small className="truncate">{title ?? chat.title}</Small>
          <Muted className="truncate text-xs">{connection.card?.name ?? chat.agentName}</Muted>
        </div>
        {showEventExplorer && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => setEventsOpen((open) => !open)}
            title="Toggle event explorer"
          >
            <ActivityIcon className="size-4" />
          </Button>
        )}
        {showDebugPanel && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => setDebugOpen((open) => !open)}
            title="Toggle debug console"
          >
            <BugIcon className="size-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={session.newSession}
          disabled={session.isStreaming}
        >
          <SquarePenIcon className="size-3.5" />
          New Session
        </Button>
      </div>

      <SessionInfoBar
        contextId={session.contextId}
        transportMethod={connection.transportMethod}
        inputModes={inputModes}
        outputModes={outputModes}
      />

      <ChatMessages
        chat={chat}
        a2uiEnabled={a2uiEnabled}
        onRetry={(item) => sendMessage(item.parts, item.metadata)}
      />

      <ChatInput
        onSend={sendMessage}
        onCancel={cancelStream}
        isStreaming={session.isStreaming}
        disabled={session.isStreaming}
        isInputRequired={isInputRequired}
        inputModes={inputModes}
      />

      {showEventExplorer && eventsOpen && (
        <EventExplorer
          events={chat.executionEvents}
          onClose={() => setEventsOpen(false)}
        />
      )}

      {effectiveDebugOpen && (
        <A2ADebugPanel debug={debug} onClose={() => setDebugOpen(false)} />
      )}
    </div>
  );
}
