import { memo } from "react";
import type { ArtifactItem } from "@/lib/features/chats/chatsSlice";
import { PartRenderer } from "./PartRenderer";
import { Caption, MicroLabel } from "@/components/typography";
import { Button } from "@/components/ui/button";
import {
  getArtifactRevisionLabel,
  getArtifactText,
  getEditableArtifactKind,
  isEditableArtifact,
} from "@/lib/features/chats/artifactRevision";
import { Cpu, PencilIcon, Table2Icon, Code2Icon, WorkflowIcon, FileTextIcon } from "lucide-react";
import { useState } from "react";

interface Props {
  item: ArtifactItem;
  a2uiEnabled?: boolean;
  onInspect?: () => void;
  onSubmitRevision?: (item: ArtifactItem, revisedText: string) => Promise<void> | void;
}

export const ArtifactBlock = memo(function ArtifactBlock({
  item,
  a2uiEnabled = false,
  onInspect,
  onSubmitRevision,
}: Props) {
  const label = item.name ?? "Artifact";
  const hasOnlyText = item.parts.every(p => p.kind === "text");
  const [isEditing, setIsEditing] = useState(false);
  const [revisedText, setRevisedText] = useState(() => getArtifactText(item));
  const [isSaving, setIsSaving] = useState(false);

  // Extract token usage if available
  const usage = item.metadata?.usage as
    { input_tokens?: number; output_tokens?: number; total_tokens?: number } | undefined;
  const canEdit = isEditableArtifact(item) && Boolean(onSubmitRevision);
  const artifactKind = getEditableArtifactKind(item);
  const revisionLabel = getArtifactRevisionLabel(item);
  const editorClassName =
    artifactKind === "code" || artifactKind === "diagram" || artifactKind === "table"
      ? "font-mono text-xs"
      : "text-sm";
  const KindIcon =
    artifactKind === "code"
      ? Code2Icon
      : artifactKind === "table"
        ? Table2Icon
        : artifactKind === "diagram"
          ? WorkflowIcon
          : FileTextIcon;

  return (
    <div className="group bg-card relative my-1 min-w-0 overflow-hidden rounded-[9px] border text-sm shadow-xs">
      <div className="bg-surface-2 flex flex-wrap items-center gap-2.5 border-b px-3.75 py-2.75">
        <MicroLabel className="text-foreground font-mono text-[11px] font-semibold tracking-[0.03em]">
          {label.toUpperCase()}
        </MicroLabel>
        {item.description && (
          <Caption className="text-fg-subtle min-w-0 truncate text-[12px]">
            {item.description}
          </Caption>
        )}
        <div className="ms-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {canEdit && !item.isStreaming && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs"
              onClick={() => {
                setRevisedText(getArtifactText(item));
                setIsEditing(value => !value);
              }}
            >
              <PencilIcon className="size-3" />
              {isEditing ? "Close editor" : revisionLabel}
            </Button>
          )}
          {usage?.total_tokens !== undefined && (
            <Caption
              className="text-muted-foreground flex items-center gap-1"
              title={`Input: ${usage.input_tokens} | Output: ${usage.output_tokens}`}
            >
              <Cpu size={12} className="text-muted-foreground/60" />
              {usage.total_tokens} tokens
            </Caption>
          )}
          {item.isStreaming && (
            <Caption className="flex items-center gap-1">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
              streaming
            </Caption>
          )}
        </div>
      </div>
      <div className={`min-w-0 px-3 py-2 ${hasOnlyText ? "" : "space-y-2"}`}>
        {item.parts.map((part, i) => (
          <PartRenderer key={i} part={part} a2uiEnabled={a2uiEnabled} />
        ))}
        {item.isStreaming && item.parts.length === 0 && (
          <Caption className="animate-pulse">…</Caption>
        )}
      </div>
      {isEditing && canEdit && (
        <div className="bg-muted/20 border-t px-3 py-3">
          <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs">
            <KindIcon className="size-3.5" />
            <span className="capitalize">{artifactKind} artifact</span>
          </div>
          <textarea
            className={`bg-background focus:ring-ring min-h-36 w-full resize-y rounded-md border px-3 py-2 outline-none focus:ring-1 ${editorClassName}`}
            value={revisedText}
            onChange={event => setRevisedText(event.target.value)}
            spellCheck={artifactKind === "text" || artifactKind === "markdown"}
            aria-label={`Edit ${label} content`}
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRevisedText(getArtifactText(item));
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSaving || revisedText === getArtifactText(item)}
              onClick={async () => {
                if (!onSubmitRevision) return;
                setIsSaving(true);
                try {
                  await onSubmitRevision(item, revisedText);
                  setIsEditing(false);
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              {isSaving ? "Sending..." : "Send revision"}
            </Button>
          </div>
        </div>
      )}
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
  );
});
