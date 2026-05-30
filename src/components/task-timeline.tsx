import type { TaskTimelineStage } from "@/lib/a2a/execution-events";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskTimelineProps {
  stages: TaskTimelineStage[];
  className?: string;
  compact?: boolean;
}

function stageVariant(stage: TaskTimelineStage): "default" | "secondary" | "outline" | "destructive" {
  if (stage.level === "error") return "destructive";
  if (stage.level === "warning") return "outline";
  return "secondary";
}

export function TaskTimeline({ stages, className, compact = false }: TaskTimelineProps) {
  if (stages.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} aria-label="Task timeline">
      {stages.map((stage) => (
        <Badge
          key={stage.key}
          variant={stageVariant(stage)}
          className={compact ? "px-2 py-0 text-[10px]" : undefined}
          title={new Date(stage.timestamp).toLocaleString()}
        >
          {stage.label}
        </Badge>
      ))}
    </div>
  );
}
