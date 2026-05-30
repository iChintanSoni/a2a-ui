import { useMemo, useState } from "react";
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
  const skillPromptStarters = useMemo(() => {
    const card = connection.card ?? initialCard;
    return (card?.skills ?? []).flatMap((skill) =>
      (skill.examples ?? []).map((example, index) => ({
        id: `agent-example-${skill.id}-${index}`,
        label: example.slice(0, 40) || skill.name,
        text: example,
        createdAt: 0,
        useCount: 0,
      })),
    );
  }, [connection.card, initialCard]);

  if (!chat) {
    return (
      <div className="glass flex min-h-80 items-center justify-center rounded-xl p-6">
        <Muted>Preparing chat session...</Muted>
      </div>
    );
  }

  return (
    <div className="glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
      <div className="flex flex-wrap items-start gap-2 border-b px-3 py-3 sm:items-center sm:px-4">
        <div className="min-w-0 flex-1">
          <Small className="truncate">{title ?? chat.title}</Small>
          <Muted className="truncate text-xs">{connection.card?.name ?? chat.agentName}</Muted>
        </div>
        {showEventExplorer && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => {
              setEventsOpen((open) => !open);
              setDebugOpen(false);
            }}
            title="Toggle event explorer"
            aria-label="Toggle event explorer"
            aria-pressed={eventsOpen}
          >
            <ActivityIcon className="size-4" />
          </Button>
        )}
        {showDebugPanel && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => {
              setDebugOpen((open) => !open);
              setEventsOpen(false);
            }}
            title="Toggle debug console"
            aria-label="Toggle debug console"
            aria-pressed={debugOpen}
          >
            <BugIcon className="size-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 max-sm:px-2"
          onClick={session.newSession}
          disabled={session.isStreaming}
          aria-label="New session"
        >
          <SquarePenIcon className="size-3.5" />
          <span className="hidden sm:inline">New Session</span>
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
        promptPresets={skillPromptStarters}
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
