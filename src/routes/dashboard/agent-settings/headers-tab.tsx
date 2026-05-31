import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Muted } from "@/components/typography";
import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import type { CustomHeader } from "@/lib/features/agents/agentsSlice";

interface HeadersTabProps {
  headers: CustomHeader[];
  updateHeader: (i: number, field: "key" | "value", val: string) => void;
  removeHeaderRow: (i: number) => void;
  addHeaderRow: () => void;
  headersSaved: boolean;
  saveHeaders: () => void;
}

export function HeadersTab({
  headers,
  updateHeader,
  removeHeaderRow,
  addHeaderRow,
  headersSaved,
  saveHeaders,
}: HeadersTabProps) {
  return (
    <>
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
              onChange={(e) => updateHeader(i, "key", e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Value"
              value={row.value}
              onChange={(e) => updateHeader(i, "value", e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeHeaderRow(i)}
              aria-label="Remove header"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addHeaderRow}
        >
          <PlusIcon className="size-4" />
          Add Header
        </Button>
        <Button onClick={saveHeaders} size="sm" className="gap-2">
          <SaveIcon className="size-4" />
          {headersSaved ? "Saved!" : "Save Headers"}
        </Button>
      </div>
    </>
  );
}
