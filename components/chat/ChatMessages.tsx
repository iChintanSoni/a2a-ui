import { useEffect, useRef, useState } from "react";
import type { ArtifactItem, Chat, UserMessageItem } from "@/lib/features/chats/chatsSlice";
import { UserBubble, AgentBubble } from "./MessageBubble";
import { TaskStatusRow } from "./TaskStatusRow";
import { ArtifactBlock } from "./ArtifactBlock";
import { ToolCallBlock } from "./ToolCallBlock";
import { JsonInspectModal } from "./JsonInspectModal";
import { getTaskTimelineStages } from "@/lib/a2a/execution-events";

interface Props {
  chat: Chat;
  onRetry?: (text: string) => void;
  onRerunMessage?: (item: UserMessageItem) => void;
  onSubmitArtifactRevision?: (item: ArtifactItem, revisedText: string) => Promise<void> | void;
}

export function ChatMessages({ chat, onRetry, onRerunMessage, onSubmitArtifactRevision }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [inspectData, setInspectData] = useState<unknown>(null);

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
      {chat.items.map((item, index) => {
        if (item.kind === "user-message") {
          return (
            <UserBubble
              key={item.id}
              item={item}
              onInspect={() => setInspectData(item)}
              onRerun={
                onRerunMessage && item.attachments?.length
                  ? undefined
                  : onRerunMessage
                    ? () => onRerunMessage(item)
                    : undefined
              }
            />
          );
        }
        if (item.kind === "agent-message") {
          return <AgentBubble key={item.id} item={item} onInspect={() => setInspectData(item)} />;
        }
        if (item.kind === "task-status") {
          return (
            <TaskStatusRow
              key={`${item.taskId}-${item.state}`}
              item={item}
              timelineStages={getTaskTimelineStages(chat.executionEvents, item.taskId)}
              onInspect={() => setInspectData(item)}
              onRetry={
                onRetry
                  ? () => {
                      for (let i = index - 1; i >= 0; i--) {
                        const prev = chat.items[i];
                        if (prev.kind === "user-message") {
                          onRetry(prev.text);
                          break;
                        }
                      }
                    }
                  : undefined
              }
            />
          );
        }
        if (item.kind === "artifact") {
          return (
            <ArtifactBlock
              key={`${item.taskId}-${item.id}`}
              item={item}
              onInspect={() => setInspectData(item)}
              onSubmitRevision={onSubmitArtifactRevision}
            />
          );
        }
        if (item.kind === "tool-call") {
          return <ToolCallBlock key={item.id} item={item} onInspect={() => setInspectData(item)} />;
        }
        return null;
      })}
      <div ref={bottomRef} />
      <JsonInspectModal
        data={inspectData}
        open={inspectData !== null}
        onClose={() => setInspectData(null)}
      />
    </div>
  );
}
