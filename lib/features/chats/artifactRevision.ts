import type { Part } from "@a2a-js/sdk";
import type { ArtifactItem } from "./chatsSlice";

export interface TextDiffSummary {
  changed: boolean;
  addedLines: number;
  removedLines: number;
}

export type EditableArtifactKind = "text" | "markdown" | "code" | "table" | "diagram";

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

function metadataString(item: ArtifactItem, key: string): string | undefined {
  const value = item.metadata?.[key];
  return typeof value === "string" ? value.toLowerCase() : undefined;
}

function inferFenceLanguage(text: string): string | undefined {
  const match = text.match(/^```([a-z0-9_-]+)?/i);
  return match?.[1]?.toLowerCase();
}

export function getEditableArtifactKind(item: ArtifactItem): EditableArtifactKind {
  const itemName = (item.name ?? "").toLowerCase();
  const name = `${itemName} ${item.description ?? ""}`.toLowerCase();
  const mimeType =
    metadataString(item, "mimeType") ??
    metadataString(item, "contentType") ??
    metadataString(item, "type");
  const text = getArtifactText(item).trim();
  const fenceLanguage = inferFenceLanguage(text);

  if (
    mimeType?.includes("mermaid") ||
    mimeType?.includes("graphviz") ||
    fenceLanguage === "mermaid" ||
    fenceLanguage === "dot" ||
    name.includes("diagram")
  ) {
    return "diagram";
  }

  if (
    mimeType?.includes("csv") ||
    mimeType?.includes("spreadsheet") ||
    name.includes("table") ||
    itemName.endsWith(".csv")
  ) {
    return "table";
  }

  if (
    mimeType?.includes("markdown") ||
    itemName.endsWith(".md") ||
    fenceLanguage === "markdown" ||
    fenceLanguage === "md"
  ) {
    return "markdown";
  }

  if (
    mimeType?.includes("json") ||
    mimeType?.includes("javascript") ||
    mimeType?.includes("typescript") ||
    mimeType?.includes("python") ||
    itemName.match(/\.(js|jsx|ts|tsx|py|go|rs|java|rb|php|css|html|json|yaml|yml|sh)$/) ||
    Boolean(fenceLanguage)
  ) {
    return "code";
  }

  return "text";
}

export function getArtifactRevisionLabel(item: ArtifactItem): string {
  const kind = getEditableArtifactKind(item);
  if (kind === "markdown") return "Revise markdown";
  if (kind === "code") return "Revise code";
  if (kind === "table") return "Revise table";
  if (kind === "diagram") return "Revise diagram";
  return "Revise";
}

function fenceLanguageForKind(kind: EditableArtifactKind): string {
  if (kind === "diagram") return "mermaid";
  if (kind === "table") return "csv";
  if (kind === "markdown") return "markdown";
  if (kind === "code") return "text";
  return "text";
}

export function buildArtifactRevisionMessage(item: ArtifactItem, revisedText: string) {
  const originalText = getArtifactText(item);
  const diff = summarizeTextDiff(originalText, revisedText);
  const kind = getEditableArtifactKind(item);
  const text = [
    `Use this revised ${kind} artifact as the latest working version for task ${item.taskId}.`,
    `Artifact: ${item.name ?? item.id}`,
    `Diff summary: ${diff.addedLines} added line${diff.addedLines === 1 ? "" : "s"}, ${diff.removedLines} removed line${diff.removedLines === 1 ? "" : "s"}.`,
    "",
    `\`\`\`${fenceLanguageForKind(kind)}`,
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
      artifactKind: kind,
    },
    diff,
  };
}
