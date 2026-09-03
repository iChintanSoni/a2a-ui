import type { Part } from "@a2a-js/sdk";
import "@/lib/utils/buffer-polyfill";

/** The `$case` discriminators of the v1 `Part.content` oneof. */
export type PartCase = "text" | "data" | "url" | "raw";

export const DEFAULT_TEXT_MEDIA_TYPE = "text/plain";
export const DEFAULT_DATA_MEDIA_TYPE = "application/json";
export const DEFAULT_FILE_MEDIA_TYPE = "application/octet-stream";

// v1 `Part` requires every field, so hand-writing literals is noisy and easy to
// get wrong. These constructors are the only place the full shape is spelled out.

export function textPart(text: string, mediaType = DEFAULT_TEXT_MEDIA_TYPE): Part {
  return { content: { $case: "text", value: text }, metadata: undefined, filename: "", mediaType };
}

export function dataPart(data: unknown, mediaType = DEFAULT_DATA_MEDIA_TYPE): Part {
  return { content: { $case: "data", value: data }, metadata: undefined, filename: "", mediaType };
}

export function urlFilePart(url: string, filename = "", mediaType = DEFAULT_FILE_MEDIA_TYPE): Part {
  return { content: { $case: "url", value: url }, metadata: undefined, filename, mediaType };
}

export function rawFilePart(
  bytes: Buffer,
  filename = "",
  mediaType = DEFAULT_FILE_MEDIA_TYPE,
): Part {
  return { content: { $case: "raw", value: bytes }, metadata: undefined, filename, mediaType };
}

export function partCase(part: Part): PartCase | undefined {
  return part.content?.$case;
}

/** `true` for both file representations — `url` (by reference) and `raw` (by bytes). */
export function isFilePart(part: Part): boolean {
  const $case = part.content?.$case;
  return $case === "url" || $case === "raw";
}

export function getPartText(part: Part): string | undefined {
  return part.content?.$case === "text" ? part.content.value : undefined;
}

export function getPartData(part: Part): unknown | undefined {
  return part.content?.$case === "data" ? part.content.value : undefined;
}

/** The `url` of a by-reference file part, or `undefined` for any other part. */
export function getPartUrl(part: Part): string | undefined {
  return part.content?.$case === "url" ? part.content.value : undefined;
}

/** Base64 of a by-value file part, or `undefined` for any other part. */
export function getPartBytesBase64(part: Part): string | undefined {
  if (part.content?.$case !== "raw") return undefined;
  const value = part.content.value;
  return Buffer.isBuffer(value) ? value.toString("base64") : Buffer.from(value).toString("base64");
}

function stringifyDataPart(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return "[unserializable data]";
  }
}

function describeFilePart(part: Part): string {
  const name = part.filename || "file";
  return `[File: ${name} (${part.mediaType || DEFAULT_FILE_MEDIA_TYPE})]`;
}

export function getTextPartsText(parts: Part[]): string {
  return parts
    .map(getPartText)
    .filter((text): text is string => text != null)
    .join("");
}

export function partsToPlainText(parts: Part[]): string {
  return parts
    .map(part => {
      switch (part.content?.$case) {
        case "text":
          return part.content.value;
        case "data":
          return stringifyDataPart(part.content.value);
        case "url":
        case "raw":
          return describeFilePart(part);
        default:
          return "";
      }
    })
    .filter(value => value.trim().length > 0)
    .join("\n\n")
    .trim();
}

export function buildPartsPreview(parts: Part[], maxLength = 140): string {
  const summary = partsToPlainText(parts);
  if (!summary) return "(empty message)";
  if (summary.length <= maxLength) return summary;
  return `${summary.slice(0, maxLength - 1)}…`;
}

export function hasPartCase(parts: Part[], $case: PartCase): boolean {
  return parts.some(part => part.content?.$case === $case);
}
