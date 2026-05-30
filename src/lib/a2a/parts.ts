import type { Part } from "@a2a-js/sdk";

function stringifyDataPart(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return "[unserializable data]";
  }
}

function describeFilePart(part: Extract<Part, { kind: "file" }>): string {
  const name = part.file.name ?? "file";
  const mimeType = part.file.mimeType ?? "application/octet-stream";
  return `[File: ${name} (${mimeType})]`;
}

export function getTextPartsText(parts: Part[]): string {
  return parts
    .filter((part): part is Extract<Part, { kind: "text" }> => part.kind === "text")
    .map((part) => part.text)
    .join("");
}

export function partsToPlainText(parts: Part[]): string {
  return parts
    .map((part) => {
      if (part.kind === "text") return part.text;
      if (part.kind === "data") return stringifyDataPart(part.data);
      return describeFilePart(part);
    })
    .filter((value) => value.trim().length > 0)
    .join("\n\n")
    .trim();
}

export function buildPartsPreview(parts: Part[], maxLength = 140): string {
  const summary = partsToPlainText(parts);
  if (!summary) return "(empty message)";
  if (summary.length <= maxLength) return summary;
  return `${summary.slice(0, maxLength - 1)}…`;
}

export function hasPartKind(parts: Part[], kind: Part["kind"]): boolean {
  return parts.some((part) => part.kind === kind);
}
