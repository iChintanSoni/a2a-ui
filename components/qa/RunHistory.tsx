"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Caption, Muted, Small } from "@/components/typography";
import { formatDuration } from "@/lib/features/qa/qaUtils";
import type { QaSuiteRun } from "@/lib/features/qa/types";

interface Props {
  runs: QaSuiteRun[];
}

export function RunHistory({ runs }: Props) {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  if (runs.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <Small>Run history</Small>
        <div className="rounded-md border border-dashed p-6 text-center">
          <Muted>No QA runs recorded yet.</Muted>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Small>Run history</Small>
      {runs.slice(0, 20).map((run) => {
        const isExpanded = expandedRunId === run.id;
        return (
          <div key={run.id} className="min-w-0 rounded-md border">
            <button
              className="flex w-full items-start gap-2 p-4 text-left hover:bg-muted/20"
              onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
            >
              {isExpanded
                ? <ChevronDownIcon className="mt-0.5 size-4 shrink-0" />
                : <ChevronRightIcon className="mt-0.5 size-4 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Small>{run.suiteName}</Small>
                  <Badge variant={run.passed ? "default" : "destructive"}>
                    {run.passed ? "Passed" : "Failed"}
                  </Badge>
                  <Badge variant="outline">{formatDuration(run.completedAt - run.startedAt)}</Badge>
                  <Badge variant="outline">
                    {run.caseResults.filter((r) => r.passed).length}/{run.caseResults.length} cases
                  </Badge>
                </div>
                <Caption className="mt-1 block">
                  {new Date(run.completedAt).toLocaleString()} · {run.agentName}
                </Caption>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t px-4 pb-4 pt-3">
                <div className="flex flex-col gap-3">
                  {run.caseResults.map((result) => (
                    <div key={result.caseId} className="rounded-md bg-muted/30 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Caption>{result.caseName}</Caption>
                        <Badge variant={result.passed ? "default" : "destructive"}>
                          {result.passed ? "Pass" : "Fail"}
                        </Badge>
                        <Badge variant="outline">{result.outputMode}</Badge>
                        {result.finalTaskState && (
                          <Badge variant="outline">{result.finalTaskState}</Badge>
                        )}
                        <Badge variant="outline">{formatDuration(result.durationMs)}</Badge>
                      </div>

                      {result.error ? (
                        <Caption className="mt-2 block text-destructive">{result.error}</Caption>
                      ) : (
                        <>
                          {result.outputPreview && (
                            <Muted className="mt-2 line-clamp-2">{result.outputPreview}</Muted>
                          )}
                          {result.assertionResults.length > 0 && (
                            <div className="mt-2 flex flex-col gap-1">
                              {result.assertionResults.map((ar) => (
                                <div key={ar.assertionId} className="flex items-start gap-1.5 text-xs">
                                  <span className={ar.passed ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                                    {ar.passed ? "✓" : "✗"}
                                  </span>
                                  <span className="font-medium">{ar.label}:</span>
                                  <span className="text-muted-foreground">{ar.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
