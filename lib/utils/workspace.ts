import type { Agent, AuthConfig, CustomHeader } from "@/lib/features/agents/agentsSlice";
import type { Chat } from "@/lib/features/chats/chatsSlice";
import { maskSecrets } from "@/lib/utils/debugInterceptor";

export interface WorkspaceExport {
  version: 1;
  exportedAt: string;
  agents: Agent[];
  chats?: Chat[];
}

function sanitizeAuth(auth: AuthConfig): AuthConfig {
  switch (auth.type) {
    case "bearer":
      return { type: "bearer" };
    case "api-key":
      return { type: "api-key", apiKeyHeader: auth.apiKeyHeader };
    case "basic":
      return { type: "basic", basicUsername: auth.basicUsername };
    case "none":
    default:
      return { type: "none" };
  }
}

function sanitizeHeaders(headers: CustomHeader[]): CustomHeader[] {
  return headers.map((header) => ({
    key: header.key,
    value: header.value ? "" : header.value,
  }));
}

export function sanitizeAgentForExport(agent: Agent): Agent {
  return maskSecrets({
    ...agent,
    status: "disconnected",
    error: undefined,
    auth: sanitizeAuth(agent.auth),
    customHeaders: sanitizeHeaders(agent.customHeaders),
  }) as Agent;
}

export function buildWorkspaceExport(input: {
  agents: Agent[];
  chats?: Chat[];
  includeChats: boolean;
}): WorkspaceExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    agents: input.agents.map(sanitizeAgentForExport),
    ...(input.includeChats ? { chats: input.chats ?? [] } : {}),
  };
}

export function parseWorkspaceImport(value: unknown): WorkspaceExport {
  if (Array.isArray(value)) {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      agents: value as Agent[],
    };
  }

  if (!value || typeof value !== "object") {
    throw new Error("Workspace file must be a JSON object.");
  }

  const workspace = value as Partial<WorkspaceExport>;
  if (!Array.isArray(workspace.agents)) {
    throw new Error("Workspace file must include an agents array.");
  }

  return {
    version: 1,
    exportedAt: typeof workspace.exportedAt === "string" ? workspace.exportedAt : new Date().toISOString(),
    agents: workspace.agents,
    chats: Array.isArray(workspace.chats) ? workspace.chats : undefined,
  };
}

export function normalizeImportedAgent(agent: Agent): Agent {
  return {
    ...agent,
    id: crypto.randomUUID(),
    tags: agent.tags ?? [],
    favorite: agent.favorite ?? false,
    status: "disconnected",
    error: undefined,
    auth: agent.auth ?? { type: "none" },
    customHeaders: agent.customHeaders ?? [],
  };
}

export function normalizeImportedChat(chat: Chat): Chat {
  return {
    ...chat,
    id: crypto.randomUUID(),
    archived: chat.archived ?? false,
    items: chat.items ?? [],
  };
}
