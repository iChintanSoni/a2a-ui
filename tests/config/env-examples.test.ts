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
    expect(env).toContain("OLLAMA_HOST=http://localhost:11434");
    expect(env).toContain("OLLAMA_LLM_MODEL=qwen3.5:4b");
    expect(env).not.toContain("AI_PROVIDER=");
    expect(env).not.toContain("GEMINI_API_KEY=");
  });
});
