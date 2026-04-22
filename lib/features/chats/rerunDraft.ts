export interface RerunDraft {
  text: string;
  metadata?: Record<string, string>;
}

function storageKey(chatId: string) {
  return `a2a-ui:rerun:${chatId}`;
}

export function queueRerunDraft(chatId: string, draft: RerunDraft) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(storageKey(chatId), JSON.stringify(draft));
}

export function consumeRerunDraft(chatId: string): RerunDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(storageKey(chatId));
  if (!raw) return null;
  window.sessionStorage.removeItem(storageKey(chatId));
  try {
    return JSON.parse(raw) as RerunDraft;
  } catch {
    return null;
  }
}
