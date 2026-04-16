import { describe, expect, it } from "vitest";
import { buildWorkspaceExport, normalizeImportedAgent } from "@/lib/utils/workspace";
import type { Agent } from "@/lib/features/agents/agentsSlice";

const agent: Agent = {
  id: "a1",
  url: "https://agent.test",
  displayName: "Agent",
  tags: ["demo"],
  favorite: true,
  card: {
    name: "Agent",
    description: "desc",
    version: "1",
    protocolVersion: "0.3.0",
  },
  status: "connected",
  auth: { type: "bearer", bearerToken: "secret-token" },
  customHeaders: [{ key: "X-Api-Key", value: "secret" }],
};

describe("workspace export", () => {
  it("exports agents without secrets by default", () => {
    const workspace = buildWorkspaceExport({ agents: [agent], chats: [], includeChats: false });

    expect(workspace.chats).toBeUndefined();
    expect(workspace.agents[0].status).toBe("disconnected");
    expect(workspace.agents[0].auth).toEqual({ type: "bearer" });
    expect(workspace.agents[0].customHeaders[0]).toEqual({ key: "X-Api-Key", value: "" });
    expect(JSON.stringify(workspace)).not.toContain("secret-token");
  });

  it("normalizes imported agents as disconnected with metadata defaults", () => {
    const normalized = normalizeImportedAgent({
      ...agent,
      tags: undefined,
      favorite: undefined,
      status: "connected",
    });

    expect(normalized.id).not.toBe(agent.id);
    expect(normalized.status).toBe("disconnected");
    expect(normalized.tags).toEqual([]);
    expect(normalized.favorite).toBe(false);
  });
});
