import { type Part } from "@a2a-js/sdk";

// LangChain multimodal content block types
export type TextBlock = { type: "text"; text: string };
export type ImageBlock = { type: "image_url"; image_url: { url: string } };
export type ContentBlock = TextBlock | ImageBlock;

/**
 * Convert A2A message parts into a LangChain content value.
 * - TextPart → plain string (or TextBlock in a multi-part message)
 * - DataPart → JSON text block so structured payloads reach the model
 * - FilePart with image/* MIME → ImageBlock (data URL or URI)
 * - Other FilePart → text placeholder so the model knows a file was attached
 * Returns a plain string when there is only a single text part (widest model compatibility),
 * otherwise returns a ContentBlock array for multimodal input.
 */
export function buildMessageContent(parts: Part[]): string | ContentBlock[] {
  const blocks: ContentBlock[] = [];

  for (const part of parts) {
    if (part.kind === "text") {
      if (part.text) blocks.push({ type: "text", text: part.text });
    } else if (part.kind === "data") {
      blocks.push({
        type: "text",
        text: `Structured data:\n${JSON.stringify(part.data, null, 2)}`,
      });
    } else if (part.kind === "file") {
      const { file } = part;
      const mimeType = file.mimeType ?? "application/octet-stream";

      if (mimeType.startsWith("image/")) {
        const url =
          "uri" in file ? file.uri : `data:${mimeType};base64,${"bytes" in file ? file.bytes : ""}`;
        blocks.push({ type: "image_url", image_url: { url } });
      } else {
        const name = file.name ?? "file";
        blocks.push({ type: "text", text: `[Attached file: ${name} (${mimeType}) — content not shown]` });
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
    .map((block) => {
      if (typeof block === "string") return block;
      if (block && typeof block === "object" && "type" in block && block.type === "text" && "text" in block && typeof block.text === "string") {
        return block.text;
      }
      return "";
    })
    .join("");
}

export function shouldReturnA2UIDemo(content: string | ContentBlock[]): boolean {
  return contentToText(content).toLowerCase().includes("a2ui");
}
