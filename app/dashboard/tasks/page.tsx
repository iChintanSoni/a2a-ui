"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TaskState } from "@a2a-js/sdk";
import { ArrowRightIcon, BookmarkPlusIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTitle, Muted, Caption, Small } from "@/components/typography";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  buildTaskSummaries,
  type TaskSummary,
} from "@/lib/features/chats/taskIndex";
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

export default function TasksPage() {
  const dispatch = useAppDispatch();
  const chats = useAppSelector((state) => state.chats.chats);
  const presets = useAppSelector((state) => state.workbench.taskFilterPresets);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<TaskFilter>("all");

  const tasks = useMemo(() => buildTaskSummaries(chats), [chats]);
  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (stateFilter !== "all" && task.state !== stateFilter) return false;
      if (normalizedQuery && !taskSearchText(task).includes(normalizedQuery)) return false;
      return true;
    });
  }, [query, stateFilter, tasks]);

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 md:p-8">
      <div>
        <PageTitle>Tasks</PageTitle>
        <Muted>
          Explore task-centric runs across chats, including state, artifacts, and correlated
          warnings.
        </Muted>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
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
            <div key={`${task.chatId}:${task.taskId}`} className="rounded-md border p-4">
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
                  {task.timelineStages.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {task.timelineStages.map((stage) => (
                        <Badge key={stage.key} variant="secondary">
                          {stage.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {task.artifactNames.length > 0 && (
                    <Caption className="mt-3 block truncate">
                      Artifacts: {task.artifactNames.join(", ")}
                    </Caption>
                  )}
                </div>

                <Link
                  href={`/dashboard/chat/${task.chatId}`}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Open chat
                  <ArrowRightIcon className="size-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
