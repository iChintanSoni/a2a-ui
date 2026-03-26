import type { ToolCallItem } from "@/lib/features/chats/chatsSlice";
import { Search, Loader2, CheckCircle, XCircle } from "lucide-react";

interface Props {
  item: ToolCallItem;
}

export function ToolCallBlock({ item }: Props) {
  const { toolName, query, resultCount, phase } = item;

  const icon =
    phase === "running" ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
    ) : phase === "done" ? (
      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
    ) : (
      <XCircle className="h-3.5 w-3.5 text-red-500" />
    );

  return (
    <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground w-fit max-w-sm">
      <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
      <div className="flex flex-col gap-1 min-w-0">
        <span className="font-medium text-foreground/70">{toolName}</span>
        <span className="truncate">
          <span className="text-muted-foreground/60">query: </span>
          {query}
        </span>
        <div className="flex items-center gap-1">
          {icon}
          {phase === "running" && <span>searching…</span>}
          {phase === "done" && (
            <span>
              {resultCount ?? 0} result{resultCount !== 1 ? "s" : ""}
            </span>
          )}
          {phase === "error" && <span className="text-red-500">search failed</span>}
        </div>
      </div>
    </div>
  );
}
