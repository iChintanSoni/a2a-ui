import { describe, expect, it } from "vitest";
import type { ArtifactItem } from "@/lib/features/chats/chatsSlice";
import {
  buildArtifactRevisionMessage,
  getArtifactText,
  getArtifactRevisionLabel,
  getEditableArtifactKind,
  isEditableArtifact,
  summarizeTextDiff,
} from "@/lib/features/chats/artifactRevision";

function makeArtifact(overrides: Partial<ArtifactItem> = {}): ArtifactItem {
  return {
    kind: "artifact",
    id: "artifact-1",
    taskId: "task-1",
    name: "draft.md",
    parts: [{ kind: "text", text: "hello" }],
    isStreaming: false,
    timestamp: 1,
    ...overrides,
  };
}

describe("artifactRevision", () => {
  it("detects editable text artifacts", () => {
    const artifact = makeArtifact({
      parts: [{ kind: "text", text: "line one\nline two" }],
    });

    expect(isEditableArtifact(artifact)).toBe(true);
    expect(getArtifactText(artifact)).toBe("line one\nline two");
  });

  it("summarizes text diff changes", () => {
    expect(summarizeTextDiff("a\nb", "a\nc")).toEqual({
      changed: true,
      addedLines: 1,
      removedLines: 1,
    });
  });

  it("builds a revision message with metadata", () => {
    const artifact = makeArtifact({
      parts: [{ kind: "text", text: "line one\nline two" }],
    });
    const revision = buildArtifactRevisionMessage(artifact, "line one\nline three");

    expect(revision.metadata).toMatchObject({
      artifactId: "artifact-1",
      artifactName: "draft.md",
      artifactTaskId: "task-1",
      artifactRevision: "true",
      artifactKind: "markdown",
    });
    expect(revision.parts[0]).toMatchObject({ kind: "text" });
    expect(revision.parts[0].kind === "text" ? revision.parts[0].text : "").toContain(
      "Use this revised markdown artifact as the latest working version",
    );
    expect(revision.parts[0].kind === "text" ? revision.parts[0].text : "").toContain(
      "line three",
    );
  });

  it("classifies code artifacts and preserves the kind in revision metadata", () => {
    const item = makeArtifact({
      name: "handler.ts",
      parts: [{ kind: "text", text: "export const ok = true;" }],
    });

    const revision = buildArtifactRevisionMessage(item, "export const ok = false;");

    expect(getEditableArtifactKind(item)).toBe("code");
    expect(getArtifactRevisionLabel(item)).toBe("Revise code");
    expect(revision.metadata.artifactKind).toBe("code");
    expect(revision.parts[0].text).toContain("revised code artifact");
  });

  it("classifies diagram and table artifacts", () => {
    expect(
      getEditableArtifactKind(
        makeArtifact({
          name: "flow diagram",
          parts: [{ kind: "text", text: "```mermaid\ngraph TD\n```" }],
        }),
      ),
    ).toBe("diagram");

    expect(
      getEditableArtifactKind(
        makeArtifact({
          name: "results.csv",
          metadata: { mimeType: "text/csv" },
          parts: [{ kind: "text", text: "name,value\nalpha,1" }],
        }),
      ),
    ).toBe("table");
  });
});
