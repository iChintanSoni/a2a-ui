import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AgentCapabilities {
  streaming?: boolean;
  pushNotifications?: boolean;
  stateTransitionHistory?: boolean;
}

export interface AgentInterface {
  url: string;
  transport: string;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
  security?: Record<string, string[]>[];
}

export interface AgentCard {
  name: string;
  description: string;
  url?: string;
  preferredTransport?: string;
  additionalInterfaces?: AgentInterface[];
  version: string;
  protocolVersion: string;
  author?: string;
  capabilities?: AgentCapabilities;
  skills?: AgentSkill[];
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  security?: Record<string, string[]>[];
  securitySchemes?: Record<string, unknown>;
}

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
  card: AgentCard;
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

export const agentsSlice = createSlice({
  name: "agents",
  initialState,
  reducers: {
    hydrateAgents: (_state, action: PayloadAction<Agent[]>) => {
      return {
        agents: action.payload.map((agent) => ({
          ...agent,
          tags: agent.tags ?? [],
          favorite: agent.favorite ?? false,
        })),
        activeAgentUrl: null,
      };
    },
    addAgent: (state, action: PayloadAction<Agent>) => {
      const nextAgent = {
        ...action.payload,
        tags: action.payload.tags ?? [],
        favorite: action.payload.favorite ?? false,
      };
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
    updateAgentCard: (
      state,
      action: PayloadAction<{ agentId: string; card: AgentCard }>
    ) => {
      const agent = state.agents.find((a) => a.id === action.payload.agentId);
      if (agent) {
        agent.card = action.payload.card;
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
  updateAgentCard,
} = agentsSlice.actions;

export default agentsSlice.reducer;
