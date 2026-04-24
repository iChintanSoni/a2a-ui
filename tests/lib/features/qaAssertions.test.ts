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
    const parts = [
      { kind: "text" as const, text: "hello" },
      { kind: "data" as const, data: { status: "ok" } },
      { kind: "text" as const, text: "{\"ready\":true}" },
    ];

    expect(textFromParts(parts)).toContain("hello");
    expect(jsonValuesFromParts(parts)).toEqual([{ status: "ok" }, { ready: true }]);
  });

  it("evaluates task state and output mode expectations", () => {
    const output = {
      text: "ready",
      jsonValues: [],
      artifactCount: 0,
      finalTaskState: "completed" as const,
    };

    expect(evaluateExpectedTaskState("completed", output)?.passed).toBe(true);
    expect(evaluateExpectedTaskState("failed", output)?.passed).toBe(false);
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
        finalTaskState: "completed",
      },
    );

    expect(results.every((result) => result.passed)).toBe(true);
  });
});
