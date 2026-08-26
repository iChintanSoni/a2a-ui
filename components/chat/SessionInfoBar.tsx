"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CopyIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FileTextIcon,
  ImageIcon,
  MicIcon,
  VideoIcon,
  FileIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Caption, MicroLabel } from "@/components/typography";

interface SessionInfoBarProps {
  contextId: string;
  transportMethod: string | null;
  inputModes: string[];
  outputModes: string[];
}

function ModalityIcon({ mimeType }: { mimeType: string }) {
  const cls = "size-3";
  if (mimeType.startsWith("text/") || mimeType === "text") return <FileTextIcon className={cls} />;
  if (mimeType.startsWith("image/")) return <ImageIcon className={cls} />;
  if (mimeType.startsWith("audio/")) return <MicIcon className={cls} />;
  if (mimeType.startsWith("video/")) return <VideoIcon className={cls} />;
  return <FileIcon className={cls} />;
}

export function SessionInfoBar({
  contextId,
  transportMethod,
  inputModes,
  outputModes,
}: SessionInfoBarProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(contextId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const truncated =
    contextId.length > 20 ? `${contextId.slice(0, 8)}…${contextId.slice(-4)}` : contextId;

  return (
    <div className="bg-surface-2 border-b">
      {/* Summary row — always visible */}
      <div className="text-muted-foreground flex min-w-0 items-center gap-2.5 px-3 py-2 text-xs sm:px-4">
        <MicroLabel className="text-fg-subtle tracking-[0.08em]">Session</MicroLabel>

        {/* Context ID */}
        <button
          onClick={handleCopy}
          title={copied ? "Copied context ID" : "Copy context ID"}
          aria-label={copied ? "Copied context ID" : `Copy context ID ${contextId}`}
          className="text-foreground hover:bg-muted focus-visible:ring-ring flex min-w-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
        >
          <span>{truncated}</span>
          {copied ? (
            <CheckIcon className="text-primary size-3" aria-hidden="true" />
          ) : (
            <CopyIcon className="size-3" aria-hidden="true" />
          )}
        </button>

        {/* Transport badge */}
        {transportMethod && (
          <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px]">
            {transportMethod}
          </Badge>
        )}

        {/* Modalities — collapsed: show count; expanded: see below */}
        {!expanded && (inputModes.length > 0 || outputModes.length > 0) && (
          <Caption className="text-[10px]">
            <span className="hidden sm:inline">
              {inputModes.length + outputModes.length} modalities
            </span>
            <span className="sm:hidden">{inputModes.length + outputModes.length} modes</span>
          </Caption>
        )}

        {/* Expand toggle */}
        {(inputModes.length > 0 || outputModes.length > 0) && (
          <Button
            variant="ghost"
            size="icon"
            className={cn("ml-auto size-5 rounded")}
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? "Collapse session info" : "Expand session info"}
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronUpIcon className="size-3" />
            ) : (
              <ChevronDownIcon className="size-3" />
            )}
          </Button>
        )}
      </div>

      {/* Expanded modalities row */}
      {expanded && (inputModes.length > 0 || outputModes.length > 0) && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 px-3 pb-2 text-xs sm:px-4">
          {inputModes.length > 0 && (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MicroLabel>In</MicroLabel>
              {inputModes.map(m => (
                <Badge
                  key={m}
                  variant="secondary"
                  className="flex h-4 items-center gap-1 px-1.5 py-0 text-[10px]"
                >
                  <ModalityIcon mimeType={m} />
                  {m}
                </Badge>
              ))}
            </div>
          )}
          {outputModes.length > 0 && (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MicroLabel>Out</MicroLabel>
              {outputModes.map(m => (
                <Badge
                  key={m}
                  variant="secondary"
                  className="flex h-4 items-center gap-1 px-1.5 py-0 text-[10px]"
                >
                  <ModalityIcon mimeType={m} />
                  {m}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
