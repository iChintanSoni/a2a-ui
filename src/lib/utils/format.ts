/** Format a millisecond duration as "N ms" / "N.N s", or "n/a" when unknown. */
export function formatDuration(durationMs: number | null) {
  if (durationMs == null) return "n/a";
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(1)} s`;
}
