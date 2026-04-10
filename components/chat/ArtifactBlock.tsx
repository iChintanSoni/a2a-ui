import type { ArtifactItem } from "@/lib/features/chats/chatsSlice";
import { PartRenderer } from "./PartRenderer";
import { Caption, MicroLabel } from "@/components/typography";

import { Cpu } from "lucide-react";

interface Props {
  item: ArtifactItem;
  onInspect?: () => void;
}

export function ArtifactBlock({ item, onInspect }: Props) {
  const label = item.name ?? "Artifact";
  const hasOnlyText = item.parts.every((p) => p.kind === "text");
  
  // Extract token usage if available
  const usage = item.metadata?.usage as
    | { input_tokens?: number; output_tokens?: number; total_tokens?: number }
    | undefined;

  return (
    <div className="my-1 rounded-lg border bg-card overflow-hidden text-sm group relative">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-1.5">
        <MicroLabel>{label}</MicroLabel>
        {item.description && (
          <Caption className="truncate">{item.description}</Caption>
        )}
        <div className="ms-auto flex items-center gap-3">
          {usage?.total_tokens !== undefined && (
            <Caption className="flex items-center gap-1 text-muted-foreground" title={`Input: ${usage.input_tokens} | Output: ${usage.output_tokens}`}>
              <Cpu size={12} className="text-muted-foreground/60" />
              {usage.total_tokens} tokens
            </Caption>
          )}
          {item.isStreaming && (
            <Caption className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
              streaming
            </Caption>
          )}
        </div>
      </div>
      <div className={`px-3 py-2 ${hasOnlyText ? "" : "space-y-2"}`}>
        {item.parts.map((part, i) => (
          <PartRenderer key={i} part={part} />
        ))}
        {item.isStreaming && item.parts.length === 0 && (
          <Caption className="animate-pulse">…</Caption>
        )}
      </div>
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
  );
}
