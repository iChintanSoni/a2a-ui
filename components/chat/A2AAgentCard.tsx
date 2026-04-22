"use client";

import { RefreshCwIcon } from "lucide-react";
import { AgentCardViewer } from "@/components/agent-card-viewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Caption, Muted, Small } from "@/components/typography";
import type { AgentCard } from "@a2a-js/sdk";
import { checkCompliance } from "@/lib/utils/compliance";

interface A2AAgentCardProps {
  card: AgentCard | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => unknown | Promise<unknown>;
}

export function A2AAgentCard({ card, loading, error, onRefresh }: A2AAgentCardProps) {
  const compliance = card ? checkCompliance(card) : null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Small className="truncate">
            {card?.name ?? "Agent card"}
          </Small>
          <Caption className="mt-1 truncate">
            {card?.description ?? "Fetch an agent card to inspect transports, skills, and modes."}
          </Caption>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void onRefresh()}>
            <RefreshCwIcon className="size-3.5" />
            Refresh
          </Button>
        )}
      </div>

      {card ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Protocol {card.protocolVersion}</Badge>
            <Badge variant="outline">Version {card.version}</Badge>
            {compliance && (
              <Badge variant={compliance.failCount === 0 ? "default" : "destructive"}>
                {compliance.failCount === 0
                  ? "Compliant"
                  : `${compliance.failCount} issue${compliance.failCount === 1 ? "" : "s"}`}
              </Badge>
            )}
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div>URL: {card.url ?? "Not declared"}</div>
            <div>Preferred transport: {card.preferredTransport ?? "Not declared"}</div>
            <div>Input modes: {(card.defaultInputModes ?? []).join(", ") || "None"}</div>
            <div>Output modes: {(card.defaultOutputModes ?? []).join(", ") || "None"}</div>
          </div>

          <AgentCardViewer card={card} />
        </div>
      ) : (
        <Muted className="mt-4 text-sm">
          {loading ? "Loading agent card..." : error ?? "No agent card loaded yet."}
        </Muted>
      )}
    </div>
  );
}
