import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Clock,
  Ban,
  ShieldAlert,
  HelpCircle,
} from "lucide-react";
import type { TaskStatusItem } from "@/lib/features/chats/chatsSlice";
import { PartRenderer } from "./PartRenderer";
import { Muted } from "@/components/typography";

interface Props {
  item: TaskStatusItem;
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

export function TaskStatusRow({ item }: Props) {
  const config = STATE_CONFIG[item.state] ?? STATE_CONFIG.unknown;
  const Icon = config.icon;

  // Render a prominent callout card for input-required state
  if (item.state === "input-required") {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/40">
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
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-1">
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
    </div>
  );
}
