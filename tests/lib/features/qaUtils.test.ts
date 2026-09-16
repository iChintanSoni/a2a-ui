import { describe, expect, it } from "vitest";
import { TaskState } from "@a2a-js/sdk";
import {
  formatDuration,
  parseCsvImport,
  parseCsvLine,
  parseJsonImport,
  parseMetadata,
  passRate,
  validateDataTable,
  validateJsonPath,
  validateMetadata,
  validateRegex,
} from "@/lib/features/qa/qaUtils";
import type { QaSuiteRun } from "@/lib/features/qa/types";

describe("qaUtils", () => {
  describe("parseCsvLine", () => {
    it("parses simple comma-separated fields", () => {
      expect(parseCsvLine("name,prompt,outputMode")).toEqual(["name", "prompt", "outputMode"]);
    });

    it("parses quoted fields containing commas", () => {
      expect(parseCsvLine('"Hello, world",bar,"one, two, three"')).toEqual([
        "Hello, world",
        "bar",
        "one, two, three",
      ]);
    });

    it("parses escaped quotes inside quoted fields", () => {
      expect(parseCsvLine('case1,"prompt with ""nested quotes""",text')).toEqual([
        "case1",
        'prompt with "nested quotes"',
        "text",
      ]);
    });

    it("handles empty fields", () => {
      expect(parseCsvLine("a,,c")).toEqual(["a", "", "c"]);
    });
  });

  describe("parseCsvImport", () => {
    it("returns empty array for empty input or header-only", () => {
      expect(parseCsvImport("")).toEqual([]);
      expect(parseCsvImport("name,prompt\n")).toEqual([]);
    });

    it("correctly extracts prompt and metadata without token-shifting", () => {
      const csv = `name,prompt,expectedTaskState,expectedOutputMode,regexPattern,jsonPath,metadata
"Case 1","What is 2+2?",completed,text,4,$.result,"{""env"":""prod""}"`;

      const cases = parseCsvImport(csv);
      expect(cases).toHaveLength(1);
      const c = cases[0];
      expect(c.name).toBe("Case 1");
      expect(c.prompt).toBe("What is 2+2?");
      expect(c.expectedTaskState).toBe(TaskState.TASK_STATE_COMPLETED);
      expect(c.expectedOutputMode).toBe("text");
      expect(c.metadata).toEqual({ env: "prod" });
      expect(c.assertions).toHaveLength(2);
      expect(c.assertions?.[0]).toMatchObject({
        kind: "content-regex",
        pattern: "4",
      });
      expect(c.assertions?.[1]).toMatchObject({
        kind: "json-path",
        path: "$.result",
      });
    });
  });

  describe("parseJsonImport", () => {
    it("parses JSON array of test cases and normalizes expectedTaskState", () => {
      const json = JSON.stringify([
        {
          name: "Test JSON",
          prompt: "Echo hello",
          expectedTaskState: "completed",
          expectedOutputMode: "text",
          metadata: { tag: "smoke" },
          assertions: [{ id: "a1", kind: "content-regex", label: "Matches", pattern: "hello" }],
        },
      ]);

      const cases = parseJsonImport(json);
      expect(cases).toHaveLength(1);
      expect(cases[0].name).toBe("Test JSON");
      expect(cases[0].prompt).toBe("Echo hello");
      expect(cases[0].expectedTaskState).toBe(TaskState.TASK_STATE_COMPLETED);
      expect(cases[0].expectedOutputMode).toBe("text");
      expect(cases[0].metadata).toEqual({ tag: "smoke" });
    });

    it("throws when JSON is not an array", () => {
      expect(() => parseJsonImport('{"name": "test"}')).toThrow(
        "Expected a JSON array of test cases.",
      );
    });
  });

  describe("validators", () => {
    it("validates metadata JSON", () => {
      expect(validateMetadata("")).toBeNull();
      expect(validateMetadata('{"key": "val"}')).toBeNull();
      expect(validateMetadata("invalid json")).not.toBeNull();
      expect(parseMetadata('{"a": 123}')).toEqual({ a: "123" });
    });

    it("validates regex pattern", () => {
      expect(validateRegex("")).toBeNull();
      expect(validateRegex("valid-[0-9]+")).toBeNull();
      expect(validateRegex("([unclosed")).not.toBeNull();
    });

    it("validates JSON path", () => {
      expect(validateJsonPath("")).toBeNull();
      expect(validateJsonPath("$.data.status")).toBeNull();
      expect(validateJsonPath("data.status")).toBe("JSON path must start with $.");
    });

    it("validates data table JSON array of objects", () => {
      expect(validateDataTable("")).toBeNull();
      expect(validateDataTable('[{"var": "1"}, {"var": "2"}]')).toBeNull();
      expect(validateDataTable('{"not": "array"}')).toBe("Data table must be a JSON array.");
      expect(validateDataTable('["string", 123]')).toBe("Each row must be a JSON object.");
    });
  });

  describe("formatters and helpers", () => {
    it("formats duration in ms and seconds", () => {
      expect(formatDuration(450)).toBe("450 ms");
      expect(formatDuration(1500)).toBe("1.5 s");
    });

    it("computes pass rate correctly", () => {
      const runs = [
        { suiteId: "s1", passed: true },
        { suiteId: "s1", passed: false },
        { suiteId: "s1", passed: true },
        { suiteId: "s2", passed: false },
      ] as QaSuiteRun[];

      expect(passRate(runs, "s1")).toBe(67);
      expect(passRate(runs, "s2")).toBe(0);
      expect(passRate(runs, "s3")).toBeNull();
    });
  });
});
