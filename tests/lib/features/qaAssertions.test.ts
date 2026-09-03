import { TaskState } from "@a2a-js/sdk";
import { dataPart, textPart } from "@/lib/a2a/parts";
import { describe, expect, it } from "vitest";
import {
  evaluateExpectedTaskState,
  evaluateOutputMode,
  evaluateQaAssertions,
  jsonValuesFromParts,
  textFromParts,
} from "@/lib/features/qa/assertions";

describe("qa assertions", () => {
  it("extracts text and JSON values from parts", () => {
    const parts = [textPart("hello"), dataPart({ status: "ok" }), textPart('{"ready":true}')];

    expect(textFromParts(parts)).toContain("hello");
    expect(jsonValuesFromParts(parts)).toEqual([{ status: "ok" }, { ready: true }]);
  });

  it("evaluates task state and output mode expectations", () => {
    const output = {
      text: "ready",
      jsonValues: [],
      artifactCount: 0,
      artifactMimeTypes: [],
      durationMs: 100,
      finalTaskState: TaskState.TASK_STATE_COMPLETED as const,
    };

    expect(evaluateExpectedTaskState(TaskState.TASK_STATE_COMPLETED, output)?.passed).toBe(true);
    expect(evaluateExpectedTaskState(TaskState.TASK_STATE_FAILED, output)?.passed).toBe(false);
    expect(evaluateOutputMode("text", output)?.passed).toBe(true);
    expect(evaluateOutputMode("json", output)?.passed).toBe(false);
  });

  it("evaluates regex and JSON path assertions", () => {
    const results = evaluateQaAssertions(
      [
        {
          id: "a1",
          kind: "content-regex",
          label: "Ready",
          pattern: "ready",
          flags: "i",
        },
        {
          id: "a2",
          kind: "json-path",
          label: "Status",
          path: "$.status",
          equals: "ok",
        },
      ],
      {
        text: "Agent is READY",
        jsonValues: [{ status: "ok" }],
        artifactCount: 0,
        artifactMimeTypes: [],
        durationMs: 250,
        finalTaskState: TaskState.TASK_STATE_COMPLETED,
      },
    );

    expect(results.every(result => result.passed)).toBe(true);
  });

  it("evaluates task-duration-ms assertions", () => {
    const output = {
      text: "",
      jsonValues: [],
      artifactCount: 0,
      artifactMimeTypes: [],
      durationMs: 800,
      finalTaskState: TaskState.TASK_STATE_COMPLETED as const,
    };
    const results = evaluateQaAssertions(
      [
        {
          id: "d1",
          kind: "task-duration-ms",
          label: "Under 1s",
          operator: "lt" as const,
          value: 1000,
        },
        {
          id: "d2",
          kind: "task-duration-ms",
          label: "Over 2s",
          operator: "gt" as const,
          value: 2000,
        },
      ],
      output,
    );
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(false);
  });

  it("evaluates artifact-mime assertions", () => {
    const output = {
      text: "",
      jsonValues: [],
      artifactCount: 1,
      artifactMimeTypes: ["image/png"],
      durationMs: 100,
      finalTaskState: TaskState.TASK_STATE_COMPLETED as const,
    };
    const results = evaluateQaAssertions(
      [
        { id: "m1", kind: "artifact-mime", label: "Any image", pattern: "image/*" },
        { id: "m2", kind: "artifact-mime", label: "Exact PNG", pattern: "image/png" },
        { id: "m3", kind: "artifact-mime", label: "No PDF", pattern: "application/pdf" },
      ],
      output,
    );
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(true);
    expect(results[2].passed).toBe(false);
  });
});
