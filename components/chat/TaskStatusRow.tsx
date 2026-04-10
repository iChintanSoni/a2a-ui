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
import { PartRenderer } from "./PartRenderer";
import { Muted } from "@/components/typography";
import { Button } from "@/components/ui/button";

interface Props {
  item: TaskStatusItem;
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
    className: "text-amber-500",
    spin: true,
  },
  "input-required": {
    icon: AlertCircle,
    label: "Input required",
    className: "text-blue-500",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    className: "text-green-500",
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
    className: "text-amber-500",
  },
  unknown: {
    icon: HelpCircle,
    label: "Unknown",
    className: "text-muted-foreground",
  },
};

export function TaskStatusRow({ item, onInspect, onRetry }: Props) {
  const config = STATE_CONFIG[item.state] ?? STATE_CONFIG.unknown;
  const Icon = config.icon;

  // Render a prominent callout card for input-required state
  if (item.state === "input-required") {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/40 group relative">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-medium mb-1">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>Agent needs your input</span>
        </div>
        {item.statusMessage && item.statusMessage.parts.length > 0 ? (
          <div className="text-sm text-blue-900 dark:text-blue-200">
            {item.statusMessage.parts.map((part, i) => (
              <PartRenderer key={i} part={part} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Please provide additional information to continue.
          </p>
        )}
        {onInspect && (
          <button
            onClick={onInspect}
            className="absolute -top-2 -right-2 hidden group-hover:flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground text-[10px] font-mono shadow-sm"
            title="Inspect raw JSON"
          >
            {"{}"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-1 group relative">
      <div className={`flex items-center gap-1.5 text-xs ${config.className}`}>
        <Icon className={`size-3.5 ${config.spin ? "animate-spin" : ""}`} />
        <span>{config.label}</span>
      </div>
      {item.statusMessage && item.statusMessage.parts.length > 0 && (
        <Muted className="ms-5">
          {item.statusMessage.parts.map((part, i) => (
            <PartRenderer key={i} part={part} />
          ))}
        </Muted>
      )}
      {item.state === "canceled" && onRetry && (
        <div className="ms-5 mt-1">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onRetry}>
            <RotateCcw className="size-3" />
            Retry
          </Button>
        </div>
      )}
      {onInspect && (
        <button
          onClick={onInspect}
          className="absolute -top-2 -right-2 hidden group-hover:flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground text-[10px] font-mono shadow-sm"
          title="Inspect raw JSON"
        >
          {"{}"}
        </button>
      )}
    </div>
  );
}
