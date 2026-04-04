"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import { Button } from "@/components/ui/button";
import { XIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LogEntry, LogType } from "@/lib/utils/debugInterceptor";

hljs.registerLanguage("json", json);

// ─── JSON syntax highlight ────────────────────────────────────────────────────

function JsonView({ value }: { value: unknown }) {
  const str = JSON.stringify(value, null, 2) ?? "null";
  const highlighted = hljs.highlight(str, { language: "json" }).value;
  return (
    <pre
      className="hljs text-[11px] leading-relaxed whitespace-pre-wrap break-words"
      // highlight.js output is safe — it HTML-escapes content internally
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<LogType, string> = {
  request:
    "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  response:
    "bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/20",
  error:
    "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20",
};

function TypeBadge({ type }: { type: LogType }) {
  return (
    <span
      className={cn(
        "inline-block rounded px-1.5 py-0 text-[10px] font-semibold uppercase leading-5 shrink-0",
        TYPE_STYLES[type]
      )}
    >
      {type}
    </span>
  );
}

// ─── Single log entry ─────────────────────────────────────────────────────────

function LogRow({ entry }: { entry: LogEntry }) {
  const [open, setOpen] = useState(false);
  const time = new Date(entry.timestamp).toISOString().slice(11, 23); // HH:MM:SS.mmm

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="mt-0.5 shrink-0 font-mono text-[10px] text-muted-foreground">
          {time}
        </span>
        <TypeBadge type={entry.type} />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/80">
          {entry.method}
        </span>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="overflow-x-auto bg-muted/30 px-3 pb-2 pt-1">
          <JsonView value={entry.payload} />
        </div>
      )}
    </div>
  );
}

// ─── Filter button ────────────────────────────────────────────────────────────

type Filter = LogType | "all";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Request", value: "request" },
  { label: "Response", value: "response" },
  { label: "Error", value: "error" },
];

// ─── Debug panel ──────────────────────────────────────────────────────────────

interface DebugPanelProps {
  logs: LogEntry[];
  onClear: () => void;
  onClose: () => void;
}

const MIN_HEIGHT = 160;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 300;

export function DebugPanel({ logs, onClear, onClose }: DebugPanelProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const dragStartRef = useRef<{ y: number; h: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered =
    filter === "all" ? logs : logs.filter((l) => l.type === filter);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [filtered.length]);

  // ── Resize drag ──────────────────────────────────────────────────────────────
  const handleDragMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragStartRef.current = { y: e.clientY, h: height };

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragStartRef.current) return;
        const delta = dragStartRef.current.y - ev.clientY; // drag up → taller
        const next = Math.max(
          MIN_HEIGHT,
          Math.min(MAX_HEIGHT, dragStartRef.current.h + delta)
        );
        setHeight(next);
      };

      const onMouseUp = () => {
        dragStartRef.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [height]
  );

  return (
    <div
      className="flex shrink-0 flex-col border-t bg-background"
      style={{ height }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleDragMouseDown}
        className="flex h-2 cursor-row-resize items-center justify-center hover:bg-muted/60 transition-colors"
        title="Drag to resize"
      >
        <div className="h-0.5 w-8 rounded-full bg-border" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b px-3 py-1.5 shrink-0">
        <span className="text-xs font-semibold text-foreground/70 mr-1">
          Debug Console
        </span>

        {/* Filter buttons */}
        <div className="flex gap-0.5">
          {FILTERS.map((f) => {
            const count =
              f.value === "all"
                ? logs.length
                : logs.filter((l) => l.type === f.value).length;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {f.label}
                {count > 0 && (
                  <span className="ml-1 opacity-70">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={onClear}
            title="Clear logs"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={onClose}
            title="Close debug console"
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Log list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">
            No {filter === "all" ? "" : filter + " "}logs yet.
          </p>
        ) : (
          filtered.map((entry) => <LogRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}
