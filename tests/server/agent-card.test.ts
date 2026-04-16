import { describe, expect, it } from "vitest";
import { createAgentCard } from "../../server/src/card";
import { checkCompliance } from "@/lib/utils/compliance";

describe("demo A2A server agent card", () => {
  it("declares spec-compatible transports and MIME modes", () => {
    const card = createAgentCard("http://localhost:3001");

    expect(card.url).toBe("http://localhost:3001/a2a/jsonrpc");
    expect(card.preferredTransport).toBe("JSONRPC");
    expect(card.additionalInterfaces).toEqual([
      { url: "http://localhost:3001/a2a/jsonrpc", transport: "JSONRPC" },
      { url: "http://localhost:3001/a2a/rest", transport: "HTTP+JSON" },
    ]);
    expect(card.defaultInputModes).toContain("text/plain");
    expect(card.defaultOutputModes).toContain("text/plain");
    expect(card.skills.every((skill) => Array.isArray(skill.inputModes))).toBe(true);
    expect(card.skills.every((skill) => Array.isArray(skill.outputModes))).toBe(true);
  });

  it("passes the local A2A compliance validator", () => {
    const result = checkCompliance(createAgentCard("http://localhost:3001"));

    expect(result.checks.filter((check) => !check.pass)).toEqual([]);
  });
});
