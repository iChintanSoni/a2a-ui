import { useEffect, useRef } from "react";
import type { Chat } from "@/lib/features/chats/chatsSlice";
import { UserBubble, AgentBubble } from "./MessageBubble";
import { TaskStatusRow } from "./TaskStatusRow";
import { ArtifactBlock } from "./ArtifactBlock";
import { ToolCallBlock } from "./ToolCallBlock";

interface Props {
  chat: Chat;
}

export function ChatMessages({ chat }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.items.length, chat.items]);

  if (chat.items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        Send a message to start chatting with <span className="font-medium ms-1">{chat.agentName}</span>.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
      {chat.items.map((item) => {
        if (item.kind === "user-message") {
          return <UserBubble key={item.id} item={item} />;
        }
        if (item.kind === "agent-message") {
          return <AgentBubble key={item.id} item={item} />;
        }
        if (item.kind === "task-status") {
          return <TaskStatusRow key={`${item.taskId}-${item.state}`} item={item} />;
        }
        if (item.kind === "artifact") {
          return <ArtifactBlock key={`${item.taskId}-${item.id}`} item={item} />;
        }
        if (item.kind === "tool-call") {
          return <ToolCallBlock key={item.id} item={item} />;
        }
        return null;
      })}
      <div ref={bottomRef} />
    </div>
  );
}
