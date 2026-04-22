import { describe, expect, it } from "vitest";
import reducer, {
  saveTaskFilterPreset,
  removeTaskFilterPreset,
  savePromptPreset,
  markPromptPresetUsed,
  setAgentDefaultMetadata,
  clearAgentDefaultMetadata,
  type WorkbenchState,
} from "@/lib/features/workbench/workbenchSlice";

const INITIAL_STATE: WorkbenchState = {
  taskFilterPresets: [],
  agentSettings: {},
};

describe("workbenchSlice", () => {
  it("saves and removes task filter presets", () => {
    let state = reducer(
      INITIAL_STATE,
      saveTaskFilterPreset({ query: "weather", state: "completed" }),
    );
    expect(state.taskFilterPresets).toHaveLength(1);

    state = reducer(state, removeTaskFilterPreset(state.taskFilterPresets[0].id));
    expect(state.taskFilterPresets).toEqual([]);
  });

  it("saves prompt presets per agent and tracks usage", () => {
    let state = reducer(
      INITIAL_STATE,
      savePromptPreset({
        agentUrl: "https://agent.test",
        text: "Summarize the forecast",
        metadata: { audience: "ops" },
      }),
    );

    const preset = state.agentSettings["https://agent.test"].promptPresets[0];
    expect(preset.label).toContain("Summarize the forecast");
    expect(preset.metadata).toEqual({ audience: "ops" });

    state = reducer(
      state,
      markPromptPresetUsed({
        agentUrl: "https://agent.test",
        presetId: preset.id,
      }),
    );

    expect(state.agentSettings["https://agent.test"].promptPresets[0].useCount).toBe(1);
  });

  it("stores and clears default metadata per agent", () => {
    let state = reducer(
      INITIAL_STATE,
      setAgentDefaultMetadata({
        agentUrl: "https://agent.test",
        metadata: { audience: "ops", environment: "dev" },
      }),
    );

    expect(state.agentSettings["https://agent.test"].defaultMetadata).toEqual({
      audience: "ops",
      environment: "dev",
    });

    state = reducer(state, clearAgentDefaultMetadata("https://agent.test"));
    expect(state.agentSettings["https://agent.test"].defaultMetadata).toEqual({});
  });
});
