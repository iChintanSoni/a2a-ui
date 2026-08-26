import type { Agent } from "@/lib/features/agents/agentsSlice";
import type { Chat } from "@/lib/features/chats/chatsSlice";

export type PresetCategory = "all" | "local" | "remote" | "research" | "productivity" | "demo";

export interface AgentPreset {
  id: string;
  name: string;
  category: "local" | "remote" | "research" | "productivity" | "demo";
  tags: string[];
  summary: string;
  description: string;
  agent: Omit<Agent, "id">;
  samplePrompts?: string[];
  sampleChats?: Array<Omit<Chat, "id">>;
}

export interface WorkspacePreset {
  id: string;
  name: string;
  description: string;
  presets: AgentPreset[];
}
