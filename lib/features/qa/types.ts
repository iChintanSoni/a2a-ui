import type { Part, TaskState } from "@a2a-js/sdk";

export type QaOutputMode = "any" | "text" | "json" | "artifact";

export type QaAssertion =
  | {
      id: string;
      kind: "content-regex";
      label: string;
      pattern: string;
      flags?: string;
    }
  | {
      id: string;
      kind: "json-path";
      label: string;
      path: string;
      equals?: string;
    }
  | {
      id: string;
      kind: "task-duration-ms";
      label: string;
      operator: "lt" | "lte" | "gt" | "gte";
      value: number;
    }
  | {
      id: string;
      kind: "artifact-mime";
      label: string;
      /** Glob-style MIME pattern, e.g. "image/*" or "application/json" */
      pattern: string;
    };

export interface QaTestCase {
  id: string;
  name: string;
  prompt: string;
  attachments: Part[];
  metadata: Record<string, string>;
  expectedTaskState?: TaskState;
  expectedOutputMode: QaOutputMode;
  assertions: QaAssertion[];
  /**
   * Optional data table for parametrized tests. Each row is a map of variable
   * names to values. Use {{varName}} in `prompt` and metadata values to
   * substitute. Each row generates one sub-case at run time.
   */
  dataTable?: Array<Record<string, string>>;
}

export interface QaSuite {
  id: string;
  agentUrl: string;
  agentName: string;
  name: string;
  description?: string;
  cases: QaTestCase[];
  createdAt: number;
  updatedAt: number;
}

export interface QaAssertionResult {
  assertionId: string;
  label: string;
  passed: boolean;
  message: string;
}

export interface QaCaseResult {
  caseId: string;
  caseName: string;
  passed: boolean;
  durationMs: number;
  finalTaskState?: TaskState;
  outputMode: QaOutputMode;
  outputPreview: string;
  assertionResults: QaAssertionResult[];
  error?: string;
}

export interface QaSuiteRun {
  id: string;
  suiteId: string;
  suiteName: string;
  agentUrl: string;
  agentName: string;
  startedAt: number;
  completedAt: number;
  passed: boolean;
  caseResults: QaCaseResult[];
}

export interface QaState {
  suites: QaSuite[];
  runs: QaSuiteRun[];
}
