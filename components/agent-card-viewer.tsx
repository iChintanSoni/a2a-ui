"use client";

import { useState, useEffect } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import type { AgentCard } from "@a2a-js/sdk";

interface AgentCardViewerProps {
  card: AgentCard;
}

export function AgentCardViewer({ card }: AgentCardViewerProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string>("");

  const json = JSON.stringify(card, null, 2);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    import("highlight.js/lib/core").then(async ({ default: hljs }) => {
      const jsonLang = await import("highlight.js/lib/languages/json");
      if (!hljs.getLanguage("json")) {
        hljs.registerLanguage("json", jsonLang.default);
      }
      if (!cancelled) {
        setHighlighted(hljs.highlight(json, { language: "json" }).value);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, json]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-0 text-xs">
          {open ? (
            <ChevronDownIcon className="size-3.5" />
          ) : (
            <ChevronRightIcon className="size-3.5" />
          )}
          {open ? "Hide" : "Show"} raw agent card JSON
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="hljs mt-2 max-h-96 overflow-auto rounded-md p-4 text-xs font-mono leading-relaxed">
          {highlighted ? (
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          ) : (
            <code>{json}</code>
          )}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}
