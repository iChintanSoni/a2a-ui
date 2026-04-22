import type { Part } from "@a2a-js/sdk";
import type { ArtifactItem } from "./chatsSlice";

export interface TextDiffSummary {
  changed: boolean;
  addedLines: number;
  removedLines: number;
}

export function isEditableArtifact(item: ArtifactItem): boolean {
  return item.parts.length > 0 && item.parts.every((part) => part.kind === "text");
}

export function getArtifactText(item: ArtifactItem): string {
  return item.parts
    .filter((part): part is Extract<(typeof item.parts)[number], { kind: "text" }> => part.kind === "text")
    .map((part) => part.text)
    .join("");
}

export function summarizeTextDiff(original: string, revised: string): TextDiffSummary {
  const originalLines = original.split("\n");
  const revisedLines = revised.split("\n");
  const originalSet = new Set(originalLines);
  const revisedSet = new Set(revisedLines);

  return {
    changed: original !== revised,
    addedLines: revisedLines.filter((line) => !originalSet.has(line)).length,
    removedLines: originalLines.filter((line) => !revisedSet.has(line)).length,
  };
}

export function buildArtifactRevisionMessage(item: ArtifactItem, revisedText: string) {
  const originalText = getArtifactText(item);
  const diff = summarizeTextDiff(originalText, revisedText);
  const text = [
    `Use this revised artifact as the latest working version for task ${item.taskId}.`,
    `Artifact: ${item.name ?? item.id}`,
    `Diff summary: ${diff.addedLines} added line${diff.addedLines === 1 ? "" : "s"}, ${diff.removedLines} removed line${diff.removedLines === 1 ? "" : "s"}.`,
    "",
    "```text",
    revisedText,
    "```",
  ].join("\n");

  return {
    parts: [{ kind: "text", text }] satisfies Part[],
    metadata: {
      artifactId: item.id,
      artifactName: item.name ?? item.id,
      artifactTaskId: item.taskId,
      artifactRevision: "true",
    },
    diff,
  };
}
