"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, FileTextIcon, ImageIcon, MicIcon, VideoIcon, FileIcon } from "lucide-react";
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

  const truncated = contextId.length > 20 ? `${contextId.slice(0, 8)}…${contextId.slice(-4)}` : contextId;

  return (
    <div className="border-b bg-muted/30">
      {/* Summary row — always visible */}
      <div className="flex min-w-0 items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground sm:px-4">
        <MicroLabel>Session</MicroLabel>

        {/* Context ID */}
        <button
          onClick={handleCopy}
          title="Copy context ID"
          className="flex min-w-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono transition-colors hover:bg-muted"
        >
          <span>{truncated}</span>
          {copied ? (
            <CheckIcon className="size-3 text-green-500" />
          ) : (
            <CopyIcon className="size-3" />
          )}
        </button>

        {/* Transport badge */}
        {transportMethod && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            {transportMethod}
          </Badge>
        )}

        {/* Modalities — collapsed: show count; expanded: see below */}
        {!expanded && (inputModes.length > 0 || outputModes.length > 0) && (
          <Caption className="text-[10px]">
            <span className="hidden sm:inline">{inputModes.length + outputModes.length} modalities</span>
            <span className="sm:hidden">{inputModes.length + outputModes.length} modes</span>
          </Caption>
        )}

        {/* Expand toggle */}
        {(inputModes.length > 0 || outputModes.length > 0) && (
          <Button
            variant="ghost"
            size="icon"
            className={cn("ml-auto size-5 rounded")}
            onClick={() => setExpanded((v) => !v)}
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 pb-2 text-xs text-muted-foreground sm:px-4">
          {inputModes.length > 0 && (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MicroLabel>In</MicroLabel>
              {inputModes.map((m) => (
                <Badge key={m} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex items-center gap-1">
                  <ModalityIcon mimeType={m} />
                  {m}
                </Badge>
              ))}
            </div>
          )}
          {outputModes.length > 0 && (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MicroLabel>Out</MicroLabel>
              {outputModes.map((m) => (
                <Badge key={m} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex items-center gap-1">
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
