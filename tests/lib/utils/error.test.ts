import { describe, expect, it } from "vitest";
import { getErrorMessage, isAbortError } from "@/lib/utils/error";

describe("error utils", () => {
  describe("getErrorMessage", () => {
    it("extracts message from Error instances", () => {
      expect(getErrorMessage(new Error("custom failure"))).toBe("custom failure");
    });

    it("returns string errors verbatim", () => {
      expect(getErrorMessage("literal string error")).toBe("literal string error");
    });

    it("returns fallback for non-error types", () => {
      expect(getErrorMessage(null)).toBe("An unexpected error occurred.");
      expect(getErrorMessage({ code: 500 }, "Failed with code")).toBe("Failed with code");
    });
  });

  describe("isAbortError", () => {
    it("returns true for DOMException / Error with name AbortError", () => {
      const abortErr = new Error("aborted");
      abortErr.name = "AbortError";
      expect(isAbortError(abortErr)).toBe(true);
    });

    it("returns false for standard errors or non-errors", () => {
      expect(isAbortError(new Error("regular error"))).toBe(false);
      expect(isAbortError("AbortError")).toBe(false);
      expect(isAbortError(null)).toBe(false);
    });
  });
});
