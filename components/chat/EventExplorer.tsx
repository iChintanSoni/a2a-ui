"use client";

import { useMemo, useState } from "react";
import { ActivityIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Caption, Small } from "@/components/typography";
import { cn } from "@/lib/utils";
import {
  filterExecutionEvents,
  getTransportSummary,
  type ExecutionEvent,
  type ExecutionEventKind,
} from "@/lib/a2a/execution-events";

type EventFilter = ExecutionEventKind | "all";

const FILTERS: { label: string; value: EventFilter }[] = [
  { label: "All", value: "all" },
  { label: "Transport", value: "transport" },
  { label: "Validation", value: "validation" },
  { label: "Tasks", value: "task-status" },
  { label: "Artifacts", value: "artifact-update" },
  { label: "Tools", value: "tool-call" },
  { label: "Agent", value: "agent-message" },
  { label: "Outgoing", value: "outgoing-message" },
];

const KIND_STYLES: Record<ExecutionEvent["kind"], string> = {
  "outgoing-message": "border-blue-500/20 bg-blue-500/15 text-blue-700 dark:text-blue-300",
  transport: "border-cyan-500/20 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  validation: "border-yellow-500/20 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  "task-status": "border-amber-500/20 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "artifact-update": "border-indigo-500/20 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  "tool-call": "border-emerald-500/20 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "agent-message": "border-green-500/20 bg-green-500/15 text-green-700 dark:text-green-300",
};

interface EventExplorerProps {
  events: ExecutionEvent[];
  onClose: () => void;
}

function EventRow({ event }: { event: ExecutionEvent }) {
  const [open, setOpen] = useState(false);
  const time = new Date(event.timestamp).toISOString().slice(11, 23);
  const status = event.details?.transport;
  const duration =
    status &&
    typeof status === "object" &&
    "durationMs" in status &&
    typeof status.durationMs === "number"
      ? `${status.durationMs}ms`
      : null;

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
      >
        <Caption className="mt-0.5 shrink-0 font-mono">{time}</Caption>
        <span
          className={cn(
            "inline-flex shrink-0 rounded border px-1.5 py-0 text-[10px] font-semibold uppercase leading-5",
            KIND_STYLES[event.kind],
          )}
        >
          {event.kind}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-foreground">{event.summary}</div>
          <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
            {event.taskId && <Badge variant="outline">task {event.taskId}</Badge>}
            {event.requestId && <Badge variant="outline">request {event.requestId}</Badge>}
            {duration && <Badge variant="outline">{duration}</Badge>}
          </div>
        </div>
        <Caption className="shrink-0">{open ? "▲" : "▼"}</Caption>
      </button>

      {open && (
        <div className="overflow-x-auto bg-muted/30 px-3 pb-3 pt-1">
          <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-foreground/80">
            {JSON.stringify(event, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function EventExplorer({ events, onClose }: EventExplorerProps) {
  const [filter, setFilter] = useState<EventFilter>("all");
  const [taskFilter, setTaskFilter] = useState("");
  const [requestFilter, setRequestFilter] = useState("");

  const filtered = useMemo(
    () =>
      filterExecutionEvents(events, {
        kind: filter,
        taskId: taskFilter,
        requestId: requestFilter,
      }),
    [events, filter, requestFilter, taskFilter],
  );

  const summary = useMemo(() => getTransportSummary(filtered), [filtered]);

  return (
    <div className="flex shrink-0 flex-col border-t bg-background" style={{ height: 340 }}>
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <ActivityIcon className="size-4 text-muted-foreground" />
        <Small className="text-foreground/80">Event Explorer</Small>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-6" onClick={onClose}>
            <XIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="border-b px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((entry) => (
            <button
              key={entry.value}
              onClick={() => setFilter(entry.value)}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                filter === entry.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <Input
            value={taskFilter}
            onChange={(event) => setTaskFilter(event.target.value)}
            placeholder="Filter by task ID"
            className="h-8 text-xs"
          />
          <Input
            value={requestFilter}
            onChange={(event) => setRequestFilter(event.target.value)}
            placeholder="Filter by request ID"
            className="h-8 text-xs"
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline">{filtered.length} events</Badge>
          <Badge variant="outline">{summary.total} transport</Badge>
          <Badge variant="outline">{summary.errors} errors</Badge>
          {summary.avgDurationMs != null && (
            <Badge variant="outline">{summary.avgDurationMs}ms avg</Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <Caption className="p-4 text-center">No matching events yet.</Caption>
        ) : (
          filtered.map((event) => <EventRow key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}
