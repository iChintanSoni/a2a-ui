import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import type { CustomHeader } from "@/lib/features/agents/agentsSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Muted } from "@/components/typography";

interface Props {
  headers: CustomHeader[];
  saved: boolean;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, field: "key" | "value", val: string) => void;
  onSave: () => void;
}

export function HeadersTab({ headers, saved, onAdd, onRemove, onUpdate, onSave }: Props) {
  return (
    <div className="mt-6 space-y-4">
      <Muted>Additional headers sent with every request to this agent.</Muted>

      <div className="flex flex-col gap-2">
        {headers.length === 0 && (
          <Muted className="py-2">No custom headers configured.</Muted>
        )}
        {headers.map((row, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
            <Input
              placeholder="Header name"
              value={row.key}
              onChange={(e) => onUpdate(i, "key", e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Value"
              value={row.value}
              onChange={(e) => onUpdate(i, "value", e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(i)}
              aria-label="Remove header"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <PlusIcon className="size-4" />
          Add Header
        </Button>
        <Button onClick={onSave} size="sm" className="gap-2">
          <SaveIcon className="size-4" />
          {saved ? "Saved!" : "Save Headers"}
        </Button>
      </div>
    </div>
  );
}
