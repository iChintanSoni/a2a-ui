"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TaskState } from "@a2a-js/sdk";
import { ArrowRightIcon, BookmarkPlusIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskTimeline } from "@/components/task-timeline";
import { PageTitle, Muted, Caption, Small } from "@/components/typography";
import { getTransportSummary } from "@/lib/a2a/execution-events";
import { partsToPlainText } from "@/lib/a2a/parts";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  buildTaskSummaries,
  type TaskSummary,
} from "@/lib/features/chats/taskIndex";
import type { ArtifactItem, TaskStatusItem } from "@/lib/features/chats/chatsSlice";
import {
  removeTaskFilterPreset,
  saveTaskFilterPreset,
} from "@/lib/features/workbench/workbenchSlice";

type TaskFilter = "all" | TaskState;

function stateBadgeVariant(state: TaskState): "default" | "secondary" | "outline" | "destructive" {
  if (state === "completed") return "default";
  if (state === "failed" || state === "rejected") return "destructive";
  if (state === "working" || state === "submitted") return "secondary";
  return "outline";
}

function taskSearchText(task: TaskSummary) {
  return [
    task.taskId,
    task.contextId,
    task.chatTitle,
    task.agentName,
    task.agentUrl,
    task.state,
    task.latestStatusText,
    ...task.artifactNames,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function taskKey(task: TaskSummary) {
  return `${task.chatId}:${task.taskId}`;
}

export default function TasksPage() {
  const dispatch = useAppDispatch();
  const chats = useAppSelector((state) => state.chats.chats);
  const presets = useAppSelector((state) => state.workbench.taskFilterPresets);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<TaskFilter>("all");
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>(null);

  const tasks = useMemo(() => buildTaskSummaries(chats), [chats]);
  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (stateFilter !== "all" && task.state !== stateFilter) return false;
      if (normalizedQuery && !taskSearchText(task).includes(normalizedQuery)) return false;
      return true;
    });
  }, [query, stateFilter, tasks]);
  const selectedTask = filteredTasks.find((task) => taskKey(task) === selectedTaskKey) ?? null;
  const selectedChat = selectedTask
    ? chats.find((chat) => chat.id === selectedTask.chatId) ?? null
    : null;
  const selectedStatusHistory = selectedChat && selectedTask
    ? selectedChat.items.filter(
        (item): item is TaskStatusItem =>
          item.kind === "task-status" && item.taskId === selectedTask.taskId,
      )
    : [];
  const selectedArtifacts = selectedChat && selectedTask
    ? selectedChat.items.filter(
        (item): item is ArtifactItem =>
          item.kind === "artifact" && item.taskId === selectedTask.taskId,
      )
    : [];
  const selectedEvents = selectedChat && selectedTask
    ? selectedChat.executionEvents.filter((event) => event.taskId === selectedTask.taskId)
    : [];
  const selectedWarnings = selectedEvents.filter((event) => event.level !== "info");
  const selectedTiming = selectedChat ? getTransportSummary(selectedChat.executionEvents) : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 md:p-8">
      <div>
        <PageTitle>Tasks</PageTitle>
        <Muted>
          Explore task-centric runs across chats, including state, artifacts, and correlated
          warnings.
        </Muted>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <Input
          placeholder="Search by task, context, chat, agent, or artifact"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select value={stateFilter} onValueChange={(value) => setStateFilter(value as TaskFilter)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="working">Working</SelectItem>
            <SelectItem value="input-required">Input required</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="auth-required">Auth required</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            dispatch(
              saveTaskFilterPreset({
                query,
                state: stateFilter,
              }),
            )
          }
        >
          <BookmarkPlusIcon data-icon="inline-start" />
          Save current filter
        </Button>
        {presets.map((preset) => (
          <div key={preset.id} className="flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-1">
            <button
              onClick={() => {
                setQuery(preset.query);
                setStateFilter(preset.state);
              }}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {preset.label}
            </button>
            <button
              onClick={() => dispatch(removeTaskFilterPreset(preset.id))}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Remove ${preset.label}`}
            >
              <Trash2Icon className="size-3" />
            </button>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <Muted>No tasks match the current filters.</Muted>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div key={`${task.chatId}:${task.taskId}`} className="min-w-0 rounded-md border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Small className="truncate">{task.taskId}</Small>
                    <Badge variant={stateBadgeVariant(task.state)}>{task.state}</Badge>
                    {task.validationWarningCount > 0 && (
                      <Badge variant="outline">
                        {task.validationWarningCount} warning
                        {task.validationWarningCount === 1 ? "" : "s"}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {task.artifactCount} artifact{task.artifactCount === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <Caption className="mt-1 block truncate">
                    {task.agentName} · Context {task.contextId}
                  </Caption>
                  <Muted className="mt-2 line-clamp-2">
                    {task.latestStatusText || "No status detail recorded for this task yet."}
                  </Muted>
                  <TaskTimeline stages={task.timelineStages} className="mt-3" />
                  {task.artifactNames.length > 0 && (
                    <Caption className="mt-3 block break-words">
                      Artifacts: {task.artifactNames.join(", ")}
                    </Caption>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedTaskKey(taskKey(task))}
                  >
                    Details
                  </Button>
                  <Link
                    href={`/dashboard/chat/${task.chatId}`}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Open chat
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet
        open={selectedTask != null}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskKey(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Task details</SheetTitle>
            <SheetDescription>
              {selectedTask?.taskId ?? "No task selected"}
            </SheetDescription>
          </SheetHeader>

          {selectedTask && (
            <div className="flex flex-col gap-5 px-4 pb-4">
              <div className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={stateBadgeVariant(selectedTask.state)}>{selectedTask.state}</Badge>
                  <Badge variant="outline">
                    {selectedArtifacts.length} artifact{selectedArtifacts.length === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="outline">
                    {selectedWarnings.length} warning{selectedWarnings.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <Caption className="mt-2 block">
                  {selectedTask.agentName} · Context {selectedTask.contextId}
                </Caption>
                <TaskTimeline stages={selectedTask.timelineStages} className="mt-3" />
              </div>

              <section className="space-y-2">
                <Small>State history</Small>
                {selectedStatusHistory.length === 0 ? (
                  <Muted>No status history recorded.</Muted>
                ) : (
                  <div className="space-y-2">
                    {selectedStatusHistory.map((item) => (
                      <div key={`${item.id}:${item.timestamp}`} className="rounded-md bg-muted/30 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={stateBadgeVariant(item.state)}>{item.state}</Badge>
                          <Caption>{new Date(item.timestamp).toLocaleString()}</Caption>
                        </div>
                        {item.statusMessage && (
                          <Muted className="mt-2 line-clamp-3">
                            {partsToPlainText(item.statusMessage.parts) || "Empty status message."}
                          </Muted>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <Small>Artifacts</Small>
                {selectedArtifacts.length === 0 ? (
                  <Muted>No artifacts recorded.</Muted>
                ) : (
                  <div className="space-y-2">
                    {selectedArtifacts.map((artifact) => (
                      <div key={artifact.id} className="rounded-md bg-muted/30 p-3">
                        <Caption className="block">
                          {artifact.name || artifact.id}
                          {artifact.isStreaming ? " · streaming" : ""}
                        </Caption>
                        {artifact.description && <Muted className="mt-1">{artifact.description}</Muted>}
                        <Muted className="mt-2 line-clamp-3">
                          {partsToPlainText(artifact.parts) || "No preview available."}
                        </Muted>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <Small>Request timing</Small>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md bg-muted/30 p-3">
                    <Caption className="block">Requests</Caption>
                    <Small>{selectedTiming?.total ?? 0}</Small>
                  </div>
                  <div className="rounded-md bg-muted/30 p-3">
                    <Caption className="block">Errors</Caption>
                    <Small>{selectedTiming?.errors ?? 0}</Small>
                  </div>
                  <div className="rounded-md bg-muted/30 p-3">
                    <Caption className="block">Average</Caption>
                    <Small>
                      {selectedTiming?.avgDurationMs != null
                        ? `${selectedTiming.avgDurationMs} ms`
                        : "n/a"}
                    </Small>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <Small>Warnings</Small>
                {selectedWarnings.length === 0 ? (
                  <Muted>No warnings or errors recorded for this task.</Muted>
                ) : (
                  <div className="space-y-2">
                    {selectedWarnings.map((event) => (
                      <div key={event.id} className="rounded-md bg-muted/30 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={event.level === "error" ? "destructive" : "outline"}>
                            {event.level}
                          </Badge>
                          <Caption>{event.kind}</Caption>
                        </div>
                        <Muted className="mt-2">{event.summary}</Muted>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {selectedTask && (
            <SheetFooter>
              <Button asChild>
                <Link href={`/dashboard/chat/${selectedTask.chatId}`}>
                  Open source chat
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
