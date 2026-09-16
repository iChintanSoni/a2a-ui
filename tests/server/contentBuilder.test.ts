import { describe, expect, it } from "vitest";
import { textPart, dataPart, rawFilePart } from "../../server/src/parts";
import {
  buildMessageContent,
  contentToText,
  shouldReturnA2UIDemo,
} from "../../server/src/contentBuilder";

describe("server contentBuilder", () => {
  describe("buildMessageContent", () => {
    it("returns plain string for a single text part", () => {
      const parts = [textPart("Hello server")];
      expect(buildMessageContent(parts)).toBe("Hello server");
    });

    it("returns ContentBlock array for multipart messages", () => {
      const parts = [textPart("First part"), textPart("Second part")];
      const result = buildMessageContent(parts);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([
        { type: "text", text: "First part" },
        { type: "text", text: "Second part" },
      ]);
    });

    it("handles data parts as structured JSON text blocks", () => {
      const parts = [dataPart({ action: "query", id: 42 })];
      const result = buildMessageContent(parts);
      expect(typeof result).toBe("string");
      expect(result).toContain('"action": "query"');
    });

    it("handles image attachments as image_url blocks", () => {
      const buf = Buffer.from("dummy-png-data");
      const parts = [rawFilePart(buf, "test.png", "image/png")];
      const result = buildMessageContent(parts);
      expect(Array.isArray(result)).toBe(true);
      expect((result as Array<{ type: string; image_url: { url: string } }>)[0]).toMatchObject({
        type: "image_url",
        image_url: {
          url: expect.stringContaining("data:image/png;base64,"),
        },
      });
    });

    it("returns placeholder for empty parts array", () => {
      expect(buildMessageContent([])).toBe("(empty message)");
    });
  });

  describe("contentToText", () => {
    it("converts string and block arrays to plain text", () => {
      expect(contentToText("direct string")).toBe("direct string");
      expect(
        contentToText([
          { type: "text", text: "Hello " },
          { type: "text", text: "World" },
        ]),
      ).toBe("Hello World");
    });
  });

  describe("shouldReturnA2UIDemo", () => {
    it("detects a2ui keyword in user prompts", () => {
      expect(shouldReturnA2UIDemo("Show me an A2UI demo")).toBe(true);
      expect(shouldReturnA2UIDemo("Just normal chat")).toBe(false);
    });
  });
});
