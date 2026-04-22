import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Agent } from "./features/agents/agentsSlice";
import type { Chat } from "./features/chats/chatsSlice";

interface A2ASchema extends DBSchema {
  agents: { key: string; value: Agent };
  chats: { key: string; value: Chat };
}

let _db: Promise<IDBPDatabase<A2ASchema>> | null = null;

function getDB(): Promise<IDBPDatabase<A2ASchema>> {
  if (!_db) {
    _db = openDB<A2ASchema>("a2a-ui", 1, {
      upgrade(db) {
        db.createObjectStore("agents", { keyPath: "id" });
        db.createObjectStore("chats", { keyPath: "id" });
      },
    });
  }
  return _db;
}

export async function loadPersistedState(): Promise<{ agents: Agent[]; chats: Chat[] }> {
  const db = await getDB();
  const [agents, chats] = await Promise.all([db.getAll("agents"), db.getAll("chats")]);
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
    items: c.items ?? [],
    executionEvents: c.executionEvents ?? [],
  }));
  return { agents: restoredAgents, chats: restoredChats };
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
