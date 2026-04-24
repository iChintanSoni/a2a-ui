"use client";

import { A2AAgentCard } from "@/components/chat/A2AAgentCard";
import { A2AChat } from "@/components/chat/A2AChat";
import { Caption, PageTitle, Muted, P } from "@/components/typography";
import { useA2AConnection } from "@/hooks/use-a2a-connection";

const DEMO_AGENT_URL =
  process.env.NEXT_PUBLIC_DEMO_AGENT_URL ?? "http://localhost:3001";

export default function EmbedDemoPage() {
  const cardConnection = useA2AConnection({
    agentUrl: DEMO_AGENT_URL,
    autoConnect: true,
    autoLoadCard: true,
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 md:p-8">
      <div className="flex max-w-3xl flex-col gap-2">
        <Caption>Phase 1 Demo</Caption>
        <PageTitle>Embeddable A2A Chat</PageTitle>
        <P className="text-sm text-muted-foreground">
          This route uses the new headless hooks and embeddable components directly, without the
          dashboard chat route owning session orchestration.
        </P>
        <Muted className="text-sm">
          Agent URL: <span className="font-mono">{DEMO_AGENT_URL}</span>
        </Muted>
      </div>

      <div className="grid min-h-0 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <A2AChat
          agentUrl={DEMO_AGENT_URL}
          initialCard={cardConnection.card ?? undefined}
          persistenceMode="memory"
          context={{
            initialMetadata: {
              surface: "embed-demo",
              source: "a2a-ui",
            },
            hiddenSystemContext:
              "You are running inside the embeddable A2A UI demo. Prefer concise answers that help developers inspect behavior quickly.",
            messageContextEnrichers: [
              ({ text }) => ({
                metadata: {
                  promptLength: String(text.length),
                },
              }),
            ],
          }}
          title="Embeddable Widget"
        />

        <A2AAgentCard
          card={cardConnection.card}
          loading={cardConnection.status === "connecting"}
          error={cardConnection.error}
          onRefresh={cardConnection.refreshAgentCard}
        />
      </div>
    </div>
  );
}
