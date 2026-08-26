import type { Agent } from "@/lib/features/agents/agentsSlice";
import type { Chat } from "@/lib/features/chats/chatsSlice";
import type { AgentPreset, WorkspacePreset } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateAgentPreset(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, errors: ["Preset must be a valid JSON object."] };
  }

  const preset = value as Partial<AgentPreset>;

  if (!preset.id || typeof preset.id !== "string" || !preset.id.trim()) {
    errors.push("Preset 'id' is required and must be a non-empty string.");
  }

  if (!preset.name || typeof preset.name !== "string" || !preset.name.trim()) {
    errors.push("Preset 'name' is required and must be a non-empty string.");
  }

  const validCategories = ["local", "remote", "research", "productivity", "demo"];
  if (!preset.category || !validCategories.includes(preset.category)) {
    errors.push(`Preset 'category' must be one of: ${validCategories.join(", ")}.`);
  }

  if (!Array.isArray(preset.tags)) {
    errors.push("Preset 'tags' must be an array of strings.");
  }

  if (!preset.agent || typeof preset.agent !== "object" || Array.isArray(preset.agent)) {
    errors.push("Preset 'agent' configuration object is required.");
  } else {
    const agent = preset.agent as Partial<Agent>;
    if (!agent.url || typeof agent.url !== "string" || !agent.url.trim()) {
      errors.push("Agent 'url' is required and must be a valid string.");
    }
    if (!agent.card || typeof agent.card !== "object" || Array.isArray(agent.card)) {
      errors.push("Agent 'card' is required.");
    } else {
      const card = agent.card;
      if (!card.name || typeof card.name !== "string") {
        errors.push("Agent card 'name' is required.");
      }
      if (!card.version || typeof card.version !== "string") {
        errors.push("Agent card 'version' is required.");
      }
      if (!Array.isArray(card.defaultInputModes)) {
        errors.push("Agent card 'defaultInputModes' must be an array.");
      }
      if (!Array.isArray(card.defaultOutputModes)) {
        errors.push("Agent card 'defaultOutputModes' must be an array.");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateWorkspacePreset(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, errors: ["Workspace preset must be a JSON object."] };
  }

  const ws = value as Partial<WorkspacePreset>;

  if (!ws.id || typeof ws.id !== "string") {
    errors.push("Workspace preset 'id' is required.");
  }
  if (!ws.name || typeof ws.name !== "string") {
    errors.push("Workspace preset 'name' is required.");
  }
  if (!Array.isArray(ws.presets) || ws.presets.length === 0) {
    errors.push("Workspace preset 'presets' must be a non-empty array of agent presets.");
  } else {
    ws.presets.forEach((p, idx) => {
      const result = validateAgentPreset(p);
      if (!result.valid) {
        errors.push(`Preset at index ${idx} is invalid: ${result.errors.join("; ")}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function normalizePresetAgent(preset: AgentPreset, existingAgent?: Agent): Agent {
  const agentData = preset.agent;
  return {
    id: existingAgent?.id ?? crypto.randomUUID(),
    url: agentData.url,
    displayName: existingAgent?.displayName ?? agentData.displayName ?? preset.name,
    tags: Array.from(
      new Set([...(existingAgent?.tags ?? []), ...(agentData.tags ?? []), ...(preset.tags ?? [])]),
    ),
    favorite: existingAgent?.favorite ?? agentData.favorite ?? false,
    a2uiEnabled: existingAgent?.a2uiEnabled ?? agentData.a2uiEnabled ?? false,
    status: existingAgent?.status ?? "disconnected",
    error: undefined,
    auth: existingAgent?.auth ?? agentData.auth ?? { type: "none" },
    customHeaders: existingAgent?.customHeaders ?? agentData.customHeaders ?? [],
    card: {
      ...agentData.card,
      skills: (agentData.card.skills ?? []).map(skill => ({
        ...skill,
        examples: skill.examples ?? [],
        tags: skill.tags ?? [],
      })),
    },
  };
}

export function normalizePresetChat(
  presetChat: Omit<Chat, "id">,
  agentUrl: string,
  agentName: string,
): Chat {
  return {
    ...presetChat,
    id: crypto.randomUUID(),
    agentUrl,
    agentName,
    timestamp: presetChat.timestamp || Date.now(),
    archived: presetChat.archived ?? false,
    pinned: presetChat.pinned ?? false,
    executionEvents: presetChat.executionEvents ?? [],
    items: (presetChat.items ?? []).map(item => ({
      ...item,
      id: item.id || crypto.randomUUID(),
    })),
  };
}

export function importPresetToWorkspace(
  preset: AgentPreset,
  existingAgents: Agent[],
): { agent: Agent; chats: Chat[]; isUpdate: boolean } {
  const validation = validateAgentPreset(preset);
  if (!validation.valid) {
    throw new Error(`Invalid preset '${preset.name}': ${validation.errors.join("; ")}`);
  }

  const existing = existingAgents.find(a => a.url === preset.agent.url);
  const agent = normalizePresetAgent(preset, existing);

  const chats = (preset.sampleChats ?? []).map(c =>
    normalizePresetChat(c, agent.url, agent.displayName ?? agent.card.name),
  );

  return {
    agent,
    chats,
    isUpdate: Boolean(existing),
  };
}
