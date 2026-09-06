import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useA2AMessages } from "@/hooks/use-a2a-messages";
import type { A2AExternalMessageStore } from "@/lib/a2a/types";
import type { useA2AConnection } from "@/hooks/use-a2a-connection";
import type { useA2ADebug } from "@/hooks/use-a2a-debug";
import type { useA2ASession } from "@/hooks/use-a2a-session";
import type { Chat } from "@/lib/features/chats/chatTypes";

const CONTEXT_ID = "ctx-1";

function makeChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: CONTEXT_ID,
    title: "Chat",
    agentUrl: "http://localhost:3001",
    agentName: "Demo Agent",
    lastMessage: "",
    timestamp: 0,
    items: [],
    executionEvents: [],
    ...overrides,
  };
}

/**
 * Mirrors `use-chat-session.ts`, which memoizes the store on the Redux `chat`
 * object — so a new store identity per render is the real-world case, not a
 * contrived one.
 */
function makeStore(sanitize: () => void, chat: Chat): A2AExternalMessageStore {
  return {
    chat,
    ensureChat: vi.fn(),
    sanitizeStaleStreaming: sanitize,
    addUserMessage: vi.fn(),
    applyStatusUpdate: vi.fn(),
    applyArtifactUpdate: vi.fn(),
    applyToolCall: vi.fn(),
    applyAgentMessage: vi.fn(),
    appendExecutionEvent: vi.fn(),
  };
}

const connection = {
  agentUrl: "http://localhost:3001",
  card: { name: "Demo Agent" },
} as unknown as ReturnType<typeof useA2AConnection>;

const debug = {
  logs: [],
  recordValidation: vi.fn(),
  recordError: vi.fn(),
} as unknown as ReturnType<typeof useA2ADebug>;

const session = {
  contextId: CONTEXT_ID,
  activeTaskId: null,
  abortRef: { current: null },
  setActiveTaskId: vi.fn(),
} as unknown as ReturnType<typeof useA2ASession>;

function Probe({ store }: { store: A2AExternalMessageStore }) {
  useA2AMessages({ connection, debug, session, persistenceMode: "external", store });
  return null;
}

afterEach(cleanup);

describe("useA2AMessages stale-stream sanitizing", () => {
  it("sanitizes once per context even as the store identity changes", () => {
    const sanitize = vi.fn();
    const { rerender } = render(<Probe store={makeStore(sanitize, makeChat())} />);

    // Each stream event produces a fresh chat, hence a fresh store.
    for (let i = 0; i < 3; i++) {
      rerender(<Probe store={makeStore(sanitize, makeChat({ lastMessage: `evt-${i}` }))} />);
    }

    expect(sanitize).toHaveBeenCalledTimes(1);
    expect(sanitize).toHaveBeenCalledWith(CONTEXT_ID);
  });

  it("sanitizes again when the context changes", () => {
    const sanitize = vi.fn();
    const { rerender } = render(<Probe store={makeStore(sanitize, makeChat())} />);

    const nextSession = { ...session, contextId: "ctx-2" } as ReturnType<typeof useA2ASession>;
    function NextProbe({ store }: { store: A2AExternalMessageStore }) {
      useA2AMessages({
        connection,
        debug,
        session: nextSession,
        persistenceMode: "external",
        store,
      });
      return null;
    }
    rerender(<NextProbe store={makeStore(sanitize, makeChat({ id: "ctx-2" }))} />);

    expect(sanitize).toHaveBeenCalledTimes(2);
    expect(sanitize).toHaveBeenLastCalledWith("ctx-2");
  });
});
