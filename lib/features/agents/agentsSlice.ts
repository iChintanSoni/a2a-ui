import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AgentCard {
  name: string;
  description: string;
  version: string;
  protocolVersion: string;
  author?: string;
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
  card: AgentCard;
  status: "connected" | "disconnected" | "error";
  error?: string;
  auth: AuthConfig;
  customHeaders: CustomHeader[];
}

interface AgentsState {
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
    addAgent: (state, action: PayloadAction<Agent>) => {
      const existingIndex = state.agents.findIndex(
        (a) => a.url === action.payload.url
      );
      if (existingIndex >= 0) {
        state.agents[existingIndex] = action.payload;
      } else {
        state.agents.push(action.payload);
      }
      if (state.agents.length === 1 && action.payload.status === "connected") {
        state.activeAgentUrl = action.payload.url;
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
  },
});

export const {
  addAgent,
  removeAgent,
  setActiveAgent,
  updateAgentStatus,
  updateAgentAuth,
  updateAgentHeaders,
} = agentsSlice.actions;

export default agentsSlice.reducer;
