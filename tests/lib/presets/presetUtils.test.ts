import { textPart } from "@/lib/a2a/parts";
import { describe, expect, it } from "vitest";
import { CURATED_AGENT_PRESETS } from "@/lib/presets/data";
import {
  validateAgentPreset,
  validateWorkspacePreset,
  normalizePresetAgent,
  normalizePresetChat,
  importPresetToWorkspace,
} from "@/lib/presets/presetUtils";
import type { AgentPreset } from "@/lib/presets/types";
import type { Agent } from "@/lib/features/agents/agentsSlice";

describe("presetUtils", () => {
  it("validates all curated agent presets successfully", () => {
    expect(CURATED_AGENT_PRESETS.length).toBeGreaterThanOrEqual(2);
    for (const preset of CURATED_AGENT_PRESETS) {
      const result = validateAgentPreset(preset);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("detects invalid presets with missing fields", () => {
    const invalidNull = validateAgentPreset(null);
    expect(invalidNull.valid).toBe(false);

    const invalidEmpty = validateAgentPreset({});
    expect(invalidEmpty.valid).toBe(false);
    expect(invalidEmpty.errors.length).toBeGreaterThan(0);

    const invalidCategory = validateAgentPreset({
      id: "p1",
      name: "Test",
      category: "unknown-category",
      tags: [],
      agent: {
        url: "http://localhost:3001",
        card: {
          name: "Test Card",
          version: "1.0",
          defaultInputModes: [],
          defaultOutputModes: [],
        },
      },
    });
    expect(invalidCategory.valid).toBe(false);
    expect(invalidCategory.errors.some(e => e.includes("category"))).toBe(true);

    const invalidCard = validateAgentPreset({
      id: "p1",
      name: "Test",
      category: "local",
      tags: [],
      agent: {
        url: "http://localhost:3001",
        card: null,
      },
    });
    expect(invalidCard.valid).toBe(false);
    expect(invalidCard.errors.some(e => e.includes("card"))).toBe(true);
  });

  it("validates workspace presets with multiple entries", () => {
    const valid = validateWorkspacePreset({
      id: "ws-preset-1",
      name: "Standard Dev Setup",
      presets: [CURATED_AGENT_PRESETS[0]],
    });
    expect(valid.valid).toBe(true);

    const invalid = validateWorkspacePreset({
      id: "ws-preset-2",
      name: "Broken Setup",
      presets: [{ id: "bad" }],
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });

  it("normalizes preset agent and preserves existing agent ID and settings on update", () => {
    const preset = CURATED_AGENT_PRESETS[0];
    const existingAgent: Agent = {
      id: "existing-uuid-123",
      url: preset.agent.url,
      displayName: "Custom My Local",
      tags: ["custom-tag"],
      favorite: true,
      a2uiEnabled: true,
      status: "connected",
      auth: { type: "none" },
      customHeaders: [],
      card: preset.agent.card,
    };

    const normalizedNew = normalizePresetAgent(preset);
    expect(normalizedNew.id).toBeDefined();
    expect(normalizedNew.displayName).toBe(preset.name);

    const normalizedExisting = normalizePresetAgent(preset, existingAgent);
    expect(normalizedExisting.id).toBe("existing-uuid-123");
    expect(normalizedExisting.favorite).toBe(true);
    expect(normalizedExisting.tags).toContain("custom-tag");
    expect(normalizedExisting.tags).toContain("local");
  });

  it("normalizes preset chats with valid UUIDs and properties", () => {
    const presetChat = {
      title: "Sample Chat",
      agentUrl: "http://localhost:3001",
      agentName: "Demo",
      lastMessage: "Hello",
      timestamp: Date.now(),
      archived: false,
      pinned: true,
      executionEvents: [],
      items: [
        {
          id: "m1",
          kind: "user-message" as const,
          timestamp: Date.now(),
          parts: [textPart("Hi")],
        },
      ],
    };

    const chat = normalizePresetChat(presetChat, "http://localhost:3001", "Demo");
    expect(chat.id).toBeDefined();
    expect(chat.agentUrl).toBe("http://localhost:3001");
    expect(chat.agentName).toBe("Demo");
    expect(chat.pinned).toBe(true);
    expect(chat.items).toHaveLength(1);
  });

  it("imports a preset to workspace and handles duplicates gracefully", () => {
    const preset = CURATED_AGENT_PRESETS[0];
    const emptyAgents: Agent[] = [];

    const firstImport = importPresetToWorkspace(preset, emptyAgents);
    expect(firstImport.isUpdate).toBe(false);
    expect(firstImport.agent.url).toBe(preset.agent.url);
    expect(firstImport.chats.length).toBeGreaterThanOrEqual(1);

    // Duplicate import of same URL
    const existingList: Agent[] = [firstImport.agent];
    const secondImport = importPresetToWorkspace(preset, existingList);
    expect(secondImport.isUpdate).toBe(true);
    expect(secondImport.agent.id).toBe(firstImport.agent.id);
  });

  it("throws descriptive error when importing an invalid preset", () => {
    const brokenPreset = {
      id: "",
      name: "",
    } as unknown as AgentPreset;

    expect(() => importPresetToWorkspace(brokenPreset, [])).toThrowError(/Invalid preset/);
  });
});
