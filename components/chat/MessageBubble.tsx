import type { UserMessageItem, AgentMessageItem } from "@/lib/features/chats/chatsSlice";
import { RotateCcwIcon } from "lucide-react";
import { PartRenderer } from "./PartRenderer";

interface UserBubbleProps {
  item: UserMessageItem;
  a2uiEnabled?: boolean;
  onInspect?: () => void;
  onRerun?: () => void;
}

export function UserBubble({ item, a2uiEnabled = false, onInspect, onRerun }: UserBubbleProps) {
  return (
    <div className="flex justify-end group">
      <div className="relative flex max-w-[75%] flex-col items-end gap-1.5">
        {item.parts.map((part, i) =>
          part.kind === "text" ? (
            <div
              key={i}
              className="rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
            >
              <PartRenderer part={part} a2uiEnabled={a2uiEnabled} />
            </div>
          ) : (
            <div
              key={i}
              className="max-w-full overflow-hidden rounded-2xl border bg-background px-3 py-2 text-sm text-foreground shadow-sm"
            >
              <PartRenderer part={part} a2uiEnabled={a2uiEnabled} />
            </div>
          ),
        )}
        {onRerun && (
          <button
            onClick={onRerun}
            className="absolute -top-2 -right-2 hidden group-hover:flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground shadow-sm"
            title="Rerun this prompt in a fresh run"
          >
            <RotateCcwIcon className="size-3" />
          </button>
        )}
        {onInspect && (
          <button
            onClick={onInspect}
            className="absolute -top-2 -left-2 hidden group-hover:flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground text-[10px] font-mono shadow-sm"
            title="Inspect raw JSON"
          >
            {"{}"}
          </button>
        )}
      </div>
    </div>
  );
}

interface AgentBubbleProps {
  item: AgentMessageItem;
  a2uiEnabled?: boolean;
  onInspect?: () => void;
}

export function AgentBubble({ item, a2uiEnabled = false, onInspect }: AgentBubbleProps) {
  return (
    <div className="flex justify-start group">
      <div className="relative max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm space-y-1">
        {item.parts.map((part, i) => (
          <PartRenderer key={i} part={part} a2uiEnabled={a2uiEnabled} />
        ))}
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
    </div>
  );
}
