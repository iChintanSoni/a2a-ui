import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  migrateLegacyAgentCard,
  migrateLegacyParts,
  toOptionalTaskState,
  toTaskState,
} from "@/lib/a2a/legacy";
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
    _db = openDB<A2ASchema>("a2a-ui", 4, {
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

// Two generations of stored chat items:
//   v1 → v2: UserMessageItem carried `text` + `attachments` instead of `parts`.
//   v2 → v3: @a2a-js/sdk v1.0 restructured Part and made TaskState a numeric enum.
function migrateItems(items: unknown[]): ChatItem[] {
  return items.map(item => {
    const raw = item as Record<string, unknown>;

    if (raw.kind === "user-message" && !Array.isArray(raw.parts)) {
      const legacyParts: unknown[] = [];
      if (typeof raw.text === "string" && raw.text) {
        legacyParts.push({ kind: "text", text: raw.text });
      }
      if (Array.isArray(raw.attachments)) {
        legacyParts.push(...raw.attachments);
      }
      return { ...raw, parts: migrateLegacyParts(legacyParts) } as ChatItem;
    }

    if (raw.kind === "task-status") {
      const statusMessage = raw.statusMessage as Record<string, unknown> | undefined;
      return {
        ...raw,
        state: toTaskState(raw.state),
        ...(statusMessage
          ? { statusMessage: { parts: migrateLegacyParts(statusMessage.parts) } }
          : {}),
      } as ChatItem;
    }

    if (Array.isArray(raw.parts)) {
      return { ...raw, parts: migrateLegacyParts(raw.parts) } as ChatItem;
    }

    return item as ChatItem;
  });
}

function migrateQaState(qa: QaState | undefined): QaState {
  return {
    suites: (qa?.suites ?? []).map(suite => ({
      ...suite,
      cases: (suite.cases ?? []).map(testCase => ({
        ...testCase,
        attachments: migrateLegacyParts(testCase.attachments),
        expectedTaskState: toOptionalTaskState(testCase.expectedTaskState),
      })),
    })),
    runs: (qa?.runs ?? []).map(run => ({
      ...run,
      caseResults: (run.caseResults ?? []).map(result => ({
        ...result,
        finalTaskState: toOptionalTaskState(result.finalTaskState),
      })),
    })),
  };
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
  const restoredAgents = agents.map(a => ({
    ...a,
    tags: a.tags ?? [],
    favorite: a.favorite ?? false,
    card: migrateLegacyAgentCard(a.card),
    status: "disconnected" as const,
    error: undefined,
  }));
  const restoredChats = chats.map(c => ({
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
    qa: migrateQaState(qa),
  };
}

export async function persistAgents(agents: Agent[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("agents", "readwrite");
  await tx.store.clear();
  await Promise.all(agents.map(a => tx.store.put(a)));
  await tx.done;
}

export async function persistChats(chats: Chat[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("chats", "readwrite");
  await tx.store.clear();
  await Promise.all(chats.map(c => tx.store.put(c)));
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
