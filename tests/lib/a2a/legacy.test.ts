import { describe, expect, it } from "vitest";
import { TaskState } from "@a2a-js/sdk";
import {
  migrateLegacyAgentCard,
  migrateLegacyPart,
  migrateLegacyParts,
  taskStateLabel,
  toOptionalTaskState,
  toTaskState,
} from "@/lib/a2a/legacy";
import { getPartBytesBase64, textPart } from "@/lib/a2a/parts";

describe("task state conversion", () => {
  it("reads v0.3 kebab-case, v1.0 names, and v1.0 ordinals", () => {
    expect(toTaskState("completed")).toBe(TaskState.TASK_STATE_COMPLETED);
    expect(toTaskState("input-required")).toBe(TaskState.TASK_STATE_INPUT_REQUIRED);
    expect(toTaskState("TASK_STATE_FAILED")).toBe(TaskState.TASK_STATE_FAILED);
    expect(toTaskState(TaskState.TASK_STATE_WORKING)).toBe(TaskState.TASK_STATE_WORKING);
  });

  it("maps the v0.3 'unknown' state onto UNSPECIFIED", () => {
    expect(toTaskState("unknown")).toBe(TaskState.TASK_STATE_UNSPECIFIED);
  });

  it("keeps absent values absent instead of coercing to UNRECOGNIZED", () => {
    expect(toOptionalTaskState(undefined)).toBeUndefined();
    expect(toOptionalTaskState("")).toBeUndefined();
    expect(toOptionalTaskState(null)).toBeUndefined();
    // A real value of 0 must survive, unlike a truthiness check.
    expect(toOptionalTaskState("unknown")).toBe(TaskState.TASK_STATE_UNSPECIFIED);
  });

  it("round-trips through the short label the UI and exports use", () => {
    for (const label of ["submitted", "working", "completed", "input-required", "auth-required"]) {
      expect(taskStateLabel(toTaskState(label))).toBe(label);
    }
    expect(taskStateLabel(undefined)).toBe("unknown");
  });
});

describe("part migration", () => {
  it("converts a v0.3 text part", () => {
    expect(migrateLegacyPart({ kind: "text", text: "hello" })).toEqual(textPart("hello"));
  });

  it("converts a v0.3 data part", () => {
    const part = migrateLegacyPart({ kind: "data", data: { ok: true } });
    expect(part.content).toEqual({ $case: "data", value: { ok: true } });
  });

  it("converts a v0.3 file-by-bytes part to raw content", () => {
    const part = migrateLegacyPart({
      kind: "file",
      file: { name: "a.txt", mimeType: "text/plain", bytes: "aGVsbG8=" },
    });

    expect(part.content?.$case).toBe("raw");
    expect(part.filename).toBe("a.txt");
    expect(part.mediaType).toBe("text/plain");
    expect(getPartBytesBase64(part)).toBe("aGVsbG8=");
  });

  it("converts a v0.3 file-by-uri part to url content", () => {
    const part = migrateLegacyPart({
      kind: "file",
      file: { name: "a.png", mimeType: "image/png", uri: "https://cdn.test/a.png" },
    });

    expect(part.content).toEqual({ $case: "url", value: "https://cdn.test/a.png" });
  });

  it("preserves part metadata across the conversion", () => {
    const part = migrateLegacyPart({
      kind: "data",
      data: {},
      metadata: { mimeType: "application/vnd.a2ui+json" },
    });

    expect(part.metadata).toEqual({ mimeType: "application/vnd.a2ui+json" });
  });

  it("passes an already-v1 part through, backfilling required fields", () => {
    const part = migrateLegacyPart({ content: { $case: "text", value: "hi" } });

    expect(part).toEqual({
      content: { $case: "text", value: "hi" },
      metadata: undefined,
      filename: "",
      mediaType: "",
    });
  });

  it("tolerates junk instead of throwing", () => {
    expect(migrateLegacyParts(undefined)).toEqual([]);
    expect(migrateLegacyPart(null).content).toEqual({ $case: "text", value: "" });
  });
});

describe("agent card migration", () => {
  const legacyCard = {
    name: "Demo",
    description: "desc",
    url: "https://agent.test/a2a/jsonrpc",
    version: "1.0.0",
    protocolVersion: "0.3.0",
    preferredTransport: "JSONRPC",
    capabilities: { streaming: true, stateTransitionHistory: true },
    additionalInterfaces: [
      { url: "https://agent.test/a2a/jsonrpc", transport: "JSONRPC" },
      { url: "https://agent.test/a2a/rest", transport: "HTTP+JSON" },
    ],
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
    skills: [{ id: "s1", name: "Skill", description: "d", tags: ["a"] }],
    security: [{ bearer: [] }],
    securitySchemes: { bearer: { type: "http" } },
  };

  it("folds url and preferredTransport into the leading interface", () => {
    const card = migrateLegacyAgentCard(legacyCard);

    expect(card.supportedInterfaces[0]).toEqual({
      url: "https://agent.test/a2a/jsonrpc",
      protocolBinding: "JSONRPC",
      tenant: "",
      protocolVersion: "0.3.0",
    });
  });

  it("keeps additional interfaces without duplicating the preferred one", () => {
    const card = migrateLegacyAgentCard(legacyCard);

    expect(card.supportedInterfaces).toHaveLength(2);
    expect(card.supportedInterfaces[1].protocolBinding).toBe("HTTP+JSON");
  });

  it("renames security to securityRequirements", () => {
    expect(migrateLegacyAgentCard(legacyCard).securityRequirements).toEqual([{ bearer: [] }]);
  });

  it("fills the fields v1.0 requires but v0.3 omitted", () => {
    const card = migrateLegacyAgentCard(legacyCard);

    expect(card.capabilities?.extensions).toEqual([]);
    expect(card.signatures).toEqual([]);
    expect(card.skills[0].examples).toEqual([]);
    expect(card.skills[0].securityRequirements).toEqual([]);
  });

  it("leaves an already-v1 card's interfaces alone", () => {
    const supportedInterfaces = [
      { url: "https://agent.test", protocolBinding: "JSONRPC", tenant: "", protocolVersion: "1.0" },
    ];
    const card = migrateLegacyAgentCard({ name: "Demo", supportedInterfaces });

    expect(card.supportedInterfaces).toEqual(supportedInterfaces);
  });

  it("returns an empty interface list when there is no url to derive one from", () => {
    expect(migrateLegacyAgentCard({ name: "Demo" }).supportedInterfaces).toEqual([]);
  });
});
