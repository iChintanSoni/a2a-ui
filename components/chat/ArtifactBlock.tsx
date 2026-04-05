import type { ArtifactItem } from "@/lib/features/chats/chatsSlice";
import { PartRenderer } from "./PartRenderer";
import { Caption, MicroLabel } from "@/components/typography";

interface Props {
  item: ArtifactItem;
}

export function ArtifactBlock({ item }: Props) {
  const label = item.name ?? "Artifact";
  const hasOnlyText = item.parts.every((p) => p.kind === "text");

  return (
    <div className="my-1 rounded-lg border bg-card overflow-hidden text-sm">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-1.5">
        <MicroLabel>{label}</MicroLabel>
        {item.description && (
          <Caption className="truncate">{item.description}</Caption>
        )}
        {item.isStreaming && (
          <Caption className="ms-auto flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
            streaming
          </Caption>
        )}
      </div>
      <div className={`px-3 py-2 ${hasOnlyText ? "" : "space-y-2"}`}>
        {item.parts.map((part, i) => (
          <PartRenderer key={i} part={part} />
        ))}
        {item.isStreaming && item.parts.length === 0 && (
          <Caption className="animate-pulse">…</Caption>
        )}
      </div>
    </div>
  );
}
