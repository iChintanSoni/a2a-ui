import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AgentCard {
  name: string;
  description: string;
  version: string;
  protocolVersion: string;
  author?: string;
}

export interface Agent {
  url: string;
  card: AgentCard;
  status: "connected" | "disconnected" | "error";
  error?: string;
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
      // Avoid duplicate agents based on URL
      const existingAgentIndex = state.agents.findIndex(
        (a) => a.url === action.payload.url
      );
      if (existingAgentIndex >= 0) {
        state.agents[existingAgentIndex] = action.payload; // Update existing
      } else {
        state.agents.push(action.payload);
      }
      
      // If it's the first successfully added agent, make it active
      if (state.agents.length === 1 && action.payload.status === "connected") {
        state.activeAgentUrl = action.payload.url;
      }
    },
    removeAgent: (state, action: PayloadAction<string>) => {
      state.agents = state.agents.filter((a) => a.url !== action.payload);
      if (state.activeAgentUrl === action.payload) {
        state.activeAgentUrl = state.agents.length > 0 ? state.agents[0].url : null;
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
  },
});

export const { addAgent, removeAgent, setActiveAgent, updateAgentStatus } = agentsSlice.actions;

export default agentsSlice.reducer;
