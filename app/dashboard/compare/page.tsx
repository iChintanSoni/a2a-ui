"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PageTitle, Muted, Caption, Small } from "@/components/typography";
import { useAppSelector } from "@/lib/hooks";
import { compareRuns } from "@/lib/features/chats/compareRuns";

function formatDuration(durationMs: number | null) {
  if (durationMs == null) return "n/a";
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(1)} s`;
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value == null) return <Badge variant="outline">Timing unavailable</Badge>;
  if (value === 0) return <Badge variant="secondary">Same duration</Badge>;
  const slower = value > 0;
  return (
    <Badge variant={slower ? "outline" : "default"}>
      Right run {slower ? "slower" : "faster"} by {formatDuration(Math.abs(value))}
    </Badge>
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
      <div>
        <PageTitle>Compare Runs</PageTitle>
        <Muted>
          Compare prompts, outputs, artifacts, and timing across two saved runs.
        </Muted>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={comparison.sameAgent ? "default" : "destructive"}>
          {comparison.sameAgent ? "Same agent" : "Different agents"}
        </Badge>
        <Badge variant={comparison.samePrompt ? "default" : "outline"}>
          {comparison.samePrompt ? "Same prompt" : "Prompt changed"}
        </Badge>
        <DeltaBadge value={comparison.durationDeltaMs} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[comparison.left, comparison.right].map((run, index) => (
          <div key={run.chatId} className="rounded-md border p-4">
            <Caption>{index === 0 ? "Left run" : "Right run"}</Caption>
            <Small className="mt-1 block truncate">{run.title}</Small>
            <Muted className="mt-1 truncate">{run.agentName}</Muted>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{run.artifacts.length} text artifacts</Badge>
              <Badge variant="outline">Duration {formatDuration(run.durationMs)}</Badge>
            </div>
            <Link href={`/dashboard/chat/${run.chatId}`} className="mt-3 inline-block text-sm underline">
              Open run
            </Link>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border p-4">
          <Caption>Left prompt</Caption>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-sm">{comparison.left.latestPrompt || "No prompt captured."}</pre>
        </div>
        <div className="rounded-md border p-4">
          <Caption>Right prompt</Caption>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-sm">{comparison.right.latestPrompt || "No prompt captured."}</pre>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border p-4">
          <Caption>Left output</Caption>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-sm">{comparison.left.latestOutput || "No output captured."}</pre>
        </div>
        <div className="rounded-md border p-4">
          <Caption>Right output</Caption>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-sm">{comparison.right.latestOutput || "No output captured."}</pre>
        </div>
      </div>

      <div className="rounded-md border p-4">
        <Small>Artifact diffs</Small>
        {comparison.artifactComparisons.length === 0 ? (
          <Muted className="mt-2">No text artifacts available to compare.</Muted>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {comparison.artifactComparisons.map((artifact) => (
              <div key={artifact.key} className="rounded-md border bg-muted/10 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Caption>{artifact.label}</Caption>
                  <Badge variant={artifact.diff.changed ? "outline" : "default"}>
                    {artifact.diff.changed ? "Changed" : "Same"}
                  </Badge>
                  {artifact.diff.changed && (
                    <Badge variant="secondary">
                      +{artifact.diff.addedLines} / -{artifact.diff.removedLines}
                    </Badge>
                  )}
                </div>
                <div className="mt-3 grid gap-4 lg:grid-cols-2">
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border bg-background p-3 text-sm">
                    {artifact.left || "No artifact text."}
                  </pre>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border bg-background p-3 text-sm">
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
