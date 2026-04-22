import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { TaskState } from "@a2a-js/sdk";

export interface TaskFilterPreset {
  id: string;
  label: string;
  query: string;
  state: TaskState | "all";
  createdAt: number;
}

export interface PromptPreset {
  id: string;
  label: string;
  text: string;
  metadata?: Record<string, string>;
  createdAt: number;
  useCount: number;
}

export interface AgentWorkbenchSettings {
  defaultMetadata: Record<string, string>;
  promptPresets: PromptPreset[];
}

export interface WorkbenchState {
  taskFilterPresets: TaskFilterPreset[];
  agentSettings: Record<string, AgentWorkbenchSettings>;
}

const initialState: WorkbenchState = {
  taskFilterPresets: [],
  agentSettings: {},
};

function normalizeMetadata(
  metadata: Record<string, string> | undefined,
): Record<string, string> {
  if (!metadata) return {};
  return Object.fromEntries(
    Object.entries(metadata)
      .map(([key, value]) => [key.trim(), value] as const)
      .filter(([key]) => key.length > 0),
  );
}

function getAgentSettings(state: WorkbenchState, agentUrl: string): AgentWorkbenchSettings {
  const existing = state.agentSettings[agentUrl];
  if (existing) return existing;
  const created: AgentWorkbenchSettings = {
    defaultMetadata: {},
    promptPresets: [],
  };
  state.agentSettings[agentUrl] = created;
  return created;
}

function defaultPromptLabel(text: string): string {
  const line = text.trim().split("\n")[0] ?? "";
  return line.slice(0, 40) || "Saved prompt";
}

export const workbenchSlice = createSlice({
  name: "workbench",
  initialState,
  reducers: {
    hydrateWorkbench: (_state, action: PayloadAction<WorkbenchState | undefined>) => {
      return {
        taskFilterPresets: action.payload?.taskFilterPresets ?? [],
        agentSettings: action.payload?.agentSettings ?? {},
      };
    },

    saveTaskFilterPreset: (
      state,
      action: PayloadAction<{
        id?: string;
        label?: string;
        query: string;
        state: TaskState | "all";
      }>,
    ) => {
      const label =
        action.payload.label?.trim() ||
        action.payload.query.trim().slice(0, 40) ||
        `${action.payload.state} tasks`;

      const preset: TaskFilterPreset = {
        id: action.payload.id ?? crypto.randomUUID(),
        label,
        query: action.payload.query,
        state: action.payload.state,
        createdAt: Date.now(),
      };

      const index = state.taskFilterPresets.findIndex((entry) => entry.id === preset.id);
      if (index >= 0) {
        state.taskFilterPresets[index] = preset;
      } else {
        state.taskFilterPresets.unshift(preset);
      }
    },

    removeTaskFilterPreset: (state, action: PayloadAction<string>) => {
      state.taskFilterPresets = state.taskFilterPresets.filter(
        (preset) => preset.id !== action.payload,
      );
    },

    savePromptPreset: (
      state,
      action: PayloadAction<{
        agentUrl: string;
        id?: string;
        label?: string;
        text: string;
        metadata?: Record<string, string>;
      }>,
    ) => {
      const settings = getAgentSettings(state, action.payload.agentUrl);
      const preset: PromptPreset = {
        id: action.payload.id ?? crypto.randomUUID(),
        label: action.payload.label?.trim() || defaultPromptLabel(action.payload.text),
        text: action.payload.text,
        metadata: normalizeMetadata(action.payload.metadata),
        createdAt: Date.now(),
        useCount: 0,
      };

      const index = settings.promptPresets.findIndex((entry) => entry.id === preset.id);
      if (index >= 0) {
        settings.promptPresets[index] = {
          ...settings.promptPresets[index],
          ...preset,
        };
      } else {
        settings.promptPresets.unshift(preset);
      }
    },

    removePromptPreset: (
      state,
      action: PayloadAction<{ agentUrl: string; presetId: string }>,
    ) => {
      const settings = getAgentSettings(state, action.payload.agentUrl);
      settings.promptPresets = settings.promptPresets.filter(
        (preset) => preset.id !== action.payload.presetId,
      );
    },

    markPromptPresetUsed: (
      state,
      action: PayloadAction<{ agentUrl: string; presetId: string }>,
    ) => {
      const settings = getAgentSettings(state, action.payload.agentUrl);
      const preset = settings.promptPresets.find(
        (entry) => entry.id === action.payload.presetId,
      );
      if (!preset) return;
      preset.useCount += 1;
    },

    setAgentDefaultMetadata: (
      state,
      action: PayloadAction<{ agentUrl: string; metadata: Record<string, string> }>,
    ) => {
      const settings = getAgentSettings(state, action.payload.agentUrl);
      settings.defaultMetadata = normalizeMetadata(action.payload.metadata);
    },

    clearAgentDefaultMetadata: (state, action: PayloadAction<string>) => {
      const settings = getAgentSettings(state, action.payload);
      settings.defaultMetadata = {};
    },
  },
});

export const {
  hydrateWorkbench,
  saveTaskFilterPreset,
  removeTaskFilterPreset,
  savePromptPreset,
  removePromptPreset,
  markPromptPresetUsed,
  setAgentDefaultMetadata,
  clearAgentDefaultMetadata,
} = workbenchSlice.actions;

export default workbenchSlice.reducer;
