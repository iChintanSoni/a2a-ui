"use client";

import { useRef, useMemo, useState } from "react";
import { ClipboardCheckIcon, PlusIcon, Trash2Icon, UploadIcon } from "lucide-react";
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
import { Caption, Muted, Small } from "@/components/typography";
import { useAppDispatch } from "@/lib/hooks";
import { createDemoSmokeSuite } from "@/lib/features/qa/demoSuite";
import { saveQaSuite } from "@/lib/features/qa/qaSlice";
import {
  parseMetadata,
  parseCsvImport,
  parseJsonImport,
  validateDataTable,
  validateJsonPath,
  validateMetadata,
  validateRegex,
} from "@/lib/features/qa/qaUtils";
import { getErrorMessage } from "@/lib/utils/error";
import type { QaOutputMode, QaSuite, QaTestCase } from "@/lib/features/qa/types";
import type { Agent } from "@/lib/features/agents/agentsSlice";

const TASK_STATES = [
  "submitted", "working", "input-required", "completed",
  "canceled", "failed", "rejected", "auth-required", "unknown",
] as const;

const DURATION_OPERATORS = [
  { value: "lt", label: "< (less than)" },
  { value: "lte", label: "≤ (at most)" },
  { value: "gt", label: "> (greater than)" },
  { value: "gte", label: "≥ (at least)" },
] as const;

interface Props {
  agents: Agent[];
  selectedAgent: Agent | undefined;
  agentUrl: string;
  onAgentChange: (url: string) => void;
}

export function SuiteBuilder({ agents, selectedAgent, agentUrl, onAgentChange }: Props) {
  const dispatch = useAppDispatch();
  const importFileRef = useRef<HTMLInputElement>(null);

  const [suiteName, setSuiteName] = useState("Smoke suite");
  const [suiteDescription, setSuiteDescription] = useState("");
  const [draftCases, setDraftCases] = useState<QaTestCase[]>([]);

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
  const durationError = durationValue && isNaN(Number(durationValue)) ? "Duration must be a number." : null;
  const canAddCase = !metadataError && !regexError && !jsonPathError && !dataTableError && !durationError;

  function buildCurrentCase(): QaTestCase | null {
    if (!canAddCase) return null;
    let parsedMetadata: Record<string, string>;
    try { parsedMetadata = parseMetadata(metadata); } catch { return null; }

    const assertions: QaTestCase["assertions"] = [];
    if (regexPattern.trim()) {
      assertions.push({ id: crypto.randomUUID(), kind: "content-regex", label: "Content regex", pattern: regexPattern.trim(), flags: "i" });
    }
    if (jsonPath.trim()) {
      assertions.push({ id: crypto.randomUUID(), kind: "json-path", label: "JSON path exists", path: jsonPath.trim() });
    }
    if (durationValue.trim() && !durationError) {
      assertions.push({ id: crypto.randomUUID(), kind: "task-duration-ms", label: `Duration ${durationOperator} ${durationValue} ms`, operator: durationOperator, value: Number(durationValue) });
    }
    if (artifactMimePattern.trim()) {
      assertions.push({ id: crypto.randomUUID(), kind: "artifact-mime", label: `Artifact MIME matches ${artifactMimePattern.trim()}`, pattern: artifactMimePattern.trim() });
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

  const resetCaseEditor = (nextIndex: number) => {
    setCaseName(`Case ${nextIndex}`);
    setPrompt("");
    setMetadata("{}");
    setRegexPattern("");
    setJsonPath("");
    setDurationValue("");
    setArtifactMimePattern("");
    setDataTableJson("");
  };

  const addCase = () => {
    setFormError(null);
    const qaCase = buildCurrentCase();
    if (!qaCase) { setFormError("Resolve validation errors before adding."); return; }
    setDraftCases((prev) => [...prev, qaCase]);
    resetCaseEditor(draftCases.length + 2);
  };

  const saveSuite = () => {
    if (!selectedAgent) return;
    setFormError(null);
    const currentCase = buildCurrentCase();
    const allCases = currentCase ? [...draftCases, currentCase] : draftCases;
    if (allCases.length === 0) { setFormError("Add at least one case before saving."); return; }

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
        const imported = file.name.endsWith(".csv") ? parseCsvImport(text) : parseJsonImport(text);
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
        setFormError(`Import failed: ${getErrorMessage(err)}`);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-md border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheckIcon className="size-4" />
          <Small>Suite builder</Small>
        </div>
        <div className="flex items-center gap-1">
          <input ref={importFileRef} type="file" accept=".json,.csv" className="hidden" onChange={handleImportFile} />
          <Button variant="outline" size="sm" onClick={() => importFileRef.current?.click()} title="Import cases from JSON or CSV">
            <UploadIcon className="size-3.5" />
            Import
          </Button>
        </div>
      </div>

      {/* Suite-level fields */}
      <div className="space-y-2">
        <Label>Agent</Label>
        <Select value={selectedAgent?.url ?? agentUrl} onValueChange={onAgentChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Button variant="ghost" size="icon" className="size-5" onClick={() => setDraftCases((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Remove case">
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
                  <Button key={starter.id} type="button" variant="outline" size="sm" onClick={() => setPrompt(starter.text)} title={starter.text}>
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
          <Button variant="outline" onClick={() => dispatch(saveQaSuite(createDemoSmokeSuite(selectedAgent)))}>
            Add smoke suite
          </Button>
        )}
      </div>

      <Caption className="text-muted-foreground">
        Import accepts <strong>.json</strong> (array of case objects) or{" "}
        <strong>.csv</strong> (columns: name, prompt, expectedTaskState, expectedOutputMode, regexPattern, jsonPath, metadata).
      </Caption>
    </div>
  );
}
