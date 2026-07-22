import type { TaskTimelineStage } from "@/lib/a2a/execution-events";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskTimelineProps {
  stages: TaskTimelineStage[];
  className?: string;
  compact?: boolean;
}

function stageVariant(
  stage: TaskTimelineStage,
  isLast: boolean,
): "brand" | "outline" | "warning" | "destructive" {
  if (stage.level === "error") return "destructive";
  if (stage.level === "warning") return "warning";
  return isLast ? "brand" : "outline";
}

export function TaskTimeline({ stages, className, compact = false }: TaskTimelineProps) {
  if (stages.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.75", className)} aria-label="Task timeline">
      {stages.map((stage, index) => (
        <Badge
          key={stage.key}
          variant={stageVariant(stage, index === stages.length - 1)}
          className={compact ? "px-2 py-0 text-[10px]" : "px-2.5 py-1 text-[11px] font-semibold"}
          title={new Date(stage.timestamp).toLocaleString()}
        >
          {stage.label}
        </Badge>
      ))}
    </div>
  );
}
