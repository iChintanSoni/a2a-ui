import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createA2AStore, makeStore } from "@/lib/store";

describe("store factory", () => {
  it("creates a store with the four slices", () => {
    const state = makeStore().getState();

    expect(Object.keys(state).sort()).toEqual(["agents", "chats", "qa", "workbench"]);
  });

  it("exposes createA2AStore as documented by the embedding guide", () => {
    expect(createA2AStore).toBe(makeStore);
    expect(readFileSync("docs/embed.md", "utf8")).toContain(
      'import { createA2AStore } from "a2a-ui/lib/store";',
    );
  });
});
