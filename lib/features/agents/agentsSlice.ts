import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AgentCard as SDKAgentCard } from "@a2a-js/sdk";
import { normalizeModes } from "@/lib/utils/modes";

export type AuthType = "none" | "bearer" | "api-key" | "basic";

export interface AuthConfig {
  type: AuthType;
  bearerToken?: string;
  apiKeyHeader?: string;
  apiKeyValue?: string;
  basicUsername?: string;
  basicPassword?: string;
}

export interface CustomHeader {
  key: string;
  value: string;
}

export interface Agent {
  id: string;
  url: string;
  displayName?: string;
  tags?: string[];
  favorite?: boolean;
  a2uiEnabled?: boolean;
  card: SDKAgentCard;
  status: "connected" | "disconnected" | "error";
  error?: string;
  auth: AuthConfig;
  customHeaders: CustomHeader[];
}

export interface AgentsState {
  agents: Agent[];
  activeAgentUrl: string | null;
}

const initialState: AgentsState = {
  agents: [],
  activeAgentUrl: null,
};

function normalizeAgentCard(card: SDKAgentCard): SDKAgentCard {
  const defaultInputModes = normalizeModes(card.defaultInputModes);
  const defaultOutputModes = normalizeModes(card.defaultOutputModes);

  return {
    ...card,
    defaultInputModes: defaultInputModes ?? [],
    defaultOutputModes: defaultOutputModes ?? [],
    skills: (card.skills ?? []).map((skill) => ({
      ...skill,
      inputModes: normalizeModes(skill.inputModes),
      outputModes: normalizeModes(skill.outputModes),
    })),
  };
}

function normalizeAgent(agent: Agent): Agent {
  return {
    ...agent,
    card: normalizeAgentCard(agent.card),
    tags: agent.tags ?? [],
    favorite: agent.favorite ?? false,
    a2uiEnabled: agent.a2uiEnabled ?? false,
  };
}

export const agentsSlice = createSlice({
  name: "agents",
  initialState,
  reducers: {
    hydrateAgents: (_state, action: PayloadAction<Agent[]>) => {
      return {
        agents: action.payload.map(normalizeAgent),
        activeAgentUrl: null,
      };
    },
    addAgent: (state, action: PayloadAction<Agent>) => {
      const nextAgent = normalizeAgent(action.payload);
      const existingIndex = state.agents.findIndex(
        (a) => a.url === nextAgent.url
      );
      if (existingIndex >= 0) {
        state.agents[existingIndex] = nextAgent;
      } else {
        state.agents.push(nextAgent);
      }
      if (state.agents.length === 1 && nextAgent.status === "connected") {
        state.activeAgentUrl = nextAgent.url;
      }
    },
    removeAgent: (state, action: PayloadAction<string>) => {
      const agent = state.agents.find((a) => a.id === action.payload);
      if (agent && state.activeAgentUrl === agent.url) {
        state.activeAgentUrl = null;
      }
      state.agents = state.agents.filter((a) => a.id !== action.payload);
      if (!state.activeAgentUrl && state.agents.length > 0) {
        state.activeAgentUrl = state.agents[0].url;
      }
    },
    setActiveAgent: (state, action: PayloadAction<string>) => {
      state.activeAgentUrl = action.payload;
    },
    updateAgentStatus: (
      state,
      action: PayloadAction<{ url: string; status: Agent["status"]; error?: string }>
    ) => {
      const agent = state.agents.find((a) => a.url === action.payload.url);
      if (agent) {
        agent.status = action.payload.status;
        agent.error = action.payload.error;
      }
    },
    updateAgentAuth: (
      state,
      action: PayloadAction<{ agentId: string; auth: AuthConfig }>
    ) => {
      const agent = state.agents.find((a) => a.id === action.payload.agentId);
      if (agent) {
        agent.auth = action.payload.auth;
      }
    },
    updateAgentHeaders: (
      state,
      action: PayloadAction<{ agentId: string; headers: CustomHeader[] }>
    ) => {
      const agent = state.agents.find((a) => a.id === action.payload.agentId);
      if (agent) {
        agent.customHeaders = action.payload.headers;
      }
    },
    updateAgentDisplayName: (
      state,
      action: PayloadAction<{ agentId: string; displayName: string }>
    ) => {
      const agent = state.agents.find((a) => a.id === action.payload.agentId);
      if (agent) {
        agent.displayName = action.payload.displayName || undefined;
      }
    },
    updateAgentTags: (
      state,
      action: PayloadAction<{ agentId: string; tags: string[] }>
    ) => {
      const agent = state.agents.find((a) => a.id === action.payload.agentId);
      if (agent) {
        agent.tags = Array.from(
          new Set(action.payload.tags.map((tag) => tag.trim()).filter(Boolean))
        );
      }
    },
    toggleAgentFavorite: (state, action: PayloadAction<string>) => {
      const agent = state.agents.find((a) => a.id === action.payload);
      if (agent) {
        agent.favorite = !agent.favorite;
      }
    },
    setAgentA2UIEnabled: (
      state,
      action: PayloadAction<{ agentId: string; enabled: boolean }>
    ) => {
      const agent = state.agents.find((a) => a.id === action.payload.agentId);
      if (agent) {
        agent.a2uiEnabled = action.payload.enabled;
      }
    },
    updateAgentCard: (
      state,
      action: PayloadAction<{ agentId: string; card: SDKAgentCard }>
    ) => {
      const agent = state.agents.find((a) => a.id === action.payload.agentId);
      if (agent) {
        agent.card = normalizeAgentCard(action.payload.card);
        agent.status = "connected";
        agent.error = undefined;
      }
    },
  },
});

export const {
  hydrateAgents,
  addAgent,
  removeAgent,
  setActiveAgent,
  updateAgentStatus,
  updateAgentAuth,
  updateAgentHeaders,
  updateAgentDisplayName,
  updateAgentTags,
  toggleAgentFavorite,
  setAgentA2UIEnabled,
  updateAgentCard,
} = agentsSlice.actions;

export default agentsSlice.reducer;
