/** Returns true when v is a non-null object (plain or class instance). */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Returns true when v is an array. */
export function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

/** Returns true when v is a non-empty string. */
export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/** Safely reads a string property from an unknown object. */
export function getString(obj: unknown, key: string): string | undefined {
  if (!isRecord(obj)) return undefined;
  const val = obj[key];
  return typeof val === "string" ? val : undefined;
}

/** Safely reads a nested property path from an unknown object. */
export function getNestedRecord(obj: unknown, ...keys: string[]): Record<string, unknown> | undefined {
  let cur: unknown = obj;
  for (const key of keys) {
    if (!isRecord(cur)) return undefined;
    cur = cur[key];
  }
  return isRecord(cur) ? cur : undefined;
}

/** Validates the shape of an A2A tool-call artifact data payload. */
export function isToolCallData(v: unknown): v is {
  phase: "running" | "done" | "error";
  toolName: string;
  query: string;
  resultCount?: number;
  imageUrl?: string;
} {
  if (!isRecord(v)) return false;
  const phase = getString(v, "phase");
  if (phase !== "running" && phase !== "done" && phase !== "error") return false;
  if (typeof v.toolName !== "string") return false;
  if (typeof v.query !== "string") return false;
  return true;
}
