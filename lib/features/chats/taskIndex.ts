import type { Part, TaskState } from "@a2a-js/sdk";
import {
  getTaskTimelineStages,
  type TaskTimelineStage,
} from "@/lib/a2a/execution-events";
import type { Chat } from "./chatsSlice";

export interface TaskSummary {
  chatId: string;
  chatTitle: string;
  contextId: string;
  taskId: string;
  agentName: string;
  agentUrl: string;
  state: TaskState;
  artifactCount: number;
  artifactNames: string[];
  validationWarningCount: number;
  latestStatusText: string;
  lastUpdated: number;
  timelineStages: TaskTimelineStage[];
}

function textFromParts(parts: Part[]): string {
  return parts
    .filter((part): part is Extract<Part, { kind: "text" }> => part.kind === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

function taskKey(chatId: string, taskId: string) {
  return `${chatId}::${taskId}`;
}

export function buildTaskSummaries(chats: Chat[]): TaskSummary[] {
  const tasks = new Map<string, TaskSummary>();

  for (const chat of chats) {
    for (const item of chat.items) {
      if (item.kind === "task-status") {
        const key = taskKey(chat.id, item.taskId);
        const existing = tasks.get(key);
        const latestStatusText = item.statusMessage
          ? textFromParts(item.statusMessage.parts)
          : "";

        tasks.set(key, {
          chatId: chat.id,
          chatTitle: chat.title,
          contextId: chat.id,
          taskId: item.taskId,
          agentName: chat.agentName,
          agentUrl: chat.agentUrl,
          state: item.state,
          artifactCount: existing?.artifactCount ?? 0,
          artifactNames: existing?.artifactNames ?? [],
          validationWarningCount: existing?.validationWarningCount ?? 0,
          latestStatusText,
          lastUpdated: Math.max(existing?.lastUpdated ?? 0, item.timestamp),
          timelineStages: getTaskTimelineStages(chat.executionEvents, item.taskId),
        });
        continue;
      }

      if (item.kind === "artifact") {
        const key = taskKey(chat.id, item.taskId);
        const existing = tasks.get(key);
        tasks.set(key, {
          chatId: chat.id,
          chatTitle: chat.title,
          contextId: chat.id,
          taskId: item.taskId,
          agentName: chat.agentName,
          agentUrl: chat.agentUrl,
          state: existing?.state ?? "unknown",
          artifactCount: (existing?.artifactCount ?? 0) + 1,
          artifactNames:
            item.name && !(existing?.artifactNames ?? []).includes(item.name)
              ? [...(existing?.artifactNames ?? []), item.name]
              : (existing?.artifactNames ?? []),
          validationWarningCount: existing?.validationWarningCount ?? 0,
          latestStatusText: existing?.latestStatusText ?? "",
          lastUpdated: Math.max(existing?.lastUpdated ?? 0, item.timestamp),
          timelineStages: getTaskTimelineStages(chat.executionEvents, item.taskId),
        });
      }
    }

    for (const event of chat.executionEvents) {
      if (event.kind !== "validation" || !event.taskId) continue;
      const key = taskKey(chat.id, event.taskId);
      const existing = tasks.get(key);
      tasks.set(key, {
        chatId: chat.id,
        chatTitle: chat.title,
        contextId: chat.id,
        taskId: event.taskId,
        agentName: chat.agentName,
        agentUrl: chat.agentUrl,
        state: existing?.state ?? "unknown",
        artifactCount: existing?.artifactCount ?? 0,
        artifactNames: existing?.artifactNames ?? [],
        validationWarningCount: (existing?.validationWarningCount ?? 0) + 1,
        latestStatusText: existing?.latestStatusText ?? "",
        lastUpdated: Math.max(existing?.lastUpdated ?? 0, event.timestamp),
        timelineStages: getTaskTimelineStages(chat.executionEvents, event.taskId),
      });
    }
  }

  return [...tasks.values()].sort((a, b) => b.lastUpdated - a.lastUpdated);
}
