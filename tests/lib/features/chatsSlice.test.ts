import { describe, it, expect, beforeEach } from "vitest";
import reducer, {
  addChat,
  setActiveChat,
  removeChat,
  addUserMessage,
  applyStatusUpdate,
  applyArtifactUpdate,
  applyToolCall,
  applyAgentMessage,
  type Chat,
} from "@/lib/features/chats/chatsSlice";

const INITIAL_STATE = { chats: [], activeChatId: null };

function makeChat(overrides: Partial<Omit<Chat, "items">> = {}): Omit<Chat, "items"> {
  return {
    id: "chat-1",
    title: "Test Chat",
    agentUrl: "https://agent.test",
    agentName: "Test Agent",
    lastMessage: "",
    timestamp: 1000,
    ...overrides,
  };
}

describe("chatsSlice", () => {
  describe("addChat", () => {
    it("adds a chat with an empty items array", () => {
      const state = reducer(INITIAL_STATE, addChat(makeChat()));
      expect(state.chats).toHaveLength(1);
      expect(state.chats[0].items).toEqual([]);
    });

    it("sets activeChatId to the new chat", () => {
      const state = reducer(INITIAL_STATE, addChat(makeChat({ id: "c1" })));
      expect(state.activeChatId).toBe("c1");
    });

    it("prepends new chats (most recent first)", () => {
      let state = reducer(INITIAL_STATE, addChat(makeChat({ id: "c1", timestamp: 1 })));
      state = reducer(state, addChat(makeChat({ id: "c2", timestamp: 2 })));
      expect(state.chats[0].id).toBe("c2");
    });

    it("caps the list at 10 chats", () => {
      let state = INITIAL_STATE;
      for (let i = 0; i < 12; i++) {
        state = reducer(state, addChat(makeChat({ id: `c${i}` })));
      }
      expect(state.chats).toHaveLength(10);
    });

    it("updates metadata when the same id is added again (no items reset)", () => {
      let state = reducer(INITIAL_STATE, addChat(makeChat({ id: "c1", title: "Old" })));
      // Add a message first
      state = reducer(state, addUserMessage({ chatId: "c1", id: "m1", text: "hello" }));
      // Re-add same chat with updated title
      state = reducer(state, addChat(makeChat({ id: "c1", title: "New" })));
      expect(state.chats).toHaveLength(1);
      expect(state.chats[0].title).toBe("New");
      // items should be preserved
      expect(state.chats[0].items).toHaveLength(1);
    });
  });

  describe("setActiveChat", () => {
    it("sets activeChatId", () => {
      const state = reducer(INITIAL_STATE, setActiveChat("c99"));
      expect(state.activeChatId).toBe("c99");
    });

    it("accepts null", () => {
      const state = reducer({ ...INITIAL_STATE, activeChatId: "c1" }, setActiveChat(null));
      expect(state.activeChatId).toBeNull();
    });
  });

  describe("removeChat", () => {
    it("removes the chat with the given id", () => {
      let state = reducer(INITIAL_STATE, addChat(makeChat({ id: "c1" })));
      state = reducer(state, removeChat("c1"));
      expect(state.chats).toHaveLength(0);
    });

    it("sets activeChatId to first remaining chat when active is removed", () => {
      let state = reducer(INITIAL_STATE, addChat(makeChat({ id: "c1" })));
      state = reducer(state, addChat(makeChat({ id: "c2" })));
      state = reducer(state, setActiveChat("c2"));
      state = reducer(state, removeChat("c2"));
      expect(state.activeChatId).toBe("c1");
    });

    it("sets activeChatId to null when last chat is removed", () => {
      let state = reducer(INITIAL_STATE, addChat(makeChat({ id: "c1" })));
      state = reducer(state, removeChat("c1"));
      expect(state.activeChatId).toBeNull();
    });
  });

  describe("addUserMessage", () => {
    it("appends a user-message item to the chat", () => {
      let state = reducer(INITIAL_STATE, addChat(makeChat({ id: "c1" })));
      state = reducer(state, addUserMessage({ chatId: "c1", id: "m1", text: "Hello" }));
      const item = state.chats[0].items[0];
      expect(item.kind).toBe("user-message");
      expect((item as { text: string }).text).toBe("Hello");
    });

    it("updates lastMessage and timestamp on the chat", () => {
      let state = reducer(INITIAL_STATE, addChat(makeChat({ id: "c1", lastMessage: "", timestamp: 0 })));
      state = reducer(state, addUserMessage({ chatId: "c1", id: "m1", text: "Hi" }));
      expect(state.chats[0].lastMessage).toBe("Hi");
      expect(state.chats[0].timestamp).toBeGreaterThan(0);
    });

    it("is a no-op for an unknown chatId", () => {
      let state = reducer(INITIAL_STATE, addChat(makeChat({ id: "c1" })));
      state = reducer(state, addUserMessage({ chatId: "unknown", id: "m1", text: "Hi" }));
      expect(state.chats[0].items).toHaveLength(0);
    });
  });

  describe("applyStatusUpdate", () => {
    let state = INITIAL_STATE;

    beforeEach(() => {
      state = reducer(INITIAL_STATE, addChat(makeChat({ id: "c1" })));
    });

    it("adds a new task-status item", () => {
      state = reducer(
        state,
        applyStatusUpdate({ chatId: "c1", taskId: "t1", state: "working" })
      );
      expect(state.chats[0].items).toHaveLength(1);
      expect(state.chats[0].items[0].kind).toBe("task-status");
    });

    it("upserts (updates in place) an existing task-status for the same taskId", () => {
      state = reducer(state, applyStatusUpdate({ chatId: "c1", taskId: "t1", state: "working" }));
      state = reducer(state, applyStatusUpdate({ chatId: "c1", taskId: "t1", state: "completed" }));
      expect(state.chats[0].items).toHaveLength(1);
      const item = state.chats[0].items[0] as { state: string };
      expect(item.state).toBe("completed");
    });

    it("adds a separate item for a different taskId", () => {
      state = reducer(state, applyStatusUpdate({ chatId: "c1", taskId: "t1", state: "working" }));
      state = reducer(state, applyStatusUpdate({ chatId: "c1", taskId: "t2", state: "completed" }));
      expect(state.chats[0].items).toHaveLength(2);
    });
  });

  describe("applyArtifactUpdate", () => {
    let state = INITIAL_STATE;
    const baseArtifact = {
      chatId: "c1",
      taskId: "t1",
      artifactId: "a1",
      parts: [{ kind: "text" as const, text: "Hello" }],
      append: false,
      lastChunk: false,
    };

    beforeEach(() => {
      state = reducer(INITIAL_STATE, addChat(makeChat({ id: "c1" })));
    });

    it("adds a new artifact item", () => {
      state = reducer(state, applyArtifactUpdate(baseArtifact));
      expect(state.chats[0].items).toHaveLength(1);
      expect(state.chats[0].items[0].kind).toBe("artifact");
    });

    it("sets isStreaming to true when lastChunk is false", () => {
      state = reducer(state, applyArtifactUpdate({ ...baseArtifact, lastChunk: false }));
      const item = state.chats[0].items[0] as { isStreaming: boolean };
      expect(item.isStreaming).toBe(true);
    });

    it("sets isStreaming to false when lastChunk is true", () => {
      state = reducer(state, applyArtifactUpdate({ ...baseArtifact, lastChunk: true }));
      const item = state.chats[0].items[0] as { isStreaming: boolean };
      expect(item.isStreaming).toBe(false);
    });

    it("replaces parts when append is false", () => {
      state = reducer(state, applyArtifactUpdate(baseArtifact));
      state = reducer(
        state,
        applyArtifactUpdate({
          ...baseArtifact,
          parts: [{ kind: "text", text: "World" }],
          append: false,
        })
      );
      const item = state.chats[0].items[0] as { parts: { text: string }[] };
      expect(item.parts).toHaveLength(1);
      expect(item.parts[0].text).toBe("World");
    });

    it("appends text to the last TextPart when append is true", () => {
      state = reducer(state, applyArtifactUpdate(baseArtifact));
      state = reducer(
        state,
        applyArtifactUpdate({
          ...baseArtifact,
          parts: [{ kind: "text", text: " World" }],
          append: true,
        })
      );
      const item = state.chats[0].items[0] as { parts: { text: string }[] };
      expect(item.parts[0].text).toBe("Hello World");
    });

    it("pushes a new part when appending a non-text part", () => {
      state = reducer(state, applyArtifactUpdate(baseArtifact));
      state = reducer(
        state,
        applyArtifactUpdate({
          ...baseArtifact,
          parts: [{ kind: "data", data: { key: "val" } }],
          append: true,
        })
      );
      const item = state.chats[0].items[0] as { parts: unknown[] };
      expect(item.parts).toHaveLength(2);
    });
  });

  describe("applyToolCall", () => {
    let state = INITIAL_STATE;

    beforeEach(() => {
      state = reducer(INITIAL_STATE, addChat(makeChat({ id: "c1" })));
    });

    it("adds a new tool-call item", () => {
      state = reducer(
        state,
        applyToolCall({ chatId: "c1", runId: "r1", toolName: "search", query: "test", phase: "running" })
      );
      expect(state.chats[0].items[0].kind).toBe("tool-call");
    });

    it("upserts an existing tool-call for the same runId", () => {
      state = reducer(state, applyToolCall({ chatId: "c1", runId: "r1", toolName: "search", query: "q", phase: "running" }));
      state = reducer(state, applyToolCall({ chatId: "c1", runId: "r1", toolName: "search", query: "q", resultCount: 5, phase: "done" }));
      expect(state.chats[0].items).toHaveLength(1);
      const item = state.chats[0].items[0] as { phase: string; resultCount: number };
      expect(item.phase).toBe("done");
      expect(item.resultCount).toBe(5);
    });
  });

  describe("applyAgentMessage", () => {
    it("adds an agent-message item", () => {
      let state = reducer(INITIAL_STATE, addChat(makeChat({ id: "c1" })));
      state = reducer(
        state,
        applyAgentMessage({
          chatId: "c1",
          messageId: "m1",
          parts: [{ kind: "text", text: "Hi there" }],
        })
      );
      expect(state.chats[0].items[0].kind).toBe("agent-message");
    });

    it("is a no-op for an unknown chatId", () => {
      let state = reducer(INITIAL_STATE, addChat(makeChat({ id: "c1" })));
      state = reducer(
        state,
        applyAgentMessage({ chatId: "unknown", messageId: "m1", parts: [] })
      );
      expect(state.chats[0].items).toHaveLength(0);
    });
  });
});
