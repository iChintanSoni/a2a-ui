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
