import { PlusIcon, XIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { DataPartDraft } from "./ChatInput";

interface Props {
  parts: DataPartDraft[];
  errors: Record<string, string>;
  disabled?: boolean;
  onAdd: () => void;
  onUpdate: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  onFormat: (id: string) => void;
}

export function DataPartEditor({ parts, errors, disabled, onAdd, onUpdate, onRemove, onFormat }: Props) {
  if (parts.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Data parts</p>
        <button
          onClick={onAdd}
          disabled={disabled}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <PlusIcon className="size-3" />
          Add another
        </button>
      </div>

      {parts.map((part, index) => (
        <div key={part.id} className="rounded-lg border bg-background/90 p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium">Data part {index + 1}</p>
            <button
              onClick={() => onRemove(part.id)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove data part ${index + 1}`}
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
          <Textarea
            rows={6}
            value={part.value}
            onChange={(e) => onUpdate(part.id, e.target.value)}
            onBlur={() => onFormat(part.id)}
            spellCheck={false}
            className="min-h-28 resize-y border-0 bg-transparent px-0 py-0 font-mono text-xs shadow-none focus-visible:ring-0"
            placeholder={'{\n  "type": "search",\n  "query": "hello"\n}'}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Sent as an A2A `DataPart`. Use a JSON object payload.
            </p>
            <button
              onClick={() => onFormat(part.id)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
              disabled={!part.value.trim()}
            >
              Format JSON
            </button>
          </div>
          {errors[part.id] && (
            <p className="mt-2 text-[11px] text-destructive">{errors[part.id]}</p>
          )}
        </div>
      ))}
    </div>
  );
}
