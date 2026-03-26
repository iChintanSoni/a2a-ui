import type { UserMessageItem, AgentMessageItem } from "@/lib/features/chats/chatsSlice";
import { PartRenderer } from "./PartRenderer";

export function UserBubble({ item }: { item: UserMessageItem }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        <span className="whitespace-pre-wrap">{item.text}</span>
      </div>
    </div>
  );
}

export function AgentBubble({ item }: { item: AgentMessageItem }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm space-y-1">
        {item.parts.map((part, i) => (
          <PartRenderer key={i} part={part} />
        ))}
      </div>
    </div>
  );
}
