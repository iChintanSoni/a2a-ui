import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Clock,
  Ban,
  ShieldAlert,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import type { TaskStatusItem } from "@/lib/features/chats/chatsSlice";
import type { TaskTimelineStage } from "@/lib/a2a/execution-events";
import { PartRenderer } from "./PartRenderer";
import { Button } from "@/components/ui/button";
import { TaskTimeline } from "@/components/task-timeline";

interface Props {
  item: TaskStatusItem;
  timelineStages?: TaskTimelineStage[];
  onInspect?: () => void;
  onRetry?: () => void;
}

const STATE_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; className: string; spin?: boolean }
> = {
  submitted: {
    icon: Clock,
    label: "Submitted",
    className: "text-muted-foreground",
  },
  working: {
    icon: Loader2,
    label: "Working…",
    className: "text-warning-foreground",
    spin: true,
  },
  "input-required": {
    icon: AlertCircle,
    label: "Input required",
    className: "text-warning-foreground",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    className: "text-brand-soft-foreground",
  },
  canceled: {
    icon: Ban,
    label: "Canceled",
    className: "text-muted-foreground",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    className: "text-destructive",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    className: "text-destructive",
  },
  "auth-required": {
    icon: ShieldAlert,
    label: "Auth required",
    className: "text-warning-foreground",
  },
  unknown: {
    icon: HelpCircle,
    label: "Unknown",
    className: "text-muted-foreground",
  },
};

export function TaskStatusRow({ item, timelineStages = [], onInspect, onRetry }: Props) {
  const config = STATE_CONFIG[item.state] ?? STATE_CONFIG.unknown;
  const Icon = config.icon;

  // Render a prominent callout card for input-required state
  if (item.state === "input-required") {
    return (
      <div className="group border-warning-soft bg-warning-soft/60 relative rounded-[9px] border px-4 py-3">
        <div className="text-warning-foreground mb-1 flex items-center gap-2 text-xs font-semibold">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>Agent needs your input</span>
        </div>
        {item.statusMessage && item.statusMessage.parts.length > 0 ? (
          <div className="text-foreground text-sm">
            {item.statusMessage.parts.map((part, i) => (
              <PartRenderer key={i} part={part} />
            ))}
          </div>
        ) : (
          <p className="text-warning-foreground text-sm">
            Please provide additional information to continue.
          </p>
        )}
        {onInspect && (
          <button
            onClick={onInspect}
            className="bg-background text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute -top-2 -right-2 hidden size-5 items-center justify-center rounded-full border font-mono text-[10px] shadow-sm transition-colors group-focus-within:flex group-hover:flex focus-visible:flex focus-visible:ring-2"
            title="Inspect raw JSON"
            aria-label="Inspect raw JSON"
          >
            {"{}"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col gap-1 py-1" role="status" aria-live="polite">
      <div className={`flex items-center gap-1.5 text-xs ${config.className}`}>
        <Icon className={`size-3.5 ${config.spin ? "animate-spin" : ""}`} aria-hidden="true" />
        <span>{config.label}</span>
      </div>
      {timelineStages.length > 0 && (
        <TaskTimeline stages={timelineStages} compact className="ms-5" />
      )}
      {item.statusMessage && item.statusMessage.parts.length > 0 && (
        <div className="text-muted-foreground ms-5 text-sm">
          {item.statusMessage.parts.map((part, i) => (
            <PartRenderer key={i} part={part} />
          ))}
        </div>
      )}
      {item.state === "canceled" && onRetry && (
        <div className="ms-5 mt-1">
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={onRetry}>
            <RotateCcw className="size-3" />
            Retry
          </Button>
        </div>
      )}
      {onInspect && (
        <button
          onClick={onInspect}
          className="bg-background text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute -top-2 -right-2 hidden size-5 items-center justify-center rounded-full border font-mono text-[10px] shadow-sm transition-colors group-focus-within:flex group-hover:flex focus-visible:flex focus-visible:ring-2"
          title="Inspect raw JSON"
          aria-label="Inspect raw JSON"
        >
          {"{}"}
        </button>
      )}
    </div>
  );
}
