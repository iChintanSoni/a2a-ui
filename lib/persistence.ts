import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Part } from "@a2a-js/sdk";
import type { Agent } from "./features/agents/agentsSlice";
import type { Chat, ChatItem } from "./features/chats/chatsSlice";
import type { QaState } from "./features/qa/types";
import type { WorkbenchState } from "./features/workbench/workbenchSlice";

interface A2ASchema extends DBSchema {
  agents: { key: string; value: Agent };
  chats: { key: string; value: Chat };
  qa: { key: string; value: QaState };
  workbench: { key: string; value: WorkbenchState };
}

let _db: Promise<IDBPDatabase<A2ASchema>> | null = null;

function getDB(): Promise<IDBPDatabase<A2ASchema>> {
  if (!_db) {
    _db = openDB<A2ASchema>("a2a-ui", 3, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("agents")) {
          db.createObjectStore("agents", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("chats")) {
          db.createObjectStore("chats", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("workbench")) {
          db.createObjectStore("workbench");
        }
        if (!db.objectStoreNames.contains("qa")) {
          db.createObjectStore("qa");
        }
      },
    });
  }
  return _db;
}

// Migrate items from old format where UserMessageItem had `text` + `attachments`
// instead of the current `parts` array.
function migrateItems(items: unknown[]): ChatItem[] {
  return items.map((item) => {
    const raw = item as Record<string, unknown>;
    if (raw.kind === "user-message" && !Array.isArray(raw.parts)) {
      const parts: Part[] = [];
      if (typeof raw.text === "string" && raw.text) {
        parts.push({ kind: "text", text: raw.text });
      }
      if (Array.isArray(raw.attachments)) {
        parts.push(...(raw.attachments as Part[]));
      }
      return { ...raw, parts } as ChatItem;
    }
    return item as ChatItem;
  });
}

export async function loadPersistedState(): Promise<{
  agents: Agent[];
  chats: Chat[];
  workbench: WorkbenchState;
  qa: QaState;
}> {
  const db = await getDB();
  const [agents, chats, workbench, qa] = await Promise.all([
    db.getAll("agents"),
    db.getAll("chats"),
    db.get("workbench", "state"),
    db.get("qa", "state"),
  ]);
  // Reset runtime-only fields: status is re-evaluated on each page load
  const restoredAgents = agents.map((a) => ({
    ...a,
    tags: a.tags ?? [],
    favorite: a.favorite ?? false,
    status: "disconnected" as const,
    error: undefined,
  }));
  const restoredChats = chats.map((c) => ({
    ...c,
    archived: c.archived ?? false,
    pinned: c.pinned ?? false,
    items: migrateItems(c.items ?? []),
    executionEvents: c.executionEvents ?? [],
  }));
  return {
    agents: restoredAgents,
    chats: restoredChats,
    workbench: {
      taskFilterPresets: workbench?.taskFilterPresets ?? [],
      agentSettings: workbench?.agentSettings ?? {},
    },
    qa: {
      suites: qa?.suites ?? [],
      runs: qa?.runs ?? [],
    },
  };
}

export async function persistAgents(agents: Agent[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("agents", "readwrite");
  await tx.store.clear();
  await Promise.all(agents.map((a) => tx.store.put(a)));
  await tx.done;
}

export async function persistChats(chats: Chat[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("chats", "readwrite");
  await tx.store.clear();
  await Promise.all(chats.map((c) => tx.store.put(c)));
  await tx.done;
}

export async function persistWorkbench(workbench: WorkbenchState): Promise<void> {
  const db = await getDB();
  await db.put("workbench", workbench, "state");
}

export async function persistQa(qa: QaState): Promise<void> {
  const db = await getDB();
  await db.put("qa", qa, "state");
}
