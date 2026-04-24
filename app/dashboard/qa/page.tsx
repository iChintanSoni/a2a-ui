"use client";

import { useMemo, useState } from "react";
import {
  ClipboardCheckIcon,
  DownloadIcon,
  PlayIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageTitle, Muted, Caption, Small } from "@/components/typography";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { createDemoSmokeSuite } from "@/lib/features/qa/demoSuite";
import {
  clearQaRunHistory,
  recordQaRun,
  removeQaSuite,
  saveQaSuite,
} from "@/lib/features/qa/qaSlice";
import { executeQaSuite } from "@/lib/features/qa/runner";
import type { QaOutputMode, QaSuite, QaTestCase } from "@/lib/features/qa/types";

const TASK_STATES = [
  "submitted",
  "working",
  "input-required",
  "completed",
  "canceled",
  "failed",
  "rejected",
  "auth-required",
  "unknown",
] as const;

function parseMetadata(value: string): Record<string, string> {
  if (!value.trim()) return {};
  const parsed = JSON.parse(value) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(parsed).map(([key, entry]) => [key, String(entry)]),
  );
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export default function QaPage() {
  const dispatch = useAppDispatch();
  const agents = useAppSelector((state) => state.agents.agents);
  const suites = useAppSelector((state) => state.qa.suites);
  const runs = useAppSelector((state) => state.qa.runs);
  const [agentUrl, setAgentUrl] = useState(agents[0]?.url ?? "");
  const [suiteName, setSuiteName] = useState("Smoke suite");
  const [caseName, setCaseName] = useState("Basic response");
  const [prompt, setPrompt] = useState("Reply with a concise readiness message.");
  const [metadata, setMetadata] = useState("{}");
  const [expectedTaskState, setExpectedTaskState] = useState("completed");
  const [expectedOutputMode, setExpectedOutputMode] = useState<QaOutputMode>("text");
  const [regexPattern, setRegexPattern] = useState(".");
  const [jsonPath, setJsonPath] = useState("");
  const [runningSuiteId, setRunningSuiteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedAgent = agents.find((agent) => agent.url === agentUrl) ?? agents[0];
  const suitesByAgent = useMemo(
    () => suites.filter((suite) => !selectedAgent || suite.agentUrl === selectedAgent.url),
    [selectedAgent, suites],
  );

  const saveSuite = () => {
    if (!selectedAgent) return;
    setFormError(null);
    let parsedMetadata: Record<string, string>;
    try {
      parsedMetadata = parseMetadata(metadata);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
      return;
    }

    const assertions: QaTestCase["assertions"] = [];
    if (regexPattern.trim()) {
      assertions.push({
        id: crypto.randomUUID(),
        kind: "content-regex",
        label: "Content regex",
        pattern: regexPattern.trim(),
        flags: "i",
      });
    }
    if (jsonPath.trim()) {
      assertions.push({
        id: crypto.randomUUID(),
        kind: "json-path",
        label: "JSON path exists",
        path: jsonPath.trim(),
      });
    }

    const now = Date.now();
    const suite: QaSuite = {
      id: crypto.randomUUID(),
      agentUrl: selectedAgent.url,
      agentName: selectedAgent.displayName ?? selectedAgent.card.name,
      name: suiteName.trim() || "QA suite",
      createdAt: now,
      updatedAt: now,
      cases: [
        {
          id: crypto.randomUUID(),
          name: caseName.trim() || "QA case",
          prompt,
          attachments: [],
          metadata: parsedMetadata,
          expectedTaskState: expectedTaskState as QaTestCase["expectedTaskState"],
          expectedOutputMode,
          assertions,
        },
      ],
    };
    dispatch(saveQaSuite(suite));
  };

  const runSuite = async (suite: QaSuite) => {
    const agent = agents.find((entry) => entry.url === suite.agentUrl);
    if (!agent) return;
    setRunningSuiteId(suite.id);
    try {
      const run = await executeQaSuite({ suite, agent });
      dispatch(recordQaRun(run));
    } finally {
      setRunningSuiteId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 md:p-8">
      <div>
        <PageTitle>QA Harness</PageTitle>
        <Muted>
          Save repeatable agent checks, run suites, and export pass/fail reports.
        </Muted>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <Muted>Add an agent before creating QA suites.</Muted>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <div className="flex flex-col gap-4 rounded-md border p-4">
            <div className="flex items-center gap-2">
              <ClipboardCheckIcon />
              <Small>Suite builder</Small>
            </div>

            <div className="space-y-2">
              <Label>Agent</Label>
              <Select value={selectedAgent?.url} onValueChange={setAgentUrl}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.url}>
                      {agent.displayName ?? agent.card.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Suite name</Label>
              <Input value={suiteName} onChange={(event) => setSuiteName(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Case name</Label>
              <Input value={caseName} onChange={(event) => setCaseName(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Prompt</Label>
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="min-h-24"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Expected state</Label>
                <Select value={expectedTaskState} onValueChange={setExpectedTaskState}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Output mode</Label>
                <Select
                  value={expectedOutputMode}
                  onValueChange={(value) => setExpectedOutputMode(value as QaOutputMode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="artifact">Artifact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Metadata JSON</Label>
              <Textarea
                value={metadata}
                onChange={(event) => setMetadata(event.target.value)}
                className="min-h-20 font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label>Regex assertion</Label>
              <Input value={regexPattern} onChange={(event) => setRegexPattern(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>JSON path assertion</Label>
              <Input
                placeholder="$.status"
                value={jsonPath}
                onChange={(event) => setJsonPath(event.target.value)}
              />
            </div>

            {formError && <Caption className="text-destructive">{formError}</Caption>}

            <div className="flex flex-wrap gap-2">
              <Button onClick={saveSuite}>
                <PlusIcon className="size-4" />
                Save suite
              </Button>
              {selectedAgent && (
                <Button
                  variant="outline"
                  onClick={() => dispatch(saveQaSuite(createDemoSmokeSuite(selectedAgent)))}
                >
                  Add smoke suite
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Small>Saved suites</Small>
                <Button variant="outline" size="sm" onClick={() => dispatch(clearQaRunHistory(undefined))}>
                  Clear history
                </Button>
              </div>

              {suitesByAgent.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center">
                  <Muted>No suites saved for this agent.</Muted>
                </div>
              ) : (
                suitesByAgent.map((suite) => {
                  const latestRun = runs.find((run) => run.suiteId === suite.id);
                  const isRunning = runningSuiteId === suite.id;
                  return (
                    <div key={suite.id} className="rounded-md border p-4">
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
                          </div>
                          <Caption className="mt-1 block truncate">{suite.agentName}</Caption>
                          {suite.description && <Muted className="mt-2">{suite.description}</Muted>}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => runSuite(suite)}
                            disabled={isRunning}
                          >
                            <PlayIcon className="size-4" />
                            {isRunning ? "Running" : "Run"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadJson(`${suite.name}-qa-report.json`, {
                              suite,
                              runs: runs.filter((run) => run.suiteId === suite.id),
                            })}
                          >
                            <DownloadIcon className="size-4" />
                            Export
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => dispatch(removeQaSuite(suite.id))}
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

            <div className="space-y-3">
              <Small>Run history</Small>
              {runs.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center">
                  <Muted>No QA runs recorded yet.</Muted>
                </div>
              ) : (
                runs.slice(0, 12).map((run) => (
                  <div key={run.id} className="rounded-md border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Small>{run.suiteName}</Small>
                      <Badge variant={run.passed ? "default" : "destructive"}>
                        {run.passed ? "Passed" : "Failed"}
                      </Badge>
                      <Badge variant="outline">
                        {formatDuration(run.completedAt - run.startedAt)}
                      </Badge>
                    </div>
                    <Caption className="mt-1 block">
                      {new Date(run.completedAt).toLocaleString()} · {run.agentName}
                    </Caption>
                    <div className="mt-3 space-y-2">
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
                          </div>
                          {result.error ? (
                            <Caption className="mt-2 block text-destructive">{result.error}</Caption>
                          ) : (
                            <Muted className="mt-2 line-clamp-2">
                              {result.outputPreview || "No output captured."}
                            </Muted>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
