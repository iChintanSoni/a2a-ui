import type { Part, TaskState } from "@a2a-js/sdk";
import type {
  QaAssertion,
  QaAssertionResult,
  QaOutputMode,
} from "@/lib/features/qa/types";

export interface QaCapturedOutput {
  text: string;
  jsonValues: unknown[];
  artifactCount: number;
  finalTaskState?: TaskState;
}

export function textFromParts(parts: Part[]): string {
  return parts
    .filter((part): part is Extract<Part, { kind: "text" }> => part.kind === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export function jsonValuesFromParts(parts: Part[]): unknown[] {
  const values: unknown[] = [];
  for (const part of parts) {
    if (part.kind === "data") {
      values.push(part.data);
      continue;
    }
    if (part.kind !== "text") continue;
    try {
      values.push(JSON.parse(part.text));
    } catch {
      // Plain text is still valid output; it just cannot satisfy JSON assertions.
    }
  }
  return values;
}

function readPath(value: unknown, path: string): unknown {
  const segments = path
    .replace(/^\$\./, "")
    .replace(/^\$/, "")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);

  let current = value;
  for (const segment of segments) {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
      continue;
    }
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function stringifyComparable(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function evaluateOutputMode(
  expected: QaOutputMode,
  output: QaCapturedOutput,
): QaAssertionResult | null {
  if (expected === "any") return null;

  const passed =
    expected === "text"
      ? output.text.length > 0
      : expected === "json"
        ? output.jsonValues.length > 0
        : output.artifactCount > 0;

  return {
    assertionId: "expected-output-mode",
    label: `Expected ${expected} output`,
    passed,
    message: passed
      ? `Observed ${expected} output.`
      : `Did not observe ${expected} output.`,
  };
}

export function evaluateExpectedTaskState(
  expected: TaskState | undefined,
  output: QaCapturedOutput,
): QaAssertionResult | null {
  if (!expected) return null;
  const passed = output.finalTaskState === expected;
  return {
    assertionId: "expected-task-state",
    label: `Expected task state ${expected}`,
    passed,
    message: passed
      ? `Final task state was ${expected}.`
      : `Final task state was ${output.finalTaskState ?? "unknown"}.`,
  };
}

export function evaluateAssertion(
  assertion: QaAssertion,
  output: QaCapturedOutput,
): QaAssertionResult {
  if (assertion.kind === "content-regex") {
    try {
      const regex = new RegExp(assertion.pattern, assertion.flags);
      const passed = regex.test(output.text);
      return {
        assertionId: assertion.id,
        label: assertion.label,
        passed,
        message: passed
          ? `Matched /${assertion.pattern}/${assertion.flags ?? ""}.`
          : `No match for /${assertion.pattern}/${assertion.flags ?? ""}.`,
      };
    } catch (err) {
      return {
        assertionId: assertion.id,
        label: assertion.label,
        passed: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  for (const value of output.jsonValues) {
    const actual = readPath(value, assertion.path);
    if (actual === undefined) continue;
    if (assertion.equals == null || stringifyComparable(actual) === assertion.equals) {
      return {
        assertionId: assertion.id,
        label: assertion.label,
        passed: true,
        message:
          assertion.equals == null
            ? `Found ${assertion.path}.`
            : `${assertion.path} matched ${assertion.equals}.`,
      };
    }
  }

  return {
    assertionId: assertion.id,
    label: assertion.label,
    passed: false,
    message:
      assertion.equals == null
        ? `Could not find ${assertion.path}.`
        : `Could not find ${assertion.path} equal to ${assertion.equals}.`,
  };
}

export function evaluateQaAssertions(
  assertions: QaAssertion[],
  output: QaCapturedOutput,
): QaAssertionResult[] {
  return assertions.map((assertion) => evaluateAssertion(assertion, output));
}
