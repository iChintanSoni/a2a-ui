import { describe, it, expect } from "vitest";
import { normalizeAgentUrl, getAgentCardUrlFallback } from "@/lib/utils/url";
import { AGENT_CARD_PATH } from "@a2a-js/sdk";

describe("normalizeAgentUrl", () => {
  it("should trim whitespace", () => {
    expect(normalizeAgentUrl("  http://localhost:3000  ")).toBe("http://localhost:3000");
  });

  it("should add http:// to localhost if protocol is missing", () => {
    expect(normalizeAgentUrl("localhost:4000")).toBe("http://localhost:4000");
    expect(normalizeAgentUrl("127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
  });

  it("should add https:// to external domains if protocol is missing", () => {
    expect(normalizeAgentUrl("my-agent.com")).toBe("https://my-agent.com");
  });

  it("should not change existing protocol", () => {
    expect(normalizeAgentUrl("https://localhost:3000")).toBe("https://localhost:3000");
    expect(normalizeAgentUrl("http://example.com")).toBe("http://example.com");
  });

  it("should return empty string for empty input", () => {
    expect(normalizeAgentUrl("   ")).toBe("");
  });
});

describe("getAgentCardUrlFallback", () => {
  it("should append AGENT_CARD_PATH to base URL", () => {
    const fallback = getAgentCardUrlFallback("http://localhost:3001");
    expect(fallback).toBe(`http://localhost:3001/${AGENT_CARD_PATH}`);
  });

  it("should handle trailing slashes correctly", () => {
    const fallback = getAgentCardUrlFallback("http://localhost:3001/");
    expect(fallback).toBe(`http://localhost:3001/${AGENT_CARD_PATH}`);
  });

  it("should not append path if URL already ends in .json", () => {
    const url = "http://localhost:3001/custom-card.json";
    expect(getAgentCardUrlFallback(url)).toBe(url);
  });

  it("should normalize and then append", () => {
    const fallback = getAgentCardUrlFallback(" localhost:3001 ");
    expect(fallback).toBe(`http://localhost:3001/${AGENT_CARD_PATH}`);
  });
});
