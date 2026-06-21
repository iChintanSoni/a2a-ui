import { BookmarkPlusIcon, PlusIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { MetadataRow } from "./ChatInput";

interface Props {
  rows: MetadataRow[];
  hasDefaultMetadata: boolean;
  hasMetadataDraft: boolean;
  currentMetadata: Record<string, string>;
  onUpdateRow: (index: number, field: "key" | "value", val: string) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onApplyDefaults: () => void;
  onSaveDefaults?: (metadata: Record<string, string>) => void;
}

export function MetadataEditor({
  rows,
  hasDefaultMetadata,
  hasMetadataDraft,
  currentMetadata,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
  onApplyDefaults,
  onSaveDefaults,
}: Props) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2 flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">Message metadata</p>
      {rows.map((row, i) => (
        <div key={i} className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <Input
            className="h-7 text-xs flex-1"
            placeholder="key"
            value={row.key}
            onChange={(e) => onUpdateRow(i, "key", e.target.value)}
          />
          <Input
            className="h-7 text-xs flex-1"
            placeholder="value"
            value={row.value}
            onChange={(e) => onUpdateRow(i, "value", e.target.value)}
          />
          <button
            onClick={() => onRemoveRow(i)}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Remove row"
            disabled={rows.length === 1}
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={onAddRow}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-fit"
      >
        <PlusIcon className="size-3" />
        Add row
      </button>
      <div className="flex flex-wrap items-center gap-2">
        {hasDefaultMetadata && (
          <button
            onClick={onApplyDefaults}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcwIcon className="size-3" />
            Apply agent defaults
          </button>
        )}
        {hasMetadataDraft && onSaveDefaults && (
          <button
            onClick={() => onSaveDefaults(currentMetadata)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <BookmarkPlusIcon className="size-3" />
            Save as agent defaults
          </button>
        )}
      </div>
    </div>
  );
}
