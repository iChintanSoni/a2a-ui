import { getErrorMessage } from "@/lib/utils/error";
import type { QaAssertion, QaOutputMode, QaSuiteRun, QaTestCase } from "./types";

// ── validators ────────────────────────────────────────────────────────────────

export function parseMetadata(value: string): Record<string, string> {
  if (!value.trim()) return {};
  const parsed = JSON.parse(value) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(parsed).map(([key, entry]) => [key, String(entry)]),
  );
}

export function validateMetadata(value: string): string | null {
  try {
    parseMetadata(value);
    return null;
  } catch (err) {
    return getErrorMessage(err);
  }
}

export function validateRegex(value: string): string | null {
  if (!value.trim()) return null;
  try {
    new RegExp(value.trim(), "i");
    return null;
  } catch (err) {
    return getErrorMessage(err);
  }
}

export function validateJsonPath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("$") ? null : "JSON path must start with $.";
}

export function validateDataTable(value: string): string | null {
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
    return getErrorMessage(err);
  }
}

// ── formatters ────────────────────────────────────────────────────────────────

export function formatDuration(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function passRate(runs: QaSuiteRun[], suiteId: string): number | null {
  const suiteRuns = runs.filter((r) => r.suiteId === suiteId);
  if (suiteRuns.length === 0) return null;
  return Math.round((suiteRuns.filter((r) => r.passed).length / suiteRuns.length) * 100);
}

// ── download helpers ──────────────────────────────────────────────────────────

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: string[][]) {
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

// ── import parsers ─────────────────────────────────────────────────────────────

export function parseCsvImport(text: string): Partial<QaTestCase>[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map((line) => {
    const values =
      line.match(/("(?:[^"]|"")*"|[^,]*)/g)?.map((v) =>
        v.replace(/^"|"$/g, "").replace(/""/g, '"'),
      ) ?? [];
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    const assertions: QaAssertion[] = [];
    if (row["regexPattern"]) {
      assertions.push({ id: crypto.randomUUID(), kind: "content-regex", label: "Content regex", pattern: row["regexPattern"], flags: "i" });
    }
    if (row["jsonPath"]) {
      assertions.push({ id: crypto.randomUUID(), kind: "json-path", label: "JSON path exists", path: row["jsonPath"] });
    }
    return {
      id: crypto.randomUUID(),
      name: row["name"] || "Imported case",
      prompt: row["prompt"] || "",
      attachments: [],
      metadata: row["metadata"]
        ? (() => { try { return JSON.parse(row["metadata"]) as Record<string, string>; } catch { return {}; } })()
        : {},
      expectedTaskState: (row["expectedTaskState"] as QaTestCase["expectedTaskState"]) || undefined,
      expectedOutputMode: (row["expectedOutputMode"] as QaOutputMode) || "any",
      assertions,
    };
  });
}

export function parseJsonImport(text: string): Partial<QaTestCase>[] {
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
    dataTable: Array.isArray(item["dataTable"])
      ? (item["dataTable"] as Array<Record<string, string>>)
      : undefined,
  }));
}
