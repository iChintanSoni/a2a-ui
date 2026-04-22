import type { Chat, ArtifactItem } from "./chatsSlice";
import { getArtifactText, summarizeTextDiff, type TextDiffSummary } from "./artifactRevision";
import { partsToPlainText } from "@/lib/a2a/parts";

export interface ComparableArtifact {
  key: string;
  label: string;
  text: string;
}

export interface RunSnapshot {
  chatId: string;
  title: string;
  agentName: string;
  agentUrl: string;
  latestPrompt: string;
  latestPromptMetadata?: Record<string, string>;
  latestOutput: string;
  artifacts: ComparableArtifact[];
  durationMs: number | null;
}

export interface ArtifactComparison {
  key: string;
  label: string;
  left: string;
  right: string;
  diff: TextDiffSummary;
}

export interface RunComparison {
  left: RunSnapshot;
  right: RunSnapshot;
  sameAgent: boolean;
  samePrompt: boolean;
  outputDiff: TextDiffSummary;
  artifactComparisons: ArtifactComparison[];
  durationDeltaMs: number | null;
}

function getLatestPrompt(chat: Chat) {
  return chat.items.findLast((item) => item.kind === "user-message");
}

function getLatestOutput(chat: Chat): string {
  const agentMessage = chat.items.findLast((item) => item.kind === "agent-message");
  if (agentMessage) {
    return agentMessage.parts
      .filter((part): part is Extract<(typeof agentMessage.parts)[number], { kind: "text" }> => part.kind === "text")
      .map((part) => part.text)
      .join("");
  }

  const artifact = chat.items.findLast((item) => item.kind === "artifact");
  return artifact ? getArtifactText(artifact) : "";
}

function getComparableArtifacts(chat: Chat): ComparableArtifact[] {
  return chat.items
    .filter((item): item is ArtifactItem => item.kind === "artifact")
    .filter((item) => item.parts.every((part) => part.kind === "text"))
    .map((item) => ({
      key: item.name ?? item.id,
      label: item.name ?? item.id,
      text: getArtifactText(item),
    }));
}

function getDurationMs(chat: Chat): number | null {
  const outgoing = chat.executionEvents.find((event) => event.kind === "outgoing-message");
  const terminal = [...chat.executionEvents]
    .reverse()
    .find(
      (event) =>
        event.kind === "task-status" &&
        (event.details?.state === "completed" ||
          event.details?.state === "failed" ||
          event.details?.state === "rejected" ||
          event.details?.state === "canceled"),
    );

  if (!outgoing || !terminal) return null;
  return terminal.timestamp - outgoing.timestamp;
}

function toSnapshot(chat: Chat): RunSnapshot {
  const latestPrompt = getLatestPrompt(chat);
  return {
    chatId: chat.id,
    title: chat.title,
    agentName: chat.agentName,
    agentUrl: chat.agentUrl,
    latestPrompt: latestPrompt ? partsToPlainText(latestPrompt.parts) : "",
    latestPromptMetadata: latestPrompt?.metadata,
    latestOutput: getLatestOutput(chat),
    artifacts: getComparableArtifacts(chat),
    durationMs: getDurationMs(chat),
  };
}

export function compareRuns(leftChat: Chat, rightChat: Chat): RunComparison {
  const left = toSnapshot(leftChat);
  const right = toSnapshot(rightChat);

  const artifactKeys = new Set([
    ...left.artifacts.map((artifact) => artifact.key),
    ...right.artifacts.map((artifact) => artifact.key),
  ]);

  const artifactComparisons = [...artifactKeys].map((key) => {
    const leftArtifact = left.artifacts.find((artifact) => artifact.key === key);
    const rightArtifact = right.artifacts.find((artifact) => artifact.key === key);
    const leftText = leftArtifact?.text ?? "";
    const rightText = rightArtifact?.text ?? "";
    return {
      key,
      label: leftArtifact?.label ?? rightArtifact?.label ?? key,
      left: leftText,
      right: rightText,
      diff: summarizeTextDiff(leftText, rightText),
    };
  });

  return {
    left,
    right,
    sameAgent: left.agentUrl === right.agentUrl,
    samePrompt: left.latestPrompt === right.latestPrompt,
    outputDiff: summarizeTextDiff(left.latestOutput, right.latestOutput),
    artifactComparisons,
    durationDeltaMs:
      left.durationMs != null && right.durationMs != null
        ? right.durationMs - left.durationMs
        : null,
  };
}
