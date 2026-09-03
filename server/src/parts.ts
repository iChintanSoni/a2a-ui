import { type Part } from "@a2a-js/sdk";

// v1.0 `Part` requires every field, so these constructors keep the full shape in
// one place instead of spelling it out at each call site.

export const DEFAULT_FILE_MEDIA_TYPE = "application/octet-stream";

export function textPart(text: string, mediaType = "text/plain"): Part {
  return { content: { $case: "text", value: text }, metadata: undefined, filename: "", mediaType };
}

export function dataPart(data: unknown, mediaType = "application/json"): Part {
  return { content: { $case: "data", value: data }, metadata: undefined, filename: "", mediaType };
}

export function rawFilePart(
  bytes: Buffer,
  filename = "",
  mediaType = DEFAULT_FILE_MEDIA_TYPE,
): Part {
  return { content: { $case: "raw", value: bytes }, metadata: undefined, filename, mediaType };
}

export function isFilePart(part: Part): boolean {
  return part.content?.$case === "url" || part.content?.$case === "raw";
}

/** A `data:` or absolute URL for a file part, whichever representation it uses. */
export function filePartUrl(part: Part): string {
  if (part.content?.$case === "url") return part.content.value;
  if (part.content?.$case !== "raw") return "";
  const mediaType = part.mediaType || DEFAULT_FILE_MEDIA_TYPE;
  const value = part.content.value;
  const base64 = Buffer.isBuffer(value)
    ? value.toString("base64")
    : Buffer.from(value).toString("base64");
  return `data:${mediaType};base64,${base64}`;
}
