import { describe, expect, it } from "vitest";
import {
  A2UI_MIME_TYPE,
  detectA2UISurface,
} from "@/lib/a2a/a2ui";

describe("a2ui detection", () => {
  it("detects wrapped A2UI surfaces", () => {
    const detection = detectA2UISurface({
      a2ui: {
        kind: "surface",
        version: "1",
        title: "Summary",
        components: [
          { kind: "text", text: "Ready" },
          { kind: "badge", label: "ok", tone: "success" },
        ],
      },
    });

    expect(detection?.source).toBe("a2ui");
    expect(detection?.surface.title).toBe("Summary");
    expect(detection?.componentCount).toBe(2);
  });

  it("detects MIME-tagged surfaces", () => {
    const detection = detectA2UISurface(
      {
        kind: "surface",
        version: "1",
        components: [{ kind: "key-value", items: [{ label: "Status", value: "ok" }] }],
      },
      A2UI_MIME_TYPE,
    );

    expect(detection?.source).toBe("mime");
    expect(detection?.surface.components[0].kind).toBe("key-value");
  });

  it("rejects unsupported interactive-looking payloads", () => {
    expect(
      detectA2UISurface({
        a2ui: {
          kind: "surface",
          version: "1",
          components: [{ kind: "button", label: "Run tool", action: "execute" }],
        },
      }),
    ).toBeNull();
  });
});
