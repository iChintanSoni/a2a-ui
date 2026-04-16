import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("environment examples", () => {
  it("documents the UI demo agent URL", () => {
    const env = readFileSync(".env.example", "utf8");

    expect(env).toContain("NEXT_PUBLIC_DEMO_AGENT_URL=http://localhost:3001");
  });

  it("documents the demo server defaults", () => {
    const env = readFileSync("server/.env.example", "utf8");

    expect(env).toContain("PORT=3001");
    expect(env).toContain("AI_PROVIDER=gemini");
    expect(env).toContain("OLLAMA_HOST=http://localhost:11434");
  });
});
