import { dataPart, getPartBytesBase64, rawFilePart, textPart } from "@/lib/a2a/parts";
import { describe, expect, it } from "vitest";
import { buildOutgoingMessage, resolveContextConfig } from "@/lib/a2a/message-utils";

describe("resolveContextConfig", () => {
  it("merges initial metadata, enricher metadata, and user metadata", async () => {
    const resolved = await resolveContextConfig(
      {
        text: "hello",
        parts: [textPart("hello")],
        contextId: "chat-1",
        agentUrl: "https://agent.test",
        metadata: { tenant: "override", priority: "user" },
      },
      {
        initialMetadata: { source: "embed", tenant: "initial" },
        messageContextEnrichers: [
          () => ({
            metadata: { tenant: "enriched", locale: "en-US" },
          }),
        ],
      },
    );

    expect(resolved.metadata).toEqual({
      source: "embed",
      tenant: "override",
      locale: "en-US",
      priority: "user",
    });
  });

  it("concatenates base and per-message hidden context", async () => {
    const resolved = await resolveContextConfig(
      {
        text: "hello",
        parts: [textPart("hello")],
        contextId: "chat-1",
        agentUrl: "https://agent.test",
      },
      {
        hiddenSystemContext: "base context",
        messageContextEnrichers: [
          () => ({
            hiddenSystemContext: "dynamic context",
          }),
        ],
      },
    );

    expect(resolved.hiddenSystemContext).toBe("base context\n\ndynamic context");
  });
});

describe("buildOutgoingMessage", () => {
  it("injects hidden system context into the outgoing text part", async () => {
    const message = await buildOutgoingMessage({
      parts: [textPart("What is the status?")],
      messageId: "m-1",
      contextId: "c-1",
      agentUrl: "https://agent.test",
      context: {
        hiddenSystemContext: "This request came from the embedded widget.",
      },
    });

    expect(message.parts[0]).toEqual(
      textPart(
        '<system_context hidden="true">\nThis request came from the embedded widget.\n</system_context>\n\nWhat is the status?',
      ),
    );
  });

  it("prepends hidden system context when the message has no text parts", async () => {
    const message = await buildOutgoingMessage({
      parts: [dataPart({ query: "status" })],
      messageId: "m-1b",
      contextId: "c-1b",
      agentUrl: "https://agent.test",
      context: {
        hiddenSystemContext: "Hidden context only.",
      },
    });

    expect(message.parts[0]).toEqual(
      textPart('<system_context hidden="true">\nHidden context only.\n</system_context>'),
    );
    expect(message.parts[1]).toEqual(dataPart({ query: "status" }));
  });

  it("preserves file parts, metadata, and input-required task ids", async () => {
    const message = await buildOutgoingMessage({
      parts: [
        textPart("Please continue"),
        rawFilePart(Buffer.from("SGVsbG8=", "base64"), "notes.txt", "text/plain"),
      ],
      messageId: "m-2",
      contextId: "c-2",
      agentUrl: "https://agent.test",
      inputTaskId: "task-9",
      metadata: { source: "host" },
    });

    expect(message.taskId).toBe("task-9");
    expect(message.metadata).toEqual({ source: "host" });
    expect(message.parts).toHaveLength(2);
    expect(message.parts[1]).toMatchObject({
      filename: "notes.txt",
      mediaType: "text/plain",
    });
    expect(getPartBytesBase64(message.parts[1])).toBe("SGVsbG8=");
  });
});
