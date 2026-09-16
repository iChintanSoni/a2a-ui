import { describe, expect, it } from "vitest";
import {
  getNestedRecord,
  getString,
  isArray,
  isNonEmptyString,
  isRecord,
  isToolCallData,
} from "@/lib/utils/type-guards";

describe("type-guards", () => {
  describe("isRecord", () => {
    it("returns true for plain objects and false for primitives or arrays", () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ a: 1 })).toBe(true);
      expect(isRecord([])).toBe(false);
      expect(isRecord(null)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
      expect(isRecord("string")).toBe(false);
      expect(isRecord(123)).toBe(false);
    });
  });

  describe("isArray", () => {
    it("returns true for arrays and false for non-arrays", () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray({})).toBe(false);
      expect(isArray("hello")).toBe(false);
    });
  });

  describe("isNonEmptyString", () => {
    it("identifies non-empty strings", () => {
      expect(isNonEmptyString("hello")).toBe(true);
      expect(isNonEmptyString("")).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
    });
  });

  describe("getString", () => {
    it("reads string properties from objects", () => {
      expect(getString({ name: "Alice" }, "name")).toBe("Alice");
      expect(getString({ name: 123 }, "name")).toBeUndefined();
      expect(getString(null, "name")).toBeUndefined();
    });
  });

  describe("getNestedRecord", () => {
    it("traverses nested objects safely", () => {
      const obj = { a: { b: { c: "deep" } } };
      expect(getNestedRecord(obj, "a", "b")).toEqual({ c: "deep" });
      expect(getNestedRecord(obj, "a", "missing")).toBeUndefined();
      expect(getNestedRecord(null, "a")).toBeUndefined();
    });
  });

  describe("isToolCallData", () => {
    it("validates compliant tool-call payload shapes", () => {
      expect(
        isToolCallData({
          phase: "running",
          toolName: "calculator",
          query: "2+2",
        }),
      ).toBe(true);

      expect(
        isToolCallData({
          phase: "done",
          toolName: "web_search",
          query: "news",
          resultCount: 5,
        }),
      ).toBe(true);

      expect(isToolCallData({ phase: "unknown", toolName: "t", query: "q" })).toBe(false);
      expect(isToolCallData({ phase: "running", toolName: 123, query: "q" })).toBe(false);
      expect(isToolCallData(null)).toBe(false);
    });
  });
});
