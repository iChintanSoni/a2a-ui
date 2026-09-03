import { describe, expect, it } from "vitest";
import {
  buildPartsPreview,
  dataPart,
  getPartBytesBase64,
  getPartData,
  getPartText,
  getPartUrl,
  getTextPartsText,
  hasPartCase,
  isFilePart,
  partsToPlainText,
  rawFilePart,
  textPart,
  urlFilePart,
} from "@/lib/a2a/parts";

describe("part constructors", () => {
  it("builds a complete v1 text part", () => {
    expect(textPart("hello")).toEqual({
      content: { $case: "text", value: "hello" },
      metadata: undefined,
      filename: "",
      mediaType: "text/plain",
    });
  });

  it("defaults data parts to application/json", () => {
    expect(dataPart({ a: 1 }).mediaType).toBe("application/json");
    expect(getPartData(dataPart({ a: 1 }))).toEqual({ a: 1 });
  });

  it("distinguishes the two file representations", () => {
    const byUrl = urlFilePart("https://cdn.test/a.png", "a.png", "image/png");
    const byBytes = rawFilePart(Buffer.from("hello"), "a.txt", "text/plain");

    expect(isFilePart(byUrl)).toBe(true);
    expect(isFilePart(byBytes)).toBe(true);
    expect(isFilePart(textPart("x"))).toBe(false);

    expect(getPartUrl(byUrl)).toBe("https://cdn.test/a.png");
    expect(getPartUrl(byBytes)).toBeUndefined();
    expect(getPartBytesBase64(byBytes)).toBe(Buffer.from("hello").toString("base64"));
    expect(getPartBytesBase64(byUrl)).toBeUndefined();
  });
});

describe("part accessors", () => {
  it("returns undefined rather than throwing on the wrong case", () => {
    expect(getPartText(dataPart({}))).toBeUndefined();
    expect(getPartData(textPart("x"))).toBeUndefined();
  });

  it("concatenates only text parts", () => {
    const parts = [textPart("a"), dataPart({ b: 1 }), textPart("c")];
    expect(getTextPartsText(parts)).toBe("ac");
  });

  it("describes non-text parts in plain text", () => {
    const parts = [
      textPart("intro"),
      dataPart({ ok: true }),
      urlFilePart("https://cdn.test/a.png", "a.png", "image/png"),
    ];
    const text = partsToPlainText(parts);

    expect(text).toContain("intro");
    expect(text).toContain('"ok": true');
    expect(text).toContain("[File: a.png (image/png)]");
  });

  it("falls back to a placeholder for an empty preview", () => {
    expect(buildPartsPreview([])).toBe("(empty message)");
  });

  it("truncates long previews", () => {
    expect(buildPartsPreview([textPart("x".repeat(200))], 20)).toHaveLength(20);
  });

  it("detects a part case across a list", () => {
    expect(hasPartCase([textPart("a"), dataPart({})], "data")).toBe(true);
    expect(hasPartCase([textPart("a")], "raw")).toBe(false);
  });
});
