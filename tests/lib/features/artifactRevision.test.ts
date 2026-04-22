import { describe, expect, it } from "vitest";
import {
  buildArtifactRevisionMessage,
  getArtifactText,
  isEditableArtifact,
  summarizeTextDiff,
} from "@/lib/features/chats/artifactRevision";
import type { ArtifactItem } from "@/lib/features/chats/chatsSlice";

const artifact: ArtifactItem = {
  kind: "artifact",
  id: "artifact-1",
  taskId: "task-1",
  name: "draft.md",
  parts: [{ kind: "text", text: "line one\nline two" }],
  isStreaming: false,
  timestamp: 1,
};

describe("artifactRevision", () => {
  it("detects editable text artifacts", () => {
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
    const revision = buildArtifactRevisionMessage(artifact, "line one\nline three");

    expect(revision.metadata).toMatchObject({
      artifactId: "artifact-1",
      artifactName: "draft.md",
      artifactTaskId: "task-1",
      artifactRevision: "true",
    });
    expect(revision.text).toContain("Use this revised artifact as the latest working version");
    expect(revision.text).toContain("line three");
  });
});
