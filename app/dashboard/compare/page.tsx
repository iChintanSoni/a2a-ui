"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PageTitle, Muted, Caption } from "@/components/typography";
import { useAppSelector } from "@/lib/hooks";
import { compareRuns } from "@/lib/features/chats/compareRuns";

function formatDuration(durationMs: number | null) {
  if (durationMs == null) return "n/a";
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(1)} s`;
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value == null) return <Badge variant="outline">Timing unavailable</Badge>;
  if (value === 0) return <Badge variant="outline">Same duration</Badge>;
  const slower = value > 0;
  return (
    <span className="text-[11.5px] font-semibold text-brand-soft-foreground">
      Right run {slower ? "slower" : "faster"} by {formatDuration(Math.abs(value))}
    </span>
  );
}

function DiffRow({
  label,
  left,
  right,
}: {
  label: string;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-lg border bg-card shadow-xs sm:grid-cols-[120px_1fr_1fr] sm:rounded-none sm:border-0 sm:border-b sm:shadow-none sm:last:border-b-0">
      <div className="bg-surface-2 px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-fg-subtle uppercase sm:border-e sm:bg-transparent sm:py-3">
        {label}
      </div>
      <div className="min-w-0 border-b sm:border-e sm:border-b-0">
        <div className="px-4 pt-3 text-[10.5px] font-semibold text-fg-subtle sm:hidden">Run A</div>
        {left}
      </div>
      <div className="min-w-0">
        <div className="px-4 pt-3 text-[10.5px] font-semibold text-fg-subtle sm:hidden">Run B</div>
        {right}
      </div>
    </div>
  );
}

export default function CompareRunsPage() {
  const searchParams = useSearchParams();
  const leftId = searchParams.get("left");
  const rightId = searchParams.get("right");
  const chats = useAppSelector((state) => state.chats.chats);

  const leftChat = chats.find((chat) => chat.id === leftId);
  const rightChat = chats.find((chat) => chat.id === rightId);
  const comparison = useMemo(() => {
    if (!leftChat || !rightChat) return null;
    return compareRuns(leftChat, rightChat);
  }, [leftChat, rightChat]);

  if (!leftChat || !rightChat || !comparison) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <Muted>Select two runs from Conversations to compare them here.</Muted>
        <Link href="/dashboard/conversations" className="text-sm underline">
          Back to conversations
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 md:p-8">
      <div className="hidden sm:block">
        <PageTitle className="text-[26px] font-bold tracking-tight">Compare Runs</PageTitle>
        <Muted className="mt-2 text-sm font-medium">
          Side-by-side prompt, output, artifact, and timing diff across two runs.
        </Muted>
      </div>

      <div className="hidden flex-wrap gap-2 sm:flex">
        <Badge variant={comparison.sameAgent ? "brand" : "destructive"}>
          {comparison.sameAgent ? "Same agent" : "Different agents"}
        </Badge>
        <Badge variant={comparison.samePrompt ? "brand" : "outline"}>
          {comparison.samePrompt ? "Same prompt" : "Prompt changed"}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[comparison.left, comparison.right].map((run, index) => (
          <div key={run.chatId} className="flex items-center gap-3.5 rounded-[9px] border bg-card px-4 py-3.5 shadow-xs">
            <div
              className={`flex size-5.5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                index === 0
                  ? "border border-border-strong bg-surface-2 text-fg-muted"
                  : "bg-brand-soft text-brand-soft-foreground"
              }`}
            >
              {index === 0 ? "A" : "B"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{run.title}</div>
              <div className="mt-0.5 truncate font-mono text-[11px] text-fg-subtle">
                {run.chatId} · {run.agentName}
              </div>
            </div>
            <Link href={`/dashboard/chat/${run.chatId}`} className="shrink-0 text-[12px] font-semibold text-brand-soft-foreground hover:opacity-80">
              Open
            </Link>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:block sm:overflow-hidden sm:rounded-lg sm:border sm:bg-card sm:shadow-xs">
        <div className="hidden grid-cols-[120px_1fr_1fr] border-b bg-surface-2 sm:grid">
          <div className="border-e px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-fg-subtle uppercase">Field</div>
          <div className="border-e px-4 py-2.5 text-[12px] font-semibold">Run A</div>
          <div className="px-4 py-2.5 text-[12px] font-semibold">Run B</div>
        </div>

        <DiffRow
          label="Prompt"
          left={<div className="px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
            {comparison.left.latestPrompt || "No prompt captured."}
          </div>}
          right={<div className="px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
            {comparison.right.latestPrompt || "No prompt captured."}
          </div>}
        />

        <DiffRow
          label="Output"
          left={<div className="px-4 py-3 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words">
            {comparison.left.latestOutput || "No output captured."}
          </div>}
          right={<div className="bg-brand-soft/40 px-4 py-3 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words">
            {comparison.right.latestOutput || "No output captured."}
          </div>}
        />

        <DiffRow
          label="Artifacts"
          left={<div className="px-4 py-3 font-mono text-[12px] text-fg-subtle">
            {comparison.left.artifacts.length} text artifact{comparison.left.artifacts.length === 1 ? "" : "s"}
          </div>}
          right={<div className="px-4 py-3 font-mono text-[12px] text-fg-subtle">
            {comparison.right.artifacts.length} text artifact{comparison.right.artifacts.length === 1 ? "" : "s"}
          </div>}
        />

        <DiffRow
          label="Timing"
          left={<div className="px-4 py-3 font-mono text-[12.5px]">{formatDuration(comparison.left.durationMs)}</div>}
          right={<div className="flex flex-wrap items-center gap-2 px-4 py-3 font-mono text-[12.5px]">
            {formatDuration(comparison.right.durationMs)}
            <DeltaBadge value={comparison.durationDeltaMs} />
          </div>}
        />
      </div>

      <div className="rounded-lg border bg-card p-5 shadow-xs">
        <span className="text-sm font-bold">Artifact diffs</span>
        {comparison.artifactComparisons.length === 0 ? (
          <Muted className="mt-2">No text artifacts available to compare.</Muted>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {comparison.artifactComparisons.map((artifact) => (
              <div key={artifact.key} className="rounded-lg border bg-surface-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Caption className="font-mono text-[12px]">{artifact.label}</Caption>
                  <Badge variant={artifact.diff.changed ? "outline" : "brand"}>
                    {artifact.diff.changed ? "Changed" : "Same"}
                  </Badge>
                  {artifact.diff.changed && (
                    <Badge variant="outline">
                      +{artifact.diff.addedLines} / -{artifact.diff.removedLines}
                    </Badge>
                  )}
                </div>
                <div className="mt-3 grid gap-4 lg:grid-cols-2">
                  <pre className="overflow-x-auto rounded-md border bg-background p-3 text-sm whitespace-pre-wrap break-words">
                    {artifact.left || "No artifact text."}
                  </pre>
                  <pre className="overflow-x-auto rounded-md border bg-background p-3 text-sm whitespace-pre-wrap break-words">
                    {artifact.right || "No artifact text."}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
