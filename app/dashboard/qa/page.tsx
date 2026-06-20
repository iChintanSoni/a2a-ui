"use client";

import { useRef, useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  DownloadIcon,
  PlayIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
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
import type {
  QaAssertion,
  QaOutputMode,
  QaSuite,
  QaSuiteRun,
  QaTestCase,
} from "@/lib/features/qa/types";

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

const DURATION_OPERATORS = [
  { value: "lt", label: "< (less than)" },
  { value: "lte", label: "≤ (at most)" },
  { value: "gt", label: "> (greater than)" },
  { value: "gte", label: "≥ (at least)" },
] as const;

// ── helpers ──────────────────────────────────────────────────────────────────

function parseMetadata(value: string): Record<string, string> {
  if (!value.trim()) return {};
  const parsed = JSON.parse(value) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(parsed).map(([key, entry]) => [key, String(entry)]),
  );
}

function validateMetadata(value: string): string | null {
  try {
    parseMetadata(value);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

function validateRegex(value: string): string | null {
  if (!value.trim()) return null;
  try {
    new RegExp(value.trim(), "i");
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

function validateJsonPath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("$") ? null : "JSON path must start with $.";
}

function validateDataTable(value: string): string | null {
  if (!value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return "Data table must be a JSON array.";
    for (const row of parsed) {
      if (typeof row !== "object" || row === null || Array.isArray(row))
        return "Each row must be a JSON object.";
    }
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
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

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function passRate(runs: QaSuiteRun[], suiteId: string): number | null {
  const suiteRuns = runs.filter((r) => r.suiteId === suiteId);
  if (suiteRuns.length === 0) return null;
  const passed = suiteRuns.filter((r) => r.passed).length;
  return Math.round((passed / suiteRuns.length) * 100);
}

// ── import helpers ────────────────────────────────────────────────────────────

function parseCsvImport(text: string): Partial<QaTestCase>[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split(",")
    .map((h) => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map((line) => {
    const values = line.match(/("(?:[^"]|"")*"|[^,]*)/g)?.map((v) => v.replace(/^"|"$/g, "").replace(/""/g, '"')) ?? [];
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    const assertions: QaAssertion[] = [];
    if (row["regexPattern"]) {
      assertions.push({
        id: crypto.randomUUID(),
        kind: "content-regex",
        label: "Content regex",
        pattern: row["regexPattern"],
        flags: "i",
      });
    }
    if (row["jsonPath"]) {
      assertions.push({
        id: crypto.randomUUID(),
        kind: "json-path",
        label: "JSON path exists",
        path: row["jsonPath"],
      });
    }
    return {
      id: crypto.randomUUID(),
      name: row["name"] || "Imported case",
      prompt: row["prompt"] || "",
      attachments: [],
      metadata: row["metadata"] ? (() => { try { return JSON.parse(row["metadata"]) as Record<string, string>; } catch { return {}; } })() : {},
      expectedTaskState: (row["expectedTaskState"] as QaTestCase["expectedTaskState"]) || undefined,
      expectedOutputMode: (row["expectedOutputMode"] as QaOutputMode) || "any",
      assertions,
    };
  });
}

function parseJsonImport(text: string): Partial<QaTestCase>[] {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("Expected a JSON array of test cases.");
  return parsed.map((item: Record<string, unknown>) => ({
    id: crypto.randomUUID(),
    name: typeof item["name"] === "string" ? item["name"] : "Imported case",
    prompt: typeof item["prompt"] === "string" ? item["prompt"] : "",
    attachments: [],
    metadata: (item["metadata"] as Record<string, string>) ?? {},
    expectedTaskState: (item["expectedTaskState"] as QaTestCase["expectedTaskState"]) ?? undefined,
    expectedOutputMode: (item["expectedOutputMode"] as QaOutputMode) ?? "any",
    assertions: Array.isArray(item["assertions"]) ? (item["assertions"] as QaAssertion[]) : [],
    dataTable: Array.isArray(item["dataTable"]) ? (item["dataTable"] as Array<Record<string, string>>) : undefined,
  }));
}

// ── main component ────────────────────────────────────────────────────────────

export default function QaPage() {
  const dispatch = useAppDispatch();
  const agents = useAppSelector((state) => state.agents.agents);
  const suites = useAppSelector((state) => state.qa.suites);
  const runs = useAppSelector((state) => state.qa.runs);

  // Suite-level form state
  const [agentUrl, setAgentUrl] = useState(agents[0]?.url ?? "");
  const [suiteName, setSuiteName] = useState("Smoke suite");
  const [suiteDescription, setSuiteDescription] = useState("");
  const [draftCases, setDraftCases] = useState<QaTestCase[]>([]);

  // Case editor form state
  const [caseName, setCaseName] = useState("Basic response");
  const [prompt, setPrompt] = useState("Reply with a concise readiness message.");
  const [metadata, setMetadata] = useState("{}");
  const [expectedTaskState, setExpectedTaskState] = useState("completed");
  const [expectedOutputMode, setExpectedOutputMode] = useState<QaOutputMode>("text");
  const [regexPattern, setRegexPattern] = useState(".");
  const [jsonPath, setJsonPath] = useState("");
  const [durationOperator, setDurationOperator] = useState<"lt" | "lte" | "gt" | "gte">("lt");
  const [durationValue, setDurationValue] = useState("");
  const [artifactMimePattern, setArtifactMimePattern] = useState("");
  const [dataTableJson, setDataTableJson] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Results
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [runningSuiteId, setRunningSuiteId] = useState<string | null>(null);

  // File import ref
  const importFileRef = useRef<HTMLInputElement>(null);

  const selectedAgent = agents.find((agent) => agent.url === agentUrl) ?? agents[0];
  const suitesByAgent = useMemo(
    () => suites.filter((suite) => !selectedAgent || suite.agentUrl === selectedAgent.url),
    [selectedAgent, suites],
  );
  const promptStarters = useMemo(
    () =>
      (selectedAgent?.card.skills ?? []).flatMap((skill) =>
        (skill.examples ?? []).map((example, index) => ({
          id: `${skill.id}-${index}`,
          label: skill.name,
          text: example,
        })),
      ),
    [selectedAgent?.card.skills],
  );

  const metadataError = useMemo(() => validateMetadata(metadata), [metadata]);
  const regexError = useMemo(() => validateRegex(regexPattern), [regexPattern]);
  const jsonPathError = useMemo(() => validateJsonPath(jsonPath), [jsonPath]);
  const dataTableError = useMemo(() => validateDataTable(dataTableJson), [dataTableJson]);
  const durationError = durationValue && isNaN(Number(durationValue))
    ? "Duration must be a number."
    : null;
  const canAddCase = !metadataError && !regexError && !jsonPathError && !dataTableError && !durationError;

  function buildCurrentCase(): QaTestCase | null {
    if (!canAddCase) return null;
    let parsedMetadata: Record<string, string>;
    try {
      parsedMetadata = parseMetadata(metadata);
    } catch {
      return null;
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
    if (durationValue.trim() && !durationError) {
      assertions.push({
        id: crypto.randomUUID(),
        kind: "task-duration-ms",
        label: `Duration ${durationOperator} ${durationValue} ms`,
        operator: durationOperator,
        value: Number(durationValue),
      });
    }
    if (artifactMimePattern.trim()) {
      assertions.push({
        id: crypto.randomUUID(),
        kind: "artifact-mime",
        label: `Artifact MIME matches ${artifactMimePattern.trim()}`,
        pattern: artifactMimePattern.trim(),
      });
    }
    const dataTable = dataTableJson.trim()
      ? (JSON.parse(dataTableJson) as Array<Record<string, string>>)
      : undefined;
    return {
      id: crypto.randomUUID(),
      name: caseName.trim() || "QA case",
      prompt,
      attachments: [],
      metadata: parsedMetadata,
      expectedTaskState: expectedTaskState as QaTestCase["expectedTaskState"],
      expectedOutputMode,
      assertions,
      dataTable,
    };
  }

  const addCase = () => {
    setFormError(null);
    const qaCase = buildCurrentCase();
    if (!qaCase) {
      setFormError("Resolve validation errors before adding.");
      return;
    }
    setDraftCases((prev) => [...prev, qaCase]);
    // Reset case editor
    setCaseName(`Case ${draftCases.length + 2}`);
    setPrompt("");
    setMetadata("{}");
    setRegexPattern("");
    setJsonPath("");
    setDurationValue("");
    setArtifactMimePattern("");
    setDataTableJson("");
  };

  const saveSuite = () => {
    if (!selectedAgent) return;
    setFormError(null);
    const currentCase = buildCurrentCase();
    const allCases = currentCase
      ? [...draftCases, currentCase]
      : draftCases;
    if (allCases.length === 0) {
      setFormError("Add at least one case before saving.");
      return;
    }
    const now = Date.now();
    const suite: QaSuite = {
      id: crypto.randomUUID(),
      agentUrl: selectedAgent.url,
      agentName: selectedAgent.displayName ?? selectedAgent.card.name,
      name: suiteName.trim() || "QA suite",
      description: suiteDescription.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      cases: allCases,
    };
    dispatch(saveQaSuite(suite));
    setDraftCases([]);
    setCaseName("Basic response");
    setPrompt("Reply with a concise readiness message.");
    setMetadata("{}");
    setRegexPattern(".");
    setJsonPath("");
    setDurationValue("");
    setArtifactMimePattern("");
    setDataTableJson("");
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        let imported: Partial<QaTestCase>[];
        if (file.name.endsWith(".csv")) {
          imported = parseCsvImport(text);
        } else {
          imported = parseJsonImport(text);
        }
        const validated = imported.map(
          (c): QaTestCase => ({
            id: c.id ?? crypto.randomUUID(),
            name: c.name ?? "Imported case",
            prompt: c.prompt ?? "",
            attachments: c.attachments ?? [],
            metadata: c.metadata ?? {},
            expectedTaskState: c.expectedTaskState,
            expectedOutputMode: c.expectedOutputMode ?? "any",
            assertions: c.assertions ?? [],
            dataTable: c.dataTable,
          }),
        );
        setDraftCases((prev) => [...prev, ...validated]);
        setFormError(null);
      } catch (err) {
        setFormError(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
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
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 md:p-8">
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
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          {/* ── Left: Suite builder ── */}
          <div className="flex min-w-0 flex-col gap-4 rounded-md border p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardCheckIcon className="size-4" />
                <Small>Suite builder</Small>
              </div>
              <div className="flex items-center gap-1">
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".json,.csv"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => importFileRef.current?.click()}
                  title="Import cases from JSON or CSV"
                >
                  <UploadIcon className="size-3.5" />
                  Import
                </Button>
              </div>
            </div>

            {/* Suite-level fields */}
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
              <Input value={suiteName} onChange={(e) => setSuiteName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input value={suiteDescription} onChange={(e) => setSuiteDescription(e.target.value)} placeholder="What this suite tests" />
            </div>

            {/* Pending cases list */}
            {draftCases.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Cases in suite</Label>
                <div className="flex flex-col gap-1">
                  {draftCases.map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between rounded bg-muted/30 px-2 py-1.5 text-sm">
                      <span className="truncate">{c.name}</span>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {c.dataTable && <Badge variant="outline" className="text-xs">×{c.dataTable.length}</Badge>}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-5"
                          onClick={() => setDraftCases((prev) => prev.filter((_, idx) => idx !== i))}
                          aria-label="Remove case"
                        >
                          <Trash2Icon className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Case editor */}
            <div className="border-t pt-3">
              <Small className="block mb-3">{draftCases.length > 0 ? "Add another case" : "Case"}</Small>

              <div className="flex flex-col gap-3">
                <div className="space-y-2">
                  <Label>Case name</Label>
                  <Input value={caseName} onChange={(e) => setCaseName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Prompt</Label>
                  <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-24" />
                  {promptStarters.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {promptStarters.slice(0, 4).map((starter) => (
                        <Button
                          key={starter.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPrompt(starter.text)}
                          title={starter.text}
                        >
                          {starter.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Expected state</Label>
                    <Select value={expectedTaskState} onValueChange={setExpectedTaskState}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TASK_STATES.map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Output mode</Label>
                    <Select value={expectedOutputMode} onValueChange={(v) => setExpectedOutputMode(v as QaOutputMode)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Textarea value={metadata} onChange={(e) => setMetadata(e.target.value)} className="min-h-16 font-mono text-xs" aria-invalid={metadataError ? "true" : "false"} />
                  {metadataError && <Caption className="text-destructive">{metadataError}</Caption>}
                </div>

                {/* Assertions */}
                <div className="border-t pt-2">
                  <Small className="block mb-2">Assertions</Small>
                  <div className="flex flex-col gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Regex pattern</Label>
                      <Input placeholder="e.g. ready|ok" value={regexPattern} onChange={(e) => setRegexPattern(e.target.value)} aria-invalid={regexError ? "true" : "false"} />
                      {regexError && <Caption className="text-destructive">{regexError}</Caption>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">JSON path exists</Label>
                      <Input placeholder="$.status" value={jsonPath} onChange={(e) => setJsonPath(e.target.value)} aria-invalid={jsonPathError ? "true" : "false"} />
                      {jsonPathError && <Caption className="text-destructive">{jsonPathError}</Caption>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Task duration (ms)</Label>
                      <div className="flex gap-2">
                        <Select value={durationOperator} onValueChange={(v) => setDurationOperator(v as typeof durationOperator)}>
                          <SelectTrigger className="w-32 shrink-0"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DURATION_OPERATORS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input placeholder="5000" value={durationValue} onChange={(e) => setDurationValue(e.target.value)} aria-invalid={durationError ? "true" : "false"} />
                      </div>
                      {durationError && <Caption className="text-destructive">{durationError}</Caption>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Artifact MIME pattern</Label>
                      <Input placeholder="image/* or application/json" value={artifactMimePattern} onChange={(e) => setArtifactMimePattern(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Data table */}
                <div className="border-t pt-2">
                  <Label className="text-xs text-muted-foreground">
                    Data table (parametrized — JSON array of row objects)
                  </Label>
                  <Textarea
                    className="mt-1.5 min-h-16 font-mono text-xs"
                    placeholder={'[{"name": "Alice"}, {"name": "Bob"}]'}
                    value={dataTableJson}
                    onChange={(e) => setDataTableJson(e.target.value)}
                    aria-invalid={dataTableError ? "true" : "false"}
                  />
                  {dataTableError && <Caption className="text-destructive">{dataTableError}</Caption>}
                  {!dataTableError && dataTableJson.trim() && (
                    <Caption className="text-muted-foreground">
                      Use {"{{varName}}"} in the prompt or metadata to substitute row values.
                    </Caption>
                  )}
                </div>
              </div>
            </div>

            {formError && <Caption className="text-destructive">{formError}</Caption>}

            <div className="flex flex-wrap gap-2">
              {draftCases.length > 0 && (
                <Button variant="outline" onClick={addCase} disabled={!canAddCase}>
                  <PlusIcon className="size-4" />
                  Add case
                </Button>
              )}
              <Button onClick={saveSuite} disabled={!canAddCase && draftCases.length === 0}>
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

            {/* Import format hint */}
            <Caption className="text-muted-foreground">
              Import accepts <strong>.json</strong> (array of case objects) or{" "}
              <strong>.csv</strong> (columns: name, prompt, expectedTaskState, expectedOutputMode, regexPattern, jsonPath, metadata).
            </Caption>
          </div>

          {/* ── Right: Suites + run history ── */}
          <div className="flex min-w-0 flex-col gap-6">
            {/* Saved suites */}
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

              {suitesByAgent.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center">
                  <Muted>No suites saved for this agent.</Muted>
                </div>
              ) : (
                suitesByAgent.map((suite) => {
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
                            {rate !== null && (
                              <Badge variant="outline">{rate}% pass rate</Badge>
                            )}
                          </div>
                          <Caption className="mt-1 block truncate">{suite.agentName}</Caption>
                          {suite.description && <Muted className="mt-1">{suite.description}</Muted>}
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                          <Button className="justify-center" size="sm" onClick={() => runSuite(suite)} disabled={isRunning}>
                            <PlayIcon className="size-4" />
                            {isRunning ? "Running" : "Run"}
                          </Button>
                          <Button className="justify-center" variant="outline" size="sm" onClick={() => downloadJson(`${suite.name}-qa-report.json`, { suite, runs: runs.filter((r) => r.suiteId === suite.id) })}>
                            <DownloadIcon className="size-4" />
                            JSON
                          </Button>
                          <Button className="justify-center" variant="outline" size="sm" onClick={() => exportRunHistoryAsCsv(suite)}>
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

            {/* Run history */}
            <div className="flex flex-col gap-3">
              <Small>Run history</Small>
              {runs.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center">
                  <Muted>No QA runs recorded yet.</Muted>
                </div>
              ) : (
                runs.slice(0, 20).map((run) => {
                  const isExpanded = expandedRunId === run.id;
                  return (
                    <div key={run.id} className="min-w-0 rounded-md border">
                      <button
                        className="flex w-full items-start gap-2 p-4 text-left hover:bg-muted/20"
                        onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                      >
                        {isExpanded ? <ChevronDownIcon className="mt-0.5 size-4 shrink-0" /> : <ChevronRightIcon className="mt-0.5 size-4 shrink-0" />}
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
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
