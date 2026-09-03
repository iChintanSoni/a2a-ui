import { memo } from "react";
import type { UserMessageItem, AgentMessageItem } from "@/lib/features/chats/chatsSlice";
import { RotateCcwIcon } from "lucide-react";
import { PartRenderer } from "./PartRenderer";

interface UserBubbleProps {
  item: UserMessageItem;
  a2uiEnabled?: boolean;
  onInspect?: () => void;
  onRerun?: () => void;
}

export const UserBubble = memo(function UserBubble({
  item,
  a2uiEnabled = false,
  onInspect,
  onRerun,
}: UserBubbleProps) {
  return (
    <div className="group flex justify-end">
      <div className="relative flex max-w-[92%] flex-col items-end gap-1.5 sm:max-w-[75%]">
        {item.parts.map((part, i) =>
          part.content?.$case === "text" ? (
            <div
              key={i}
              className="bg-foreground text-background rounded-[13px] rounded-br-[4px] px-4 py-2.5 text-[13.5px] leading-relaxed font-medium"
            >
              <PartRenderer part={part} a2uiEnabled={a2uiEnabled} />
            </div>
          ) : (
            <div
              key={i}
              className="bg-background text-foreground max-w-full overflow-hidden rounded-[13px] rounded-br-[4px] border px-3 py-2 text-sm shadow-xs"
            >
              <PartRenderer part={part} a2uiEnabled={a2uiEnabled} />
            </div>
          ),
        )}
        {onRerun && (
          <button
            onClick={onRerun}
            className="bg-background text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute -top-2 -right-2 hidden size-5 items-center justify-center rounded-full border shadow-sm transition-colors group-focus-within:flex group-hover:flex focus-visible:flex focus-visible:ring-2"
            title="Rerun this prompt in a fresh run"
            aria-label="Rerun this prompt"
          >
            <RotateCcwIcon className="size-3" />
          </button>
        )}
        {onInspect && (
          <button
            onClick={onInspect}
            className="bg-background text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute -top-2 -left-2 hidden size-5 items-center justify-center rounded-full border font-mono text-[10px] shadow-sm transition-colors group-focus-within:flex group-hover:flex focus-visible:flex focus-visible:ring-2"
            title="Inspect raw JSON"
            aria-label="Inspect raw JSON"
          >
            {"{}"}
          </button>
        )}
      </div>
    </div>
  );
});

interface AgentBubbleProps {
  item: AgentMessageItem;
  a2uiEnabled?: boolean;
  onInspect?: () => void;
}

export const AgentBubble = memo(function AgentBubble({
  item,
  a2uiEnabled = false,
  onInspect,
}: AgentBubbleProps) {
  return (
    <div className="group flex justify-start">
      <div className="bg-surface-2 relative max-w-[92%] rounded-[13px] rounded-bl-[4px] border px-4 py-2.5 text-sm sm:max-w-[75%]">
        {item.parts.map((part, i) => (
          <PartRenderer key={i} part={part} a2uiEnabled={a2uiEnabled} />
        ))}
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
    </div>
  );
});
