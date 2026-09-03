import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { TaskState } from "@a2a-js/sdk";
import {
  evaluateExpectedTaskState,
  evaluateOutputMode,
  evaluateQaAssertions,
  type QaCapturedOutput,
} from "@/lib/features/qa/assertions";
import type { QaTestCase } from "@/lib/features/qa/types";

// `npx a2a-ui qa-run` runs the inline JS runner in bin/qa-run.mjs, not the
// TypeScript one, so assertion semantics live twice. These tests pin the two
// implementations to the same verdicts — see docs/testing.md, "QA parity rule".
async function loadCli() {
  return import(pathToFileURL(resolve("bin/qa-run.mjs")).href);
}

function capture(overrides: Partial<QaCapturedOutput> = {}): QaCapturedOutput {
  return {
    text: "",
    jsonValues: [],
    artifactCount: 0,
    artifactMimeTypes: [],
    durationMs: 0,
    ...overrides,
  };
}

function makeCase(overrides: Partial<QaTestCase> = {}): QaTestCase {
  return {
    id: "case-1",
    name: "Case",
    prompt: "p",
    attachments: [],
    metadata: {},
    expectedOutputMode: "any",
    assertions: [],
    ...overrides,
  };
}

/** The verdicts both runners must agree on: which assertions ran, and their pass/fail. */
function verdicts(results: Array<{ assertionId: string; passed: boolean }>) {
  return results.map(r => ({ assertionId: r.assertionId, passed: r.passed }));
}

function uiVerdicts(testCase: QaTestCase, output: QaCapturedOutput) {
  return verdicts(
    [
      evaluateExpectedTaskState(testCase.expectedTaskState, output),
      evaluateOutputMode(testCase.expectedOutputMode, output),
      ...evaluateQaAssertions(testCase.assertions, output),
    ].filter(result => result != null),
  );
}

describe("qa-run task state parsing", () => {
  it("accepts the same spellings as the UI's converter", async () => {
    const { toTaskState, taskStateLabel } = await loadCli();

    expect(toTaskState("completed")).toBe(TaskState.TASK_STATE_COMPLETED);
    expect(toTaskState("TASK_STATE_COMPLETED")).toBe(TaskState.TASK_STATE_COMPLETED);
    expect(toTaskState(TaskState.TASK_STATE_COMPLETED)).toBe(TaskState.TASK_STATE_COMPLETED);
    expect(taskStateLabel(TaskState.TASK_STATE_INPUT_REQUIRED)).toBe("input-required");
  });
});

describe("qa-run assertion parity with the browser runner", () => {
  it("agrees on expected task state, including the falsy UNSPECIFIED value", async () => {
    const { evaluateAll } = await loadCli();

    for (const state of [
      TaskState.TASK_STATE_UNSPECIFIED,
      TaskState.TASK_STATE_COMPLETED,
      TaskState.TASK_STATE_FAILED,
    ]) {
      const testCase = makeCase({ expectedTaskState: state });
      const output = capture({ finalTaskState: TaskState.TASK_STATE_COMPLETED });

      expect(verdicts(evaluateAll(testCase, output))).toEqual(uiVerdicts(testCase, output));
    }
  });

  it("agrees on output mode expectations", async () => {
    const { evaluateAll } = await loadCli();

    const cases: Array<[QaTestCase["expectedOutputMode"], QaCapturedOutput]> = [
      ["text", capture({ text: "hello" })],
      ["text", capture()],
      ["artifact", capture({ artifactCount: 1 })],
      ["artifact", capture()],
      ["any", capture()],
    ];

    for (const [mode, output] of cases) {
      const testCase = makeCase({ expectedOutputMode: mode });
      expect(verdicts(evaluateAll(testCase, output))).toEqual(uiVerdicts(testCase, output));
    }
  });

  it("agrees on regex, duration, and artifact-mime assertions", async () => {
    const { evaluateAll } = await loadCli();

    const testCase = makeCase({
      assertions: [
        { id: "a1", kind: "content-regex", label: "matches", pattern: "ready", flags: "i" },
        { id: "a2", kind: "content-regex", label: "misses", pattern: "absent" },
        { id: "a3", kind: "task-duration-ms", label: "fast", operator: "lt", value: 500 },
        { id: "a4", kind: "task-duration-ms", label: "slow", operator: "gte", value: 500 },
        { id: "a5", kind: "artifact-mime", label: "png", pattern: "image/*" },
        { id: "a6", kind: "artifact-mime", label: "pdf", pattern: "application/pdf" },
      ],
    });
    const output = capture({
      text: "READY to go",
      durationMs: 120,
      artifactCount: 1,
      artifactMimeTypes: ["image/png"],
    });

    expect(verdicts(evaluateAll(testCase, output))).toEqual(uiVerdicts(testCase, output));
  });

  it("agrees that an invalid regex fails rather than throws", async () => {
    const { evaluateAll } = await loadCli();

    const testCase = makeCase({
      assertions: [{ id: "a1", kind: "content-regex", label: "bad", pattern: "([" }],
    });
    const output = capture({ text: "anything" });

    expect(verdicts(evaluateAll(testCase, output))).toEqual(uiVerdicts(testCase, output));
  });

  it("documents the one deliberate divergence: json-path is skipped in the CLI", async () => {
    const { evaluateAll } = await loadCli();

    const testCase = makeCase({
      assertions: [{ id: "a1", kind: "json-path", label: "status", path: "$.status" }],
    });
    const output = capture({ jsonValues: [{ status: "ok" }] });

    expect(evaluateAll(testCase, output)).toEqual([]);
    expect(uiVerdicts(testCase, output)).toEqual([{ assertionId: "a1", passed: true }]);
  });
});
