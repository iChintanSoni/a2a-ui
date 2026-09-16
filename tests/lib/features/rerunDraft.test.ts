import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { textPart } from "@/lib/a2a/parts";
import { consumeRerunDraft, queueRerunDraft } from "@/lib/features/chats/rerunDraft";

describe("rerunDraft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queues and consumes a draft for a chat", () => {
    const draft = {
      parts: [textPart("Hello again")],
      metadata: { retry: "true" },
    };

    queueRerunDraft("chat-123", draft);

    const consumed = consumeRerunDraft("chat-123");
    expect(consumed).toEqual(draft);

    // Should only be consumable once
    expect(consumeRerunDraft("chat-123")).toBeNull();
  });

  it("returns null for non-existent chat draft", () => {
    expect(consumeRerunDraft("unknown-chat")).toBeNull();
  });

  it("expires drafts after TTL", () => {
    const draft = {
      parts: [textPart("Expiring draft")],
    };

    queueRerunDraft("chat-ttl", draft);

    // Fast-forward 5 minutes + 1 second
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

    expect(consumeRerunDraft("chat-ttl")).toBeNull();
  });
});
