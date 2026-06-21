import type { Part } from "@a2a-js/sdk";

export interface RerunDraft {
  parts: Part[];
  metadata?: Record<string, string>;
}

interface PendingEntry {
  draft: RerunDraft;
  expiresAt: number;
}

const DRAFT_TTL_MS = 5 * 60 * 1_000; // 5 minutes

// Module-level map: survives SPA navigation (no page reload) without coupling to
// sessionStorage or the persisted Redux store (where ephemeral data doesn't belong).
const pending = new Map<string, PendingEntry>();

export function queueRerunDraft(chatId: string, draft: RerunDraft): void {
  const now = Date.now();
  for (const [key, entry] of pending) {
    if (entry.expiresAt < now) pending.delete(key);
  }
  pending.set(chatId, { draft, expiresAt: now + DRAFT_TTL_MS });
}

export function consumeRerunDraft(chatId: string): RerunDraft | null {
  const entry = pending.get(chatId) ?? null;
  pending.delete(chatId);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.draft;
}
