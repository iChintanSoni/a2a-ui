import { AlertTriangleIcon, CheckCircle2Icon, DownloadIcon, RefreshCwIcon, XCircleIcon } from "lucide-react";
import type { Agent } from "@/lib/features/agents/agentsSlice";
import type { ComplianceResult } from "@/lib/utils/compliance";
import { AgentCardViewer } from "@/components/agent-card-viewer";
import { AgentCapabilitiesBadges } from "@/components/agent-capabilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Caption, ErrorText, Mono, SectionTitle, Small } from "@/components/typography";

interface Props {
  agent: Agent;
  compliance: ComplianceResult;
  refetching: boolean;
  refetchError: string | null;
  refetchSuccess: boolean;
  onRefetch: () => void;
  onExportReport: () => void;
}

export function CardTab({
  agent,
  compliance,
  refetching,
  refetchError,
  refetchSuccess,
  onRefetch,
  onExportReport,
}: Props) {
  const { card } = agent;

  return (
    <div className="mt-6 space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" className="gap-2" onClick={onRefetch} disabled={refetching}>
          <RefreshCwIcon className={`size-4 ${refetching ? "animate-spin" : ""}`} />
          {refetching ? "Fetching…" : "Re-fetch Agent Card"}
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={onExportReport}>
          <DownloadIcon className="size-4" />
          Export Protocol Report
        </Button>
        {refetchSuccess && <Caption className="text-green-600 inline">Card updated.</Caption>}
        {refetchError && <ErrorText>{refetchError}</ErrorText>}
      </div>

      <div className="space-y-3">
        <SectionTitle>Capabilities</SectionTitle>
        <AgentCapabilitiesBadges
          capabilities={card.capabilities}
          defaultInputModes={card.defaultInputModes}
          defaultOutputModes={card.defaultOutputModes}
        />
        {card.preferredTransport && (
          <Caption>
            Preferred transport: <Mono>{card.preferredTransport}</Mono>
          </Caption>
        )}
        {card.additionalInterfaces && card.additionalInterfaces.length > 0 && (
          <div className="space-y-1">
            <Caption>Additional interfaces</Caption>
            {card.additionalInterfaces.map((entry, index) => (
              <div
                key={`${entry.url}-${entry.transport}-${index}`}
                className="flex min-w-0 flex-col gap-1 text-xs sm:flex-row sm:gap-2"
              >
                <Badge variant="secondary">{entry.transport}</Badge>
                <Mono className="break-all">{entry.url}</Mono>
              </div>
            ))}
          </div>
        )}
        {card.securitySchemes && Object.keys(card.securitySchemes).length > 0 && (
          <div className="space-y-1">
            <Caption>Security schemes</Caption>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(card.securitySchemes).map(([name, scheme]) => (
                <Badge key={name} variant="secondary">
                  {name}: {typeof scheme === "object" && scheme && "type" in scheme ? String(scheme.type) : "unknown"}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {card.skills && card.skills.length > 0 && (
        <div className="space-y-3">
          <SectionTitle>Skills ({card.skills.length})</SectionTitle>
          <div className="space-y-2">
            {card.skills.map((skill) => (
              <div key={skill.id} className="rounded-md border px-3 py-2 text-sm">
                <Small>{skill.name}</Small>
                <Caption className="mt-0.5">{skill.description}</Caption>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(skill.inputModes ?? card.defaultInputModes ?? []).map((mode) => (
                    <Badge key={`in-${skill.id}-${mode}`} variant="secondary">
                      In: {mode}
                    </Badge>
                  ))}
                  {(skill.outputModes ?? card.defaultOutputModes ?? []).map((mode) => (
                    <Badge key={`out-${skill.id}-${mode}`} variant="outline">
                      Out: {mode}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SectionTitle>A2A Spec Compliance</SectionTitle>
          <Caption className="inline">
            {compliance.passCount}/{compliance.checks.length} checks passed
          </Caption>
        </div>
        <div className="space-y-1.5">
          {compliance.checks.map((c) => (
            <div key={c.id} className="flex items-start gap-2 text-xs">
              {c.pass ? (
                <CheckCircle2Icon className="size-3.5 mt-0.5 shrink-0 text-green-500" />
              ) : c.severity === "warning" ? (
                <AlertTriangleIcon className="size-3.5 mt-0.5 shrink-0 text-yellow-600" />
              ) : (
                <XCircleIcon className="size-3.5 mt-0.5 shrink-0 text-destructive" />
              )}
              <span
                className={
                  c.pass
                    ? ""
                    : c.severity === "warning"
                      ? "text-yellow-700 dark:text-yellow-300"
                      : "text-destructive"
                }
              >
                <Mono className="text-xs">{c.label}</Mono>
                {!c.pass && (
                  <span className="text-muted-foreground"> — {c.message}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <SectionTitle>Raw Agent Card</SectionTitle>
        <AgentCardViewer card={card} />
      </div>
    </div>
  );
}
