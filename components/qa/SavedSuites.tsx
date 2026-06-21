"use client";

import { DownloadIcon, PlayIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Caption, Muted, Small } from "@/components/typography";
import { downloadCsv, downloadJson, passRate } from "@/lib/features/qa/qaUtils";
import type { QaSuite, QaSuiteRun } from "@/lib/features/qa/types";
import { useAppDispatch } from "@/lib/hooks";
import { clearQaRunHistory, removeQaSuite } from "@/lib/features/qa/qaSlice";

interface Props {
  suites: QaSuite[];
  runs: QaSuiteRun[];
  runningSuiteId: string | null;
  onRun: (suite: QaSuite) => void;
}

export function SavedSuites({ suites, runs, runningSuiteId, onRun }: Props) {
  const dispatch = useAppDispatch();

  const exportRunHistoryAsCsv = (suite: QaSuite) => {
    const suiteRuns = runs.filter((r) => r.suiteId === suite.id);
    const headers = ["run_id", "started_at", "passed", "duration_ms", "case_name", "case_passed", "assertion_label", "assertion_passed", "assertion_message"];
    const rows: string[][] = [headers];
    for (const run of suiteRuns) {
      for (const c of run.caseResults) {
        if (c.assertionResults.length === 0) {
          rows.push([run.id, new Date(run.startedAt).toISOString(), String(run.passed), String(run.completedAt - run.startedAt), c.caseName, String(c.passed), "", "", c.error ?? ""]);
        }
        for (const a of c.assertionResults) {
          rows.push([run.id, new Date(run.startedAt).toISOString(), String(run.passed), String(run.completedAt - run.startedAt), c.caseName, String(c.passed), a.label, String(a.passed), a.message]);
        }
      }
    }
    downloadCsv(`${suite.name}-qa-history.csv`, rows);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Small>Saved suites</Small>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (!window.confirm("Clear all QA run history? Saved suites will remain.")) return;
            dispatch(clearQaRunHistory(undefined));
          }}
        >
          Clear history
        </Button>
      </div>

      {suites.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center">
          <Muted>No suites saved for this agent.</Muted>
        </div>
      ) : (
        suites.map((suite) => {
          const latestRun = runs.find((run) => run.suiteId === suite.id);
          const rate = passRate(runs, suite.id);
          const isRunning = runningSuiteId === suite.id;
          return (
            <div key={suite.id} className="min-w-0 rounded-md border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Small className="truncate">{suite.name}</Small>
                    <Badge variant="outline">
                      {suite.cases.length} case{suite.cases.length === 1 ? "" : "s"}
                    </Badge>
                    {latestRun && (
                      <Badge variant={latestRun.passed ? "default" : "destructive"}>
                        {latestRun.passed ? "Passing" : "Failing"}
                      </Badge>
                    )}
                    {rate !== null && <Badge variant="outline">{rate}% pass rate</Badge>}
                  </div>
                  <Caption className="mt-1 block truncate">{suite.agentName}</Caption>
                  {suite.description && <Muted className="mt-1">{suite.description}</Muted>}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Button className="justify-center" size="sm" onClick={() => onRun(suite)} disabled={isRunning}>
                    <PlayIcon className="size-4" />
                    {isRunning ? "Running" : "Run"}
                  </Button>
                  <Button
                    className="justify-center"
                    variant="outline"
                    size="sm"
                    onClick={() => downloadJson(`${suite.name}-qa-report.json`, { suite, runs: runs.filter((r) => r.suiteId === suite.id) })}
                  >
                    <DownloadIcon className="size-4" />
                    JSON
                  </Button>
                  <Button
                    className="justify-center"
                    variant="outline"
                    size="sm"
                    onClick={() => exportRunHistoryAsCsv(suite)}
                  >
                    <DownloadIcon className="size-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (!window.confirm(`Remove "${suite.name}"? Run history will remain.`)) return;
                      dispatch(removeQaSuite(suite.id));
                    }}
                    aria-label={`Remove ${suite.name}`}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
