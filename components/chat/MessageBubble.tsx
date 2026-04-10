import type { UserMessageItem, AgentMessageItem } from "@/lib/features/chats/chatsSlice";
import { PartRenderer } from "./PartRenderer";

interface UserBubbleProps {
  item: UserMessageItem;
  onInspect?: () => void;
}

export function UserBubble({ item, onInspect }: UserBubbleProps) {
  return (
    <div className="flex justify-end group">
      <div className="relative flex max-w-[75%] flex-col items-end gap-1.5">
        {/* Attachment previews above the text bubble */}
        {item.attachments && item.attachments.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {item.attachments.map((part, i) => (
              <div key={i} className="rounded-xl border bg-muted/50 overflow-hidden">
                <PartRenderer part={part} />
              </div>
            ))}
          </div>
        )}
        <div className="rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          <span className="whitespace-pre-wrap">{item.text}</span>
        </div>
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
  onInspect?: () => void;
}

export function AgentBubble({ item, onInspect }: AgentBubbleProps) {
  return (
    <div className="flex justify-start group">
      <div className="relative max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm space-y-1">
        {item.parts.map((part, i) => (
          <PartRenderer key={i} part={part} />
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
