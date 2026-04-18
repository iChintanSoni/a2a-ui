export function normalizeMode(mode: string): string {
  if (mode === "text") return "text/plain";
  if (mode === "json") return "application/json";
  return mode;
}

export function normalizeModes(modes: string[] | undefined): string[] | undefined {
  if (!modes) return undefined;
  return Array.from(new Set(modes.map(normalizeMode)));
}

export function isTextMode(mode: string): boolean {
  const normalized = normalizeMode(mode);
  return normalized === "text/plain";
}

export function isAttachmentMode(mode: string): boolean {
  return !isTextMode(mode);
}
