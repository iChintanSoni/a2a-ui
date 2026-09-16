import { describe, expect, it } from "vitest";
import { isAttachmentMode, isTextMode, normalizeMode, normalizeModes } from "@/lib/utils/modes";

describe("modes utils", () => {
  describe("normalizeMode", () => {
    it("maps text to text/plain and json to application/json", () => {
      expect(normalizeMode("text")).toBe("text/plain");
      expect(normalizeMode("json")).toBe("application/json");
      expect(normalizeMode("image/png")).toBe("image/png");
    });
  });

  describe("normalizeModes", () => {
    it("returns undefined for undefined input", () => {
      expect(normalizeModes(undefined)).toBeUndefined();
    });

    it("deduplicates and normalizes mode arrays", () => {
      expect(normalizeModes(["text", "text/plain", "json", "application/json"])).toEqual([
        "text/plain",
        "application/json",
      ]);
    });
  });

  describe("isTextMode and isAttachmentMode", () => {
    it("distinguishes text modes from attachment modes", () => {
      expect(isTextMode("text/plain")).toBe(true);
      expect(isTextMode("text")).toBe(true);
      expect(isTextMode("image/png")).toBe(false);

      expect(isAttachmentMode("image/png")).toBe(true);
      expect(isAttachmentMode("text/plain")).toBe(false);
      expect(isAttachmentMode("text")).toBe(false);
    });
  });
});
