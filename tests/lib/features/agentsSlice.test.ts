import { describe, it, expect } from "vitest";
import reducer, {
  addAgent,
  removeAgent,
  setActiveAgent,
  updateAgentStatus,
  updateAgentAuth,
  updateAgentHeaders,
  updateAgentCard,
  updateAgentTags,
  toggleAgentFavorite,
  type Agent,
} from "@/lib/features/agents/agentsSlice";

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "agent-1",
    url: "https://example.com/agent",
    card: {
      name: "Test Agent",
      description: "desc",
      version: "1.0",
      protocolVersion: "0.1",
    },
    status: "connected",
    auth: { type: "none" },
    customHeaders: [],
    ...overrides,
  };
}

const INITIAL_STATE = { agents: [], activeAgentUrl: null };

describe("agentsSlice", () => {
  describe("addAgent", () => {
    it("adds an agent to an empty list", () => {
      const state = reducer(INITIAL_STATE, addAgent(makeAgent()));
      expect(state.agents).toHaveLength(1);
      expect(state.agents[0].url).toBe("https://example.com/agent");
    });

    it("sets activeAgentUrl when the first connected agent is added", () => {
      const state = reducer(INITIAL_STATE, addAgent(makeAgent()));
      expect(state.activeAgentUrl).toBe("https://example.com/agent");
    });

    it("does NOT set activeAgentUrl for a disconnected first agent", () => {
      const state = reducer(INITIAL_STATE, addAgent(makeAgent({ status: "disconnected" })));
      expect(state.activeAgentUrl).toBeNull();
    });

    it("upserts by URL — updates existing agent rather than duplicating", () => {
      const first = makeAgent({ id: "a1", url: "https://agent.test" });
      const updated = makeAgent({ id: "a2", url: "https://agent.test", card: { ...first.card, name: "Updated" } });

      let state = reducer(INITIAL_STATE, addAgent(first));
      state = reducer(state, addAgent(updated));

      expect(state.agents).toHaveLength(1);
      expect(state.agents[0].card.name).toBe("Updated");
    });

    it("does NOT change activeAgentUrl when a second agent is added", () => {
      let state = reducer(INITIAL_STATE, addAgent(makeAgent({ id: "a1", url: "https://first.test" })));
      state = reducer(state, addAgent(makeAgent({ id: "a2", url: "https://second.test" })));
      expect(state.activeAgentUrl).toBe("https://first.test");
    });

    it("normalizes agent card mode aliases when adding an agent", () => {
      const state = reducer(
        INITIAL_STATE,
        addAgent(
          makeAgent({
            card: {
              ...makeAgent().card,
              defaultInputModes: ["text", "image/*"],
              defaultOutputModes: ["json"],
              skills: [
                {
                  id: "chat",
                  name: "Chat",
                  description: "Talks",
                  tags: [],
                  inputModes: ["text"],
                  outputModes: ["json"],
                },
              ],
            },
          })
        )
      );

      expect(state.agents[0].card.defaultInputModes).toEqual([
        "text/plain",
        "image/*",
      ]);
      expect(state.agents[0].card.defaultOutputModes).toEqual([
        "application/json",
      ]);
      expect(state.agents[0].card.skills?.[0].inputModes).toEqual([
        "text/plain",
      ]);
    });
  });

  describe("removeAgent", () => {
    it("removes the agent with the given id", () => {
      let state = reducer(INITIAL_STATE, addAgent(makeAgent({ id: "a1" })));
      state = reducer(state, removeAgent("a1"));
      expect(state.agents).toHaveLength(0);
    });

    it("clears activeAgentUrl when the active agent is removed", () => {
      let state = reducer(INITIAL_STATE, addAgent(makeAgent({ id: "a1", url: "https://active.test" })));
      state = reducer(state, removeAgent("a1"));
      expect(state.activeAgentUrl).toBeNull();
    });

    it("falls back to first remaining agent as activeAgentUrl", () => {
      let state = reducer(INITIAL_STATE, addAgent(makeAgent({ id: "a1", url: "https://first.test" })));
      state = reducer(state, addAgent(makeAgent({ id: "a2", url: "https://second.test" })));
      // Manually set active to first
      state = reducer(state, setActiveAgent("https://first.test"));
      state = reducer(state, removeAgent("a1"));
      expect(state.activeAgentUrl).toBe("https://second.test");
    });

    it("is a no-op for an unknown id", () => {
      let state = reducer(INITIAL_STATE, addAgent(makeAgent({ id: "a1" })));
      state = reducer(state, removeAgent("unknown"));
      expect(state.agents).toHaveLength(1);
    });
  });

  describe("setActiveAgent", () => {
    it("sets activeAgentUrl to the given URL", () => {
      const state = reducer(INITIAL_STATE, setActiveAgent("https://other.test"));
      expect(state.activeAgentUrl).toBe("https://other.test");
    });
  });

  describe("updateAgentStatus", () => {
    it("updates status for the matching agent URL", () => {
      let state = reducer(INITIAL_STATE, addAgent(makeAgent({ status: "connected" })));
      state = reducer(
        state,
        updateAgentStatus({ url: "https://example.com/agent", status: "error", error: "timeout" })
      );
      expect(state.agents[0].status).toBe("error");
      expect(state.agents[0].error).toBe("timeout");
    });

    it("is a no-op for an unknown URL", () => {
      let state = reducer(INITIAL_STATE, addAgent(makeAgent()));
      state = reducer(state, updateAgentStatus({ url: "https://unknown.test", status: "error" }));
      expect(state.agents[0].status).toBe("connected");
    });
  });

  describe("updateAgentAuth", () => {
    it("updates auth for the matching agent id", () => {
      let state = reducer(INITIAL_STATE, addAgent(makeAgent({ id: "a1", auth: { type: "none" } })));
      state = reducer(
        state,
        updateAgentAuth({ agentId: "a1", auth: { type: "bearer", bearerToken: "tok" } })
      );
      expect(state.agents[0].auth.type).toBe("bearer");
    });

    it("is a no-op for an unknown id", () => {
      let state = reducer(INITIAL_STATE, addAgent(makeAgent({ id: "a1" })));
      state = reducer(state, updateAgentAuth({ agentId: "unknown", auth: { type: "bearer" } }));
      expect(state.agents[0].auth.type).toBe("none");
    });
  });

  describe("updateAgentCard", () => {
    it("normalizes snake_case mode fields when refetching a card", () => {
      let state = reducer(INITIAL_STATE, addAgent(makeAgent({ id: "a1" })));
      state = reducer(
        state,
        updateAgentCard({
          agentId: "a1",
          card: {
            name: "Refetched",
            description: "desc",
            version: "1.0",
            protocolVersion: "0.3.0",
            default_input_modes: ["text"],
            default_output_modes: ["json"],
            skills: [
              {
                id: "chat",
                name: "Chat",
                description: "Talks",
                tags: [],
                input_modes: ["text"],
                output_modes: ["json"],
              },
            ],
          } as unknown as Agent["card"],
        })
      );

      expect(state.agents[0].card.defaultInputModes).toEqual(["text/plain"]);
      expect(state.agents[0].card.defaultOutputModes).toEqual([
        "application/json",
      ]);
      expect(state.agents[0].card.skills?.[0].outputModes).toEqual([
        "application/json",
      ]);
    });
  });

  describe("updateAgentHeaders", () => {
    it("replaces customHeaders for the matching agent id", () => {
      let state = reducer(INITIAL_STATE, addAgent(makeAgent({ id: "a1", customHeaders: [] })));
      state = reducer(
        state,
        updateAgentHeaders({ agentId: "a1", headers: [{ key: "X-Foo", value: "bar" }] })
      );
      expect(state.agents[0].customHeaders).toEqual([{ key: "X-Foo", value: "bar" }]);
    });
  });

  describe("tags and favorites", () => {
    it("updates tags with trimming and de-duplication", () => {
      let state = reducer(INITIAL_STATE, addAgent(makeAgent({ id: "a1" })));
      state = reducer(
        state,
        updateAgentTags({ agentId: "a1", tags: [" demo ", "local", "demo", ""] })
      );
      expect(state.agents[0].tags).toEqual(["demo", "local"]);
    });

    it("toggles favorite", () => {
      let state = reducer(INITIAL_STATE, addAgent(makeAgent({ id: "a1", favorite: false })));
      state = reducer(state, toggleAgentFavorite("a1"));
      expect(state.agents[0].favorite).toBe(true);
    });
  });
});
