import { type Part } from "@a2a-js/sdk";
import { DEFAULT_FILE_MEDIA_TYPE, filePartUrl, isFilePart } from "#src/parts.ts";

// LangChain multimodal content block types
export type TextBlock = { type: "text"; text: string };
export type ImageBlock = { type: "image_url"; image_url: { url: string } };
export type ContentBlock = TextBlock | ImageBlock;

/**
 * Convert A2A message parts into a LangChain content value.
 * - text part → plain string (or TextBlock in a multi-part message)
 * - data part → JSON text block so structured payloads reach the model
 * - file part with image/* media type → ImageBlock (data URL or URL)
 * - any other file part → text placeholder so the model knows a file was attached
 * Returns a plain string when there is only a single text part (widest model compatibility),
 * otherwise returns a ContentBlock array for multimodal input.
 */
export function buildMessageContent(parts: Part[]): string | ContentBlock[] {
  const blocks: ContentBlock[] = [];

  for (const part of parts) {
    if (part.content?.$case === "text") {
      if (part.content.value) blocks.push({ type: "text", text: part.content.value });
    } else if (part.content?.$case === "data") {
      blocks.push({
        type: "text",
        text: `Structured data:\n${JSON.stringify(part.content.value, null, 2)}`,
      });
    } else if (isFilePart(part)) {
      const mimeType = part.mediaType || DEFAULT_FILE_MEDIA_TYPE;

      if (mimeType.startsWith("image/")) {
        blocks.push({ type: "image_url", image_url: { url: filePartUrl(part) } });
      } else {
        const name = part.filename || "file";
        blocks.push({
          type: "text",
          text: `[Attached file: ${name} (${mimeType}) — content not shown]`,
        });
      }
    }
  }

  if (blocks.length === 0) return "(empty message)";
  if (blocks.length === 1 && blocks[0].type === "text") return blocks[0].text;
  return blocks;
}

export function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map(block => {
      if (typeof block === "string") return block;
      if (
        block &&
        typeof block === "object" &&
        "type" in block &&
        block.type === "text" &&
        "text" in block &&
        typeof block.text === "string"
      ) {
        return block.text;
      }
      return "";
    })
    .join("");
}

export function shouldReturnA2UIDemo(content: string | ContentBlock[]): boolean {
  return contentToText(content).toLowerCase().includes("a2ui");
}
