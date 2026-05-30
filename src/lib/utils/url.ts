import { AGENT_CARD_PATH } from "@a2a-js/sdk";

/**
 * Normalizes an agent URL by trimming whitespace and ensuring it has a protocol.
 * Defaults to http:// for localhost and https:// for others if protocol is missing.
 */
export function normalizeAgentUrl(url: string): string {
  let trimmed = url.trim();
  if (!trimmed) return "";

  // Add protocol if missing
  if (!/^https?:\/\//i.test(trimmed)) {
    const isLocal =
      trimmed.startsWith("localhost") ||
      trimmed.startsWith("127.0.0.1") ||
      trimmed.startsWith("[::1]");
    trimmed = (isLocal ? "http://" : "https://") + trimmed;
  }

  return trimmed;
}

/**
 * Returns a fallback URL pointing to the well-known agent card path.
 * If the URL already ends in .json, it returns the same URL.
 */
export function getAgentCardUrlFallback(url: string): string {
  const normalized = normalizeAgentUrl(url);
  if (!normalized) return "";

  // If it already looks like a JSON card path, don't change it
  if (normalized.toLowerCase().endsWith(".json")) {
    return normalized;
  }

  // Append standard agent card path
  // Ensure we don't have double slashes
  const base = normalized.replace(/\/$/, "");
  return `${base}/${AGENT_CARD_PATH}`;
}
